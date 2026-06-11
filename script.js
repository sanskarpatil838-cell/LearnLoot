// ============================================================
// ===== USER PROFILE =====
// ============================================================
const DISPLAY_AVATARS = ['🎓', '📚', '🧠', '🧮', '🚀', '⭐', '🔥', '💡', '🏆', '🎯', '📝', '✨'];
const LEGACY_AVATAR_MAP = {
    ST: '🎓',
    LN: '📚',
    FX: '🧠',
    TR: '🧮',
    EG: '🚀',
    RK: '⭐',
    SP: '🔥',
    FR: '💡',
    DM: '🏆',
    SR: '🎯',
    TG: '📝',
    CP: '✨',
    '??': '🎓'
};
const firebaseConfig = window.firebaseConfig || null;
const appCheckConfig = window.appCheckConfig || {};
const firebaseReady = typeof firebase !== 'undefined'
    && typeof window.isFirebaseConfigured === 'function'
    && window.isFirebaseConfigured(firebaseConfig);

const firebaseApp = firebaseReady
    ? (firebase.apps.length ? firebase.app() : firebase.initializeApp(firebaseConfig))
    : null;
const auth = firebaseReady ? firebase.auth() : null;
const db = firebaseReady ? firebase.firestore() : null;
let appCheck = null;
if (auth && typeof auth.useDeviceLanguage === 'function') {
    auth.useDeviceLanguage();
}
if (
    firebaseReady
    && appCheckConfig.enabled
    && appCheckConfig.siteKey
    && typeof firebase.appCheck === 'function'
) {
    try {
        appCheck = firebase.appCheck();
        appCheck.activate(appCheckConfig.siteKey, true);
    } catch (error) {
        console.warn('Firebase App Check could not be activated:', error);
        appCheck = null;
    }
}
const adminConfig = window.adminConfig || {};
const backendConfig = window.backendConfig || {};
const BACKEND_API_BASE_URL = String(backendConfig.apiBaseUrl || '').replace(/\/+$/, '');
const REQUIRE_BACKEND_API = backendConfig.requireBackend !== false;
const ALLOW_CLIENT_FIRESTORE_FALLBACK = Boolean(backendConfig.allowClientFirestoreFallback) && !REQUIRE_BACKEND_API;
const ADMIN_EMAILS = Array.from(new Set(
    (adminConfig.adminEmails || [])
        .map((email) => String(email || '').trim().toLowerCase())
        .filter(Boolean)
));
const RAPID_ANSWER_SECONDS_THRESHOLD = Number(adminConfig.rapidAnswerSeconds || 3);
const SUSPICION_SCORE_THRESHOLD = Number(adminConfig.suspicionThreshold || 8);
const MAX_ADMIN_USERS = Number(adminConfig.maxAdminUsers || 200);
const MAX_ADMIN_ATTEMPTS = Number(adminConfig.maxAdminAttempts || 250);
const MAX_LEADERBOARD_USERS = Number(adminConfig.maxLeaderboardUsers || 100);
const LEADERBOARD_CACHE_MS = 30 * 1000;
const AUTO_SUBMIT_MESSAGE = 'Test submitted automatically because the same suspicious activity was detected again.';
const MIN_WITHDRAWAL_POINTS = 10000;
const WITHDRAWAL_STATUSES = ['Pending', 'Approved', 'Rejected', 'Paid'];
const QUESTION_BANK_CLIENT_VERSION = '20260603-pyq-render-clean-v3';
const AUTH_PROFILE_SEED_STORAGE_KEY = 'learnloot_auth_profile_seed';
const PAUSED_TEST_STORAGE_KEY_PREFIX = 'learnloot_paused_test_v1';
const PENDING_OFFLINE_ATTEMPT_STORAGE_KEY_PREFIX = 'learnloot_pending_offline_attempt_v1';
const OFFLINE_AUTOSUBMIT_REASON = 'internet connection disconnected';
const REFERRAL_REWARD_POINTS = 100;

let currentUser = null;
let selectedAvatar = DISPLAY_AVATARS[0];
let pendingProfileSeed = null;
let authStateLoadPromise = null;
let isSubmittingTest = false;
let testStartSnapshot = null;
let pausedTestState = null;
let adminUsers = [];
let adminAttempts = [];
let adminWithdrawalRequests = [];
let adminReferrals = [];
let adminPayments = [];
let referralHistory = [];
let adminLoadError = '';
let pendingReferralSuccessMessage = '';
let adminPanelVisible = false;
let isSubmittingWithdrawal = false;
const updatingWithdrawalRequestIds = new Set();
const updatingReferralRecordIds = new Set();
let cheatLog = null;
let currentQuestionStartedAt = 0;
let questionResumeCarryMs = 0;
let fullscreenWarningGiven = false;
let pendingRuleWarningAction = null;
let pendingPreQuizInstructionAction = null;
let pendingQuizScoringAction = null;
let chapterCatalog = [];
let chapterCatalogLoadPromise = null;
let leaderboardFetchedAt = 0;
let quizMediaStream = null;
let mediaRecorder = null;
let currentRecordingAttemptId = '';
let currentQuizAttemptId = '';
let recordingUploadTask = null;
let lastRecordingDownloadUrl = '';
let recordingChunkIndex = 0;
let recordingUploadedChunkCount = 0;
let recordingFailedChunkCount = 0;
let recordingPendingUploads = new Set();
let recordingBasePath = '';
let recordingStudentId = '';
let recordingQuizId = '';
let recordingLastUploadError = '';
let selectedSidebarAvatar = '';
const adminRecordingAvailabilityCache = new Map();
const adminAutoMergeAttemptIds = new Set();
const adminAutoMergeFailedAttemptIds = new Set();
const adminAutoMergeErrorMessages = new Map();
const adminLocalMergedRecordingUrls = new Map();
let adminRecordingValidationRun = 0;
let adminRecordingAutoRefreshTimer = null;
let offlineAutoSubmitInProgress = false;
let pendingOfflineSubmitInProgress = false;
let purchaseRefreshInProgress = false;

function getDisplayAvatar(value) {
    const avatar = String(value || '').trim();
    return LEGACY_AVATAR_MAP[avatar] || avatar || DISPLAY_AVATARS[0];
}

function getNumericValue(value, fallback = 0) {
    const number = Number(value);
    if (Number.isFinite(number)) return number;

    const fallbackNumber = Number(fallback);
    return Number.isFinite(fallbackNumber) ? fallbackNumber : 0;
}

function normalizeReferralCode(value) {
    return String(value || '')
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 20);
}

function getCashEarnedDisplayValue(value = totalPoints) {
    return getNumericValue(value);
}

function isBackendEnabled() {
    return Boolean(BACKEND_API_BASE_URL);
}

function getBackendRequiredMessage() {
    return 'Backend API is required for launch. Set window.backendConfig.apiBaseUrl in firebase-config.js.';
}

function canUseClientFirestoreFallback() {
    return ALLOW_CLIENT_FIRESTORE_FALLBACK;
}

function ensureBackendOrFallbackAvailable() {
    if (isBackendEnabled() || canUseClientFirestoreFallback()) return true;
    throw new Error(getBackendRequiredMessage());
}

function getBackendModeHeaders() {
    const mode = String(backendConfig.mode || 'cloud').trim().toLowerCase();
    const isSameOriginBackend = typeof window !== 'undefined'
        && BACKEND_API_BASE_URL
        && BACKEND_API_BASE_URL.startsWith(window.location.origin);
    return isSameOriginBackend ? { 'X-LearnLoot-Backend-Mode': mode || 'cloud' } : {};
}

function range(start, end) {
    return Array.from(
        { length: Math.max(0, Number(end || 0) - Number(start || 0) + 1) },
        (_, index) => Number(start || 0) + index
    );
}

function getChapterRecord(chapter) {
    return chapterCatalog.find((entry) => entry.name === chapter) || null;
}

function getChapterNames() {
    return chapterCatalog.map((entry) => entry.name);
}

function getChapterQuestionCount(chapter) {
    return Number(getChapterRecord(chapter)?.totalQuestions || 0);
}

function getChapterPartCount(chapter) {
    const totalParts = Number(getChapterRecord(chapter)?.totalParts ?? 0);
    return Number.isFinite(totalParts) ? Math.max(0, totalParts) : 0;
}

function getChapterPartInfo(chapter, partNumber = 1) {
    const chapterRecord = getChapterRecord(chapter);
    const totalQuestions = Number(chapterRecord?.totalQuestions || 0);
    const rawTotalParts = Number(chapterRecord?.totalParts ?? 0);
    const totalParts = totalQuestions > 0 ? Math.max(1, rawTotalParts || 1) : 0;
    const partSize = Math.max(1, Number(chapterRecord?.perPart || CHAPTER_PART_SIZE));
    const safePartNumber = totalParts > 0
        ? Math.min(Math.max(Number(partNumber) || 1, 1), totalParts)
        : 0;
    const questionCount = Math.min(partSize, totalQuestions);

    return {
        partNumber: safePartNumber,
        totalParts,
        totalQuestions,
        startIndex: 0,
        endIndex: questionCount,
        questionCount,
        label: `Quiz ${safePartNumber} (${questionCount} random questions)`
    };
}

function cloneQuizQuestion(question = {}) {
    const clonedQuestion = {
        questionId: String(question.questionId || ''),
        questionNumber: Number(question.questionNumber || 0),
        q: String(question.q || ''),
        qHtml: String(question.qHtml || ''),
        o: Array.isArray(question.o) ? question.o.map((option) => String(option || '')) : [],
        oHtml: Array.isArray(question.oHtml) ? question.oHtml.map((option) => String(option || '')) : []
    };

    return clonedQuestion;
}

function getPausedQuestionList(pausedState) {
    return Array.isArray(pausedState?.qList)
        ? pausedState.qList.map(cloneQuizQuestion)
        : [];
}

function isPausedTestStateCurrent(pausedState) {
    if (!pausedState) return true;
    return String(pausedState.questionBankVersion || '') === QUESTION_BANK_CLIENT_VERSION;
}

function clearStalePausedTestState() {
    if (pausedTestState && !isPausedTestStateCurrent(pausedTestState)) {
        setPausedTestState(null);
    }
}

function getPausedTestStorageOwner() {
    return String(currentUser?.uid || auth?.currentUser?.uid || currentUser?.email || auth?.currentUser?.email || '').trim();
}

function getPausedTestStorageKey(ownerId = getPausedTestStorageOwner()) {
    const safeOwner = sanitizeStorageSegment(ownerId || 'guest', 'guest');
    return `${PAUSED_TEST_STORAGE_KEY_PREFIX}:${safeOwner}`;
}

function normalizeStoredPausedTestState(rawValue = null) {
    const wrapper = rawValue && typeof rawValue === 'object' && rawValue.state
        ? rawValue
        : { state: rawValue };
    const state = wrapper.state;
    if (!state || typeof state !== 'object') return null;
    if (!isPausedTestStateCurrent(state)) return null;

    const ownerId = String(state.ownerId || wrapper.ownerId || '').trim();
    const currentOwnerId = getPausedTestStorageOwner();
    if (ownerId && currentOwnerId && ownerId !== currentOwnerId) return null;

    const chapter = String(state.chapter || '').trim();
    const quizAttemptId = String(state.quizAttemptId || state.clientAttemptId || '').trim();
    const qListFromState = getPausedQuestionList(state);
    if (!chapter || !quizAttemptId || qListFromState.length === 0) return null;

    const normalizeAnswer = (value) => {
        if (value === null || typeof value === 'undefined' || value === '') return null;
        const number = Number(value);
        return Number.isInteger(number) && number >= 0 ? number : null;
    };
    const rawAnswers = Array.isArray(state.answers) ? state.answers : [];
    const rawMarked = Array.isArray(state.marked) ? state.marked : [];
    const rawTimedOut = Array.isArray(state.timedOutQuestions) ? state.timedOutQuestions : [];
    const rawIndex = Number(state.index || 0);
    const safeIndex = Math.min(
        Math.max(Number.isFinite(rawIndex) ? Math.floor(rawIndex) : 0, 0),
        Math.max(qListFromState.length - 1, 0)
    );
    const snapshot = state.testStartSnapshot && typeof state.testStartSnapshot === 'object'
        ? state.testStartSnapshot
        : {
            totalPoints: getNumericValue(state.totalPoints, totalPoints),
            testsCompleted: getNumericValue(state.testsCompleted, testsCompleted),
            totalTimeSpent: getNumericValue(state.totalTimeSpent, totalTimeSpent),
            totalCorrectAnswers: getNumericValue(state.totalCorrectAnswers, totalCorrectAnswers),
            totalQuestionsAttempted: getNumericValue(state.totalQuestionsAttempted, totalQuestionsAttempted)
        };

    return {
        ...state,
        ownerId: currentOwnerId || ownerId,
        savedAt: Number(state.savedAt || wrapper.savedAt || Date.now()),
        chapter,
        partNumber: Number(state.partNumber || 1),
        partLabel: String(state.partLabel || ''),
        quizAttemptId,
        quizSeed: String(state.quizSeed || ''),
        questionIds: Array.isArray(state.questionIds)
            ? state.questionIds.map((id) => String(id || '')).filter(Boolean)
            : [],
        qList: qListFromState,
        index: safeIndex,
        answers: Array.from({ length: qListFromState.length }, (_, i) => normalizeAnswer(rawAnswers[i])),
        marked: Array.from({ length: qListFromState.length }, (_, i) => Boolean(rawMarked[i])),
        timedOutQuestions: Array.from({ length: qListFromState.length }, (_, i) => Boolean(rawTimedOut[i])),
        time: Math.max(0, Number(state.time ?? QUIZ_TOTAL_SECONDS)),
        elapsedTimeBeforePauseMs: Math.max(0, Number(state.elapsedTimeBeforePauseMs || 0)),
        currentQuestionElapsedMsBeforePause: Math.max(0, Number(state.currentQuestionElapsedMsBeforePause || 0)),
        cheatLog: cloneCheatLog(state.cheatLog),
        testStartSnapshot: {
            totalPoints: getNumericValue(snapshot.totalPoints),
            testsCompleted: getNumericValue(snapshot.testsCompleted),
            totalTimeSpent: getNumericValue(snapshot.totalTimeSpent),
            totalCorrectAnswers: getNumericValue(snapshot.totalCorrectAnswers),
            totalQuestionsAttempted: getNumericValue(snapshot.totalQuestionsAttempted)
        }
    };
}

function savePausedTestStateToStorage(state) {
    const normalizedState = normalizeStoredPausedTestState(state);
    if (!normalizedState) return;

    try {
        localStorage.setItem(getPausedTestStorageKey(normalizedState.ownerId), JSON.stringify({
            ownerId: normalizedState.ownerId,
            savedAt: normalizedState.savedAt,
            state: normalizedState
        }));
    } catch (error) {
        console.warn('Could not save quiz progress locally:', error);
    }
}

function clearPausedTestStateStorage(ownerId = getPausedTestStorageOwner()) {
    if (!ownerId) return;

    try {
        localStorage.removeItem(getPausedTestStorageKey(ownerId));
    } catch (error) {
        console.warn('Could not clear saved quiz progress:', error);
    }
}

function setPausedTestState(nextState, options = {}) {
    const { persist = true } = options;
    pausedTestState = nextState ? normalizeStoredPausedTestState(nextState) : null;

    if (!persist) return;
    if (pausedTestState) {
        savePausedTestStateToStorage(pausedTestState);
    } else {
        clearPausedTestStateStorage();
    }
}

function restorePausedTestStateFromStorage() {
    const ownerId = getPausedTestStorageOwner();
    if (!ownerId) {
        setPausedTestState(null, { persist: false });
        return null;
    }

    try {
        const raw = localStorage.getItem(getPausedTestStorageKey(ownerId));
        const restoredState = raw ? normalizeStoredPausedTestState(JSON.parse(raw)) : null;
        if (raw && !restoredState) {
            setPausedTestState(null);
            return null;
        }
        if (
            restoredState
            && hasAttemptedQuizPart(restoredState.chapter, restoredState.partNumber)
        ) {
            setPausedTestState(null);
            return null;
        }
        setPausedTestState(restoredState, { persist: Boolean(restoredState) });
        return pausedTestState;
    } catch (error) {
        console.warn('Could not restore saved quiz progress:', error);
        setPausedTestState(null);
        return null;
    }
}

function getPendingOfflineAttemptStorageKey(ownerId = getPausedTestStorageOwner()) {
    const safeOwner = sanitizeStorageSegment(ownerId || 'guest', 'guest');
    return `${PENDING_OFFLINE_ATTEMPT_STORAGE_KEY_PREFIX}:${safeOwner}`;
}

function normalizePendingOfflineAttempt(rawValue = null) {
    const wrapper = rawValue && typeof rawValue === 'object' && rawValue.attempt
        ? rawValue
        : { attempt: rawValue };
    const attempt = wrapper.attempt;
    if (!attempt || typeof attempt !== 'object') return null;

    const ownerId = String(wrapper.ownerId || attempt.userId || '').trim();
    const currentOwnerId = getPausedTestStorageOwner();
    if (ownerId && currentOwnerId && ownerId !== currentOwnerId) return null;

    const clientAttemptId = String(attempt.clientAttemptId || '').trim();
    const quizSeed = String(attempt.quizSeed || '').trim();
    if (!clientAttemptId || !quizSeed) return null;

    return {
        ownerId: currentOwnerId || ownerId,
        savedAt: Number(wrapper.savedAt || Date.now()),
        reason: String(wrapper.reason || OFFLINE_AUTOSUBMIT_REASON),
        attempt: {
            ...attempt,
            clientAttemptId,
            quizSeed
        }
    };
}

function savePendingOfflineAttempt(attempt, reason = OFFLINE_AUTOSUBMIT_REASON) {
    const ownerId = getPausedTestStorageOwner();
    if (!ownerId || !attempt) return;

    try {
        localStorage.setItem(getPendingOfflineAttemptStorageKey(ownerId), JSON.stringify({
            ownerId,
            savedAt: Date.now(),
            reason,
            attempt
        }));
    } catch (error) {
        console.warn('Could not save pending offline quiz submission:', error);
    }
}

function getPendingOfflineAttempt() {
    const ownerId = getPausedTestStorageOwner();
    if (!ownerId) return null;

    try {
        const raw = localStorage.getItem(getPendingOfflineAttemptStorageKey(ownerId));
        return raw ? normalizePendingOfflineAttempt(JSON.parse(raw)) : null;
    } catch (error) {
        console.warn('Could not read pending offline quiz submission:', error);
        return null;
    }
}

function clearPendingOfflineAttemptStorage(ownerId = getPausedTestStorageOwner()) {
    if (!ownerId) return;

    try {
        localStorage.removeItem(getPendingOfflineAttemptStorageKey(ownerId));
    } catch (error) {
        console.warn('Could not clear pending offline quiz submission:', error);
    }
}

function isLikelyOfflineError(error) {
    const message = String(error?.message || error || '').toLowerCase();
    return (typeof navigator !== 'undefined' && navigator.onLine === false)
        || message.includes('failed to fetch')
        || message.includes('network')
        || message.includes('offline')
        || message.includes('internet');
}

function renderPendingOfflineSubmission(attempt = {}, reason = OFFLINE_AUTOSUBMIT_REASON) {
    const scoreDisplay = document.getElementById('score-display');
    const reviewSection = document.getElementById('review-section');
    const attemptedCount = Array.isArray(attempt.answers)
        ? attempt.answers.filter((answer) => Number.isInteger(answer)).length
        : Number(attempt.attemptedCount || 0);
    const total = Number(attempt.total || qList.length || 0);

    if (scoreDisplay) {
        scoreDisplay.innerHTML = `
            <h3>Quiz auto-submitted</h3>
            <p class="auth-status warning">${escapeHtml(reason)}. Your answers so far were locked and saved on this device.</p>
            <div class="score-display">${attemptedCount}/${total}</div>
            <div style="font-size:1rem;color:var(--text-secondary);margin-top:0.75rem;">
                This pending submission will sync automatically when internet is back.
            </div>
        `;
    }

    if (reviewSection) {
        reviewSection.innerHTML = '';
    }
}

function createCurrentAttemptPayload({
    score = 0,
    accuracy = 0,
    points = 0,
    timeSpent = 0,
    systemReason = ''
} = {}) {
    const total = qList.length || 0;
    const attemptedCount = answers.filter((answer) => Number.isInteger(answer)).length;
    const timedOutCount = timedOutQuestions.filter(Boolean).length;
    const finalizedCheatLog = cloneCheatLog(cheatLog, {
        accuracy,
        score,
        total,
        timeSpent
    });

    if (systemReason) {
        finalizedCheatLog.reasons = Array.from(new Set([
            ...(finalizedCheatLog.reasons || []),
            systemReason
        ]));
    }

    return {
        clientAttemptId: currentQuizAttemptId,
        chapter: currentChapter,
        partNumber: currentPartNumber,
        partLabel: currentPartLabel,
        quizSeed: currentQuizSeed,
        questionIds: [...currentQuestionIds],
        difficulty: currentDifficulty,
        score,
        total,
        accuracy,
        attemptedCount,
        incorrectCount: 0,
        timedOutCount,
        unattemptedCount: Math.max(0, total - attemptedCount - timedOutCount),
        points,
        answers: answers.map((answer) => Number.isInteger(answer) ? answer : null),
        timedOutQuestions: timedOutQuestions.map(Boolean),
        markedQuestions: marked.map(Boolean),
        timestamp: Date.now(),
        timeSpent,
        userId: currentUser?.uid || '',
        userName: currentUser?.name || 'Student',
        userAvatar: getDisplayAvatar(currentUser?.avatar),
        cheatLog: finalizedCheatLog
    };
}

function markOfflineAttemptCompletedLocally(reason = OFFLINE_AUTOSUBMIT_REASON) {
    if (!currentQuizAttemptId) return null;

    syncQuizTimeRemaining();
    const elapsedThisRun = startTime ? Math.max(0, Date.now() - startTime) : 0;
    const timeSpent = Math.floor((elapsedTimeBeforePauseMs + elapsedThisRun) / 1000);
    const attempt = createCurrentAttemptPayload({ timeSpent, systemReason: reason });

    savePendingOfflineAttempt(attempt, reason);
    recordAttemptLocally({
        ...attempt,
        localOnly: true,
        pendingSync: true,
        completedOffline: true
    });
    setPausedTestState(null);
    generateChapterList();
    return attempt;
}

async function retryPendingOfflineAttempt() {
    if (pendingOfflineSubmitInProgress || !currentUser || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
        return;
    }

    const pending = getPendingOfflineAttempt();
    if (!pending) return;

    pendingOfflineSubmitInProgress = true;
    try {
        const response = await persistAttemptToCloud(pending.attempt);
        const savedAttempt = normalizeAttemptData(response?.attempt || pending.attempt, currentUser);
        recordAttemptLocally(savedAttempt);
        clearPendingOfflineAttemptStorage(pending.ownerId);
        showPointsNotification('Pending quiz submitted successfully.', 'points-added');
        await loadCloudData().catch((error) => {
            console.warn('Could not refresh cloud data after pending quiz submission:', error);
        });
        updateWallet();
        updateDashboard();
        renderLeaderboard();
        renderCharts();
        renderAdminDashboard();
    } catch (error) {
        console.warn('Pending offline quiz submission is still waiting for sync:', error);
    } finally {
        pendingOfflineSubmitInProgress = false;
    }
}

function saveCurrentTestProgressThrottled(intervalMs = 5000) {
    const now = Date.now();
    if (now - lastProgressAutosaveAt < intervalMs) return;
    saveCurrentTestProgress();
}

function saveActiveTestProgressForReload() {
    if (!currentChapter || !testStartSnapshot) return;
    saveCurrentTestProgress();
}

function markPageExitAndSaveTestProgress() {
    pageExitInProgress = true;
    saveActiveTestProgressForReload();
}

function clearHiddenViolationTimeout() {
    if (hiddenViolationTimeout) {
        clearTimeout(hiddenViolationTimeout);
        hiddenViolationTimeout = null;
    }
}

function handleVisibilityChangeForQuizProgress() {
    saveActiveTestProgressForReload();
    clearHiddenViolationTimeout();

    if (!document.hidden) {
        pageExitInProgress = false;
        return;
    }

    hiddenViolationTimeout = setTimeout(() => {
        hiddenViolationTimeout = null;
        if (!pageExitInProgress && document.hidden) {
            autoSubmitForCheatViolation('tabSwitchCount', 'tab switching');
        }
    }, 800);
}

async function ensureQuestionCatalogLoaded(options = {}) {
    const force = Boolean(options.force);
    if (!force && chapterCatalog.length > 0) return chapterCatalog;
    if (!force && chapterCatalogLoadPromise) return chapterCatalogLoadPromise;

    chapterCatalogLoadPromise = callBackend('/api/quiz/chapters')
        .then((response) => {
            chapterCatalog = Array.isArray(response.chapters) ? response.chapters : [];
            return chapterCatalog;
        })
        .finally(() => {
            chapterCatalogLoadPromise = null;
        });

    return chapterCatalogLoadPromise;
}

async function loadQuizQuestionsFromBackend(chapter, partNumber = 1) {
    const params = new URLSearchParams({
        chapter,
        partNumber: String(partNumber)
    });
    const response = await callBackend(`/api/quiz/questions?${params.toString()}`);
    return {
        ...response,
        attemptId: String(response.attemptId || ''),
        expiresAtMs: Number(response.expiresAtMs || 0),
        quizSeed: String(response.quizSeed || ''),
        questionIds: Array.isArray(response.questionIds)
            ? response.questionIds.map((id) => String(id || '')).filter(Boolean)
            : [],
        questions: Array.isArray(response.questions)
            ? response.questions.map(cloneQuizQuestion)
            : []
    };
}

async function getAppCheckHeaders() {
    if (!appCheck || typeof appCheck.getToken !== 'function') return {};

    try {
        const tokenResult = await appCheck.getToken(false);
        return tokenResult?.token ? { 'X-Firebase-AppCheck': tokenResult.token } : {};
    } catch (error) {
        console.warn('Firebase App Check token could not be read:', error);
        return {};
    }
}

async function callBackend(path, options = {}) {
    if (!isBackendEnabled()) throw new Error('Backend API is not configured.');
    if (!auth?.currentUser) throw new Error('You must be signed in before calling the backend.');

    const token = await auth.currentUser.getIdToken();
    const appCheckHeaders = await getAppCheckHeaders();
    const response = await fetch(`${BACKEND_API_BASE_URL}${path}`, {
        method: options.method || 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            ...appCheckHeaders,
            ...getBackendModeHeaders(),
            'Content-Type': 'application/json',
            ...(options.headers || {})
        },
        body: options.body ? JSON.stringify(options.body) : undefined
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(payload.error || payload.detail || `Backend request failed with ${response.status}`);
    }

    return payload;
}

async function callPublicBackend(path, options = {}) {
    if (!isBackendEnabled()) throw new Error('Backend API is not configured.');

    const appCheckHeaders = await getAppCheckHeaders();
    const response = await fetch(`${BACKEND_API_BASE_URL}${path}`, {
        method: options.method || 'GET',
        headers: {
            ...appCheckHeaders,
            ...getBackendModeHeaders(),
            'Content-Type': 'application/json',
            ...(options.headers || {})
        },
        body: options.body ? JSON.stringify(options.body) : undefined
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(payload.error || payload.detail || `Backend request failed with ${response.status}`);
    }

    return payload;
}

function applyCloudProfile(profile = {}) {
    if (!profile) return;

    totalPoints = getNumericValue(profile.totalPoints, totalPoints);
    if (typeof profile.points !== 'undefined' && typeof profile.totalPoints === 'undefined') {
        totalPoints = getNumericValue(profile.points, totalPoints);
    }
    testsCompleted = getNumericValue(profile.testsCompleted, testsCompleted);
    totalTimeSpent = getNumericValue(profile.totalTimeSpent, totalTimeSpent);
    totalCorrectAnswers = getNumericValue(profile.totalCorrectAnswers, totalCorrectAnswers);
    totalQuestionsAttempted = getNumericValue(profile.totalQuestionsAttempted, totalQuestionsAttempted);

    if (currentUser) {
        currentUser = {
            ...currentUser,
            uid: profile.uid || currentUser.uid,
            name: profile.name || currentUser.name,
            avatar: getDisplayAvatar(profile.avatar || currentUser.avatar),
            email: profile.email || currentUser.email,
            isAdmin: typeof profile.isAdmin === 'boolean' ? profile.isAdmin : currentUser.isAdmin,
            referralCode: normalizeReferralCode(profile.referralCode || currentUser.referralCode),
            referredBy: String(profile.referredBy || currentUser.referredBy || ''),
            totalReferrals: getNumericValue(profile.totalReferrals ?? profile.numberOfReferrals ?? profile.noOfReferrals, currentUser.totalReferrals || 0),
            referralPoints: getNumericValue(profile.referralPoints, currentUser.referralPoints || 0)
        };
    }
}

function sanitizeStorageSegment(value, fallback = 'item') {
    const safeValue = String(value || fallback)
        .trim()
        .replace(/[^a-zA-Z0-9_-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 80);
    return safeValue || fallback;
}

function initApp() {
    createParticles();

    // Start every visit in dark mode.
    const isDark = true;
    document.body.classList.add('dark');
    localStorage.setItem('jee_dark', true);
    const btn = document.getElementById('dark-btn');
    if (btn) btn.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';

    // Restore sound pref
    soundEnabled = localStorage.getItem('jee_sound') !== 'false';
    updateSoundBtn();

    showLoginScreen();
    if (firebaseReady) {
        if (!isBackendEnabled() && !canUseClientFirestoreFallback()) {
            setAuthStatus(getBackendRequiredMessage(), 'error');
        } else {
            setAuthStatus('Create an account, sign in with email, or continue with Google.');
        }
        auth.onAuthStateChanged(handleAuthStateChanged);
        handleGoogleRedirectResult();
    } else {
        setAuthStatus('Add your Firebase project keys in firebase-config.js before signing in.', 'error');
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && document.getElementById('locked-quiz-modal')?.classList.contains('active')) {
            closeLockedQuizModal();
            return;
        }

        if (e.key === 'Escape' && document.getElementById('pending-payment-modal')?.classList.contains('active')) {
            closePendingPaymentModal();
            return;
        }

        if (e.key === 'Escape' && document.getElementById('withdraw-modal')?.style.display !== 'none') {
            closeWithdrawModal();
            return;
        }

        if (e.key === 'Escape' && isHomeSectionTabOpen()) {
            closeHomeSectionTab();
            return;
        }

        if (e.key === 'Escape' && isHomeSidebarOpen()) {
            closeHomeSidebar();
            return;
        }

        if (isScreenshotShortcut(e)) {
            e.preventDefault();
            handleScreenCaptureAttempt('taking a screenshot');
            return;
        }

        if (isPrintShortcut(e)) {
            e.preventDefault();
            handleScreenCaptureAttempt('printing or saving the quiz screen');
            return;
        }

        const quizEl = document.getElementById('quiz');
        if (quizEl && quizEl.style.display !== 'none') {
            if (e.key === 'ArrowRight') nextQ();
            if (e.key === 'ArrowLeft') prevQ();
            if (e.key === 'm' || e.key === 'M') markQuestion();
        }
    });

    window.addEventListener('beforeunload', markPageExitAndSaveTestProgress);
    window.addEventListener('pagehide', markPageExitAndSaveTestProgress);

    document.addEventListener('visibilitychange', handleVisibilityChangeForQuizProgress);

    window.addEventListener('blur', () => {
        incrementCheatMetric('blurCount');
    });

    document.addEventListener('copy', () => {
        autoSubmitForCheatViolation('copyCount', 'copying during the test');
    });

    document.addEventListener('paste', () => {
        autoSubmitForCheatViolation('pasteCount', 'pasting during the test');
    });

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    window.addEventListener('beforeprint', () => {
        handleScreenCaptureAttempt('printing or saving the quiz screen');
    });

    window.addEventListener('offline', handleOfflineDuringQuiz);
    window.addEventListener('online', handleOnlineAfterDisconnect);
}

function setAuthStatus(message, type = '') {
    const statusEl = document.getElementById('auth-status');
    if (!statusEl) return;
    statusEl.textContent = message || '';
    statusEl.className = type ? `auth-status ${type}` : 'auth-status';
}

function scrollToPageTop(behavior = 'smooth') {
    window.scrollTo({
        top: 0,
        left: 0,
        behavior
    });
}

function resetAuthInputs() {
    ['username-input', 'email-input', 'password-input', 'referral-input'].forEach((fieldId) => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.value = '';
            field.style.borderColor = '';
        }
    });
    setReferralStatus('');
}

function resetUserState() {
    clearInterval(timer);
    clearQuestionAdvanceTimeout();
    clearHiddenViolationTimeout();
    pageExitInProgress = false;
    currentUser = null;
    leaderboard = [];
    leaderboardFetchedAt = 0;
    adminUsers = [];
    adminAttempts = [];
    adminWithdrawalRequests = [];
    adminReferrals = [];
    adminPayments = [];
    clearVerifiedPurchasedCourses();
    referralHistory = [];
    adminLoadError = '';
    pendingReferralSuccessMessage = '';
    adminPanelVisible = false;
    isSubmittingWithdrawal = false;
    updatingWithdrawalRequestIds.clear();
    testHistory = [];
    chapterHistory = {};
    totalPoints = 0;
    testsCompleted = 0;
    totalTimeSpent = 0;
    totalCorrectAnswers = 0;
    totalQuestionsAttempted = 0;
    sessionPoints = 0;
    currentChapter = '';
    currentPartNumber = 1;
    currentPartLabel = '';
    currentQuizSeed = '';
    currentQuestionIds = [];
    currentQuizAttemptId = '';
    testStartSnapshot = null;
    setPausedTestState(null, { persist: false });
    elapsedTimeBeforePauseMs = 0;
    cheatLog = null;
    currentQuestionStartedAt = 0;
    questionResumeCarryMs = 0;
    fullscreenWarningGiven = false;
    pendingRuleWarningAction = null;
}

function ensureFirebaseReady() {
    if (firebaseReady) return true;
    setAuthStatus('Firebase is not configured yet. Update firebase-config.js first.', 'error');
    return false;
}

function getAuthFormValues() {
    return {
        name: (document.getElementById('username-input')?.value || '').trim(),
        email: (document.getElementById('email-input')?.value || '').trim(),
        password: document.getElementById('password-input')?.value || '',
        referralCode: normalizeReferralCode(document.getElementById('referral-input')?.value || '')
    };
}

function getReferralCodeFromUrl() {
    try {
        const params = new URLSearchParams(window.location.search);
        return normalizeReferralCode(params.get('ref'));
    } catch (error) {
        return '';
    }
}

function setReferralStatus(message = '', type = '') {
    const statusEl = document.getElementById('referral-status');
    if (!statusEl) return;
    statusEl.textContent = message || '';
    statusEl.className = type ? `referral-status ${type}` : 'referral-status';
}

function handleReferralInputChange() {
    const input = document.getElementById('referral-input');
    if (!input) return;
    input.value = normalizeReferralCode(input.value);
    setReferralStatus(input.value ? 'Referral code will be checked before signup.' : '');
}

function hydrateReferralCodeFromUrl() {
    const input = document.getElementById('referral-input');
    if (!input || input.value) return;

    const referralCode = getReferralCodeFromUrl();
    if (referralCode) {
        input.value = referralCode;
        setReferralStatus('Referral code detected from your invite link.');
    }
}

function getReferralClientInfo() {
    const screenValue = window.screen
        ? `${window.screen.width || 0}x${window.screen.height || 0}`
        : '';
    return {
        userAgent: navigator.userAgent || '',
        language: navigator.language || '',
        platform: navigator.platform || '',
        screen: screenValue,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || ''
    };
}

async function validateReferralCodeForSignup(referralCode) {
    const code = normalizeReferralCode(referralCode);
    if (!code) {
        setReferralStatus('');
        return '';
    }

    setReferralStatus('Checking referral code...', '');

    try {
        const response = await callPublicBackend(`/api/referrals/validate?code=${encodeURIComponent(code)}`);
        const validCode = normalizeReferralCode(response.referralCode || code);
        setReferralStatus('Referral code applied successfully.', 'success');
        return validCode;
    } catch (error) {
        setReferralStatus(error.message || 'Invalid referral code.', 'error');
        throw error;
    }
}

function normalizeAuthProfileSeed(seed = {}) {
    return {
        name: String(seed.name || '').trim().slice(0, 20),
        avatar: getDisplayAvatar(seed.avatar || selectedAvatar || DISPLAY_AVATARS[0]),
        referralCode: normalizeReferralCode(seed.referralCode),
        clientInfo: seed.clientInfo && typeof seed.clientInfo === 'object' ? seed.clientInfo : getReferralClientInfo()
    };
}

function getStoredAuthProfileSeed() {
    try {
        const rawSeed = sessionStorage.getItem(AUTH_PROFILE_SEED_STORAGE_KEY);
        return rawSeed ? normalizeAuthProfileSeed(JSON.parse(rawSeed)) : null;
    } catch (error) {
        return null;
    }
}

function setPendingAuthProfileSeed(seed, persist = false) {
    const normalizedSeed = normalizeAuthProfileSeed(seed);
    pendingProfileSeed = normalizedSeed;

    try {
        if (persist) {
            sessionStorage.setItem(AUTH_PROFILE_SEED_STORAGE_KEY, JSON.stringify(normalizedSeed));
        }
    } catch (error) {
        console.warn('Could not store pending auth profile seed:', error);
    }
}

function clearPendingAuthProfileSeed() {
    pendingProfileSeed = null;
    try {
        sessionStorage.removeItem(AUTH_PROFILE_SEED_STORAGE_KEY);
    } catch (error) {
        console.warn('Could not clear pending auth profile seed:', error);
    }
}

function highlightField(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    field.style.borderColor = 'var(--danger)';
    field.focus();
}

function getDefaultDisplayName(authUser, preferredName) {
    const emailName = authUser && authUser.email ? authUser.email.split('@')[0] : 'Student';
    return preferredName || authUser.displayName || emailName || 'Student';
}

function isPasswordProviderUser(authUser) {
    return Boolean(
        authUser
        && Array.isArray(authUser.providerData)
        && authUser.providerData.some((provider) => provider?.providerId === 'password')
    );
}

function formatFirebaseError(error) {
    const rawMessage = String(error?.message || error || '').trim();
    const lowerMessage = rawMessage.toLowerCase();

    if (lowerMessage.includes('failed to fetch') || lowerMessage.includes('networkerror')) {
        return isBackendEnabled()
            ? `Sign-in worked, but the backend API could not be reached at ${BACKEND_API_BASE_URL}. Start the backend server or set a public backend URL in firebase-config.js.`
            : 'Sign-in worked, but the app backend is not configured.';
    }

    const messages = {
        'auth/email-already-in-use': 'That email is already registered. Try signing in instead.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/invalid-credential': 'Your email or password is incorrect.',
        'auth/missing-password': 'Please enter your password.',
        'auth/operation-not-allowed': 'This sign-in method is not enabled in Firebase yet.',
        'auth/account-exists-with-different-credential': 'This email already uses another sign-in method.',
        'auth/cancelled-popup-request': 'Another Google sign-in window was already open. Please try again.',
        'auth/operation-not-supported-in-this-environment': 'Google sign-in needs this page to be opened from a web address, not directly as a file.',
        'auth/popup-blocked': 'Your browser blocked the Google sign-in popup. Please allow popups or try again.',
        'auth/popup-closed-by-user': 'Google sign-in was closed before finishing.',
        'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
        'auth/unauthorized-domain': 'This domain is not allowed in Firebase Authentication yet.',
        'auth/user-disabled': 'This account has been disabled in Firebase.',
        'auth/user-not-found': 'No account found for this email. Create an account first.',
        'auth/weak-password': 'Password should be at least 6 characters long.',
        'auth/wrong-password': 'Your email or password is incorrect.'
    };

    return messages[error.code] || rawMessage || 'Something went wrong. Please try again.';
}

function isAdminEmail(email) {
    return ADMIN_EMAILS.includes(String(email || '').trim().toLowerCase());
}

function createEmptyCheatLog() {
    return {
        tabSwitchCount: 0,
        blurCount: 0,
        copyCount: 0,
        pasteCount: 0,
        screenshotAttemptCount: 0,
        fullscreenExitCount: 0,
        resumeCount: 0,
        questionTimes: [],
        rapidAnswerCount: 0,
        avgSecondsPerQuestion: 0,
        suspicionScore: 0,
        flagged: false,
        autoSubmitted: false,
        autoSubmitReason: '',
        reasons: []
    };
}

function normalizeQuestionTimes(questionTimes = []) {
    if (!Array.isArray(questionTimes)) return [];

    return questionTimes.map((entry, index) => {
        if (typeof entry === 'number') {
            return {
                questionNumber: index + 1,
                secondsTaken: Number(entry.toFixed ? entry.toFixed(1) : entry),
                answered: true,
                correct: null
            };
        }

        return {
            questionNumber: Number(entry.questionNumber || index + 1),
            secondsTaken: Number(entry.secondsTaken || 0),
            answered: entry.answered !== false,
            correct: typeof entry.correct === 'boolean' ? entry.correct : null
        };
    }).filter((entry) => Number.isFinite(entry.secondsTaken));
}

function normalizeCheatLog(rawCheatLog = null, context = {}) {
    const next = {
        ...createEmptyCheatLog(),
        ...(rawCheatLog || {})
    };

    next.tabSwitchCount = Number(next.tabSwitchCount || 0);
    next.blurCount = Number(next.blurCount || 0);
    next.copyCount = Number(next.copyCount || 0);
    next.pasteCount = Number(next.pasteCount || 0);
    next.screenshotAttemptCount = Number(next.screenshotAttemptCount || 0);
    next.fullscreenExitCount = Number(next.fullscreenExitCount || 0);
    next.resumeCount = Number(next.resumeCount || 0);
    next.rapidAnswerCount = Number(next.rapidAnswerCount || 0);
    next.questionTimes = normalizeQuestionTimes(next.questionTimes);
    next.autoSubmitted = Boolean(next.autoSubmitted);
    next.autoSubmitReason = String(next.autoSubmitReason || '').trim();

    const totalQuestionSeconds = next.questionTimes.reduce((sum, entry) => sum + Number(entry.secondsTaken || 0), 0);
    next.avgSecondsPerQuestion = next.questionTimes.length
        ? Number((totalQuestionSeconds / next.questionTimes.length).toFixed(1))
        : 0;

    const reasons = [];
    if (next.autoSubmitted) {
        reasons.push(next.autoSubmitReason
            ? `auto-submitted for ${next.autoSubmitReason}`
            : 'test auto-submitted for a rule violation');
    }
    if (next.tabSwitchCount > 0) reasons.push(`${next.tabSwitchCount} tab switch${next.tabSwitchCount === 1 ? '' : 'es'}`);
    if (next.copyCount > 0) reasons.push(`${next.copyCount} copy event${next.copyCount === 1 ? '' : 's'}`);
    if (next.pasteCount > 0) reasons.push(`${next.pasteCount} paste event${next.pasteCount === 1 ? '' : 's'}`);
    if (next.screenshotAttemptCount > 0) reasons.push(`${next.screenshotAttemptCount} screen capture attempt${next.screenshotAttemptCount === 1 ? '' : 's'}`);
    if (next.fullscreenExitCount > 0) reasons.push(`${next.fullscreenExitCount} fullscreen exit${next.fullscreenExitCount === 1 ? '' : 's'}`);
    if (next.resumeCount > 0) reasons.push(`${next.resumeCount} resumed session${next.resumeCount === 1 ? '' : 's'}`);
    if (next.rapidAnswerCount > 0) reasons.push(`${next.rapidAnswerCount} rapid answer${next.rapidAnswerCount === 1 ? '' : 's'}`);

    let suspicionScore =
        next.tabSwitchCount * 2 +
        next.blurCount +
        next.copyCount * 2 +
        next.pasteCount * 5 +
        next.screenshotAttemptCount * 8 +
        next.fullscreenExitCount * 8 +
        next.resumeCount * 2 +
        next.rapidAnswerCount * 2;

    const accuracy = Number(context.accuracy || 0);
    const fastHighScore = accuracy >= 90
        && next.avgSecondsPerQuestion > 0
        && next.avgSecondsPerQuestion <= RAPID_ANSWER_SECONDS_THRESHOLD + 1;

    if (fastHighScore) {
        suspicionScore += 4;
        reasons.push('very high score with unusually low answer time');
    }

    next.suspicionScore = suspicionScore;
    next.flagged = next.autoSubmitted || suspicionScore >= SUSPICION_SCORE_THRESHOLD;
    next.reasons = reasons;
    return next;
}

function cloneCheatLog(rawCheatLog = null, context = {}) {
    const normalized = normalizeCheatLog(rawCheatLog, context);
    return {
        ...normalized,
        questionTimes: normalized.questionTimes.map((entry) => ({ ...entry })),
        reasons: [...normalized.reasons]
    };
}

function normalizeAttemptData(rawAttempt = {}, userMeta = {}) {
    const attempt = {
        ...rawAttempt,
        chapter: String(rawAttempt.chapter || 'Untitled Chapter'),
        difficulty: rawAttempt.difficulty || 'all',
        score: Number(rawAttempt.score || 0),
        total: Number(rawAttempt.total || 0),
        partNumber: Number(rawAttempt.partNumber || 1),
        accuracy: Number(rawAttempt.accuracy || 0),
        points: Number(rawAttempt.points || 0),
        timestamp: Number(rawAttempt.timestamp || Date.now()),
        timeSpent: Number(rawAttempt.timeSpent || 0),
        userId: rawAttempt.userId || userMeta.uid || '',
        userName: rawAttempt.userName || userMeta.name || 'Student',
        userAvatar: getDisplayAvatar(rawAttempt.userAvatar || userMeta.avatar || DISPLAY_AVATARS[0])
    };

    attempt.cheatLog = normalizeCheatLog(rawAttempt.cheatLog, attempt);
    return attempt;
}

function isQuizSessionActive() {
    const quizEl = document.getElementById('quiz');
    return Boolean(quizEl && quizEl.style.display !== 'none' && currentChapter && cheatLog);
}

function isScreenshotShortcut(e) {
    const key = String(e.key || '').toLowerCase();
    const code = String(e.code || '').toLowerCase();

    return key === 'printscreen'
        || code === 'printscreen'
        || (e.metaKey && e.shiftKey && ['3', '4', '5', 's'].includes(key));
}

function isPrintShortcut(e) {
    return (e.ctrlKey || e.metaKey) && String(e.key || '').toLowerCase() === 'p';
}

function handleScreenCaptureAttempt(reason) {
    if (!isQuizSessionActive() || isSubmittingTest) return;
    autoSubmitForCheatViolation('screenshotAttemptCount', reason);
}

function handleOfflineDuringQuiz() {
    if (!isQuizSessionActive() || isSubmittingTest || offlineAutoSubmitInProgress) return;

    offlineAutoSubmitInProgress = true;
    if (!cheatLog) cheatLog = createEmptyCheatLog();
    markOfflineAttemptCompletedLocally(OFFLINE_AUTOSUBMIT_REASON);
    showPointsNotification('Internet disconnected. Auto-submitting current answers.', 'points-lost');
    submitTest({
        silent: true,
        systemReason: OFFLINE_AUTOSUBMIT_REASON,
        queueOnFailure: true
    }).finally(() => {
        offlineAutoSubmitInProgress = false;
    });
}

function handleOnlineAfterDisconnect() {
    offlineAutoSubmitInProgress = false;
    retryPendingOfflineAttempt();
}

// ============================================================
// ===== RULE VIOLATION MODAL =====
// ============================================================
function showViolationModal(message, action = 'WARNING', onAcknowledge = null) {
    const modal = document.getElementById('rule-warning-modal');
    const title = document.getElementById('rule-warning-title');
    const text = document.getElementById('rule-warning-message');
    pendingRuleWarningAction = typeof onAcknowledge === 'function' ? onAcknowledge : null;
    if (!modal || !title || !text) {
        alert(message);
        const action = pendingRuleWarningAction;
        pendingRuleWarningAction = null;
        if (action) action();
        return;
    }

    title.textContent = action === 'AUTO_SUBMIT' ? 'Test Auto-submitted' : 'Rule Violation';
    text.textContent = message;
    modal.style.display = 'flex';
}

function closeRuleWarningModal() {
    const modal = document.getElementById('rule-warning-modal');
    if (modal) modal.style.display = 'none';
    const action = pendingRuleWarningAction;
    pendingRuleWarningAction = null;
    if (action) action();
}

function getPreQuizRecordingInstructionText() {
    return [
        'Recording and Exam Integrity',
        '',
        'This quiz is recorded through your camera and microphone to help prevent cheating.',
        '',
        '- Sit upright in a well-lit place before you begin.',
        '- Your face, shoulders, upper body, and both hands must remain clearly visible in the camera frame.',
        '- Keep only your solving paper or notebook and required writing tools with you.',
        '- Anything in your hand other than solving paper, notebook, or writing tools may be treated as cheating.',
        '- Books, phones, hidden devices, extra notes, another person, or repeated suspicious movement may also be treated as cheating.',
        '- If cheating is suspected, the wallet rewards from this quiz may be marked invalid.',
        '',
        'Continue only if you understand and agree to follow these rules.'
    ].join('\n');
}

function showPreQuizRecordingInstructions() {
    const modal = document.getElementById('pre-quiz-recording-modal');
    if (!modal) return Promise.resolve(confirm(getPreQuizRecordingInstructionText()));

    if (pendingPreQuizInstructionAction) {
        pendingPreQuizInstructionAction(false);
        pendingPreQuizInstructionAction = null;
    }

    modal.style.display = 'flex';

    return new Promise((resolve) => {
        pendingPreQuizInstructionAction = resolve;
        setTimeout(() => {
            document.getElementById('pre-quiz-recording-start-btn')?.focus();
        }, 0);
    });
}

function closePreQuizRecordingInstructions(accepted = false) {
    const modal = document.getElementById('pre-quiz-recording-modal');
    if (modal) modal.style.display = 'none';

    const action = pendingPreQuizInstructionAction;
    pendingPreQuizInstructionAction = null;
    if (action) action(Boolean(accepted));
}

function getQuizScoringPopupText() {
    return `Scoring rule: +${POINTS_PER_QUESTION} wallet points for every correct answer and -${INCORRECT_POINTS_PENALTY} wallet points for every incorrect answer.`;
}

function showQuizScoringPopup() {
    const modal = document.getElementById('quiz-scoring-modal');
    if (!modal) {
        alert(getQuizScoringPopupText());
        return Promise.resolve();
    }

    if (pendingQuizScoringAction) {
        pendingQuizScoringAction();
        pendingQuizScoringAction = null;
    }

    const correctPoints = document.getElementById('quiz-scoring-correct-points');
    const incorrectPoints = document.getElementById('quiz-scoring-incorrect-points');
    if (correctPoints) correctPoints.textContent = `+${POINTS_PER_QUESTION}`;
    if (incorrectPoints) incorrectPoints.textContent = `-${INCORRECT_POINTS_PENALTY}`;

    modal.style.display = 'flex';

    return new Promise((resolve) => {
        pendingQuizScoringAction = resolve;
        setTimeout(() => {
            document.getElementById('quiz-scoring-start-btn')?.focus();
        }, 0);
    });
}

function closeQuizScoringPopup() {
    const modal = document.getElementById('quiz-scoring-modal');
    if (modal) modal.style.display = 'none';

    const action = pendingQuizScoringAction;
    pendingQuizScoringAction = null;
    if (action) action();
}

function autoSubmitTest(reason = AUTO_SUBMIT_MESSAGE) {
    if (!isQuizSessionActive() || isSubmittingTest) return;

    if (!cheatLog) cheatLog = createEmptyCheatLog();
    cheatLog.autoSubmitted = true;
    cheatLog.autoSubmitReason = reason;

    sessionPoints = 0;
    updateWallet();
    updateDashboard();
    showViolationModal(reason, 'AUTO_SUBMIT');
    showPointsNotification(reason, 'points-lost');
    submitTest({ silent: true, violationReason: reason });
}

function getFullscreenElement() {
    return document.fullscreenElement
        || document.webkitFullscreenElement
        || document.msFullscreenElement
        || null;
}

function isFullscreenActive() {
    return Boolean(getFullscreenElement());
}

function requestFullscreenMode() {
    const target = document.documentElement;
    if (target.requestFullscreen) return target.requestFullscreen();
    if (target.webkitRequestFullscreen) return target.webkitRequestFullscreen();
    if (target.msRequestFullscreen) return target.msRequestFullscreen();
    return Promise.reject(new Error('Fullscreen mode is not supported by this browser.'));
}

async function requireFullscreenBeforeQuiz() {
    if (isFullscreenActive()) return true;

    const agreed = confirm('Fullscreen mode is required while attempting the test. Enter fullscreen now?');
    if (!agreed) return false;

    try {
        await requestFullscreenMode();
        return isFullscreenActive();
    } catch (error) {
        console.error('Fullscreen request failed:', error);
        alert('Fullscreen mode is required before starting the test. Please allow fullscreen and try again.');
        return false;
    }
}

function handleFullscreenChange() {
    if (!isQuizSessionActive() || isSubmittingTest) return;
    if (isFullscreenActive()) return;

    incrementCheatMetric('fullscreenExitCount');

    if (!fullscreenWarningGiven) {
        fullscreenWarningGiven = true;
        showViolationModal(
            'Warning: Fullscreen mode was turned off. Please stay in fullscreen during the test. If fullscreen is turned off again, the test will be submitted automatically.',
            'WARNING',
            () => {
                requestFullscreenMode().catch((error) => {
                    console.error('Fullscreen request failed after warning:', error);
                    showPointsNotification('Please return to fullscreen to continue the test.', 'points-lost');
                });
            }
        );
        return;
    }

    autoSubmitTest('Test submitted automatically because fullscreen mode was turned off again.');
}

function incrementCheatMetric(metricName) {
    if (!isQuizSessionActive() || isSubmittingTest) return;
    if (typeof cheatLog[metricName] !== 'number') cheatLog[metricName] = 0;
    cheatLog[metricName]++;
}

function autoSubmitForCheatViolation(metricName, reason) {
    if (!isQuizSessionActive() || isSubmittingTest) return;

    incrementCheatMetric(metricName);
    cheatLog.autoSubmitted = true;
    cheatLog.autoSubmitReason = reason;
    sessionPoints = 0;
    updateWallet();
    updateDashboard();
    showPointsNotification('Rule violation detected. Test auto-submitted. This quiz reward is cancelled.', 'points-lost');
    submitTest({ silent: true, violationReason: reason });
}

function setTextContent(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value || '';
}

function updateRecordingUi({ status = '', progress = '', warning = '' } = {}) {
    if (status) {
        setTextContent('recording-status', status);
        setTextContent('recording-result-status', status);
    }
    if (progress) {
        setTextContent('upload-progress', progress);
        setTextContent('recording-result-progress', progress);
    }
    setTextContent('camera-warning', warning);
    setTextContent('camera-start-warning', warning);
    setTextContent('recording-result-warning', warning);
}

function getCameraErrorMessage(error) {
    const name = String(error?.name || '');
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        return 'Camera and microphone permission is required to start the quiz.';
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        return 'Camera or microphone was not found. Connect a device and try again.';
    }
    if (name === 'NotReadableError' || name === 'TrackStartError') {
        return 'Camera or microphone is already in use by another app.';
    }
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        return 'Camera recording requires HTTPS or localhost.';
    }
    return error?.message || 'Camera recording could not be started.';
}

function getFirebaseStorageErrorMessage(error) {
    const code = String(error?.code || '').trim();
    const message = String(error?.message || error || '').trim();

    if (code === 'storage/unauthorized') {
        return 'Firebase Storage denied the upload. Deploy storage.rules and make sure the user is signed in or guest uploads are allowed.';
    }
    if (code === 'storage/bucket-not-found') {
        return 'Firebase Storage bucket was not found. Check storageBucket in firebase-config.js.';
    }
    if (code === 'storage/quota-exceeded') {
        return 'Firebase Storage quota was exceeded.';
    }
    if (code === 'storage/retry-limit-exceeded') {
        return 'Firebase Storage upload timed out. Check your network and try again.';
    }
    if (code === 'storage/canceled') {
        return 'Firebase Storage upload was canceled.';
    }
    if (/config is missing/i.test(message)) {
        return message;
    }
    if (/storage sdk is not loaded|service is not available|service storage is not available/i.test(message)) {
        return 'Firebase Storage is not available in this page. Hard refresh once and make sure firebase-storage-compat.js loads before script.js.';
    }

    return [code, message].filter(Boolean).join(': ') || 'Firebase Storage upload failed.';
}

async function verifyMicrophoneSignal(stream, durationMs = 1400) {
    const audioTracks = stream?.getAudioTracks ? stream.getAudioTracks() : [];
    if (!audioTracks.length) {
        return {
            ok: false,
            message: 'Microphone was not found. Connect or enable a microphone, then start the quiz again.'
        };
    }

    audioTracks.forEach((track) => {
        track.enabled = true;
    });

    const blockedTrack = audioTracks.find((track) => track.readyState !== 'live' || track.muted);
    if (blockedTrack) {
        return {
            ok: false,
            message: 'Microphone is muted or inactive. Allow microphone access and unmute your input device.'
        };
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
        return { ok: true, message: '' };
    }

    let audioContext = null;
    let source = null;
    try {
        audioContext = new AudioContextClass();
        if (audioContext.state === 'suspended' && typeof audioContext.resume === 'function') {
            await audioContext.resume();
        }

        const audioOnlyStream = new MediaStream(audioTracks);
        source = audioContext.createMediaStreamSource(audioOnlyStream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);

        const data = new Uint8Array(analyser.fftSize);
        let peak = 0;
        let total = 0;
        let samples = 0;
        const startedAt = Date.now();

        while (Date.now() - startedAt < durationMs) {
            analyser.getByteTimeDomainData(data);
            for (let i = 0; i < data.length; i += 1) {
                const level = Math.abs(data[i] - 128) / 128;
                peak = Math.max(peak, level);
                total += level;
                samples += 1;
            }
            await new Promise((resolve) => setTimeout(resolve, 100));
        }

        const average = samples ? total / samples : 0;
        if (peak > 0.008 || average > 0.0008) {
            return { ok: true, peak, average, message: '' };
        }

        return {
            ok: false,
            peak,
            average,
            message: 'Microphone permission was granted, but no sound was detected. Unmute your mic, select the correct input device, speak once, and try again.'
        };
    } catch (error) {
        console.warn('Microphone signal check failed:', error);
        return { ok: true, message: '' };
    } finally {
        if (source && typeof source.disconnect === 'function') source.disconnect();
        if (audioContext && typeof audioContext.close === 'function') {
            audioContext.close().catch(() => {});
        }
    }
}

function getRecordingFirestore() {
    if (!db) {
        throw new Error('Firestore is not available. Check Firebase initialization.');
    }
    return db;
}

function getCompatRecordingStorage() {
    if (!firebaseApp || typeof firebaseApp.storage !== 'function') {
        throw new Error('Firebase Storage is not available in this page.');
    }
    return firebaseApp.storage();
}

function getRecordingChunkContentType(blob) {
    const blobType = String(blob?.type || '').trim();
    return blobType && /^video\/webm/i.test(blobType)
        ? blobType
        : 'video/webm;codecs=vp8,opus';
}

function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = String(reader.result || '');
            resolve(result.includes(',') ? result.split(',').pop() : result);
        };
        reader.onerror = () => reject(reader.error || new Error('Recording chunk could not be read.'));
        reader.readAsDataURL(blob);
    });
}

function getRecordingDocRef(attemptId = currentRecordingAttemptId) {
    return getRecordingFirestore().collection('recordings').doc(String(attemptId));
}

function getRecordingChunkDocRef(attemptId, index) {
    return getRecordingDocRef(attemptId)
        .collection('chunks')
        .doc(`chunk_${String(index).padStart(4, '0')}`);
}

function getRecordingPathParts() {
    const studentId = sanitizeStorageSegment(
        currentUser?.uid || `guest_${Date.now()}`,
        `guest_${Date.now()}`
    );
    const quizId = sanitizeStorageSegment(
        [currentChapter, currentPartNumber].filter(Boolean).join('_'),
        'quiz'
    );
    const attemptId = sanitizeStorageSegment(currentRecordingAttemptId || Date.now(), String(Date.now()));
    return {
        studentId,
        quizId,
        attemptId,
        basePath: `quiz-recordings/${studentId}/${quizId}/${attemptId}`
    };
}

async function createRecordingMetadataDocument() {
    const { studentId, quizId, attemptId, basePath } = getRecordingPathParts();
    recordingStudentId = studentId;
    recordingQuizId = quizId;
    recordingBasePath = basePath;

    await getRecordingDocRef(attemptId).set({
        studentId,
        quizId,
        attemptId,
        chapter: currentChapter || '',
        partNumber: Number(currentPartNumber || 0),
        partLabel: currentPartLabel || '',
        userName: currentUser?.name || 'Student',
        userAvatar: getDisplayAvatar(currentUser?.avatar),
        status: 'recording',
        startedAt: firebase.firestore.FieldValue.serverTimestamp(),
        endedAt: null,
        chunkCount: 0,
        failedChunkCount: 0,
        finalVideoUrl: null,
        finalVideoPath: null,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
}

function uploadTaskToPromise(uploadTask, onProgress) {
    return new Promise((resolve, reject) => {
        uploadTask.on(
            'state_changed',
            (snapshot) => {
                if (!onProgress) return;
                const percent = snapshot.totalBytes
                    ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
                    : 0;
                onProgress(percent);
            },
            reject,
            () => resolve(uploadTask.snapshot)
        );
    });
}

async function markRecordingChunkUploaded({
    attemptId,
    index,
    path,
    downloadURL = '',
    size = 0,
    contentType = 'video/webm;codecs=vp8,opus',
    uploadedVia = 'client'
}) {
    recordingUploadedChunkCount = Math.max(recordingUploadedChunkCount, index);
    recordingLastUploadError = '';

    try {
        await getRecordingChunkDocRef(attemptId, index).set({
            index,
            path,
            downloadURL,
            size,
            contentType,
            status: 'uploaded',
            uploadedVia,
            uploadedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    } catch (error) {
        console.warn(`Recording chunk ${index} uploaded to Storage but Firestore metadata could not be saved:`, error);
    }

    try {
        await getRecordingDocRef(attemptId).set({
            chunkCount: recordingUploadedChunkCount,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    } catch (error) {
        console.warn('Recording chunk count could not be updated in Firestore:', error);
    }

    updateRecordingUi({
        status: 'Recording in progress',
        progress: `Uploaded ${recordingUploadedChunkCount} chunk${recordingUploadedChunkCount === 1 ? '' : 's'}`
    });

    return { index, path, downloadURL };
}

async function uploadRecordingChunkOnce(blob, index) {
    const attemptId = sanitizeStorageSegment(currentRecordingAttemptId || Date.now(), String(Date.now()));
    const path = `${recordingBasePath}/chunks/chunk_${String(index).padStart(4, '0')}.webm`;
    const contentType = getRecordingChunkContentType(blob);
    const storageRef = getCompatRecordingStorage().ref(path);
    const snapshot = await uploadTaskToPromise(
        storageRef.put(blob, {
            contentType,
            customMetadata: {
                studentId: recordingStudentId,
                quizId: recordingQuizId,
                attemptId,
                chunkIndex: String(index)
            }
        }),
        (percent) => {
            updateRecordingUi({
                status: 'Recording in progress',
                progress: `Uploading chunk ${index}: ${percent}%`
            });
        }
    );
    let downloadURL = '';
    try {
        downloadURL = await snapshot.ref.getDownloadURL();
    } catch (error) {
        console.warn(`Recording chunk ${index} uploaded but download URL could not be created:`, error);
    }

    return markRecordingChunkUploaded({
        attemptId,
        index,
        path,
        downloadURL,
        size: blob.size,
        contentType,
        uploadedVia: 'client_blob'
    });
}

async function uploadRecordingChunkStringOnce(blob, index) {
    const attemptId = sanitizeStorageSegment(currentRecordingAttemptId || Date.now(), String(Date.now()));
    const path = `${recordingBasePath}/chunks/chunk_${String(index).padStart(4, '0')}.webm`;
    const contentType = getRecordingChunkContentType(blob);
    const dataBase64 = await blobToBase64(blob);
    const storageRef = getCompatRecordingStorage().ref(path);
    const snapshot = await uploadTaskToPromise(
        storageRef.putString(dataBase64, 'base64', {
            contentType,
            customMetadata: {
                studentId: recordingStudentId,
                quizId: recordingQuizId,
                attemptId,
                chunkIndex: String(index),
                uploadedVia: 'client_base64'
            }
        }),
        (percent) => {
            updateRecordingUi({
                status: 'Recording in progress',
                progress: `Retrying chunk ${index}: ${percent}%`
            });
        }
    );
    let downloadURL = '';
    try {
        downloadURL = await snapshot.ref.getDownloadURL();
    } catch (error) {
        console.warn(`Recording chunk ${index} base64 upload succeeded but download URL could not be created:`, error);
    }

    return markRecordingChunkUploaded({
        attemptId,
        index,
        path,
        downloadURL,
        size: blob.size,
        contentType,
        uploadedVia: 'client_base64'
    });
}

async function uploadRecordingChunkViaBackend(blob, index) {
    if (!isBackendEnabled()) {
        throw new Error('Backend API is not configured for recording upload fallback.');
    }

    const attemptId = sanitizeStorageSegment(currentRecordingAttemptId || Date.now(), String(Date.now()));
    const contentType = getRecordingChunkContentType(blob);
    const dataBase64 = await blobToBase64(blob);
    updateRecordingUi({
        status: 'Recording in progress',
        progress: `Uploading chunk ${index} through backend`
    });

    const response = await callBackend('/api/recordings/chunks', {
        method: 'POST',
        body: {
            attemptId,
            quizId: recordingQuizId || 'quiz',
            index,
            contentType,
            dataBase64
        }
    });

    const chunk = response?.chunk || {};
    return markRecordingChunkUploaded({
        attemptId,
        index,
        path: chunk.path || `${recordingBasePath}/chunks/chunk_${String(index).padStart(4, '0')}.webm`,
        downloadURL: '',
        size: Number(chunk.size || blob.size || 0),
        contentType: chunk.contentType || contentType,
        uploadedVia: chunk.localOnly ? 'local_backend' : 'backend'
    });
}

async function uploadRecordingChunkWithRetry(blob, index) {
    let lastError = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            return await uploadRecordingChunkOnce(blob, index);
        } catch (error) {
            lastError = error;
            console.warn(`Recording chunk ${index} upload attempt ${attempt}/3 failed`, error);
            if (attempt < 3) {
                await new Promise((resolve) => setTimeout(resolve, 750 * attempt));
            }
        }
    }

    try {
        console.warn(`Recording chunk ${index} blob upload failed; trying base64 Storage upload.`, lastError);
        return await uploadRecordingChunkStringOnce(blob, index);
    } catch (base64Error) {
        lastError = base64Error;
        console.warn(`Recording chunk ${index} base64 Storage upload failed`, base64Error);
    }

    try {
        console.warn(`Recording chunk ${index} direct Storage upload failed; trying backend fallback.`, lastError);
        return await uploadRecordingChunkViaBackend(blob, index);
    } catch (fallbackError) {
        lastError = fallbackError;
        console.warn(`Recording chunk ${index} backend fallback failed`, fallbackError);
    }

    recordingFailedChunkCount++;
    recordingLastUploadError = getFirebaseStorageErrorMessage(lastError);
    await getRecordingChunkDocRef(currentRecordingAttemptId, index).set({
        index,
        size: blob?.size || 0,
        status: 'failed',
        failedAt: firebase.firestore.FieldValue.serverTimestamp(),
        error: String(lastError?.message || lastError || 'Upload failed')
    }, { merge: true }).catch((error) => {
        console.warn('Could not save failed recording chunk metadata:', error);
    });
    await getRecordingDocRef().set({
        failedChunkCount: recordingFailedChunkCount,
        lastUploadError: recordingLastUploadError,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).catch((error) => {
        console.warn('Could not update failed recording chunk count:', error);
    });
    console.warn('Recording chunk upload failed after retries', { index, error: lastError });
    updateRecordingUi({
        status: 'Recording in progress',
        warning: `Chunk ${index} upload failed after retries. ${recordingLastUploadError}`
    });
    return null;
}

function queueRecordingChunkUpload(blob) {
    if (!blob || blob.size === 0 || !recordingBasePath) return;
    recordingChunkIndex++;
    const index = recordingChunkIndex;
    const uploadPromise = uploadRecordingChunkWithRetry(blob, index)
        .catch((error) => {
            console.warn('Recording chunk upload queue failed:', error);
        })
        .finally(() => {
            recordingPendingUploads.delete(uploadPromise);
        });
    recordingPendingUploads.add(uploadPromise);
}

async function waitForRecordingChunkUploads() {
    if (!recordingPendingUploads.size) return;
    updateRecordingUi({
        status: 'Finalizing recording upload',
        progress: `Waiting for ${recordingPendingUploads.size} chunk upload${recordingPendingUploads.size === 1 ? '' : 's'}`
    });
    await Promise.allSettled(Array.from(recordingPendingUploads));
}

async function initCamera() {
    updateRecordingUi({
        status: 'Requesting camera and microphone permission',
        progress: 'Upload pending',
        warning: ''
    });

    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
        const message = 'This browser does not support camera and microphone access.';
        updateRecordingUi({ status: 'Camera unavailable', warning: message });
        alert(message);
        return false;
    }

    if (typeof MediaRecorder === 'undefined') {
        const message = 'MediaRecorder is not supported in this browser. Use modern Chrome or Edge.';
        updateRecordingUi({ status: 'Recording unavailable', warning: message });
        alert(message);
        return false;
    }

    try {
        await stopRecording();
        stopCamera();
        lastRecordingDownloadUrl = '';
        quizMediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                frameRate: { ideal: 15, max: 15 }
            },
            audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: true,
                channelCount: 1,
                sampleRate: 48000
            }
        });

        const preview = document.getElementById('webcam-preview');
        if (preview) {
            preview.srcObject = quizMediaStream;
            preview.muted = true;
            await preview.play().catch(() => {});
        }

        updateRecordingUi({
            status: 'Checking microphone',
            progress: 'Speak once near your microphone',
            warning: ''
        });
        const microphoneCheck = await verifyMicrophoneSignal(quizMediaStream);
        if (!microphoneCheck.ok) {
            updateRecordingUi({
                status: 'Microphone not recording',
                progress: 'Upload pending',
                warning: microphoneCheck.message
            });
            alert(microphoneCheck.message);
            stopCamera();
            return false;
        }

        updateRecordingUi({
            status: 'Camera and microphone ready',
            progress: 'Upload pending',
            warning: ''
        });
        return true;
    } catch (error) {
        const message = getCameraErrorMessage(error);
        console.error('Camera permission failed:', error);
        updateRecordingUi({ status: 'Camera unavailable', warning: message });
        stopCamera();
        alert(message);
        return false;
    }
}

function getSupportedRecordingMimeType() {
    if (typeof MediaRecorder === 'undefined') return '';
    const preferredTypes = [
        'video/webm;codecs=vp8,opus',
        'video/webm'
    ];
    return preferredTypes.find((type) => MediaRecorder.isTypeSupported(type)) || '';
}

async function startRecording() {
    if (!quizMediaStream) {
        updateRecordingUi({ status: 'Camera unavailable', warning: 'Camera stream is missing.' });
        return false;
    }

    if (typeof MediaRecorder === 'undefined') {
        updateRecordingUi({ status: 'Recording unavailable', warning: 'MediaRecorder is not supported.' });
        return false;
    }

    try {
        recordingChunkIndex = 0;
        recordingUploadedChunkCount = 0;
        recordingFailedChunkCount = 0;
        recordingPendingUploads = new Set();
        recordingLastUploadError = '';
        await createRecordingMetadataDocument();
        const mimeType = getSupportedRecordingMimeType();
        mediaRecorder = mimeType
            ? new MediaRecorder(quizMediaStream, {
                mimeType,
                videoBitsPerSecond: 300000,
                audioBitsPerSecond: 64000
            })
            : new MediaRecorder(quizMediaStream);

        mediaRecorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
                queueRecordingChunkUpload(event.data);
            }
        };
        mediaRecorder.onerror = (event) => {
            console.error('Recording failed:', event.error || event);
            updateRecordingUi({
                status: 'Recording error',
                warning: 'Recording failed. Please submit and try again.'
            });
        };
        mediaRecorder.start(5000);
        updateRecordingUi({
            status: 'Recording in progress',
            progress: 'Upload pending',
            warning: ''
        });
        return true;
    } catch (error) {
        console.error('MediaRecorder could not start:', error);
        updateRecordingUi({
            status: 'Recording unavailable',
            warning: 'Recording could not start in this browser.'
        });
        return false;
    }
}

function stopRecording() {
    return new Promise((resolve) => {
        if (!mediaRecorder) {
            resolve(recordingUploadedChunkCount || recordingChunkIndex ? {
                attemptId: currentRecordingAttemptId,
                basePath: recordingBasePath,
                chunkCount: recordingUploadedChunkCount,
                failedChunkCount: recordingFailedChunkCount
            } : null);
            return;
        }

        const recorder = mediaRecorder;
        let finished = false;
        const finalDataPromise = recorder.state === 'inactive'
            ? Promise.resolve()
            : new Promise((finalResolve) => {
                let settled = false;
                const settle = () => {
                    if (settled) return;
                    settled = true;
                    finalResolve();
                };
                recorder.addEventListener('dataavailable', settle, { once: true });
                setTimeout(settle, 1500);
            });
        const finish = async () => {
            if (finished) return;
            finished = true;
            mediaRecorder = null;
            await finalDataPromise;
            await new Promise((finalResolve) => setTimeout(finalResolve, 0));
            await waitForRecordingChunkUploads();
            const hasRecording = recordingUploadedChunkCount > 0 || recordingChunkIndex > 0;
            if (currentRecordingAttemptId) {
                await getRecordingDocRef().set({
                    status: recordingFailedChunkCount > 0 ? 'failed' : 'completed',
                    endedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    chunkCount: recordingUploadedChunkCount,
                    failedChunkCount: recordingFailedChunkCount,
                    lastUploadError: recordingLastUploadError || '',
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true }).catch((error) => {
                    console.warn('Could not mark recording complete:', error);
                });
            }
            updateRecordingUi({
                status: hasRecording
                    ? (recordingFailedChunkCount > 0 ? 'Recording upload incomplete' : 'Recording upload complete')
                    : 'No recording captured',
                progress: hasRecording
                    ? `Uploaded ${recordingUploadedChunkCount} chunk${recordingUploadedChunkCount === 1 ? '' : 's'}`
                    : 'Upload skipped',
                warning: recordingFailedChunkCount > 0
                    ? `${recordingFailedChunkCount} chunk${recordingFailedChunkCount === 1 ? '' : 's'} failed. ${recordingLastUploadError}`
                    : ''
            });
            resolve(hasRecording ? {
                attemptId: currentRecordingAttemptId,
                basePath: recordingBasePath,
                chunkCount: recordingUploadedChunkCount,
                failedChunkCount: recordingFailedChunkCount
            } : null);
        };

        if (recorder.state === 'inactive') {
            finish();
            return;
        }

        recorder.addEventListener('stop', finish, { once: true });
        try {
            if (typeof recorder.requestData === 'function' && recorder.state === 'recording') {
                recorder.requestData();
            }
            recorder.stop();
        } catch (error) {
            console.error('Could not stop recorder:', error);
            finish();
        }
    });
}

async function uploadRecording(blob) {
    if (blob && blob.attemptId && blob.basePath) {
        return {
            downloadURL: '',
            path: blob.basePath,
            attemptId: blob.attemptId,
            chunkCount: blob.chunkCount || 0,
            failedChunkCount: blob.failedChunkCount || 0
        };
    }

    if (!blob || blob.size === 0) {
        updateRecordingUi({
            status: 'No recording captured',
            progress: 'Upload skipped'
        });
        return null;
    }

    try {
        const {
            getRecordingStorage,
            ref,
            uploadBytesResumable,
            getDownloadURL
        } = await import('./firebase.js');

        const studentId = sanitizeStorageSegment(
            currentUser?.uid || `guest_${Date.now()}`,
            `guest_${Date.now()}`
        );
        const quizId = sanitizeStorageSegment(
            [currentChapter, currentPartNumber].filter(Boolean).join('_'),
            'quiz'
        );
        const attemptId = sanitizeStorageSegment(currentRecordingAttemptId || Date.now(), String(Date.now()));
        const recordingPath = `quiz-recordings/${studentId}/${quizId}/${attemptId}.webm`;
        const storageRef = ref(getRecordingStorage(), recordingPath);

        updateRecordingUi({
            status: 'Uploading recording',
            progress: 'Upload 0%',
            warning: ''
        });

        return await new Promise((resolve, reject) => {
            recordingUploadTask = uploadBytesResumable(storageRef, blob, {
                contentType: 'video/webm'
            });

            recordingUploadTask.on(
                'state_changed',
                (snapshot) => {
                    const percent = snapshot.totalBytes
                        ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
                        : 0;
                    updateRecordingUi({
                        status: 'Uploading recording',
                        progress: `Upload ${percent}%`
                    });
                },
                (error) => {
                    const message = getFirebaseStorageErrorMessage(error);
                    recordingUploadTask = null;
                    console.error('Firebase recording upload failed:', error);
                    updateRecordingUi({
                        status: 'Recording upload failed',
                        progress: 'Upload failed',
                        warning: message
                    });
                    reject(error);
                },
                async () => {
                    try {
                        const downloadURL = await getDownloadURL(recordingUploadTask.snapshot.ref);
                        lastRecordingDownloadUrl = downloadURL;
                        recordingUploadTask = null;
                        console.log('Quiz recording download URL:', downloadURL);
                        updateRecordingUi({
                            status: 'Recording uploaded',
                            progress: 'Upload complete',
                            warning: ''
                        });
                        resolve({ downloadURL, path: recordingPath });
                    } catch (error) {
                        recordingUploadTask = null;
                        console.error('Could not get recording download URL:', error);
                        updateRecordingUi({
                            status: 'Recording upload failed',
                            progress: 'Could not get download URL',
                            warning: 'Recording uploaded but the download URL could not be created.'
                        });
                        reject(error);
                    }
                }
            );
        });
    } catch (error) {
        const message = getFirebaseStorageErrorMessage(error);
        console.error('Firebase upload failed:', error);
        updateRecordingUi({
            status: 'Recording upload failed',
            progress: 'Upload failed',
            warning: message
        });
        throw error;
    }
}

async function updateRecordingMetadataFromAttempt(attempt = {}) {
    const attemptId = String(attempt.recordingAttemptId || currentRecordingAttemptId || '').trim();
    if (!attemptId || !db) return;

    try {
        await getRecordingDocRef(attemptId).set({
            chapter: attempt.chapter || currentChapter || '',
            partNumber: Number(attempt.partNumber || currentPartNumber || 0),
            partLabel: attempt.partLabel || currentPartLabel || '',
            userName: attempt.userName || currentUser?.name || 'Student',
            userAvatar: getDisplayAvatar(attempt.userAvatar || currentUser?.avatar),
            attemptClientId: attempt.clientAttemptId || '',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    } catch (error) {
        console.warn('Could not attach quiz details to recording metadata:', error);
    }
}

function stopCamera() {
    if (quizMediaStream) {
        quizMediaStream.getTracks().forEach((track) => {
            track.stop();
        });
        quizMediaStream = null;
    }

    const preview = document.getElementById('webcam-preview');
    if (preview) preview.srcObject = null;
}

function getTimestampMs(value, fallback = Date.now()) {
    if (!value) return fallback;
    if (typeof value.toDate === 'function') {
        const date = value.toDate();
        return Number.isNaN(date.getTime()) ? fallback : date.getTime();
    }
    if (typeof value.seconds === 'number') {
        return value.seconds * 1000 + Math.floor(Number(value.nanoseconds || 0) / 1000000);
    }
    const numericValue = Number(value);
    if (Number.isFinite(numericValue) && numericValue > 0) return numericValue;
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? fallback : parsed;
}

function formatDateTime(timestamp) {
    const date = new Date(getTimestampMs(timestamp));
    return `${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function formatQuestionTimes(questionTimes = []) {
    const normalized = normalizeQuestionTimes(questionTimes);
    if (normalized.length === 0) return 'No answered questions recorded.';
    return normalized.map((entry) => `Q${entry.questionNumber}: ${entry.secondsTaken}s`).join(' | ');
}

function getSafeRecordingUrl(url) {
    const raw = String(url || '').trim();
    if (!raw) return '';

    try {
        const parsed = new URL(raw);
        const allowedHosts = [
            'firebasestorage.googleapis.com',
            'storage.googleapis.com'
        ];
        const isFirebaseStorageHost = allowedHosts.includes(parsed.hostname)
            || parsed.hostname.endsWith('.firebasestorage.app');

        return parsed.protocol === 'https:' && isFirebaseStorageHost ? parsed.href : '';
    } catch (error) {
        return '';
    }
}

function canUseLocalRecordingApi() {
    const mode = String(backendConfig.mode || '').trim().toLowerCase();
    return ['localhost', '127.0.0.1'].includes(window.location.hostname)
        && mode === 'local'
        && BACKEND_API_BASE_URL.startsWith(window.location.origin);
}

function getSafeLocalRecordingUrl(url) {
    const raw = String(url || '').trim();
    if (!raw || !canUseLocalRecordingApi()) return '';

    try {
        const parsed = new URL(raw, window.location.origin);
        return parsed.origin === window.location.origin
            && parsed.pathname.startsWith('/.local-recordings/')
            ? parsed.href
            : '';
    } catch (error) {
        return '';
    }
}

function getRecordingPathFromUrl(url) {
    const safeUrl = getSafeRecordingUrl(url);
    if (!safeUrl) return '';

    try {
        const parsed = new URL(safeUrl);
        const encodedPath = parsed.pathname.split('/o/')[1];
        return encodedPath ? decodeURIComponent(encodedPath) : '';
    } catch (error) {
        return '';
    }
}

function getAttemptRecordingPath(attempt = {}) {
    return String(attempt.recordingPath || '').trim()
        || getRecordingPathFromUrl(attempt.recordingUrl);
}

function getRecordingDocumentPath(recording = {}) {
    return String(recording.finalVideoPath || '').trim()
        || getRecordingPathFromUrl(recording.finalVideoUrl);
}

function isMissingStorageObjectError(error) {
    const code = String(error?.code || '').toLowerCase();
    const message = String(error?.message || error || '').toLowerCase();
    return code === 'storage/object-not-found'
        || message.includes('object-not-found')
        || message.includes('object does not exist')
        || message.includes('no such object');
}

async function isAdminRecordingAvailable(attempt = {}) {
    const recordingUrl = getSafeRecordingUrl(attempt.recordingUrl);
    if (!recordingUrl) return false;

    const recordingPath = getAttemptRecordingPath(attempt);
    if (!recordingPath) return true;

    const cacheKey = recordingPath || recordingUrl;
    if (adminRecordingAvailabilityCache.has(cacheKey)) {
        return adminRecordingAvailabilityCache.get(cacheKey);
    }

    try {
        const {
            getRecordingStorage,
            ref,
            getMetadata
        } = await import('./firebase.js');
        await getMetadata(ref(getRecordingStorage(), recordingPath));
        adminRecordingAvailabilityCache.set(cacheKey, true);
        return true;
    } catch (error) {
        if (isMissingStorageObjectError(error)) {
            adminRecordingAvailabilityCache.set(cacheKey, false);
            return false;
        }

        console.warn('Could not verify recording in Firebase Storage:', error);
        return true;
    }
}

async function isAdminRecordingDocumentAvailable(recording = {}) {
    const status = String(recording.status || '').toLowerCase();
    if (status === 'deleted') return false;

    const finalUrl = getSafeRecordingUrl(recording.finalVideoUrl);
    const finalPath = getRecordingDocumentPath(recording);
    if (!finalUrl && !finalPath) return true;
    if (!finalPath) return true;

    const cacheKey = `recording-doc:${finalPath}`;
    if (adminRecordingAvailabilityCache.has(cacheKey)) {
        return adminRecordingAvailabilityCache.get(cacheKey);
    }

    try {
        const {
            getRecordingStorage,
            ref,
            getMetadata
        } = await import('./firebase.js');
        await getMetadata(ref(getRecordingStorage(), finalPath));
        adminRecordingAvailabilityCache.set(cacheKey, true);
        return true;
    } catch (error) {
        if (isMissingStorageObjectError(error)) {
            adminRecordingAvailabilityCache.set(cacheKey, false);
            return false;
        }

        console.warn('Could not verify recording document in Firebase Storage:', error);
        return true;
    }
}

async function getAvailableAdminRecordingAttempts() {
    const attemptsWithUrls = adminAttempts.filter((attempt) => getSafeRecordingUrl(attempt.recordingUrl));
    const availability = await Promise.all(
        attemptsWithUrls.map((attempt) => isAdminRecordingAvailable(attempt))
    );
    return attemptsWithUrls.filter((attempt, index) => availability[index]);
}

async function hydrateLocalRecordingChunks(recording = {}) {
    if (!canUseLocalRecordingApi()) return recording;
    if (Array.isArray(recording.chunks) && recording.chunks.length > 0) return recording;

    const attemptId = String(recording.attemptId || recording.id || '').trim();
    if (!attemptId) return recording;

    try {
        const params = new URLSearchParams({
            attemptId,
            studentId: String(recording.studentId || ''),
            quizId: String(recording.quizId || '')
        });
        const response = await callBackend(`/api/recordings/chunks?${params.toString()}`);
        const chunks = Array.isArray(response.chunks) ? response.chunks : [];
        if (!chunks.length) return recording;

        return {
            ...recording,
            chunks: chunks.filter((chunk) => chunk.status !== 'failed'),
            failedChunks: chunks.filter((chunk) => chunk.status === 'failed'),
            localOnlyChunks: true
        };
    } catch (error) {
        console.warn('Could not load local recording chunks:', error);
        return recording;
    }
}

async function getAdminRecordingDocuments() {
    if (!db) return [];

    const snapshot = await db.collection('recordings')
        .orderBy('startedAt', 'desc')
        .limit(100)
        .get();

    const recordings = await Promise.all(snapshot.docs.map(async (docSnapshot) => {
        const recording = { id: docSnapshot.id, ...docSnapshot.data() };
        const chunksSnapshot = await docSnapshot.ref
            .collection('chunks')
            .orderBy('index', 'asc')
            .limit(500)
            .get();
        recording.chunks = chunksSnapshot.docs
            .map((chunkDoc) => ({ id: chunkDoc.id, ...chunkDoc.data() }))
            .filter((chunk) => chunk.status !== 'failed');
        recording.failedChunks = chunksSnapshot.docs
            .map((chunkDoc) => ({ id: chunkDoc.id, ...chunkDoc.data() }))
            .filter((chunk) => chunk.status === 'failed');
        return hydrateLocalRecordingChunks(recording);
    }));

    const availability = await Promise.all(
        recordings.map((recording) => isAdminRecordingDocumentAvailable(recording))
    );

    return recordings.filter((recording, index) => availability[index]);
}

function getCallableFunctionsService() {
    if (!firebaseApp || typeof firebaseApp.functions !== 'function') {
        throw new Error('Firebase Functions SDK is not loaded. Hard refresh and check index.html includes firebase-functions-compat.js.');
    }
    return firebaseApp.functions('us-central1');
}

async function mergeLocalAdminRecording(attemptId, force = false) {
    if (!canUseLocalRecordingApi()) return null;

    const response = await callBackend('/api/recordings/merge', {
        method: 'POST',
        body: {
            attemptId,
            force: Boolean(force)
        }
    });

    const finalUrl = getSafeLocalRecordingUrl(response?.finalVideoUrl);
    if (!finalUrl) return null;

    adminLocalMergedRecordingUrls.set(attemptId, finalUrl);
    adminRecordingAvailabilityCache.clear();
    adminAutoMergeAttemptIds.delete(attemptId);
    adminAutoMergeFailedAttemptIds.delete(attemptId);
    adminAutoMergeErrorMessages.delete(attemptId);
    return {
        finalVideoUrl: finalUrl,
        finalVideoPath: response.finalVideoPath || '',
        localOnly: Boolean(response.localOnly)
    };
}

async function mergeAdminRecording(attemptId, force = false) {
    if (!currentUser?.isAdmin) {
        showPointsNotification('Admin access required to merge recordings.', 'points-lost');
        return;
    }

    const safeAttemptId = String(attemptId || '').trim();
    if (!/^[A-Za-z0-9_-]{3,160}$/.test(safeAttemptId)) {
        showPointsNotification('Invalid recording attempt id.', 'points-lost');
        return;
    }

    const statusEl = document.getElementById('admin-status');
    if (statusEl) {
        statusEl.textContent = `Merging recording ${safeAttemptId}. Please wait...`;
        statusEl.className = 'auth-status success';
    }

    adminAutoMergeFailedAttemptIds.delete(safeAttemptId);
    adminAutoMergeErrorMessages.delete(safeAttemptId);
    adminAutoMergeAttemptIds.add(safeAttemptId);

    try {
        const localMergeResult = await mergeLocalAdminRecording(safeAttemptId, force);
        if (localMergeResult?.finalVideoUrl) {
            showPointsNotification('Local recording merged successfully.', 'points-added');
            renderAdminDashboard();
            return;
        }

        const mergeFn = getCallableFunctionsService().httpsCallable('mergeRecordingChunks');
        const result = await mergeFn({ attemptId: safeAttemptId, force: Boolean(force) });
        adminRecordingAvailabilityCache.clear();
        adminAutoMergeAttemptIds.delete(safeAttemptId);
        adminAutoMergeFailedAttemptIds.delete(safeAttemptId);
        adminAutoMergeErrorMessages.delete(safeAttemptId);
        if (result?.data?.alreadyMerging) {
            showPointsNotification('Recording merge is already running.', 'points-added');
        } else if (result?.data?.alreadyMerged) {
            showPointsNotification('Recording is already merged.', 'points-added');
        } else {
            showPointsNotification('Recording merged successfully.', 'points-added');
        }
        renderAdminDashboard();
    } catch (error) {
        console.error('Recording merge failed:', error);
        adminAutoMergeAttemptIds.delete(safeAttemptId);
        adminAutoMergeFailedAttemptIds.add(safeAttemptId);
        const message = getAdminRecordingErrorMessage(error, 'Recording merge failed. Check Firebase Functions logs.');
        adminAutoMergeErrorMessages.set(safeAttemptId, message);
        if (statusEl) {
            statusEl.textContent = message;
            statusEl.className = 'auth-status error';
        }
        showPointsNotification(message, 'points-lost');
    }
}

function getAdminRecordingUploadedChunkCount(recording = {}) {
    const chunks = Array.isArray(recording.chunks) ? recording.chunks : [];
    return Number(recording.chunkCount || chunks.length || 0);
}

function getAdminRecordingFailedChunkCount(recording = {}) {
    const failedChunks = Array.isArray(recording.failedChunks) ? recording.failedChunks : [];
    return Number(recording.failedChunkCount || failedChunks.length || 0);
}

function getAdminRecordingErrorMessage(error, fallback = 'Recording merge failed.') {
    const code = String(error?.code || '').trim();
    const message = String(error?.message || error || '').trim();
    const lower = `${code} ${message}`.toLowerCase();

    if (lower.includes('not-found') || lower.includes('function') && lower.includes('not found')) {
        return 'Merge function is not deployed yet. Deploy Firebase Functions, then retry the merge.';
    }
    if (lower.includes('permission') || lower.includes('unauthenticated')) {
        return 'Merge was denied. Sign in with the configured admin email, then retry.';
    }
    if (lower.includes('missing chunk') || lower.includes('no uploaded chunks')) {
        return message || 'Some recording chunks are missing. Wait for upload completion, then retry.';
    }

    return [code, message].filter(Boolean).join(': ') || fallback;
}

function hasCompleteAdminRecordingChunks(recording = {}) {
    const chunks = Array.isArray(recording.chunks) ? recording.chunks : [];
    const uploadedChunkCount = getAdminRecordingUploadedChunkCount(recording);
    if (!uploadedChunkCount || chunks.length < uploadedChunkCount) return false;

    const indexes = chunks
        .map((chunk) => Number(chunk.index || 0))
        .filter((index) => Number.isInteger(index) && index > 0)
        .sort((a, b) => a - b);

    if (indexes.length < uploadedChunkCount) return false;
    for (let expectedIndex = 1; expectedIndex <= uploadedChunkCount; expectedIndex += 1) {
        if (indexes[expectedIndex - 1] !== expectedIndex) return false;
    }
    return true;
}

function isAdminRecordingReadyForAutoMerge(recording = {}) {
    const attemptId = String(recording.attemptId || recording.id || '').trim();
    return Boolean(currentUser?.isAdmin)
        && !adminLocalMergedRecordingUrls.has(attemptId)
        && !adminAutoMergeFailedAttemptIds.has(attemptId)
        && String(recording.status || '').toLowerCase() === 'completed'
        && !getSafeRecordingUrl(recording.finalVideoUrl)
        && !getSafeLocalRecordingUrl(recording.localFinalVideoUrl)
        && getAdminRecordingUploadedChunkCount(recording) > 0
        && getAdminRecordingFailedChunkCount(recording) === 0
        && hasCompleteAdminRecordingChunks(recording);
}

function scheduleAdminRecordingAutoRefresh() {
    if (adminRecordingAutoRefreshTimer) return;
    adminRecordingAutoRefreshTimer = setTimeout(() => {
        adminRecordingAutoRefreshTimer = null;
        const activeVideo = document.querySelector('.admin-recording-video');
        const isVideoPlaying = activeVideo && !activeVideo.paused && !activeVideo.ended;
        if (adminPanelVisible && !isVideoPlaying) renderAdminDashboard();
    }, 4000);
}

function queueAdminRecordingAutoMerge(recording = {}) {
    const attemptId = String(recording.attemptId || recording.id || '').trim();
    if (!attemptId || !isAdminRecordingReadyForAutoMerge(recording) || adminAutoMergeAttemptIds.has(attemptId)) {
        return;
    }

    adminAutoMergeAttemptIds.add(attemptId);
    const statusEl = document.getElementById('admin-status');
    if (statusEl && !adminLoadError) {
        statusEl.textContent = `Auto-merging recording ${attemptId}. The full video will appear when it is ready.`;
        statusEl.className = 'auth-status success';
    }

    (async () => {
        try {
            const localMergeResult = await mergeLocalAdminRecording(attemptId);
            if (localMergeResult?.finalVideoUrl) {
                renderAdminDashboard();
                return;
            }

            const mergeFn = getCallableFunctionsService().httpsCallable('mergeRecordingChunks');
            await mergeFn({ attemptId });
            adminRecordingAvailabilityCache.clear();
            adminAutoMergeAttemptIds.delete(attemptId);
            adminAutoMergeFailedAttemptIds.delete(attemptId);
            adminAutoMergeErrorMessages.delete(attemptId);
            renderAdminDashboard();
        } catch (error) {
            console.error('Automatic admin recording merge failed:', error);
            adminAutoMergeAttemptIds.delete(attemptId);
            adminAutoMergeFailedAttemptIds.add(attemptId);
            const message = getAdminRecordingErrorMessage(error, `Could not auto-merge recording ${attemptId}.`);
            adminAutoMergeErrorMessages.set(attemptId, message);
            if (statusEl && !adminLoadError) {
                statusEl.textContent = message;
                statusEl.className = 'auth-status error';
            }
            renderAdminDashboard();
        }
    })();
}

function getAdminRecordingMergeMessage(recording = {}) {
    const status = String(recording.status || 'unknown').toLowerCase();
    const uploadedChunkCount = getAdminRecordingUploadedChunkCount(recording);
    const failedChunkCount = getAdminRecordingFailedChunkCount(recording);
    const attemptId = String(recording.attemptId || recording.id || '').trim();

    if (adminAutoMergeFailedAttemptIds.has(attemptId)) {
        return adminAutoMergeErrorMessages.get(attemptId)
            || 'Automatic merge failed. Retry the merge after checking that every chunk uploaded correctly.';
    }
    if (status === 'recording') {
        return `Recording is still in progress. ${uploadedChunkCount} chunk${uploadedChunkCount === 1 ? '' : 's'} saved so far.`;
    }
    if (status === 'merging' || adminAutoMergeAttemptIds.has(attemptId)) {
        return 'Preparing the full merged video. This card will show only the final recording when it is ready.';
    }
    if (failedChunkCount > 0) {
        return `Cannot create a complete merged video because ${failedChunkCount} chunk${failedChunkCount === 1 ? '' : 's'} failed to upload.`;
    }
    if (uploadedChunkCount > 0 && !hasCompleteAdminRecordingChunks(recording)) {
        return `Waiting for all chunks to load before merging. Found ${Array.isArray(recording.chunks) ? recording.chunks.length : 0}/${uploadedChunkCount}.`;
    }
    if (status === 'failed') {
        return 'Merge failed. Retry the merge to rebuild the full recording from the saved chunks.';
    }
    if (uploadedChunkCount > 0) {
        return 'Queued for automatic merge. The chunk files are stored, but only the full recording is shown here.';
    }
    return 'No uploaded recording chunks were found for this attempt.';
}

function getAttemptPartLabel(attempt = {}) {
    const partLabel = String(attempt.partLabel || '').trim();
    if (partLabel) return partLabel;

    const partNumber = Number(attempt.partNumber || 0);
    return partNumber ? `Quiz ${partNumber}` : 'Chapter quiz';
}

function getAttemptPartKey(attempt = {}) {
    const partNumber = Number(attempt.partNumber || 0);
    return `${partNumber || 'chapter'}_${getAttemptPartLabel(attempt).toLowerCase()}`;
}

function getAdminRecordingGroups(recordingAttempts = adminAttempts, options = {}) {
    const includePending = Boolean(options.includePending);
    const userMetaById = new Map(adminUsers.map((user) => [
        String(user.uid || user.id || ''),
        user
    ]));
    const groupsByUser = new Map();

    recordingAttempts.forEach((attempt) => {
        const recordingUrl = getSafeRecordingUrl(attempt.recordingUrl);
        if (!recordingUrl && !includePending) return;

        const userId = String(attempt.userId || '').trim()
            || `user_${String(attempt.userName || 'student').toLowerCase().replace(/[^a-z0-9_-]/g, '_')}`;
        const userMeta = userMetaById.get(userId) || {};

        if (!groupsByUser.has(userId)) {
            groupsByUser.set(userId, {
                id: userId,
                name: userMeta.name || attempt.userName || 'Student',
                avatar: getDisplayAvatar(userMeta.avatar || attempt.userAvatar),
                chapters: new Map(),
                recordingCount: 0
            });
        }

        const userGroup = groupsByUser.get(userId);
        const chapterName = String(attempt.chapter || 'Untitled Chapter');
        if (!userGroup.chapters.has(chapterName)) {
            userGroup.chapters.set(chapterName, {
                name: chapterName,
                parts: new Map(),
                recordingCount: 0
            });
        }

        const chapterGroup = userGroup.chapters.get(chapterName);
        const partKey = getAttemptPartKey(attempt);
        const partNumber = Number(attempt.partNumber || 0);
        if (!chapterGroup.parts.has(partKey)) {
            chapterGroup.parts.set(partKey, {
                label: getAttemptPartLabel(attempt),
                sortOrder: partNumber || Number.MAX_SAFE_INTEGER,
                recordings: []
            });
        }

        chapterGroup.parts.get(partKey).recordings.push({
            ...attempt,
            recordingUrl
        });
        chapterGroup.recordingCount += 1;
        userGroup.recordingCount += 1;
    });

    return Array.from(groupsByUser.values())
        .map((group) => ({
            ...group,
            chapters: Array.from(group.chapters.values())
                .map((chapter) => ({
                    ...chapter,
                    parts: Array.from(chapter.parts.values())
                        .map((part) => ({
                            ...part,
                            recordings: part.recordings.sort((a, b) => b.timestamp - a.timestamp)
                        }))
                        .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label))
                }))
                .sort((a, b) => a.name.localeCompare(b.name))
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
}

function getRecordingAttemptMatch(recording = {}) {
    const recordingAttemptId = String(recording.attemptId || recording.id || '').trim();
    if (recordingAttemptId) {
        const exactMatch = adminAttempts.find((attempt) => String(attempt.recordingAttemptId || '').trim() === recordingAttemptId);
        if (exactMatch) return exactMatch;
    }

    const studentId = String(recording.studentId || '').trim();
    const quizId = String(recording.quizId || '').trim();
    if (!studentId || !quizId) return null;

    const candidates = adminAttempts
        .filter((attempt) => String(attempt.userId || '').trim() === studentId)
        .filter((attempt) => {
            const attemptQuizId = sanitizeStorageSegment(
                [attempt.chapter, attempt.partNumber].filter(Boolean).join('_'),
                'quiz'
            );
            return attemptQuizId === quizId;
        });

    if (!candidates.length) return null;

    const recordingStartedAt = getTimestampMs(recording.startedAt, 0);
    return candidates
        .map((attempt) => ({
            attempt,
            distance: recordingStartedAt
                ? Math.abs(Number(attempt.timestamp || 0) - recordingStartedAt)
                : 0
        }))
        .sort((a, b) => a.distance - b.distance)[0].attempt;
}

function getRecordingChapterFallback(recording = {}) {
    const quizId = String(recording.quizId || '').trim();
    if (!quizId) return 'Untitled Chapter';

    const partSuffixMatch = quizId.match(/-(\d+)$/);
    const chapterSlug = partSuffixMatch ? quizId.slice(0, -partSuffixMatch[0].length) : quizId;
    return chapterSlug
        .replace(/[-_]+/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase())
        || 'Untitled Chapter';
}

function getRecordingPartFallback(recording = {}) {
    const partNumber = Number(recording.partNumber || 0);
    if (partNumber) return partNumber;
    const quizId = String(recording.quizId || '').trim();
    const partSuffixMatch = quizId.match(/-(\d+)$/);
    return partSuffixMatch ? Number(partSuffixMatch[1]) : 0;
}

function normalizeRecordingDocumentForAdminGroup(recording = {}) {
    const matchedAttempt = getRecordingAttemptMatch(recording) || {};
    const attemptId = String(recording.attemptId || recording.id || '').trim();
    const finalUrl = getSafeRecordingUrl(recording.finalVideoUrl);
    const partNumber = Number(recording.partNumber || matchedAttempt.partNumber || getRecordingPartFallback(recording) || 0);

    return {
        ...matchedAttempt,
        recordingDoc: recording,
        recordingAttemptId: attemptId,
        userId: recording.studentId || matchedAttempt.userId || '',
        userName: recording.userName || matchedAttempt.userName || 'Student',
        userAvatar: getDisplayAvatar(recording.userAvatar || matchedAttempt.userAvatar || DISPLAY_AVATARS[0]),
        chapter: recording.chapter || matchedAttempt.chapter || getRecordingChapterFallback(recording),
        partNumber,
        partLabel: recording.partLabel || matchedAttempt.partLabel || (partNumber ? `Quiz ${partNumber}` : 'Chapter quiz'),
        timestamp: getTimestampMs(recording.startedAt, Number(matchedAttempt.timestamp || Date.now())),
        score: Number(matchedAttempt.score || 0),
        total: Number(matchedAttempt.total || 0),
        points: Number(matchedAttempt.points || 0),
        recordingUrl: finalUrl,
        recordingStatus: recording.status || 'unknown',
        recordingMergeError: recording.mergeError || ''
    };
}

function renderAdminRecordingItemCard(recording) {
    const recordingDoc = recording.recordingDoc || null;
    const attemptId = String(recording.recordingAttemptId || recordingDoc?.attemptId || recordingDoc?.id || '').trim();
    const finalUrl = getSafeLocalRecordingUrl(adminLocalMergedRecordingUrls.get(attemptId))
        || getSafeRecordingUrl(recording.recordingUrl || recordingDoc?.finalVideoUrl)
        || getSafeLocalRecordingUrl(recording.localFinalVideoUrl || recordingDoc?.localFinalVideoUrl);
    const uploadedChunkCount = recordingDoc ? getAdminRecordingUploadedChunkCount(recordingDoc) : 0;
    const failedChunkCount = recordingDoc ? getAdminRecordingFailedChunkCount(recordingDoc) : 0;
    const status = String(recordingDoc?.status || recording.recordingStatus || (finalUrl ? 'merged' : 'unknown')).toLowerCase();
    const mergeInProgress = status === 'merging' || adminAutoMergeAttemptIds.has(attemptId);
    const canRetryMerge = Boolean(recordingDoc)
        && !finalUrl
        && uploadedChunkCount > 0
        && failedChunkCount === 0
        && status !== 'recording';
    const retryLabel = status === 'merging' ? 'Restart merge' : 'Retry merge';
    const retryForce = status === 'merging'
        || status === 'failed'
        || adminAutoMergeFailedAttemptIds.has(attemptId)
        ? 'true'
        : 'false';

    return `
        <article class="admin-recording-card">
            ${finalUrl ? `
                <video class="admin-recording-video" controls preload="auto" src="${escapeHtml(finalUrl)}"></video>
            ` : `
                <div class="admin-recording-meta admin-recording-state">
                    <strong>Full recording not ready</strong>
                    <span>${escapeHtml(recordingDoc ? getAdminRecordingMergeMessage(recordingDoc) : 'Recording file is not available yet.')}</span>
                </div>
            `}
            <div class="admin-recording-meta">
                <strong>${formatDateTime(recording.timestamp)}</strong>
                <span>Score ${Number(recording.score || 0)}/${Number(recording.total || 0)} | Cash ${Number(recording.points || 0)}</span>
                ${recordingDoc ? `<span>Status: ${escapeHtml(recordingDoc.status || 'unknown')} | Uploaded chunks: ${uploadedChunkCount} | Failed chunks: ${failedChunkCount}</span>` : ''}
                ${adminAutoMergeErrorMessages.has(attemptId) ? `<span class="admin-merge-note error">${escapeHtml(adminAutoMergeErrorMessages.get(attemptId))}</span>` : ''}
                ${recordingDoc?.mergeError ? `<span class="admin-merge-note error">${escapeHtml(recordingDoc.mergeError)}</span>` : ''}
            </div>
            <div class="admin-recording-actions">
                ${finalUrl ? `
                    <a class="admin-recording-link" href="${escapeHtml(finalUrl)}" target="_blank" rel="noopener noreferrer">
                        <i class="fas fa-up-right-from-square"></i> Open full video
                    </a>
                ` : ''}
                ${mergeInProgress ? '<span class="admin-merge-note">Merge is running.</span>' : ''}
                ${canRetryMerge ? `
                    <button class="btn btn-primary btn-sm" type="button" onclick="mergeAdminRecording('${escapeHtml(attemptId)}', ${retryForce})">
                        <i class="fas fa-rotate"></i> ${retryLabel}
                    </button>
                ` : ''}
                ${failedChunkCount > 0 ? '<span class="admin-merge-note error">A complete merged recording is unavailable because one or more chunks failed.</span>' : ''}
            </div>
        </article>
    `;
}

function renderAdminRecordingGroups(recordingGroups = []) {
    return recordingGroups.map((group) => {
        const chapterCount = group.chapters.length;
        const chapterLabel = `${chapterCount} chapter${chapterCount === 1 ? '' : 's'}`;
        const recordingLabel = `${group.recordingCount} recording${group.recordingCount === 1 ? '' : 's'}`;

        return `
            <details class="admin-recording-user">
                <summary>
                    <span class="admin-recording-user-main">
                        <span class="lb-avatar">${escapeHtml(getDisplayAvatar(group.avatar))}</span>
                        <span>
                            <strong>${escapeHtml(group.name || 'Student')}</strong>
                            <small>${escapeHtml(group.id.slice(0, 16) || 'No UID')} | ${chapterLabel}</small>
                        </span>
                    </span>
                    <span class="admin-chip">${recordingLabel}</span>
                </summary>
                <div class="admin-recording-chapters">
                    ${group.chapters.map((chapter) => `
                        <details class="admin-recording-chapter">
                            <summary>
                                <strong>${escapeHtml(chapter.name)}</strong>
                                <span class="admin-chip">${chapter.parts.length} part${chapter.parts.length === 1 ? '' : 's'} | ${chapter.recordingCount} video${chapter.recordingCount === 1 ? '' : 's'}</span>
                            </summary>
                            <div class="admin-recording-parts">
                                ${chapter.parts.map((part) => `
                                    <details class="admin-recording-part">
                                        <summary>
                                            <strong>${escapeHtml(part.label)}</strong>
                                            <span class="admin-chip">${part.recordings.length} recording${part.recordings.length === 1 ? '' : 's'}</span>
                                        </summary>
                                        <div class="admin-recording-grid">
                                            ${part.recordings.map((recording) => renderAdminRecordingItemCard(recording)).join('')}
                                        </div>
                                    </details>
                                `).join('')}
                            </div>
                        </details>
                    `).join('')}
                </div>
            </details>
        `;
    }).join('');
}

async function renderAdminRecordingLibrary(container) {
    const validationRun = ++adminRecordingValidationRun;
    container.className = 'admin-recording-list';
    container.innerHTML = '<div class="admin-empty">Checking Firebase Storage for available recordings...</div>';

    try {
        const recordingDocs = await getAdminRecordingDocuments();
        if (validationRun !== adminRecordingValidationRun) return;
        if (recordingDocs.length > 0) {
            const statusEl = document.getElementById('admin-status');
            if (statusEl && !adminLoadError) {
                statusEl.textContent = `${adminUsers.length} users loaded | ${adminAttempts.length} attempt records loaded | ${recordingDocs.length} recording records loaded`;
                statusEl.className = 'auth-status success';
            }

            recordingDocs.forEach((recording) => {
                if (isAdminRecordingReadyForAutoMerge(recording)) {
                    queueAdminRecordingAutoMerge(recording);
                }
            });
            if (recordingDocs.some((recording) => {
                const attemptId = String(recording.attemptId || recording.id || '').trim();
                return String(recording.status || '').toLowerCase() === 'merging'
                    || adminAutoMergeAttemptIds.has(attemptId);
            })) {
                scheduleAdminRecordingAutoRefresh();
            }

            const groupedRecordings = getAdminRecordingGroups(
                recordingDocs.map((recording) => normalizeRecordingDocumentForAdminGroup(recording)),
                { includePending: true }
            );
            container.innerHTML = groupedRecordings.length
                ? renderAdminRecordingGroups(groupedRecordings)
                : '<div class="admin-empty">No recording documents found.</div>';
            return;
        }
    } catch (error) {
        console.warn('Could not load recordings collection; falling back to legacy attempt recording URLs.', error);
    }

    const availableAttempts = await getAvailableAdminRecordingAttempts();
    if (validationRun !== adminRecordingValidationRun) return;

    const recordingGroups = getAdminRecordingGroups(availableAttempts);
    const statusEl = document.getElementById('admin-status');
    if (statusEl && !adminLoadError) {
        statusEl.textContent = `${adminUsers.length} users loaded | ${adminAttempts.length} attempt records loaded | ${availableAttempts.length} available recordings`;
        statusEl.className = 'auth-status success';
    }

    if (recordingGroups.length === 0) {
        container.innerHTML = '<div class="admin-empty">No available recordings found in Firebase Storage. Deleted Storage files are hidden automatically.</div>';
        return;
    }

    container.innerHTML = renderAdminRecordingGroups(recordingGroups);
}

function getAdminErrorMessage(error) {
    const message = String(error?.message || error || 'Unknown error');
    const lower = message.toLowerCase();

    if (lower.includes('permission') || lower.includes('insufficient permissions') || lower.includes('missing or insufficient')) {
        return 'Admin dashboard data could not be loaded because Firestore denied access. Check that the same admin email is present in both firebase-config.js and firestore.rules, then publish rules again and sign out/sign back in.';
    }

    if (lower.includes('index')) {
        return `Admin dashboard data could not be loaded because Firestore needs an index. Firebase error: ${message}`;
    }

    return `Admin dashboard data could not be loaded. Firebase error: ${message}`;
}

function buildChapterHistoryFromAttempts(attempts) {
    const nextHistory = {};
    attempts.forEach((attempt) => {
        if (!nextHistory[attempt.chapter]) nextHistory[attempt.chapter] = [];
        nextHistory[attempt.chapter].push(attempt);
    });
    return nextHistory;
}

function hasAttemptedQuizPart(chapter, partNumber) {
    const safeChapter = String(chapter || '');
    const safePartNumber = Number(partNumber || 1);
    const pending = getPendingOfflineAttempt();
    if (
        pending
        && String(pending.attempt?.chapter || '') === safeChapter
        && Number(pending.attempt?.partNumber || 1) === safePartNumber
    ) {
        return true;
    }

    return testHistory.some((attempt) => (
        String(attempt.chapter || '') === safeChapter
        && Number(attempt.partNumber || 1) === safePartNumber
    ));
}

function getAttemptUserIdFromSnapshot(docSnapshot, data = {}) {
    return data.userId
        || docSnapshot?.ref?.parent?.parent?.id
        || '';
}

async function loadAdminAttemptsFromCollectionGroup(userMetaById) {
    const attemptsSnapshot = await db.collectionGroup('attempts')
        .orderBy('timestamp', 'desc')
        .limit(MAX_ADMIN_ATTEMPTS)
        .get();

    return attemptsSnapshot.docs.map((docSnapshot) => {
        const data = docSnapshot.data();
        const userId = getAttemptUserIdFromSnapshot(docSnapshot, data);
        return normalizeAttemptData({
            userId,
            ...data
        }, userMetaById.get(userId) || { uid: userId });
    }).sort((a, b) => b.timestamp - a.timestamp);
}

async function loadAdminAttemptsByUser(usersSnapshot, userMetaById) {
    const perUserAttemptLimit = Math.max(5, Math.ceil(MAX_ADMIN_ATTEMPTS / Math.max(usersSnapshot.docs.length, 1)));
    const attemptSnapshots = await Promise.all(
        usersSnapshot.docs.map((docSnapshot) =>
            docSnapshot.ref.collection('attempts')
                .orderBy('timestamp', 'desc')
                .limit(perUserAttemptLimit)
                .get()
        )
    );

    return attemptSnapshots.flatMap((attemptSnapshot, index) => {
        const userDoc = usersSnapshot.docs[index];
        const userId = userDoc.id;
        return attemptSnapshot.docs.map((docSnapshot) => normalizeAttemptData({
            userId,
            ...docSnapshot.data()
        }, userMetaById.get(userId)));
    }).sort((a, b) => b.timestamp - a.timestamp).slice(0, MAX_ADMIN_ATTEMPTS);
}

async function ensureUserProfile(authUser) {
    const seed = pendingProfileSeed || getStoredAuthProfileSeed() || {};

    if (isBackendEnabled()) {
        try {
            const response = await callBackend('/api/profile', {
                method: 'POST',
                body: seed
            });
            clearPendingAuthProfileSeed();
            if (response.profile?.referralApplied) {
                pendingReferralSuccessMessage = response.profile.referralReward?.message || 'Referral code applied successfully.';
            }
            return {
                ...(response.profile || {}),
                avatar: getDisplayAvatar(response.profile?.avatar || seed.avatar)
            };
        } catch (error) {
            if (!canUseClientFirestoreFallback()) throw error;
            console.warn('Backend profile load failed; falling back to Firestore client profile.', error);
        }
    }

    ensureBackendOrFallbackAvailable();

    const userRef = db.collection('users').doc(authUser.uid);
    const snapshot = await userRef.get();
    const existing = snapshot.exists ? snapshot.data() : {};

    const profile = {
        uid: authUser.uid,
        name: existing.name || getDefaultDisplayName(authUser, seed.name),
        avatar: getDisplayAvatar(existing.avatar || seed.avatar || DISPLAY_AVATARS[0]),
        totalPoints: Number(existing.totalPoints || 0),
        testsCompleted: Number(existing.testsCompleted || 0),
        totalTimeSpent: Number(existing.totalTimeSpent || 0),
        totalCorrectAnswers: Number(existing.totalCorrectAnswers || 0),
        totalQuestionsAttempted: Number(existing.totalQuestionsAttempted || 0),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastLoginAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (!snapshot.exists) {
        profile.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    }

    await userRef.set(profile, { merge: true });
    clearPendingAuthProfileSeed();

    return {
        uid: authUser.uid,
        name: profile.name,
        avatar: getDisplayAvatar(profile.avatar),
        email: authUser.email || '',
        isAdmin: isAdminEmail(authUser.email),
        referralCode: normalizeReferralCode(profile.referralCode),
        referredBy: String(profile.referredBy || ''),
        totalReferrals: getNumericValue(profile.totalReferrals ?? profile.numberOfReferrals ?? profile.noOfReferrals),
        referralPoints: getNumericValue(profile.referralPoints)
    };
}

async function refreshLeaderboardFromCloud(options = {}) {
    if (!currentUser) return;
    const force = Boolean(options.force);
    const now = Date.now();

    if (!force && leaderboard.length > 0 && now - leaderboardFetchedAt < LEADERBOARD_CACHE_MS) {
        return;
    }

    if (isBackendEnabled()) {
        try {
            const response = await callBackend('/api/leaderboard');
            leaderboard = Array.isArray(response.leaderboard) ? response.leaderboard : [];
            leaderboardFetchedAt = Date.now();
            return;
        } catch (error) {
            if (!canUseClientFirestoreFallback()) throw error;
            console.warn('Backend leaderboard load failed; falling back to Firestore client leaderboard.', error);
        }
    }

    ensureBackendOrFallbackAvailable();

    if (!db) return;

    const snapshot = await db.collection('users')
        .orderBy('totalPoints', 'desc')
        .limit(MAX_LEADERBOARD_USERS)
        .get();

    leaderboard = snapshot.docs.map((docSnapshot) => ({
        id: docSnapshot.id,
        ...docSnapshot.data()
    }));
    leaderboardFetchedAt = Date.now();
}

async function loadCloudData() {
    if (!currentUser) return;

    if (isBackendEnabled()) {
        try {
            const response = await callBackend('/api/me');
            applyCloudProfile(response.profile);
            setVerifiedPurchasedCourses(response.purchasedCourseIds || []);
            leaderboard = Array.isArray(response.leaderboard) ? response.leaderboard : [];
            leaderboardFetchedAt = Date.now();
            referralHistory = Array.isArray(response.referralHistory)
                ? response.referralHistory.map((entry) => normalizeReferralRecord(entry))
                : [];
            testHistory = Array.isArray(response.attempts)
                ? response.attempts.map((attempt) => normalizeAttemptData(attempt, currentUser))
                : [];
            chapterHistory = buildChapterHistoryFromAttempts(testHistory);
            return;
        } catch (error) {
            if (!canUseClientFirestoreFallback()) throw error;
            console.warn('Backend cloud data load failed; falling back to Firestore client data.', error);
        }
    }

    ensureBackendOrFallbackAvailable();

    if (!db) return;

    const userRef = db.collection('users').doc(currentUser.uid);
    const attemptsRef = userRef.collection('attempts');

    const [userSnapshot, attemptsSnapshot, purchasesSnapshot] = await Promise.all([
        userRef.get(),
        attemptsRef.orderBy('timestamp', 'desc').limit(100).get(),
        userRef.collection('purchases').get(),
        refreshLeaderboardFromCloud()
    ]);

    const userData = userSnapshot.exists ? userSnapshot.data() : {};
    totalPoints = getNumericValue(userData.totalPoints);
    testsCompleted = getNumericValue(userData.testsCompleted);
    totalTimeSpent = getNumericValue(userData.totalTimeSpent);
    totalCorrectAnswers = getNumericValue(userData.totalCorrectAnswers);
    totalQuestionsAttempted = getNumericValue(userData.totalQuestionsAttempted);
    setVerifiedPurchasedCourses(
        purchasesSnapshot.docs
            .filter((docSnapshot) => docSnapshot.data()?.status === 'active')
            .map((docSnapshot) => docSnapshot.id)
    );

    testHistory = attemptsSnapshot.docs
        .map((docSnapshot) => normalizeAttemptData(docSnapshot.data(), currentUser))
        .sort((a, b) => a.timestamp - b.timestamp);
    chapterHistory = buildChapterHistoryFromAttempts(testHistory);
}

function normalizeWithdrawalRequest(raw = {}) {
    return {
        id: String(raw.id || ''),
        userId: String(raw.userId || ''),
        userName: String(raw.userName || raw.name || 'Student'),
        email: String(raw.email || ''),
        phone: String(raw.phone || ''),
        upiId: String(raw.upiId || ''),
        walletBalance: getNumericValue(raw.walletBalance),
        requestedPoints: getNumericValue(raw.requestedPoints),
        status: WITHDRAWAL_STATUSES.includes(String(raw.status || 'Pending')) ? String(raw.status || 'Pending') : 'Pending',
        requestDateTime: getTimestampMs(raw.requestDateTime || raw.requestedAtMs || raw.requestedAt, Date.now()),
        updatedAtMs: getTimestampMs(raw.updatedAtMs || raw.updatedAt, 0),
        updatedBy: String(raw.updatedBy || ''),
        walletDeducted: Boolean(raw.walletDeducted),
        deductedPoints: getNumericValue(raw.deductedPoints),
        deductedAtMs: getTimestampMs(raw.deductedAtMs || raw.deductedAt, 0),
        refundedPoints: getNumericValue(raw.refundedPoints),
        refundedAtMs: getTimestampMs(raw.refundedAtMs || raw.refundedAt, 0)
    };
}

function normalizeReferralRecord(raw = {}) {
    return {
        id: String(raw.id || ''),
        referrerUserId: String(raw.referrerUserId || ''),
        referrerEmail: String(raw.referrerEmail || ''),
        referrerName: String(raw.referrerName || 'Student'),
        referredUserId: String(raw.referredUserId || ''),
        referredEmail: String(raw.referredEmail || ''),
        referredName: String(raw.referredName || 'Student'),
        referralCode: normalizeReferralCode(raw.referralCode),
        status: String(raw.status || 'completed'),
        rewardPoints: getNumericValue(raw.rewardPoints, REFERRAL_REWARD_POINTS),
        createdAtMs: getTimestampMs(raw.createdAtMs || raw.createdAt, Date.now()),
        updatedAtMs: getTimestampMs(raw.updatedAtMs || raw.updatedAt, 0),
        cancelledAtMs: getTimestampMs(raw.cancelledAtMs || raw.cancelledAt, 0),
        cancelledBy: String(raw.cancelledBy || ''),
        suspicious: Boolean(raw.suspicious),
        suspiciousReason: String(raw.suspiciousReason || ''),
        clientInfo: raw.clientInfo && typeof raw.clientInfo === 'object' ? raw.clientInfo : {}
    };
}

function getWalletBalance() {
    return getNumericValue(totalPoints);
}

function formatPointAmount(value) {
    return Math.round(getNumericValue(value)).toLocaleString('en-US');
}

function setWithdrawalStatus(message = '', type = '') {
    const statusEl = document.getElementById('withdraw-status');
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.className = type ? `withdraw-status ${type}` : 'withdraw-status';
}

function updateWithdrawButtonState() {
    const btn = document.getElementById('withdraw-btn');
    if (!btn) return;
    btn.disabled = !currentUser;
    btn.title = currentUser
        ? 'Request withdrawal'
        : 'Sign in to request withdrawal';
}

function renderWithdrawalEligibility() {
    const walletBalance = getWalletBalance();
    const submitBtn = document.getElementById('withdraw-submit-btn');
    const amountInput = document.getElementById('withdraw-points');
    const phoneInput = document.getElementById('withdraw-phone');
    const upiInput = document.getElementById('withdraw-upi');
    const canWithdraw = walletBalance >= MIN_WITHDRAWAL_POINTS;

    if (amountInput) {
        amountInput.disabled = !canWithdraw || isSubmittingWithdrawal;
        amountInput.max = String(Math.floor(walletBalance));
        if (!amountInput.value && canWithdraw) {
            amountInput.value = String(MIN_WITHDRAWAL_POINTS);
        }
    }
    if (phoneInput) phoneInput.disabled = !canWithdraw || isSubmittingWithdrawal;
    if (upiInput) upiInput.disabled = !canWithdraw || isSubmittingWithdrawal;
    if (submitBtn) submitBtn.disabled = !canWithdraw || isSubmittingWithdrawal;

    if (!canWithdraw) {
        setWithdrawalStatus('Minimum 10,000 points required to request withdrawal.', 'error');
    }
}

function openWithdrawModal() {
    if (!currentUser) {
        showPointsNotification('Please sign in to request withdrawal.', 'points-lost');
        return;
    }

    const modal = document.getElementById('withdraw-modal');
    if (!modal) return;

    const walletBalance = getWalletBalance();
    const now = new Date();
    const nameInput = document.getElementById('withdraw-name');
    const emailInput = document.getElementById('withdraw-email');
    const walletInput = document.getElementById('withdraw-wallet');
    const dateInput = document.getElementById('withdraw-date');
    const statusInput = document.getElementById('withdraw-current-status');
    const amountInput = document.getElementById('withdraw-points');

    if (nameInput) nameInput.value = currentUser.name || 'Student';
    if (emailInput) emailInput.value = currentUser.email || auth?.currentUser?.email || '';
    if (walletInput) walletInput.value = `${formatPointAmount(walletBalance)} points`;
    if (dateInput) dateInput.value = formatDateTime(now.getTime());
    if (statusInput) statusInput.value = 'Pending';
    if (amountInput) amountInput.value = walletBalance >= MIN_WITHDRAWAL_POINTS ? String(MIN_WITHDRAWAL_POINTS) : '';

    setWithdrawalStatus('');
    modal.style.display = 'flex';
    renderWithdrawalEligibility();
    setTimeout(() => {
        const firstField = walletBalance >= MIN_WITHDRAWAL_POINTS
            ? document.getElementById('withdraw-phone')
            : document.querySelector('.withdraw-close');
        firstField?.focus();
    }, 0);
}

function closeWithdrawModal() {
    const modal = document.getElementById('withdraw-modal');
    if (modal) modal.style.display = 'none';
    isSubmittingWithdrawal = false;
    renderWithdrawalEligibility();
}

async function submitWithdrawalRequest(event) {
    if (event) event.preventDefault();
    if (isSubmittingWithdrawal) return;

    if (!currentUser) {
        setWithdrawalStatus('You must be logged in to request withdrawal.', 'error');
        return;
    }

    const walletBalance = getWalletBalance();
    const phone = String(document.getElementById('withdraw-phone')?.value || '').trim();
    const upiId = String(document.getElementById('withdraw-upi')?.value || '').trim();
    const requestedPoints = Math.round(Number(document.getElementById('withdraw-points')?.value || 0));

    if (walletBalance < MIN_WITHDRAWAL_POINTS) {
        setWithdrawalStatus('Minimum 10,000 points required to request withdrawal.', 'error');
        renderWithdrawalEligibility();
        return;
    }

    if (!phone) {
        setWithdrawalStatus('Phone number is required.', 'error');
        document.getElementById('withdraw-phone')?.focus();
        return;
    }

    if (!upiId) {
        setWithdrawalStatus('UPI ID is required.', 'error');
        document.getElementById('withdraw-upi')?.focus();
        return;
    }

    if (!Number.isFinite(requestedPoints) || requestedPoints < MIN_WITHDRAWAL_POINTS) {
        setWithdrawalStatus('Enter at least 10,000 withdrawal points.', 'error');
        document.getElementById('withdraw-points')?.focus();
        return;
    }

    if (requestedPoints > walletBalance) {
        setWithdrawalStatus('Withdrawal points cannot be greater than your current wallet balance.', 'error');
        document.getElementById('withdraw-points')?.focus();
        return;
    }

    isSubmittingWithdrawal = true;
    renderWithdrawalEligibility();
    setWithdrawalStatus('Submitting withdrawal request...', '');

    try {
        const response = await callBackend('/api/withdrawals', {
            method: 'POST',
            body: { phone, upiId, requestedPoints }
        });
        const request = normalizeWithdrawalRequest(response.withdrawalRequest || {});
        if (currentUser?.isAdmin && request.id) {
            adminWithdrawalRequests = [request, ...adminWithdrawalRequests.filter((entry) => entry.id !== request.id)];
            renderAdminDashboard();
        }
        setWithdrawalStatus('Withdrawal request submitted successfully. Admin will verify and approve it.', 'success');
        showPointsNotification('Withdrawal request submitted successfully. Admin will verify and approve it.', 'points-added');
    } catch (error) {
        console.error('Withdrawal request failed:', error);
        setWithdrawalStatus(error.message || 'Withdrawal request failed. Please try again.', 'error');
    } finally {
        isSubmittingWithdrawal = false;
        renderWithdrawalEligibility();
    }
}

async function loadAdminDashboardData() {
    if (!currentUser?.isAdmin) return;
    adminRecordingAvailabilityCache.clear();

    if (isBackendEnabled()) {
        try {
            const response = await callBackend('/api/admin/dashboard');
            adminUsers = Array.isArray(response.users) ? response.users : [];
            adminAttempts = Array.isArray(response.attempts)
                ? response.attempts.map((attempt) => normalizeAttemptData(attempt))
                : [];
            adminWithdrawalRequests = Array.isArray(response.withdrawalRequests)
                ? response.withdrawalRequests.map((request) => normalizeWithdrawalRequest(request))
                : [];
            adminReferrals = Array.isArray(response.referrals)
                ? response.referrals.map((entry) => normalizeReferralRecord(entry))
                : [];
            adminPayments = Array.isArray(response.payments) ? response.payments : [];
            adminLoadError = '';
            renderAdminDashboard();
            return;
        } catch (error) {
            if (!canUseClientFirestoreFallback()) throw error;
            console.warn('Backend admin dashboard load failed; falling back to Firestore client admin data.', error);
        }
    }

    ensureBackendOrFallbackAvailable();

    if (!db) return;

    const usersSnapshot = await db.collection('users')
        .orderBy('totalPoints', 'desc')
        .limit(MAX_ADMIN_USERS)
        .get();

    adminUsers = usersSnapshot.docs.map((docSnapshot) => ({
        id: docSnapshot.id,
        ...docSnapshot.data()
    }));

    const userMetaById = new Map(adminUsers.map((user) => [user.id, {
        uid: user.id,
        name: user.name || 'Student',
        avatar: getDisplayAvatar(user.avatar || DISPLAY_AVATARS[0])
    }]));

    try {
        adminAttempts = await loadAdminAttemptsFromCollectionGroup(userMetaById);
    } catch (error) {
        console.warn('Collection-group attempt query failed; falling back to per-user attempt reads.', error);
        adminAttempts = await loadAdminAttemptsByUser(usersSnapshot, userMetaById);
    }

    try {
        const withdrawalSnapshot = await db.collection('withdrawalRequests')
            .orderBy('requestedAtMs', 'desc')
            .limit(150)
            .get();
        adminWithdrawalRequests = withdrawalSnapshot.docs.map((docSnapshot) => normalizeWithdrawalRequest({
            id: docSnapshot.id,
            ...docSnapshot.data()
        }));
    } catch (error) {
        console.warn('Withdrawal request load failed:', error);
        adminWithdrawalRequests = [];
    }

    try {
        const referralSnapshot = await db.collection('referrals')
            .orderBy('createdAtMs', 'desc')
            .limit(200)
            .get();
        adminReferrals = referralSnapshot.docs.map((docSnapshot) => normalizeReferralRecord({
            id: docSnapshot.id,
            ...docSnapshot.data()
        }));
    } catch (error) {
        console.warn('Referral record load failed:', error);
        adminReferrals = [];
    }

    try {
        const paymentsSnapshot = await db.collection('payments')
            .orderBy('createdAtMs', 'desc')
            .limit(250)
            .get();
        adminPayments = paymentsSnapshot.docs.map((docSnapshot) => ({
            id: docSnapshot.id,
            ...docSnapshot.data()
        }));
    } catch (error) {
        console.warn('Verified payment load failed:', error);
        adminPayments = [];
    }

    adminLoadError = '';
    renderAdminDashboard();
}

function toggleAdminPanel() {
    if (!currentUser?.isAdmin) return;
    adminPanelVisible = !adminPanelVisible;
    renderAdminDashboard();

    if (adminPanelVisible && adminUsers.length === 0 && !adminLoadError) {
        refreshAdminDashboard();
    }
}

async function refreshAdminDashboard() {
    if (!currentUser?.isAdmin) return;

    adminPanelVisible = true;
    adminLoadError = '';
    adminRecordingAvailabilityCache.clear();
    renderAdminDashboard();

    try {
        await loadAdminDashboardData();
    } catch (error) {
        console.error('Failed to refresh admin dashboard:', error);
        adminLoadError = getAdminErrorMessage(error);
        renderAdminDashboard();
    }
}

function renderAdminWithdrawalRequests(container) {
    if (!container) return;

    if (!adminWithdrawalRequests.length) {
        container.innerHTML = '<div class="admin-empty">No withdrawal requests yet.</div>';
        return;
    }

    container.innerHTML = adminWithdrawalRequests.map((request) => {
        const safeId = escapeHtml(request.id);
        const isUpdating = updatingWithdrawalRequestIds.has(request.id);
        const options = WITHDRAWAL_STATUSES.map((status) => `
            <option value="${status}" ${request.status === status ? 'selected' : ''}>${status}</option>
        `).join('');

        return `
            <div class="admin-attempt-card admin-withdrawal-card">
                <div class="admin-attempt-head">
                    <div>
                        <strong>${escapeHtml(request.userName || 'Student')}</strong>
                        <div class="admin-meta">${escapeHtml(request.email || 'No email')} | ${escapeHtml(request.phone || 'No phone')}</div>
                    </div>
                    <div class="admin-attempt-score">
                        <span class="admin-chip ${request.status === 'Rejected' ? 'danger' : 'success'}">${escapeHtml(request.status)}</span>
                        <strong>${formatPointAmount(request.requestedPoints)} points</strong>
                    </div>
                </div>
                <div class="admin-withdrawal-grid">
                    <div><span>User ID</span>${escapeHtml(request.userId || 'Unknown')}</div>
                    <div><span>UPI ID</span>${escapeHtml(request.upiId || 'Missing')}</div>
                    <div><span>Wallet balance</span>${formatPointAmount(request.walletBalance)} points</div>
                    <div><span>Requested points</span>${formatPointAmount(request.requestedPoints)} points</div>
                    <div><span>Request date/time</span>${formatDateTime(request.requestDateTime)}</div>
                    <div><span>Updated by</span>${escapeHtml(request.updatedBy || 'Not updated yet')}</div>
                    <div><span>Wallet deduction</span>${request.walletDeducted ? `${formatPointAmount(request.deductedPoints)} points deducted` : 'Not deducted'}</div>
                </div>
                <div class="admin-withdrawal-actions">
                    <select class="withdraw-status-select" onchange="updateWithdrawalRequestStatus('${safeId}', this.value)" ${isUpdating ? 'disabled' : ''}>
                        ${options}
                    </select>
                </div>
            </div>
        `;
    }).join('');
}

function renderAdminReferralRecords(container) {
    if (!container) return;

    if (!adminReferrals.length) {
        container.innerHTML = '<div class="admin-empty">No referral records yet.</div>';
        return;
    }

    container.innerHTML = adminReferrals.map((referral) => {
        const safeId = escapeHtml(referral.id);
        const isCancelled = referral.status === 'cancelled';
        const isUpdating = updatingReferralRecordIds.has(referral.id);
        const flagClass = isCancelled || referral.suspicious ? 'danger' : 'success';
        const flagLabel = isCancelled ? 'cancelled' : (referral.suspicious ? 'suspicious' : referral.status);
        const clientInfo = referral.clientInfo || {};

        return `
            <div class="admin-attempt-card ${referral.suspicious ? 'flagged' : ''}">
                <div class="admin-attempt-head">
                    <div>
                        <strong>${escapeHtml(referral.referrerEmail || referral.referrerName || referral.referrerUserId || 'Referrer')}</strong>
                        <div class="admin-meta">Referrer: ${escapeHtml(referral.referrerUserId || 'Unknown')}</div>
                    </div>
                    <div class="admin-attempt-score">
                        <span class="admin-chip ${flagClass}">${escapeHtml(flagLabel)}</span>
                        <strong>${formatPointAmount(referral.rewardPoints)} points</strong>
                    </div>
                </div>
                <div class="admin-withdrawal-grid">
                    <div><span>Referred user</span>${escapeHtml(referral.referredEmail || referral.referredUserId || 'Unknown')}</div>
                    <div><span>Referred UID</span>${escapeHtml(referral.referredUserId || 'Unknown')}</div>
                    <div><span>Referral code</span>${escapeHtml(referral.referralCode || 'Missing')}</div>
                    <div><span>Date</span>${formatDateTime(referral.createdAtMs)}</div>
                    <div><span>Device</span>${escapeHtml(clientInfo.platform || 'Unknown')}</div>
                    <div><span>IP/User agent</span>${escapeHtml(clientInfo.ip || clientInfo.userAgent || 'Not captured')}</div>
                </div>
                ${referral.suspiciousReason ? `<div class="admin-meta">Review note: ${escapeHtml(referral.suspiciousReason)}</div>` : ''}
                <div class="admin-withdrawal-actions">
                    <button class="btn btn-danger btn-sm" onclick="cancelReferralBonus('${safeId}')" type="button" ${isCancelled || isUpdating ? 'disabled' : ''}>
                        <i class="fas fa-ban"></i> ${isUpdating ? 'Cancelling...' : 'Cancel Bonus'}
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

async function cancelReferralBonus(referralId) {
    if (!currentUser?.isAdmin) {
        showPointsNotification('Admin access required to cancel referral bonuses.', 'points-lost');
        return;
    }

    const safeReferralId = String(referralId || '').trim();
    if (!safeReferralId) return;

    updatingReferralRecordIds.add(safeReferralId);
    renderAdminDashboard();

    try {
        const response = await callBackend(`/api/admin/referrals/${encodeURIComponent(safeReferralId)}/status`, {
            method: 'PATCH',
            body: {
                status: 'cancelled',
                suspiciousReason: 'Cancelled by admin review'
            }
        });
        const updated = normalizeReferralRecord(response.referral || {});
        adminReferrals = adminReferrals.map((entry) => (
            entry.id === safeReferralId ? updated : entry
        ));
        if (response.user && response.user.id) {
            adminUsers = adminUsers.map((user) => (
                (user.id || user.uid) === response.user.id
                    ? {
                        ...user,
                        totalPoints: getNumericValue(response.user.totalPoints, user.totalPoints),
                        points: getNumericValue(response.user.points, user.points),
                        totalReferrals: getNumericValue(response.user.totalReferrals ?? response.user.numberOfReferrals ?? response.user.noOfReferrals, user.totalReferrals),
                        referralPoints: getNumericValue(response.user.referralPoints, user.referralPoints)
                    }
                    : user
            ));
            if (currentUser?.uid === response.user.id) {
                totalPoints = getNumericValue(response.user.totalPoints, totalPoints);
                currentUser = {
                    ...currentUser,
                    totalReferrals: getNumericValue(response.user.totalReferrals ?? response.user.numberOfReferrals ?? response.user.noOfReferrals, currentUser.totalReferrals),
                    referralPoints: getNumericValue(response.user.referralPoints, currentUser.referralPoints)
                };
                updateWallet();
                updateDashboard();
            }
        }
        showPointsNotification('Referral bonus cancelled by admin review.', 'points-lost');
    } catch (error) {
        console.error('Failed to cancel referral bonus:', error);
        showPointsNotification(error.message || 'Could not cancel referral bonus.', 'points-lost');
    } finally {
        updatingReferralRecordIds.delete(safeReferralId);
        renderAdminDashboard();
    }
}

async function updateWithdrawalRequestStatus(requestId, status) {
    if (!currentUser?.isAdmin) {
        showPointsNotification('Admin access required to update withdrawal requests.', 'points-lost');
        return;
    }

    const safeStatus = WITHDRAWAL_STATUSES.includes(status) ? status : 'Pending';
    const safeRequestId = String(requestId || '').trim();
    if (!safeRequestId) return;

    updatingWithdrawalRequestIds.add(safeRequestId);
    renderAdminDashboard();

    try {
        const response = await callBackend(`/api/admin/withdrawals/${encodeURIComponent(safeRequestId)}/status`, {
            method: 'PATCH',
            body: { status: safeStatus }
        });
        const updated = normalizeWithdrawalRequest(response.withdrawalRequest || {});
        adminWithdrawalRequests = adminWithdrawalRequests.map((request) => (
            request.id === safeRequestId ? updated : request
        ));
        if (response.user && response.user.id) {
            adminUsers = adminUsers.map((user) => (
                (user.id || user.uid) === response.user.id
                    ? { ...user, totalPoints: getNumericValue(response.user.totalPoints, user.totalPoints) }
                    : user
            ));
            if (currentUser?.uid === response.user.id) {
                totalPoints = getNumericValue(response.user.totalPoints, totalPoints);
                updateWallet();
                updateDashboard();
            }
            renderLeaderboard();
        }
        showPointsNotification(`Withdrawal status updated to ${safeStatus}.`, 'points-added');
    } catch (error) {
        console.error('Failed to update withdrawal status:', error);
        showPointsNotification(error.message || 'Could not update withdrawal status.', 'points-lost');
    } finally {
        updatingWithdrawalRequestIds.delete(safeRequestId);
        renderAdminDashboard();
    }
}

function renderAdminDashboard() {
    const panel = document.getElementById('admin-panel');
    const toggleBtn = document.getElementById('admin-toggle-btn');
    const statusEl = document.getElementById('admin-status');
    const summaryGrid = document.getElementById('admin-summary-grid');
    const usersList = document.getElementById('admin-users-list');
    const recordingsList = document.getElementById('admin-recordings-list');
    const withdrawalsList = document.getElementById('admin-withdrawal-requests-list');
    const referralsList = document.getElementById('admin-referrals-list');
    const paymentsList = document.getElementById('admin-payments-list');
    const leaderboardList = document.getElementById('admin-leaderboard-list');
    const attemptsList = document.getElementById('admin-attempts-list');

    if (toggleBtn) {
        if (currentUser?.isAdmin) {
            toggleBtn.style.display = 'inline-flex';
            toggleBtn.innerHTML = adminPanelVisible
                ? '<i class="fas fa-eye-slash"></i> Hide Admin Dashboard'
                : '<i class="fas fa-shield-halved"></i> Admin Dashboard';
        } else {
            toggleBtn.style.display = 'none';
        }
    }

    if (!panel) return;
    if (!currentUser?.isAdmin) {
        panel.style.display = 'none';
        return;
    }

    panel.style.display = adminPanelVisible ? 'block' : 'none';
    if (!adminPanelVisible) return;

    if (statusEl) {
        if (adminLoadError) {
            statusEl.textContent = adminLoadError;
            statusEl.className = 'auth-status error';
        } else if (adminUsers.length === 0 && adminAttempts.length === 0 && adminWithdrawalRequests.length === 0 && adminReferrals.length === 0 && adminPayments.length === 0) {
            statusEl.textContent = 'Loading admin dashboard data...';
            statusEl.className = 'auth-status';
        } else {
            const recordingCount = adminAttempts.filter((attempt) => getSafeRecordingUrl(attempt.recordingUrl)).length;
            const pendingWithdrawals = adminWithdrawalRequests.filter((request) => request.status === 'Pending').length;
            statusEl.textContent = `${adminUsers.length} users | ${adminAttempts.length} attempts | ${recordingCount} recordings | ${pendingWithdrawals} pending withdrawals | ${adminPayments.length} verified purchases`;
            statusEl.className = 'auth-status success';
        }
    }

    if (summaryGrid) {
        const suspiciousAttempts = adminAttempts.filter((attempt) => attempt.cheatLog.flagged).length;
        const highestTabSwitches = adminAttempts.reduce((max, attempt) => Math.max(max, attempt.cheatLog.tabSwitchCount), 0);
        const pendingWithdrawals = adminWithdrawalRequests.filter((request) => request.status === 'Pending').length;
        const completedReferrals = adminReferrals.filter((referral) => referral.status === 'completed').length;
        summaryGrid.innerHTML = `
            <div class="stat-card">
                <div class="stat-number">${adminUsers.length}</div>
                <div>Total Users</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${adminAttempts.length}</div>
                <div>Recent Attempts</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${suspiciousAttempts}</div>
                <div>Suspicious Attempts</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${highestTabSwitches}</div>
                <div>Highest Tab Switches</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${pendingWithdrawals}</div>
                <div>Pending Withdrawals</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${completedReferrals}</div>
                <div>Completed Referrals</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${adminPayments.length}</div>
                <div>Verified Purchases</div>
            </div>
        `;
    }

    if (usersList) {
        if (adminUsers.length === 0) {
            usersList.innerHTML = '<div class="admin-empty">No user profiles found yet.</div>';
        } else {
            usersList.className = 'admin-user-list';
            usersList.innerHTML = adminUsers.map((user) => `
                <div class="leaderboard-item">
                    <div class="lb-avatar">${escapeHtml(getDisplayAvatar(user.avatar))}</div>
                    <div class="lb-info">
                        <strong>${escapeHtml(user.name || 'Student')}</strong>
                        <span>${escapeHtml((user.uid || user.id || '').slice(0, 12) || 'No UID')} | ${Number(user.testsCompleted || 0)} tests</span>
                    </div>
                    <div class="lb-score">
                        <strong>Cash ${Number(user.totalPoints || 0)}</strong>
                        <span>${getAccuracyText(user.totalCorrectAnswers, user.totalQuestionsAttempted)}</span>
                    </div>
                </div>
            `).join('');
        }
    }

    if (recordingsList) {
        renderAdminRecordingLibrary(recordingsList);
    }

    if (withdrawalsList) {
        renderAdminWithdrawalRequests(withdrawalsList);
    }

    if (referralsList) {
        renderAdminReferralRecords(referralsList);
    }

    if (paymentsList) {
        if (adminPayments.length === 0) {
            paymentsList.innerHTML = '<div class="admin-empty">No verified course purchases yet.</div>';
        } else {
            paymentsList.className = 'admin-user-list';
            paymentsList.innerHTML = adminPayments.map((payment) => `
                <div class="leaderboard-item">
                    <div class="lb-avatar"><i class="fas fa-receipt"></i></div>
                    <div class="lb-info">
                        <strong>${escapeHtml(payment.courseName || payment.courseId || 'Course purchase')}</strong>
                        <span>${escapeHtml(payment.userEmail || payment.uid || 'Unknown user')}</span>
                        <span>${escapeHtml(payment.razorpayPaymentId || payment.id || '')}</span>
                    </div>
                    <div class="lb-score">
                        <strong>₹${Number(payment.amount || 0).toLocaleString('en-IN')}</strong>
                        <span>${escapeHtml(payment.status || 'paid')} | ${formatDateTime(payment.purchasedAtMs || payment.createdAtMs)}</span>
                    </div>
                </div>
            `).join('');
        }
    }

    if (leaderboardList) {
        if (adminUsers.length === 0) {
            leaderboardList.innerHTML = '<div class="admin-empty">Leaderboard data will appear after users complete tests.</div>';
        } else {
            leaderboardList.className = 'admin-leaderboard-list';
            const medals = ['🥇', '🥈', '🥉'];
            leaderboardList.innerHTML = adminUsers.slice(0, 10).map((user, index) => `
                <div class="leaderboard-item rank-${index < 3 ? index + 1 : 'other'}">
                    <div class="lb-rank">${medals[index] || `#${index + 1}`}</div>
                    <div class="lb-avatar">${escapeHtml(getDisplayAvatar(user.avatar))}</div>
                    <div class="lb-info">
                        <strong>${escapeHtml(user.name || 'Student')}</strong>
                        <span>${Number(user.testsCompleted || 0)} tests completed</span>
                    </div>
                    <div class="lb-score">
                        <strong>Cash ${Number(user.totalPoints || 0)}</strong>
                    </div>
                </div>
            `).join('');
        }
    }

    if (attemptsList) {
        if (adminAttempts.length === 0) {
            attemptsList.innerHTML = '<div class="admin-empty">No attempts have been submitted yet.</div>';
        } else {
            attemptsList.innerHTML = adminAttempts.map((attempt) => {
                const flagClass = attempt.cheatLog.flagged ? 'danger' : 'success';
                const flagLabel = attempt.cheatLog.flagged ? 'Suspicious Attempt' : 'Clean Attempt';
                const reasons = attempt.cheatLog.reasons.length
                    ? escapeHtml(attempt.cheatLog.reasons.join(' | '))
                    : 'No suspicious signals recorded.';

                return `
                    <div class="admin-attempt-card ${attempt.cheatLog.flagged ? 'flagged' : ''}">
                        <div class="admin-attempt-head">
                            <div>
                                <strong>${escapeHtml(getDisplayAvatar(attempt.userAvatar))} ${escapeHtml(attempt.userName || 'Student')}</strong>
                                <div class="admin-meta">${escapeHtml(getChapterDisplayName(attempt.chapter))} | ${formatDateTime(attempt.timestamp)}</div>
                            </div>
                            <div class="admin-attempt-score">
                                <span class="admin-chip ${flagClass}">${flagLabel}</span>
                                <strong>${attempt.score}/${attempt.total} | Cash ${attempt.points}</strong>
                            </div>
                        </div>
                        <div class="admin-chip-row">
                            <span class="admin-chip">Accuracy: ${attempt.accuracy}%</span>
                            <span class="admin-chip">Tab switches: ${attempt.cheatLog.tabSwitchCount}</span>
                            <span class="admin-chip">Copy: ${attempt.cheatLog.copyCount}</span>
                            <span class="admin-chip">Paste: ${attempt.cheatLog.pasteCount}</span>
                            <span class="admin-chip">Capture: ${attempt.cheatLog.screenshotAttemptCount}</span>
                            <span class="admin-chip">Fullscreen exits: ${attempt.cheatLog.fullscreenExitCount}</span>
                            <span class="admin-chip">Resume: ${attempt.cheatLog.resumeCount}</span>
                            <span class="admin-chip">Rapid: ${attempt.cheatLog.rapidAnswerCount}</span>
                            <span class="admin-chip">Avg/Q: ${attempt.cheatLog.avgSecondsPerQuestion || 0}s</span>
                            <span class="admin-chip">Suspicion: ${attempt.cheatLog.suspicionScore}</span>
                        </div>
                        <div class="admin-meta">${reasons}</div>
                        <div class="admin-question-times">${escapeHtml(formatQuestionTimes(attempt.cheatLog.questionTimes))}</div>
                    </div>
                `;
            }).join('');
        }
    }
}

async function openHomeForAuthenticatedUser(authUser) {
    try {
        setAuthStatus('Loading your cloud profile...', 'success');
        currentUser = await ensureUserProfile(authUser);
        await loadCloudData();
        restorePausedTestStateFromStorage();
        adminUsers = [];
        adminAttempts = [];
        adminWithdrawalRequests = [];
        adminReferrals = [];
        adminPayments = [];
        adminLoadError = '';
        adminPanelVisible = Boolean(currentUser.isAdmin);
        resetAuthInputs();
        await showHomeScreen();
        if (pendingReferralSuccessMessage) {
            showPointsNotification(pendingReferralSuccessMessage, 'points-added');
            pendingReferralSuccessMessage = '';
        }
        retryPendingOfflineAttempt();
        if (currentUser.isAdmin) {
            try {
                await loadAdminDashboardData();
            } catch (adminError) {
                console.error('Failed to load admin dashboard data:', adminError);
                adminLoadError = getAdminErrorMessage(adminError);
                renderAdminDashboard();
            }
        }
    } catch (error) {
        console.error('Failed to load authenticated user:', error);
        clearPendingAuthProfileSeed();
        resetUserState();
        await auth.signOut().catch(() => {});
        showLoginScreen();
        setAuthStatus(formatFirebaseError(error), 'error');
    }
}

async function handleAuthStateChanged(authUser) {
    if (!authUser) {
        if (authStateLoadPromise) return;
        resetUserState();
        resetAuthInputs();
        showLoginScreen();
        if (firebaseReady && !document.getElementById('auth-status')?.textContent) {
            setAuthStatus('Create an account, sign in with email, or continue with Google.');
        }
        return;
    }

    if (authStateLoadPromise) return authStateLoadPromise;
    authStateLoadPromise = openHomeForAuthenticatedUser(authUser)
        .finally(() => {
            authStateLoadPromise = null;
        });
    return authStateLoadPromise;
}

function showLoginScreen() {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('home').style.display = 'none';
    document.getElementById('quiz').style.display = 'none';
    document.getElementById('result').style.display = 'none';
    hideReferralCard();
    setHomeSidebarButtonVisible(false);

    const grid = document.getElementById('avatar-grid');
    grid.innerHTML = DISPLAY_AVATARS.map(a =>
        `<div class="avatar-option" onclick="pickAvatar(this, '${a}')">${a}</div>`
    ).join('');

    // Select first by default
    const firstOption = grid.querySelector('.avatar-option');
    if (firstOption) { firstOption.classList.add('selected'); selectedAvatar = DISPLAY_AVATARS[0]; }
    hydrateReferralCodeFromUrl();
}

function pickAvatar(el, avatar) {
    document.querySelectorAll('.avatar-option').forEach(o => o.classList.remove('selected'));
    el.classList.add('selected');
    selectedAvatar = avatar;
}

async function createAccount() {
    if (!ensureFirebaseReady()) return;

    const { name, email, password, referralCode } = getAuthFormValues();
    if (!name) {
        setAuthStatus('Please enter a display name for your account.', 'error');
        highlightField('username-input');
        return;
    }
    if (!email) {
        setAuthStatus('Please enter your email address.', 'error');
        highlightField('email-input');
        return;
    }
    if (!password) {
        setAuthStatus('Please enter a password.', 'error');
        highlightField('password-input');
        return;
    }

    let validReferralCode = '';
    try {
        validReferralCode = await validateReferralCodeForSignup(referralCode);
    } catch (error) {
        setAuthStatus(error.message || 'Invalid referral code.', 'error');
        highlightField('referral-input');
        return;
    }

    setPendingAuthProfileSeed({
        name,
        avatar: selectedAvatar,
        referralCode: validReferralCode,
        clientInfo: getReferralClientInfo()
    });
    setAuthStatus('Creating your account...', 'success');

    try {
        const credential = await auth.createUserWithEmailAndPassword(email, password);
        if (credential.user) {
            await credential.user.updateProfile({ displayName: name });
        }
    } catch (error) {
        clearPendingAuthProfileSeed();
        setAuthStatus(formatFirebaseError(error), 'error');
    }
}

function doLogin() {
    return createAccount();
}

async function signInWithEmail() {
    if (!ensureFirebaseReady()) return;

    const { name, email, password } = getAuthFormValues();
    if (!email) {
        setAuthStatus('Please enter your email address.', 'error');
        highlightField('email-input');
        return;
    }
    if (!password) {
        setAuthStatus('Please enter your password.', 'error');
        highlightField('password-input');
        return;
    }

    setPendingAuthProfileSeed({ name, avatar: selectedAvatar });
    setAuthStatus('Signing you in...', 'success');

    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
        clearPendingAuthProfileSeed();
        setAuthStatus(formatFirebaseError(error), 'error');
    }
}

function createGoogleAuthProvider() {
    if (!firebase?.auth?.GoogleAuthProvider) {
        throw new Error('Google sign-in is not available. Make sure firebase-auth-compat.js is loaded.');
    }

    const provider = new firebase.auth.GoogleAuthProvider();
    if (typeof provider.addScope === 'function') {
        provider.addScope('email');
        provider.addScope('profile');
    }
    if (typeof provider.setCustomParameters === 'function') {
        provider.setCustomParameters({ prompt: 'select_account' });
    }
    return provider;
}

function shouldFallbackToGoogleRedirect(error) {
    return [
        'auth/popup-blocked',
        'auth/operation-not-supported-in-this-environment',
        'auth/web-storage-unsupported'
    ].includes(error?.code);
}

async function handleGoogleRedirectResult() {
    if (!auth || typeof auth.getRedirectResult !== 'function') return;

    try {
        const result = await auth.getRedirectResult();
        if (result?.user) {
            setAuthStatus('Google sign-in complete. Loading your profile...', 'success');
        }
    } catch (error) {
        clearPendingAuthProfileSeed();
        setAuthStatus(formatFirebaseError(error), 'error');
    }
}

async function signInWithGoogle() {
    if (!ensureFirebaseReady()) return;

    const { name, referralCode } = getAuthFormValues();
    let validReferralCode = '';
    try {
        validReferralCode = await validateReferralCodeForSignup(referralCode);
    } catch (error) {
        setAuthStatus(error.message || 'Invalid referral code.', 'error');
        highlightField('referral-input');
        return;
    }

    const seed = {
        name,
        avatar: selectedAvatar,
        referralCode: validReferralCode,
        clientInfo: getReferralClientInfo()
    };
    setPendingAuthProfileSeed(seed, true);
    setAuthStatus('Opening Google sign-in...', 'success');

    try {
        await auth.signInWithPopup(createGoogleAuthProvider());
    } catch (error) {
        if (shouldFallbackToGoogleRedirect(error) && typeof auth.signInWithRedirect === 'function') {
            try {
                setPendingAuthProfileSeed(seed, true);
                setAuthStatus('Popup blocked. Redirecting to Google sign-in...', 'success');
                await auth.signInWithRedirect(createGoogleAuthProvider());
                return;
            } catch (redirectError) {
                clearPendingAuthProfileSeed();
                setAuthStatus(formatFirebaseError(redirectError), 'error');
                return;
            }
        }

        clearPendingAuthProfileSeed();
        setAuthStatus(formatFirebaseError(error), 'error');
    }
}

async function sendPasswordReset() {
    if (!ensureFirebaseReady()) return;

    const { email } = getAuthFormValues();
    if (!email) {
        setAuthStatus('Enter your email address first, then request a reset link.', 'error');
        highlightField('email-input');
        return;
    }

    try {
        await auth.sendPasswordResetEmail(email);
        setAuthStatus('Password reset email sent. Check your inbox.', 'success');
    } catch (error) {
        setAuthStatus(formatFirebaseError(error), 'error');
    }
}

async function showHomeScreen() {
    setAuthStatus('Loading quiz content...', 'success');
    await ensureQuestionCatalogLoaded();

    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('home').style.display = 'block';
    document.getElementById('quiz').style.display = 'none';
    document.getElementById('result').style.display = 'none';
    hideReferralCard();
    setHomeSidebarButtonVisible(true);

    document.getElementById('user-avatar-display').textContent = getDisplayAvatar(currentUser.avatar);
    document.getElementById('user-name-display').textContent = currentUser.name;
    document.getElementById('welcome-avatar').textContent = getDisplayAvatar(currentUser.avatar);
    document.getElementById('welcome-name').textContent = `Welcome, ${currentUser.name}!`;
    updateHomeSidebarUser();
    const historySection = document.getElementById('history-section');
    if (historySection) historySection.style.display = currentUser?.isAdmin ? 'none' : 'block';

    // Motivational message
    const msgs = ['Ready to ace JEE today?', 'Keep up the great work!', 'Every question counts!', 'Sharpen your skills!'];
    document.getElementById('welcome-sub').textContent = msgs[Math.floor(Math.random() * msgs.length)];

    selectedMegaCourseId = '';
    selectedCourseId = '';
    const requestedPaymentCourseId = selectRequestedPaymentCourse();
    generateChapterList();
    restorePendingPaymentPrompt();
    if (requestedPaymentCourseId) {
        window.setTimeout(() => {
            document.getElementById('chapter-section-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
    }
    updateWallet();
    renderLeaderboard();
    renderCharts();
    renderAdminDashboard();
}

function setHomeSidebarButtonVisible(visible) {
    const button = document.getElementById('home-sidebar-btn');
    if (button) button.style.display = visible ? 'flex' : 'none';
    if (!visible) {
        closeHomeSidebar();
        closeHomeSectionTab();
    }
}

function isHomeSidebarOpen() {
    const sidebar = document.getElementById('home-sidebar');
    return Boolean(sidebar && sidebar.classList.contains('open'));
}

function isHomeSectionTabOpen() {
    const tab = document.getElementById('home-section-tab');
    return Boolean(tab && tab.classList.contains('open'));
}

function updateHomeSidebarUser() {
    const avatar = getDisplayAvatar(currentUser?.avatar);
    const name = currentUser?.name || 'Student';
    const email = currentUser?.email || auth?.currentUser?.email || 'Signed in';

    setTextContent('home-sidebar-avatar', avatar);
    setTextContent('home-sidebar-name', name);
    setTextContent('home-sidebar-email', email);
}

function toggleHomeSidebar() {
    if (isHomeSidebarOpen()) {
        closeHomeSidebar();
    } else {
        openHomeSidebar();
    }
}

function openHomeSidebar() {
    if (!currentUser) return;

    const sidebar = document.getElementById('home-sidebar');
    const backdrop = document.getElementById('home-sidebar-backdrop');
    if (!sidebar || !backdrop) return;

    updateHomeSidebarUser();
    sidebar.classList.add('open');
    sidebar.setAttribute('aria-hidden', 'false');
    backdrop.style.display = 'block';
}

function closeHomeSidebar() {
    const sidebar = document.getElementById('home-sidebar');
    const backdrop = document.getElementById('home-sidebar-backdrop');
    if (sidebar) {
        sidebar.classList.remove('open');
        sidebar.setAttribute('aria-hidden', 'true');
    }
    if (backdrop) backdrop.style.display = 'none';
}

function closeHomeSectionTab() {
    const tab = document.getElementById('home-section-tab');
    const backdrop = document.getElementById('home-section-tab-backdrop');
    if (tab) {
        tab.classList.remove('open');
        tab.setAttribute('aria-hidden', 'true');
    }
    if (backdrop) backdrop.style.display = 'none';
}

function getHomeSidebarSectionTitle(sectionId) {
    const titles = {
        'edit-profile': 'Edit Profile',
        settings: 'Settings',
        'contact-us': 'Contact Us',
        'about-us': 'About Us',
        'privacy-policy': 'Privacy Policy',
        'terms-of-use': 'Terms of Use',
        'refund-policy': 'Refund Policy'
    };

    return titles[sectionId] || titles['edit-profile'];
}

function getHomeSidebarSectionHtml(sectionId) {
    if (sectionId === 'edit-profile') {
        const currentName = escapeHtml(currentUser?.name || '');
        const currentAvatar = getDisplayAvatar(currentUser?.avatar);
        const avatarOptions = DISPLAY_AVATARS.map((avatar) => `
            <button class="sidebar-avatar-option ${avatar === currentAvatar ? 'selected' : ''}" data-avatar="${escapeHtml(avatar)}" onclick="selectSidebarAvatar(this)" type="button">
                ${escapeHtml(avatar)}
            </button>
        `).join('');

        selectedSidebarAvatar = currentAvatar;
        return `
            <h4>Edit Profile</h4>
            <p>Update how your name and avatar appear on LearnLoot.</p>
            <label class="sidebar-field">
                <span>Display name</span>
                <input id="sidebar-profile-name-input" type="text" maxlength="20" value="${currentName}" placeholder="Your name">
            </label>
            <div class="sidebar-field">
                <span>Avatar</span>
                <div class="sidebar-avatar-grid">${avatarOptions}</div>
            </div>
            <button class="btn btn-primary btn-sm sidebar-full-btn" onclick="saveSidebarProfile()">
                <i class="fas fa-floppy-disk"></i> Save Profile
            </button>
            <p class="sidebar-status" id="sidebar-section-status"></p>
        `;
    }

    if (sectionId === 'settings') {
        return `
            <h4>Settings</h4>
            <p>Adjust your quiz experience.</p>
            <button class="sidebar-setting-button ${soundEnabled ? 'active' : ''}" onclick="toggleSound(); openHomeSidebarSection('settings')" type="button">
                <i class="fas fa-volume-high"></i>
                <span>Sound Effects</span>
                <strong>${soundEnabled ? 'On' : 'Off'}</strong>
            </button>
            <button class="sidebar-setting-button ${musicEnabled ? 'active' : ''}" onclick="toggleMusic(); openHomeSidebarSection('settings')" type="button">
                <i class="fas fa-music"></i>
                <span>Ambient Music</span>
                <strong>${musicEnabled ? 'On' : 'Off'}</strong>
            </button>
            <button class="sidebar-setting-button ${document.body.classList.contains('dark') ? 'active' : ''}" onclick="toggleDark(); openHomeSidebarSection('settings')" type="button">
                <i class="fas fa-circle-half-stroke"></i>
                <span>Dark Mode</span>
                <strong>${document.body.classList.contains('dark') ? 'On' : 'Off'}</strong>
            </button>
            <button class="sidebar-setting-button sidebar-setting-danger" onclick="logoutUser()" type="button">
                <i class="fas fa-right-from-bracket"></i>
                <span>Logout</span>
                <strong>Exit</strong>
            </button>
        `;
    }

    if (sectionId === 'contact-us') {
        return `
            <h4>Support &amp; Contact</h4>
            <p>Welcome to <strong>LearnLoot Support</strong>.</p>
            <p>We are here to help you with account issues, quiz access, payment problems, reward points, withdrawal requests, technical errors, and general questions related to LearnLoot.</p>

            <h5>Contact Email</h5>
            <p>For any support query, please contact us at:</p>
            <p><strong><a href="mailto:learnloot777@gmail.com">learnloot777@gmail.com</a></strong></p>

            <h5>Response Time</h5>
            <p>Our support team usually responds within <strong>3 to 7 working days</strong>.</p>
            <p>Please note that response time may vary depending on the number of support requests, verification requirements, and the complexity of the issue.</p>

            <h5>What You Can Contact Us For</h5>
            <ul class="sidebar-copy-list">
                <li>Account login or signup issues</li>
                <li>Email verification problems</li>
                <li>Quiz access problems</li>
                <li>Payment-related issues</li>
                <li>Failed or duplicate payment queries</li>
                <li>Reward points not updated</li>
                <li>Withdrawal request queries</li>
                <li>Technical bugs or website errors</li>
                <li>Suspicious activity or fraud-related concerns</li>
                <li>General feedback or suggestions</li>
            </ul>

            <h5>Information to Include in Your Email</h5>
            <p>To help us resolve your issue faster, please include the following details in your email:</p>
            <ul class="sidebar-copy-list">
                <li>Your full name</li>
                <li>Registered email address</li>
                <li>Quiz name or quiz ID, if applicable</li>
                <li>Payment ID or screenshot, if payment-related</li>
                <li>Withdrawal request details, if applicable</li>
                <li>Screenshot of the issue, if available</li>
                <li>Short description of the problem</li>
            </ul>

            <h5>Payment Support</h5>
            <p>If your payment was deducted but the quiz was not unlocked, please email us with your registered email address, payment screenshot, transaction ID, and quiz name.</p>
            <p>After verification, we will either unlock the quiz or guide you with the next steps.</p>

            <h5>Reward Points &amp; Withdrawal Support</h5>
            <p>Reward points and withdrawals are subject to LearnLoot's verification process, anti-fraud checks, and admin approval.</p>
            <p>If you have a withdrawal-related issue, please mention your registered email address, withdrawal request date, and the number of points requested for withdrawal.</p>

            <h5>Important Note</h5>
            <p>LearnLoot is an educational platform that rewards students for learning consistency and quiz performance. Rewards are not guaranteed income and may be cancelled if cheating, fake accounts, suspicious activity, or violation of platform rules is found.</p>

            <h5>Support Email</h5>
            <p><strong><a href="mailto:learnloot777@gmail.com">learnloot777@gmail.com</a></strong></p>

            <h5>Response Time</h5>
            <div class="sidebar-info-box">
                <strong>3 to 7 working days</strong>
                <span>Please include your registered email and any screenshots or transaction details that can help us verify the issue.</span>
            </div>
        `;
    }

    if (sectionId === 'refund-policy') {
        return `
            <h4>Refund and Cancellation Policy</h4>
            <p><strong>Last Updated:</strong> 6/4/2026</p>
            <p>Welcome to <strong>LearnLoot</strong>.</p>
            <p>This Refund and Cancellation Policy explains how payments, cancellations, refunds, failed transactions, duplicate payments, quiz access, rewards, and withdrawal-related issues are handled on LearnLoot.</p>
            <p>By using LearnLoot and making any payment on the platform, you agree to this Refund and Cancellation Policy.</p>

            <h5>1. About LearnLoot</h5>
            <p>LearnLoot is an educational quiz and learning platform that helps students improve consistency, practice questions, and earn based on learning activity and quiz performance.</p>
            <p>Payments made on LearnLoot are for accessing premium educational quizzes, practice content, features, or learning services.</p>
            <p>LearnLoot earnings or withdrawal balances are separate from quiz access payments and are subject to verification, anti-fraud checks, and admin approval.</p>

            <h5>2. Free Demo Quiz</h5>
            <p>LearnLoot may provide one or more free demo quizzes for students to understand the platform before purchasing premium quiz access.</p>
            <p>Users are advised to try the free demo quiz before making any payment for premium quizzes.</p>

            <h5>3. Premium Quiz Payments</h5>
            <p>Some quizzes or learning content on LearnLoot may require payment before access is granted.</p>
            <p>After successful payment verification, the selected quiz or premium content will be unlocked for the user account used during the payment.</p>
            <p>Payments may be made through available payment methods such as UPI, cards, net banking, wallets, or other supported payment options.</p>

            <h5>4. Cancellation Policy</h5>
            <p>Once a premium quiz is successfully purchased and unlocked, cancellation is generally not allowed.</p>
            <p>A user cannot cancel a quiz access purchase after the quiz has been unlocked or attempted.</p>
            <p>Cancellation requests may be considered only if:</p>
            <ul class="sidebar-copy-list">
                <li>Payment was made by mistake and the quiz was not unlocked.</li>
                <li>Duplicate payment was made for the same quiz.</li>
                <li>Payment was deducted but access was not provided.</li>
                <li>A technical issue from LearnLoot's side prevented quiz access.</li>
            </ul>
            <p>LearnLoot reserves the right to approve or reject cancellation requests after verification.</p>

            <h5>5. Refund Eligibility</h5>
            <p>A refund may be considered in the following cases:</p>
            <ul class="sidebar-copy-list">
                <li>Payment was deducted but the quiz was not unlocked.</li>
                <li>Duplicate payment was made for the same quiz by the same user.</li>
                <li>Payment was successful, but LearnLoot failed to provide access due to a technical issue.</li>
                <li>The user was charged incorrectly.</li>
                <li>The payment was captured but the related service was not delivered.</li>
            </ul>
            <p>Refunds will not be provided in the following cases:</p>
            <ul class="sidebar-copy-list">
                <li>The user successfully accessed or attempted the premium quiz.</li>
                <li>The user changed their mind after purchase.</li>
                <li>The user selected the wrong quiz and accessed it.</li>
                <li>The user violated LearnLoot rules or anti-cheating policies.</li>
                <li>The account was suspended due to fake accounts, cheating, fraud, suspicious activity, or misuse.</li>
                <li>The user is dissatisfied with quiz difficulty after accessing the quiz.</li>
                <li>The user failed to complete the quiz due to internet issues, device issues, browser issues, or personal technical problems not caused by LearnLoot.</li>
                <li>The user expected guaranteed rewards or earnings.</li>
            </ul>

            <h5>6. Failed Payments</h5>
            <p>If your payment fails and money is not deducted, you may try again.</p>
            <p>If your payment fails but money is deducted from your bank account, the amount is usually reversed automatically by the bank or payment provider.</p>
            <p>If the amount is not reversed within the expected bank processing time, you may contact LearnLoot support with payment details.</p>

            <h5>7. Duplicate Payments</h5>
            <p>If a user makes duplicate payments for the same quiz using the same registered account, LearnLoot may verify the transaction and refund the duplicate amount.</p>
            <p>To request a duplicate payment refund, the user must provide:</p>
            <ul class="sidebar-copy-list">
                <li>Registered email address</li>
                <li>Quiz name or quiz ID</li>
                <li>Payment screenshot</li>
                <li>Transaction ID</li>
                <li>Razorpay payment ID, if available</li>
                <li>Date and time of payment</li>
            </ul>

            <h5>8. Payment Deducted but Quiz Not Unlocked</h5>
            <p>If payment is deducted but the quiz is not unlocked, please contact LearnLoot support.</p>
            <p>After verification, LearnLoot may:</p>
            <ul class="sidebar-copy-list">
                <li>Unlock the quiz manually, or</li>
                <li>Process a refund if access cannot be provided.</li>
            </ul>
            <p>Users must contact support with complete payment details for faster resolution.</p>

            <h5>9. Refund Processing Time</h5>
            <p>Approved refunds may take time to process depending on the payment gateway, bank, or payment method used.</p>
            <p>Refund processing may generally take 5 to 10 working days after approval, but the final credit timeline may depend on the user's bank or payment provider.</p>
            <p>LearnLoot is not responsible for delays caused by banks, payment gateways, or third-party payment providers.</p>

            <h5>10. Reward Points and Withdrawal Requests</h5>
            <p>Refunds are related only to payments made for quiz access or premium content.</p>
            <p>LearnLoot earnings, wallet cash, or withdrawal requests are handled separately.</p>
            <p>Rewards and withdrawals are subject to:</p>
            <ul class="sidebar-copy-list">
                <li>LearnLoot rules</li>
                <li>Minimum withdrawal limit</li>
                <li>User verification</li>
                <li>Quiz attempt verification</li>
                <li>Anti-cheating checks</li>
                <li>Fraud detection</li>
                <li>Admin approval</li>
            </ul>
            <p>LearnLoot reserves the right to cancel rewards or withdrawal requests if cheating, fake accounts, multiple accounts, suspicious activity, technical abuse, or violation of platform rules is detected.</p>

            <h5>12. User Responsibility</h5>
            <p>Before making any payment, users are responsible for:</p>
            <ul class="sidebar-copy-list">
                <li>Checking quiz details</li>
                <li>Checking quiz price</li>
                <li>Using the correct account</li>
                <li>Ensuring stable internet connection</li>
                <li>Trying the free demo quiz</li>
                <li>Reading the Terms and Conditions, Privacy Policy, and this Refund and Cancellation Policy</li>
            </ul>
            <p>LearnLoot will not be responsible for issues caused by incorrect user details, wrong account usage, personal device problems, or unstable internet connection.</p>

            <h5>13. Fraud, Cheating, and Misuse</h5>
            <p>Refunds may be denied if LearnLoot finds that the user has engaged in:</p>
            <ul class="sidebar-copy-list">
                <li>Cheating during quiz attempts</li>
                <li>Creating fake or multiple accounts</li>
                <li>Using another person's account</li>
                <li>Manipulating payment or reward systems</li>
                <li>Sharing premium quiz access</li>
                <li>Using bots, scripts, automation, or unfair methods</li>
                <li>Abusing technical bugs or loopholes</li>
                <li>Providing false refund claims</li>
            </ul>
            <p>LearnLoot may suspend or restrict such accounts without refund.</p>

            <h5>14. How to Request a Refund</h5>
            <p>To request a refund, email us at:</p>
            <p><strong><a href="mailto:learnloot777@gmail.com">learnloot777@gmail.com</a></strong></p>
            <p>Please include the following details:</p>
            <ul class="sidebar-copy-list">
                <li>Full name</li>
                <li>Registered email address</li>
                <li>Quiz name or quiz ID</li>
                <li>Payment amount</li>
                <li>Payment date and time</li>
                <li>Transaction ID</li>
                <li>Razorpay payment ID, if available</li>
                <li>Screenshot of payment</li>
                <li>Short explanation of the issue</li>
            </ul>
            <p>Incomplete refund requests may take longer to process.</p>

            <h5>15. Support Response Time</h5>
            <p>Our support team usually responds within <strong>3 to 7 working days</strong>.</p>
            <p>Response time may vary depending on the number of requests, payment verification requirements, and complexity of the issue.</p>
        `;
    }

    if (sectionId === 'about-us') {
        return `
            <h4>About Us</h4>
            <p>At LearnLoot, we believe education should be engaging, rewarding, and motivating for every student. Our mission is not just to give money to students — it is to inspire them to learn consistently by solving questions, improving their skills, and building strong academic habits.</p>
            <p>We are creating a platform where learning feels productive and exciting. By rewarding students for their efforts and performance, LearnLoot encourages discipline, curiosity, and regular practice — especially for competitive exams like JEE, MHT-CET, NEET, and more.</p>
            <p>Our goal is to help all types of students:</p>
            <ul class="sidebar-copy-list">
                <li>Students who need motivation to study regularly</li>
                <li>Students preparing for competitive exams</li>
                <li>Students who enjoy challenges and problem-solving</li>
                <li>Students who want to turn their learning time into something rewarding</li>
            </ul>
            <p>LearnLoot combines education with motivation, making studying more interactive, goal-oriented, and beneficial for everyone. We want students to develop the habit of solving questions daily — not because they are forced to, but because they are inspired to grow and earn through learning.</p>
            <p>We are not just building another quiz platform.</p>
            <p>We are building a learning ecosystem where knowledge, consistency, and effort are valued and rewarded.</p>
            <p><strong>Learn. Solve. Earn. Grow.</strong></p>
        `;
    }

    if (sectionId === 'terms-of-use') {
        return `
            <h4>Terms of Use</h4>
            <p>By using LearnLoot, you agree to use the platform honestly, follow quiz rules, and provide accurate account information.</p>

            <h5>Account Use</h5>
            <ul class="sidebar-copy-list">
                <li>Each student must use their own account.</li>
                <li>Do not share passwords, impersonate another user, or attempt unauthorized access.</li>
                <li>Email/password accounts are required for synced quiz access.</li>
            </ul>

            <h5>Quiz Integrity</h5>
            <ul class="sidebar-copy-list">
                <li>Camera, microphone, fullscreen, tab switching, copy, paste, and screenshot signals may be used to protect quiz fairness.</li>
                <li>Suspicious activity may lead to automatic submission, score review, reward cancellation, account limits, or removal from leaderboards.</li>
                <li>Recorded quiz evidence may be reviewed only by authorized administrators for integrity and support decisions.</li>
            </ul>

            <h5>Rewards</h5>
            <ul class="sidebar-copy-list">
                <li>Displayed cash or reward values are subject to validation and administrator review.</li>
                <li>Incorrect answers, rule violations, abuse, automation, or tampering may reduce or cancel rewards.</li>
                <li>Reward availability, payout methods, minimum thresholds, and timelines may change based on administrator policy.</li>
            </ul>

            <h5>Support and Data Requests</h5>
            <p>For account help, score review, recording review, reward questions, or data deletion requests, contact the LearnLoot administrator or support team with your registered email and quiz details.</p>
            <p><strong>LearnLoot Support Team</strong><br>Email: learnloot777@gmail.com</p>
        `;
    }

    return `
        <h4>Privacy Policy</h4>
        <p><strong>Last updated:</strong> May 11, 2026</p>
        <p>Welcome to LearnLoot. Your privacy is important to us. This Privacy Policy explains how LearnLoot collects, uses, stores, and protects your information when you use our platform, services, quizzes, website, and related features.</p>
        <p>By using LearnLoot, you agree to the practices described in this Privacy Policy.</p>

        <h5>1. Introduction</h5>
        <p>LearnLoot is an educational platform designed to motivate students through interactive quizzes, performance-based rewards, and learning activities. Our aim is to create a safe, transparent, and secure environment for students.</p>
        <p>We are committed to protecting user data and maintaining trust with our users.</p>

        <h5>2. Information We Collect</h5>
        <p>We may collect the following types of information:</p>
        <p><strong>a) Personal Information</strong></p>
        <ul class="sidebar-copy-list">
            <li>Full name</li>
            <li>Email address</li>
            <li>Mobile number</li>
            <li>Username/profile details</li>
            <li>Educational details such as exam preparation or class</li>
        </ul>
        <p><strong>b) Account & Usage Information</strong></p>
        <ul class="sidebar-copy-list">
            <li>Quiz performance and scores</li>
            <li>Time spent on quizzes</li>
            <li>Reward points/wallet balance</li>
            <li>Login activity</li>
            <li>Device/browser information</li>
            <li>IP address</li>
        </ul>
        <p><strong>c) Camera & Monitoring Data</strong></p>
        <p>To maintain fairness during tests and quizzes, LearnLoot may request access to webcam/video feed, face detection monitoring, and basic activity monitoring during exams.</p>
        <p>This data is used only for anti-cheating and exam integrity purposes. We do not sell webcam or monitoring data to third parties.</p>
        <p><strong>d) Payment & Reward Information</strong></p>
        <p>If LearnLoot provides rewards, withdrawals, or payments, we may collect UPI ID, wallet details, and transaction history. Payment processing may be handled securely through third-party payment providers.</p>
        <p><small><strong>Reward conversion:</strong> 100 points = 1 rupee.</small></p>

        <h5>3. How We Use Your Information</h5>
        <ul class="sidebar-copy-list">
            <li>Create and manage user accounts</li>
            <li>Conduct quizzes and tests</li>
            <li>Track performance and leaderboard rankings</li>
            <li>Provide rewards and wallet functionality</li>
            <li>Improve user experience</li>
            <li>Prevent cheating, fraud, and misuse</li>
            <li>Maintain platform security</li>
            <li>Send important updates and notifications</li>
        </ul>

        <h5>4. Webcam & Exam Monitoring Policy</h5>
        <p>For selected quizzes or competitive tests, camera permission may be mandatory and webcam monitoring may be used for anti-cheating purposes.</p>
        <p>Detection systems may monitor multiple faces, absence of face, suspicious device usage, and unusual activity during tests.</p>
        <p>Users who disable monitoring during restricted tests may face warnings or automatic submission of the test. LearnLoot uses monitoring only to maintain fairness and integrity in assessments.</p>

        <h5>5. Data Protection & Security</h5>
        <p>We implement reasonable security measures to protect user data, including secure databases, authentication systems, restricted access controls, and encrypted communication where applicable.</p>
        <p>However, no online platform can guarantee 100% security.</p>

        <h5>6. Sharing of Information</h5>
        <p>We do not sell personal information to third parties.</p>
        <ul class="sidebar-copy-list">
            <li>With trusted service providers required for platform operation</li>
            <li>For payment processing</li>
            <li>When required by law or legal authorities</li>
            <li>To prevent fraud, abuse, or security threats</li>
        </ul>

        <h5>7. Cookies & Analytics</h5>
        <p>LearnLoot may use cookies and analytics tools to improve website functionality, remember user preferences, analyze platform performance, and enhance the learning experience.</p>
        <p>Users can manage cookies through browser settings.</p>

        <h5>8. User Responsibilities</h5>
        <ul class="sidebar-copy-list">
            <li>Provide accurate information</li>
            <li>Not misuse the platform</li>
            <li>Not attempt cheating or unauthorized access</li>
            <li>Not exploit bugs or reward systems unfairly</li>
        </ul>
        <p>Violation of rules may result in account suspension or termination.</p>

        <h5>9. Children’s Privacy</h5>
        <p>LearnLoot is intended for students and learners. If users are below the age required by local laws, parental or guardian guidance is recommended while using the platform.</p>

        <h5>10. Third-Party Services</h5>
        <p>Our platform may use third-party tools or services including Firebase, payment gateways, analytics tools, and authentication services. These services may have their own privacy policies.</p>

        <h5>11. Data Retention</h5>
        <p>We may retain user data as long as necessary for account functionality, legal compliance, security purposes, and reward or transaction history.</p>
        <p>Users may request account deletion where applicable.</p>

        <h5>12. Changes to This Privacy Policy</h5>
        <p>LearnLoot may update this Privacy Policy from time to time. Updated versions will be posted on this page with the revised date.</p>
        <p>Continued use of the platform after updates means acceptance of the revised policy.</p>

        <h5>13. Contact Us</h5>
        <p>If you have any questions regarding this Privacy Policy, you can contact us at:</p>
        <p><strong>LearnLoot Support Team</strong><br>Email: learnloot777@gmail.com</p>
        <p><strong>LearnLoot</strong><br>Learn. Solve. Earn. Grow</p>
    `;
}

function openHomeSidebarSection(sectionId = 'edit-profile') {
    document.querySelectorAll('.home-sidebar-link').forEach((button) => {
        button.classList.toggle('active', button.dataset.sidebarSection === sectionId);
    });

    const tab = document.getElementById('home-section-tab');
    const backdrop = document.getElementById('home-section-tab-backdrop');
    const title = document.getElementById('home-section-tab-title');
    const body = document.getElementById('home-section-tab-body');
    if (!tab || !backdrop || !body) return;

    if (title) title.textContent = getHomeSidebarSectionTitle(sectionId);
    body.innerHTML = getHomeSidebarSectionHtml(sectionId);
    closeHomeSidebar();
    backdrop.style.display = 'block';
    tab.classList.add('open');
    tab.setAttribute('aria-hidden', 'false');

    const firstField = tab.querySelector('input, button');
    if (firstField) firstField.focus();
}

function selectSidebarAvatar(button) {
    selectedSidebarAvatar = button?.getAttribute('data-avatar') || getDisplayAvatar(currentUser?.avatar);
    document.querySelectorAll('.sidebar-avatar-option').forEach((option) => {
        option.classList.toggle('selected', option === button);
    });
}

async function saveSidebarProfile() {
    const status = document.getElementById('sidebar-section-status');
    const input = document.getElementById('sidebar-profile-name-input');
    const name = String(input?.value || '').trim();
    const avatar = getDisplayAvatar(selectedSidebarAvatar || currentUser?.avatar);

    if (!name) {
        if (status) {
            status.textContent = 'Please enter a display name.';
            status.className = 'sidebar-status error';
        }
        input?.focus();
        return;
    }

    if (status) {
        status.textContent = 'Saving profile...';
        status.className = 'sidebar-status';
    }

    try {
        if (auth?.currentUser && typeof auth.currentUser.updateProfile === 'function') {
            await auth.currentUser.updateProfile({ displayName: name });
        }

        if (isBackendEnabled()) {
            const response = await callBackend('/api/profile', {
                method: 'POST',
                body: { name, avatar }
            });
            applyCloudProfile(response.profile);
        } else {
            ensureBackendOrFallbackAvailable();
        }

        if (!isBackendEnabled() && db && currentUser?.uid) {
            await db.collection('users').doc(currentUser.uid).set({
                name,
                avatar,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        }

        currentUser = {
            ...currentUser,
            name,
            avatar
        };

        document.getElementById('user-avatar-display').textContent = getDisplayAvatar(avatar);
        document.getElementById('user-name-display').textContent = name;
        document.getElementById('welcome-avatar').textContent = getDisplayAvatar(avatar);
        document.getElementById('welcome-name').textContent = `Welcome, ${name}!`;
        updateHomeSidebarUser();

        if (status) {
            status.textContent = 'Profile updated.';
            status.className = 'sidebar-status success';
        }
    } catch (error) {
        console.error('Profile update failed:', error);
        if (status) {
            status.textContent = 'Profile could not be saved. Please try again.';
            status.className = 'sidebar-status error';
        }
    }
}

function showProfileOptions() {
    openHomeSidebar();
}

function logoutUser() {
    if (confirm('Log out? Your progress data will be saved.')) {
        closeHomeSectionTab();
        closeHomeSidebar();
        if (auth) auth.signOut();
    }
}

// ============================================================
// ===== QUIZ SETTINGS =====
// ============================================================
const POINTS_PER_QUESTION = 50;
const INCORRECT_POINTS_PENALTY = 50;
const CHAPTER_QUESTION_LIMIT = 100;
const CHAPTER_PART_SIZE = 20;
const QUIZ_QUESTIONS_PER_ATTEMPT = CHAPTER_PART_SIZE;
const NUMERICAL_VARIANTS_PER_ATTEMPT = 2;
let currentDifficulty = 'all';

const QUIZ_TOTAL_SECONDS = 40 * 60;
const DIFF_TIMES  = { all: QUIZ_TOTAL_SECONDS };
const DIFF_LABELS = { all: 'All Questions' };
const DIFF_CLASS  = { all: 'all' };

function openDifficultyModal(ch) {
    openChapterParts(ch);
}

function closeDifficultyModal() {
    closeChapterPartsModal();
    const modal = document.getElementById('difficulty-modal');
    if (modal) modal.style.display = 'none';
}

function selectDifficulty() {
    closeDifficultyModal();
}

function closeChapterPartsModal() {
    const modal = document.getElementById('chapter-parts-modal');
    if (modal) modal.remove();
    activeChapterPurchaseContext = null;
}

function getAttemptLabel() {
    return currentPartLabel || DIFF_LABELS[currentDifficulty] || 'All Questions';
}

function getQuizAccessContext(chapterName, partNumber = 1) {
    const matchingActiveContext = activeChapterPurchaseContext?.chapter === chapterName
        ? activeChapterPurchaseContext
        : null;
    return {
        courseId: matchingActiveContext?.courseId || getSelectedPaymentCourseId(),
        chapterIndex: Number.isInteger(matchingActiveContext?.chapterIndex)
            ? matchingActiveContext.chapterIndex
            : getSelectedCourseChapterIndex(chapterName),
        quizIndex: Math.max(0, Number(partNumber || 1) - 1)
    };
}

function showLockedQuizModal(courseId) {
    lockedQuizCourseId = String(courseId || '').trim();
    const modal = document.getElementById('locked-quiz-modal');
    if (!modal) return;
    modal.classList.add('active');
}

function closeLockedQuizModal() {
    lockedQuizCourseId = '';
    document.getElementById('locked-quiz-modal')?.classList.remove('active');
}

function buyLockedQuizCourse() {
    const courseId = lockedQuizCourseId;
    closeLockedQuizModal();
    buyCourse(courseId);
}

function showPendingPaymentModal(courseId = getPendingCourseId()) {
    const normalizedCourseId = String(courseId || '').trim();
    if (!isKnownPaymentCourse(normalizedCourseId) || isCoursePurchased(normalizedCourseId)) return;

    localStorage.setItem(LEARNLOOT_PENDING_COURSE_KEY, normalizedCourseId);
    const courseName = document.getElementById('pending-payment-course-name');
    if (courseName) {
        courseName.textContent = paymentCourseNames[normalizedCourseId] || normalizedCourseId;
    }
    document.getElementById('pending-payment-modal')?.classList.add('active');
}

function closePendingPaymentModal() {
    document.getElementById('pending-payment-modal')?.classList.remove('active');
}

async function refreshVerifiedPurchases(options = {}) {
    const showFeedback = Boolean(options.showFeedback);
    if (!currentUser || purchaseRefreshInProgress) return false;

    purchaseRefreshInProgress = true;
    const refreshButton = document.getElementById('refresh-purchase-status-btn');
    if (refreshButton) {
        refreshButton.disabled = true;
        refreshButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying';
    }
    const chapterContext = activeChapterPurchaseContext
        ? { ...activeChapterPurchaseContext }
        : null;

    try {
        const response = await callBackend('/api/payments/purchases');
        setVerifiedPurchasedCourses(response.purchasedCourseIds || []);
        const pendingCourseId = getPendingCourseId();
        const pendingCoursePurchased = pendingCourseId && isCoursePurchased(pendingCourseId);

        if (pendingCoursePurchased) {
            localStorage.removeItem(LEARNLOOT_PENDING_COURSE_KEY);
            closePendingPaymentModal();
            closeLockedQuizModal();
        }

        if (chapterContext) closeChapterPartsModal();
        refreshCoursePurchaseUI();
        generateChapterList();
        if (
            chapterContext?.chapter
            && chapterContext.courseId
            && isCoursePurchased(chapterContext.courseId)
        ) {
            openChapterParts(chapterContext.chapter, chapterContext.chapterIndex);
        }

        if (showFeedback) {
            showPointsNotification(
                pendingCoursePurchased
                    ? `${paymentCourseNames[pendingCourseId] || 'Course'} unlocked successfully.`
                    : 'Payment is not verified yet. The course remains locked.',
                pendingCoursePurchased ? 'points-added' : 'points-lost'
            );
        }
        return Boolean(pendingCoursePurchased);
    } catch (error) {
        console.error('Purchase verification refresh failed:', error);
        if (showFeedback) {
            showPointsNotification(error.message || 'Could not verify payment status.', 'points-lost');
        }
        return false;
    } finally {
        purchaseRefreshInProgress = false;
        if (refreshButton) {
            refreshButton.disabled = false;
            refreshButton.innerHTML = '<i class="fas fa-rotate"></i> Refresh Unlock Status';
        }
    }
}

async function refreshPendingPurchaseStatus() {
    await refreshVerifiedPurchases({ showFeedback: true });
}

function restorePendingPaymentPrompt() {
    const courseId = getPendingCourseId();
    if (!courseId) return;
    if (isCoursePurchased(courseId)) {
        localStorage.removeItem(LEARNLOOT_PENDING_COURSE_KEY);
        return;
    }
    window.setTimeout(async () => {
        const unlocked = await refreshVerifiedPurchases();
        if (!unlocked && getPendingCourseId()) showPendingPaymentModal(courseId);
    }, 250);
}

function openChapterParts(ch, chapterIndex = null) {
    closeChapterPartsModal();

    const chapterTitle = getChapterDisplayName(ch);
    const totalQs = getChapterQuestionCount(ch);
    if (totalQs === 0) {
        alert('No questions are available for this chapter yet.');
        return;
    }

    const totalParts = getChapterPartCount(ch);
    const resolvedChapterIndex = chapterIndex !== null
        && chapterIndex !== ''
        && Number.isInteger(Number(chapterIndex))
        ? Number(chapterIndex)
        : getSelectedCourseChapterIndex(ch);
    const paymentCourseId = getSelectedPaymentCourseId();
    const coursePurchased = isCoursePurchased(paymentCourseId);
    activeChapterPurchaseContext = {
        chapter: ch,
        chapterIndex: resolvedChapterIndex,
        courseId: paymentCourseId
    };
    const pausedInfo = pausedTestState?.chapter === ch
        ? getChapterPartInfo(ch, pausedTestState.partNumber || 1)
        : null;

    const partsHtml = range(1, totalParts).map((partNumber) => {
        const info = getChapterPartInfo(ch, partNumber);
        const quizIndex = partNumber - 1;
        const accessible = canAccessQuiz(paymentCourseId, resolvedChapterIndex, quizIndex);
        const isDemo = !coursePurchased && isFreeDemoQuiz(resolvedChapterIndex, quizIndex);
        const isLocked = !accessible;
        const isPausedPart = pausedInfo && pausedInfo.partNumber === partNumber;
        const isAttemptedPart = hasAttemptedQuizPart(ch, partNumber);
        const actionLabel = isLocked
            ? 'Locked'
            : (isAttemptedPart ? 'Attempted' : (isPausedPart ? 'Resume Quiz' : 'Start Quiz'));
        const actionIcon = isLocked ? 'fa-lock' : (isAttemptedPart ? 'fa-circle-check' : 'fa-play');
        const clickAction = isLocked
            ? `onclick="showLockedQuizModal('${paymentCourseId}')"`
            : (isAttemptedPart ? 'disabled' : `onclick='startTest(${escapeHtml(JSON.stringify(ch))}, ${partNumber})'`);
        return `
            <button class="part-option ${isPausedPart && !isLocked ? 'paused' : ''} ${isAttemptedPart && !isLocked ? 'attempted' : ''} ${isLocked ? 'locked-quiz' : ''}" type="button" ${clickAction}>
                <span class="part-number">Quiz ${partNumber}</span>
                <span class="part-range">Random quiz from ${totalQs} questions</span>
                <span class="part-count">${info.questionCount} questions${isAttemptedPart ? ' | Already attempted' : (isPausedPart ? ' | Resume available' : '')}</span>
                ${isLocked ? '<span class="lock-badge"><i class="fas fa-lock"></i> Locked</span>' : ''}
                ${isDemo ? '<span class="demo-badge"><i class="fas fa-gift"></i> Free Demo</span>' : ''}
                <span class="part-action"><i class="fas ${actionIcon}"></i> ${actionLabel}</span>
            </button>`;
    }).join('');

    document.body.insertAdjacentHTML('beforeend', `
        <div class="modal-overlay" id="chapter-parts-modal">
            <div class="modal-card part-modal">
                <div class="part-modal-header">
                    <div>
                        <h2>${escapeHtml(chapterTitle)}</h2>
                        <p class="modal-subtitle">${totalQs} questions available. Each quiz starts with a fresh random set of up to ${CHAPTER_PART_SIZE}.</p>
                    </div>
                    <button class="icon-btn" onclick="closeChapterPartsModal()" title="Close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="camera-start-warning" id="camera-start-warning"></div>
                <div class="part-grid">${partsHtml}</div>
            </div>
        </div>`);
}

// ============================================================
// ===== SOUND EFFECTS =====
// ============================================================
let soundEnabled = true;
let musicEnabled = false;
let audioCtx    = null;
let musicNodes  = [];
let musicGainNode = null;

function getAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
}

function playCorrectSound() {
    if (!soundEnabled) return;
    try {
        const ctx = getAudioCtx();
        [523.25, 659.25, 783.99].forEach((freq, i) => {
            const osc  = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = 'sine'; osc.frequency.value = freq;
            const t = ctx.currentTime + i * 0.13;
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.25, t + 0.04);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
            osc.start(t); osc.stop(t + 0.38);
        });
    } catch(e) {}
}

function playWrongSound() {
    if (!soundEnabled) return;
    try {
        const ctx = getAudioCtx();
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(280, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.45);
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.45);
    } catch(e) {}
}

function playTickSound() {
    if (!soundEnabled) return;
    try {
        const ctx = getAudioCtx();
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'square'; osc.frequency.value = 1200;
        gain.gain.setValueAtTime(0.07, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.06);
    } catch(e) {}
}

function playVictorySound() {
    if (!soundEnabled) return;
    try {
        const ctx = getAudioCtx();
        [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((freq, i) => {
            const osc  = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = 'sine'; osc.frequency.value = freq;
            const t = ctx.currentTime + i * 0.17;
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.28, t + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
            osc.start(t); osc.stop(t + 0.55);
        });
    } catch(e) {}
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    localStorage.setItem('jee_sound', soundEnabled);
    updateSoundBtn();
    if (soundEnabled) playCorrectSound();
}

function updateSoundBtn() {
    const btn = document.getElementById('sound-btn');
    if (btn) btn.innerHTML = soundEnabled
        ? '<i class="fas fa-volume-up"></i>'
        : '<i class="fas fa-volume-mute"></i>';
}

function toggleMusic() {
    musicEnabled = !musicEnabled;
    const btn = document.getElementById('music-btn');
    if (musicEnabled) {
        startAmbientMusic();
        if (btn) btn.classList.add('active');
    } else {
        stopAmbientMusic();
        if (btn) btn.classList.remove('active');
    }
}

function startAmbientMusic() {
    try {
        const ctx = getAudioCtx();
        musicGainNode = ctx.createGain();
        musicGainNode.gain.value = 0.055;
        musicGainNode.connect(ctx.destination);

        // Soft pad: detuned sine oscillators
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const osc3 = ctx.createOscillator();
        osc1.type = 'sine'; osc1.frequency.value = 220;    // A3
        osc2.type = 'sine'; osc2.frequency.value = 329.63; // E4
        osc3.type = 'sine'; osc3.frequency.value = 440.01; // A4 (slightly detuned)

        // LFO tremolo
        const lfo     = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.value = 0.25;
        lfoGain.gain.value  = 0.012;
        lfo.connect(lfoGain);
        lfoGain.connect(musicGainNode.gain);

        [osc1, osc2, osc3].forEach(o => o.connect(musicGainNode));
        [osc1, osc2, osc3, lfo].forEach(o => o.start());
        musicNodes = [osc1, osc2, osc3, lfo, lfoGain];
    } catch(e) {}
}

function stopAmbientMusic() {
    musicNodes.forEach(n => { try { if (n.stop) n.stop(); } catch(e) {} });
    musicNodes = [];
    if (musicGainNode) { try { musicGainNode.disconnect(); } catch(e) {} musicGainNode = null; }
}

// ============================================================
// ===== DARK MODE TOGGLE =====
// ============================================================
function toggleDark() {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    localStorage.setItem('jee_dark', isDark);
    const btn = document.getElementById('dark-btn');
    if (btn) btn.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
}

// ============================================================
// ===== LEADERBOARD =====
// ============================================================
let leaderboard = [];

function renderLeaderboard() {
    const container = document.getElementById('leaderboard-list');
    if (!container) return;

    if (leaderboard.length === 0) {
        container.innerHTML = `
            <div class="text-center" style="padding:2rem;">
                <i class="fas fa-trophy fa-3x mb-2" style="color:var(--warning);opacity:0.5;"></i>
                <p style="color:var(--text-secondary);margin-top:1rem;">No users yet. Sign in or complete a test to appear here!</p>
            </div>`;
        return;
    }

    const medals = ['🥇','🥈','🥉'];
    container.innerHTML = leaderboard.slice(0, MAX_LEADERBOARD_USERS).map((e, i) => `
        <div class="leaderboard-item rank-${i < 3 ? i+1 : 'other'}">
            <div class="lb-rank">${medals[i] || `#${i+1}`}</div>
            <div class="lb-avatar">${escapeHtml(getDisplayAvatar(e.avatar))}</div>
            <div class="lb-info">
                <strong>${escapeHtml(e.name || 'Student')}</strong>
                <span>${Number(e.testsCompleted || 0)} tests completed</span>
            </div>
            <div class="lb-score">
                <strong style="color:var(--warning)">Cash ${Number(e.totalPoints || 0)}</strong>
            </div>
        </div>
    `).join('');
}

function getAccuracyText(correct, attempted) {
    if (!attempted) return '0% accuracy';
    return `${Math.round((Number(correct || 0) / Number(attempted || 1)) * 100)}% accuracy`;
}

function formatTimeSpent(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
}

// ============================================================
// ===== PERFORMANCE CHARTS =====
// ============================================================
let accuracyChartInst = null;
let chapterChartInst  = null;
let testHistory = [];

function getAttemptIdentity(attempt = {}) {
    return String(attempt.attemptId || attempt.clientAttemptId || attempt.quizSeed || '').trim();
}

function recordAttemptLocally(attempt) {
    const normalizedAttempt = normalizeAttemptData(attempt, currentUser);
    const nextIdentity = getAttemptIdentity(normalizedAttempt);
    if (nextIdentity) {
        testHistory = testHistory.filter((entry) => getAttemptIdentity(entry) !== nextIdentity);
    }
    testHistory.push(normalizedAttempt);
    if (testHistory.length > 100) testHistory = testHistory.slice(-100);
    chapterHistory = buildChapterHistoryFromAttempts(testHistory);
}

function renderCharts() {
    renderAccuracyChart();
    renderChapterChart();
}

function getChartCanvas(wrapperId, canvasId) {
    const wrapper = document.getElementById(wrapperId);
    if (!wrapper) return null;

    let canvas = document.getElementById(canvasId);
    if (!canvas) {
        wrapper.innerHTML = `<canvas id="${canvasId}"></canvas>`;
        canvas = document.getElementById(canvasId);
    }

    return canvas;
}

function renderAccuracyChart() {
    const canvas = getChartCanvas('accuracy-chart-wrap', 'accuracyChart');
    if (!canvas) return;

    if (accuracyChartInst) { accuracyChartInst.destroy(); accuracyChartInst = null; }

    const recent = testHistory.slice(-10);
    if (recent.length === 0) {
        document.getElementById('accuracy-chart-wrap').innerHTML = `
            <div class="chart-empty">
                <i class="fas fa-chart-line fa-2x" style="opacity:0.3;"></i>
                <span>Complete tests to see your accuracy trend!</span>
            </div>`;
        return;
    }

    const isDark = document.body.classList.contains('dark');
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';

    accuracyChartInst = new Chart(canvas, {
        type: 'line',
        data: {
            labels: recent.map((t, i) => {
                const offset = testHistory.length - recent.length + i + 1;
                return `T${offset}`;
            }),
            datasets: [{
                label: 'Accuracy %',
                data: recent.map(t => t.accuracy),
                borderColor: '#4361ee',
                backgroundColor: 'rgba(67,97,238,0.12)',
                fill: true,
                tension: 0.45,
                pointBackgroundColor: recent.map(t =>
                    t.accuracy >= 80 ? '#4cc9f0' : t.accuracy >= 50 ? '#f9c74f' : '#f94144'
                ),
                pointRadius: 6, pointHoverRadius: 9,
                borderWidth: 2.5,
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => ` ${ctx.parsed.y}% — ${recent[ctx.dataIndex].chapter.substring(0,20)}`
                    }
                }
            },
            scales: {
                y: {
                    min: 0, max: 100,
                    ticks: { color: textColor, callback: v => v + '%' },
                    grid: { color: gridColor }
                },
                x: {
                    ticks: { color: textColor },
                    grid: { color: gridColor }
                }
            }
        }
    });
}

function renderChapterChart() {
    const canvas = getChartCanvas('chapter-chart-wrap', 'chapterChart');
    if (!canvas) return;

    if (chapterChartInst) { chapterChartInst.destroy(); chapterChartInst = null; }

    // Best accuracy per chapter
    const best = {};
    testHistory.forEach(t => {
        if (!best[t.chapter] || t.accuracy > best[t.chapter]) best[t.chapter] = t.accuracy;
    });

    const labels = Object.keys(best);
    const data   = Object.values(best);

    if (labels.length === 0) {
        document.getElementById('chapter-chart-wrap').innerHTML = `
            <div class="chart-empty">
                <i class="fas fa-chart-bar fa-2x" style="opacity:0.3;"></i>
                <span>Complete tests to see chapter performance!</span>
            </div>`;
        return;
    }

    const isDark = document.body.classList.contains('dark');
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';

    chapterChartInst = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: labels.map(l => l.length > 14 ? l.substring(0,14)+'…' : l),
            datasets: [{
                label: 'Best Accuracy %',
                data,
                backgroundColor: data.map(v =>
                    v >= 80 ? 'rgba(76,201,240,0.75)' :
                    v >= 50 ? 'rgba(249,199,79,0.75)' :
                              'rgba(249,65,68,0.75)'
                ),
                borderRadius: 8,
                borderSkipped: false,
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    min: 0, max: 100,
                    ticks: { color: textColor, callback: v => v + '%' },
                    grid: { color: gridColor }
                },
                x: {
                    ticks: { color: textColor, maxRotation: 30 },
                    grid: { display: false }
                }
            }
        }
    });
}

// ============================================================
// ===== QUIZ STATE =====
// ============================================================
let totalPoints            = 0;
let testsCompleted         = 0;
let sessionPoints          = 0;
let totalTimeSpent         = 0;
let totalCorrectAnswers    = 0;
let totalQuestionsAttempted = 0;
let qList   = [];
let index   = 0;
let answers = [];
let marked  = [];
let timedOutQuestions = [];
let resumeAnswerLockIndex = -1;
let time    = QUIZ_TOTAL_SECONDS;
let timer;
let quizTimerEndsAt = 0;
let lastProgressAutosaveAt = 0;
let questionAdvanceTimeout = null;
let currentChapter  = '';
let currentPartNumber = 1;
let currentPartLabel = '';
let currentQuizSeed = '';
let currentQuestionIds = [];
let optionSelected  = false;
let chapterHistory  = {};
let startTime;
let elapsedTimeBeforePauseMs = 0;
let liveDemoWalletBalance = 0;
let selectedMegaCourseId = '';
let selectedCourseId = '';
let activeChapterPurchaseContext = null;
let lockedQuizCourseId = '';
let pageExitInProgress = false;
let hiddenViolationTimeout = null;

const CLASS_11_MATH_CHAPTERS = [
    'Basic Mathematics',
    'Sets and Relations',
    'Functions',
    'Trigonometric Ratios and Identities',
    'Trigonometric Equations',
    'Inverse Trigonometric Functions',
    'Heights and Distances',
    'Complex Numbers',
    'Quadratic Equation',
    'Sequences and Series',
    'Binomial Theorem',
    'Permutation and Combination',
    'Probability',
    'Straight Lines',
    'Circle',
    'Parabola',
    'Ellipse',
    'Hyperbola',
    'Properties of Triangles',
    'Mathematical Reasoning',
    'Statistics'
];

const CLASS_12_MATH_CHAPTERS = [
    'Matrices',
    'Determinants',
    'Vector Algebra',
    'Three Dimensional Geometry',
    'Limits',
    'Continuity and Differentiability',
    'Differentiation',
    'Application of Derivatives',
    'Indefinite Integration',
    'Definite Integration',
    'Area Under Curves',
    'Differential Equations'
];

const JEE_MATH_PREFIX = 'JEE Maths - ';
const toJeeMathChapterEntries = (chapterNames) => chapterNames.map((name) => ({
    name: `${JEE_MATH_PREFIX}${name}`,
    title: name
}));

const MHT_CET_PHYSICS_PREFIX = 'MHT-CET Physics - ';
const MHT_CET_CHEMISTRY_PREFIX = 'MHT-CET Chemistry - ';

const getCourseChapterName = (entry) => {
    if (entry && typeof entry === 'object') return String(entry.name || entry.id || entry.title || '').trim();
    return String(entry || '').trim();
};

const getCourseChapterTitle = (entry) => {
    if (entry && typeof entry === 'object') return String(entry.title || entry.label || getCourseChapterName(entry)).trim();
    return getChapterDisplayName(entry);
};

const toMhtCetChapterEntries = (prefix, chapterNames) => chapterNames.map((entry) => {
    const name = getCourseChapterName(entry);
    const title = getCourseChapterTitle(entry);
    return {
        name: `${prefix}${title}`,
        title
    };
});

const CLASS_11_PHYSICS_CHAPTERS = [
    'Units and Dimensions',
    'Mathematics in Physics (Vectors, Calculus Basics)',
    'Motion in One Dimension',
    'Motion in Two Dimensions',
    'Laws of Motion',
    'Work, Power and Energy',
    'Center of Mass, Momentum and Collision',
    'Rotational Motion',
    'Gravitation',
    'Mechanical Properties of Solids',
    'Mechanical Properties of Fluids',
    'Thermal Properties of Matter',
    'Kinetic Theory of Gases',
    'Thermodynamics',
    'Oscillations',
    'Waves and Sound'
];

const CLASS_12_PHYSICS_CHAPTERS = [
    'Electrostatics',
    'Capacitance',
    'Current Electricity',
    'Magnetic Effects of Current',
    'Magnetic Properties of Matter',
    'Electromagnetic Induction',
    'Alternating Current',
    'Electromagnetic Waves',
    'Ray Optics',
    'Wave Optics',
    'Dual Nature of Matter',
    'Atomic Physics',
    'Nuclear Physics',
    'Semiconductors',
    'Experimental Physics'
];

const CLASS_11_JEE_CHEMISTRY_CHAPTERS = [
    'Some Basic Concepts of Chemistry',
    'Structure of Atom',
    'Periodic Classification',
    'Chemical Bonding',
    { name: 'Chemistry - Thermodynamics', title: 'Thermodynamics' },
    'Chemical Equilibrium',
    'Ionic Equilibrium',
    'Redox Reactions',
    'General Organic Chemistry (GOC)',
    'Hydrocarbons'
];

const CLASS_12_JEE_CHEMISTRY_CHAPTERS = [
    'Solutions',
    'Electrochemistry',
    'Chemical Kinetics',
    'd & f Block',
    'Coordination Compounds',
    'p-Block (13 & 14)',
    'p-Block (15-18)',
    'Haloalkanes & Haloarenes',
    'Alcohols, Phenols & Ethers',
    'Aldehydes & Ketones',
    'Carboxylic Acid Derivatives',
    'Amines',
    'Biomolecules',
    'Practical Chemistry'
];

const CHAPTER_DISPLAY_NAMES = {
    'Chemistry - Thermodynamics': 'Thermodynamics'
};

const COURSE_CATALOG = [
    {
        id: 'class-11-math',
        title: 'Class 11 Mathematics',
        icon: 'fa-square-root-variable',
        description: `${CLASS_11_MATH_CHAPTERS.length} JEE Maths chapters`,
        status: 'Open chapters',
        isEmpty: false,
        chapterNames: CLASS_11_MATH_CHAPTERS
    },
    {
        id: 'class-12-math',
        title: 'Class 12 Mathematics',
        icon: 'fa-infinity',
        description: `${CLASS_12_MATH_CHAPTERS.length} JEE Maths chapters`,
        status: 'Open chapters',
        isEmpty: false,
        chapterNames: CLASS_12_MATH_CHAPTERS
    },
    {
        id: 'class-11-physics',
        title: 'Class 11th Physics',
        icon: 'fa-atom',
        description: `${CLASS_11_PHYSICS_CHAPTERS.length} MHT-CET Physics chapters`,
        status: 'Open chapters',
        isEmpty: false,
        chapterNames: toMhtCetChapterEntries(MHT_CET_PHYSICS_PREFIX, CLASS_11_PHYSICS_CHAPTERS)
    },
    {
        id: 'class-12-physics',
        title: 'Class 12th Physics',
        icon: 'fa-atom',
        description: `${CLASS_12_PHYSICS_CHAPTERS.length} MHT-CET Physics chapters`,
        status: 'Open chapters',
        isEmpty: false,
        chapterNames: toMhtCetChapterEntries(MHT_CET_PHYSICS_PREFIX, CLASS_12_PHYSICS_CHAPTERS)
    },
    {
        id: 'class-11-chemistry',
        title: 'Class 11th Chemistry',
        icon: 'fa-flask-vial',
        description: `${CLASS_11_JEE_CHEMISTRY_CHAPTERS.length} MHT-CET Chemistry chapters`,
        status: 'Open chapters',
        isEmpty: false,
        chapterNames: toMhtCetChapterEntries(MHT_CET_CHEMISTRY_PREFIX, CLASS_11_JEE_CHEMISTRY_CHAPTERS)
    },
    {
        id: 'class-12-chemistry',
        title: 'Class 12th Chemistry',
        icon: 'fa-flask-vial',
        description: `${CLASS_12_JEE_CHEMISTRY_CHAPTERS.length} MHT-CET Chemistry chapters`,
        status: 'Open chapters',
        isEmpty: false,
        chapterNames: toMhtCetChapterEntries(MHT_CET_CHEMISTRY_PREFIX, CLASS_12_JEE_CHEMISTRY_CHAPTERS)
    }
];

const JEE_COURSE_OVERRIDES = {
    'class-11-math': {
        description: `${CLASS_11_MATH_CHAPTERS.length} JEE Maths chapters`,
        status: 'Open chapters',
        isEmpty: false,
        chapterNames: toJeeMathChapterEntries(CLASS_11_MATH_CHAPTERS)
    },
    'class-12-math': {
        description: `${CLASS_12_MATH_CHAPTERS.length} JEE Maths chapters`,
        status: 'Open chapters',
        isEmpty: false,
        chapterNames: toJeeMathChapterEntries(CLASS_12_MATH_CHAPTERS)
    },
    'class-11-physics': {
        description: `${CLASS_11_PHYSICS_CHAPTERS.length} JEE Physics chapters`,
        status: 'Open chapters',
        isEmpty: false,
        chapterNames: CLASS_11_PHYSICS_CHAPTERS
    },
    'class-12-physics': {
        description: `${CLASS_12_PHYSICS_CHAPTERS.length} JEE Physics chapters`,
        status: 'Open chapters',
        isEmpty: false,
        chapterNames: CLASS_12_PHYSICS_CHAPTERS
    },
    'class-11-chemistry': {
        description: `${CLASS_11_JEE_CHEMISTRY_CHAPTERS.length} JEE Chemistry chapters`,
        status: 'Open chapters',
        isEmpty: false,
        chapterNames: CLASS_11_JEE_CHEMISTRY_CHAPTERS
    },
    'class-12-chemistry': {
        description: `${CLASS_12_JEE_CHEMISTRY_CHAPTERS.length} JEE Chemistry chapters`,
        status: 'Open chapters',
        isEmpty: false,
        chapterNames: CLASS_12_JEE_CHEMISTRY_CHAPTERS
    }
};

const PAYMENT_COURSE_IDS = Object.freeze({
    'mht-cet-course': Object.freeze({
        'class-11-math': 'mhtcet-class-11-maths',
        'class-12-math': 'mhtcet-class-12-maths',
        'class-11-physics': 'mhtcet-class-11-physics',
        'class-12-physics': 'mhtcet-class-12-physics',
        'class-11-chemistry': 'mhtcet-class-11-chemistry',
        'class-12-chemistry': 'mhtcet-class-12-chemistry'
    }),
    'jee-course': Object.freeze({
        'class-11-math': 'jee-class-11-maths',
        'class-12-math': 'jee-class-12-maths',
        'class-11-physics': 'jee-class-11-physics',
        'class-12-physics': 'jee-class-12-physics',
        'class-11-chemistry': 'jee-class-11-chemistry',
        'class-12-chemistry': 'jee-class-12-chemistry'
    })
});

const MEGA_COURSE_CATALOG = [
    {
        id: 'mht-cet-course',
        title: 'MHT-CET Course',
        icon: 'fa-graduation-cap',
        description: 'Class 11th & 12th Maths, Physics, Chemistry',
        status: 'Open subjects',
        originalPrice: 1399,
        discountedPrice: 999,
        courseIds: COURSE_CATALOG.map((course) => course.id)
    },
    {
        id: 'jee-course',
        title: 'JEE Course',
        icon: 'fa-book-open-reader',
        description: 'Class 11th & 12th Maths, Physics, Chemistry',
        status: 'Open subjects',
        originalPrice: 1799,
        discountedPrice: 1499,
        courseIds: COURSE_CATALOG.map((course) => course.id)
    }
];

// DOM references (assigned after DOM loads)
let home, quiz, result, chapterList, historyList;

// ============================================================
// ===== PARTICLES =====
// ============================================================
function createParticles() {
    const container = document.getElementById('particles');
    if (!container) return;
    for (let i = 0; i < 28; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        const size = Math.random() * 10 + 5;
        p.style.cssText = `
            width:${size}px; height:${size}px;
            left:${Math.random()*100}%; top:${Math.random()*100}%;
            animation-delay:${Math.random()*6}s;
            animation-duration:${Math.random()*4+4}s;
        `;
        container.appendChild(p);
    }
}

// ============================================================
// ===== CHAPTER LIST =====
// ============================================================
function getMegaCourseById(megaCourseId) {
    return MEGA_COURSE_CATALOG.find((course) => course.id === megaCourseId) || null;
}

function getChapterEntryRecord(entry) {
    if (entry && typeof entry === 'object') {
        const name = String(entry.name || entry.id || entry.title || '').trim();
        const title = String(entry.title || entry.label || name).trim();
        return name ? { name, title: title || name } : null;
    }

    const name = String(entry || '').trim();
    return name ? { name, title: getChapterDisplayName(name) } : null;
}

function getChapterDisplayName(chapterName) {
    const name = String(chapterName || '').trim();
    if (name.startsWith(MHT_CET_PHYSICS_PREFIX)) return name.slice(MHT_CET_PHYSICS_PREFIX.length);
    if (name.startsWith(MHT_CET_CHEMISTRY_PREFIX)) return name.slice(MHT_CET_CHEMISTRY_PREFIX.length);
    return CHAPTER_DISPLAY_NAMES[name] || name;
}

function getCourseForMegaCourse(course, megaCourseId = selectedMegaCourseId) {
    if (!course) return null;
    const overrides = megaCourseId === 'jee-course' ? JEE_COURSE_OVERRIDES[course.id] : null;
    const paymentCourseId = PAYMENT_COURSE_IDS[megaCourseId]?.[course.id] || '';
    return overrides
        ? { ...course, ...overrides, paymentCourseId }
        : { ...course, paymentCourseId };
}

function getCourseById(courseId, megaCourseId = selectedMegaCourseId) {
    return getCourseForMegaCourse(
        COURSE_CATALOG.find((course) => course.id === courseId) || null,
        megaCourseId
    );
}

function getPaymentCourseRoute(paymentCourseId) {
    const targetCourseId = String(paymentCourseId || '').trim();
    for (const [megaCourseId, courseMap] of Object.entries(PAYMENT_COURSE_IDS)) {
        const courseEntry = Object.entries(courseMap).find(([, mappedCourseId]) => mappedCourseId === targetCourseId);
        if (courseEntry) {
            return {
                megaCourseId,
                courseId: courseEntry[0],
                paymentCourseId: targetCourseId
            };
        }
    }
    return null;
}

function getSelectedPaymentCourseId() {
    return getCourseById(selectedCourseId, selectedMegaCourseId)?.paymentCourseId || '';
}

function getSelectedCourseChapterIndex(chapterName) {
    const selectedCourse = getCourseById(selectedCourseId, selectedMegaCourseId);
    const chapterNames = Array.isArray(selectedCourse?.chapterNames) ? selectedCourse.chapterNames : [];
    return chapterNames
        .map(getChapterEntryRecord)
        .filter(Boolean)
        .findIndex((entry) => entry.name === chapterName);
}

function selectRequestedPaymentCourse() {
    let requestedCourseId = '';
    try {
        requestedCourseId = new URLSearchParams(window.location.search).get('courseId') || '';
    } catch (error) {
        requestedCourseId = '';
    }

    const route = getPaymentCourseRoute(requestedCourseId);
    if (!route) return '';

    selectedMegaCourseId = route.megaCourseId;
    selectedCourseId = route.courseId;
    return route.paymentCourseId;
}

function refreshCoursePurchaseUI() {
    const pendingCourseId = getPendingCourseId();
    document.querySelectorAll('[data-course-purchase-id]').forEach((card) => {
        const courseId = card.dataset.coursePurchaseId || '';
        const purchased = isCoursePurchased(courseId);
        const paymentPending = !purchased && courseId === pendingCourseId;
        const buyButton = card.querySelector('[data-buy-course]');
        const statusBadge = card.querySelector('[data-purchase-status]');

        card.classList.toggle('purchased-course', purchased);
        if (buyButton) {
            buyButton.hidden = purchased;
            buyButton.innerHTML = paymentPending
                ? '<i class="fas fa-rotate"></i> Check Payment'
                : '<i class="fas fa-bag-shopping"></i> Buy Now';
            buyButton.setAttribute(
                'onclick',
                paymentPending
                    ? `event.stopPropagation(); showPendingPaymentModal('${courseId}')`
                    : `event.stopPropagation(); buyCourse('${courseId}')`
            );
        }
        if (statusBadge) {
            statusBadge.className = purchased ? 'purchased-badge' : 'demo-available-badge';
            statusBadge.innerHTML = purchased
                ? '<i class="fas fa-circle-check"></i> Purchased'
                : (paymentPending
                    ? '<i class="fas fa-clock"></i> Verification Pending'
                    : '<i class="fas fa-gift"></i> Demo Available');
        }
    });
}

function setChapterSectionTitle(title, icon = 'fa-layer-group') {
    const titleEl = document.getElementById('chapter-section-title');
    if (!titleEl) return;
    titleEl.innerHTML = `<i class="fas ${icon}"></i> ${escapeHtml(title)}`;
}

function getCourseToolbarHtml(course, note = '') {
    return `
        <div class="course-toolbar">
            <button class="btn btn-secondary btn-sm" type="button" onclick="showCourseCards()">
                <i class="fas fa-arrow-left"></i> Subjects
            </button>
            <div class="course-toolbar-copy">
                <span>Selected Course</span>
                <h3>${escapeHtml(course.title)}</h3>
                ${note ? `<p>${escapeHtml(note)}</p>` : ''}
            </div>
        </div>`;
}

function getMegaCourseToolbarHtml(megaCourse) {
    return `
        <div class="course-toolbar">
            <button class="btn btn-secondary btn-sm" type="button" onclick="showMegaCourseCards()">
                <i class="fas fa-arrow-left"></i> Courses
            </button>
            <div class="course-toolbar-copy">
                <span>Selected Course</span>
                <h3>${escapeHtml(megaCourse.title)}</h3>
                <p>Choose Class 11th or 12th Maths, Physics, or Chemistry.</p>
            </div>
        </div>`;
}

function formatCoursePrice(price) {
    return `₹${Number(price || 0).toLocaleString('en-IN')}`;
}

function getCoursePriceHtml(megaCourse) {
    const originalPrice = Number(megaCourse?.originalPrice || 0);
    const discountedPrice = Number(megaCourse?.discountedPrice || 0);
    if (!originalPrice || !discountedPrice) return '';

    const discountPercent = Math.round(((originalPrice - discountedPrice) / originalPrice) * 100);
    return `
        <div class="course-card-price" aria-label="Discounted price ${formatCoursePrice(discountedPrice)}, original price ${formatCoursePrice(originalPrice)}">
            <strong>${formatCoursePrice(discountedPrice)}</strong>
            <del>${formatCoursePrice(originalPrice)}</del>
            <span>${discountPercent}% off</span>
        </div>`;
}

function getCoursePurchaseActionsHtml(course) {
    const paymentCourseId = course?.paymentCourseId || '';
    const purchased = isCoursePurchased(paymentCourseId);
    return `
        <div class="course-card-actions">
            <button class="course-card-status open-chapters-btn" type="button" onclick="event.stopPropagation(); selectCourse('${course.id}')">
                <i class="fas fa-folder-open"></i> Open Chapters
            </button>
            <button class="buy-now-btn" type="button" data-buy-course onclick="event.stopPropagation(); buyCourse('${paymentCourseId}')" ${purchased ? 'hidden' : ''}>
                <i class="fas fa-bag-shopping"></i> Buy Now
            </button>
            <span data-purchase-status class="${purchased ? 'purchased-badge' : 'demo-available-badge'}">
                <i class="fas ${purchased ? 'fa-circle-check' : 'fa-gift'}"></i>
                ${purchased ? 'Purchased' : 'Demo Available'}
            </span>
        </div>`;
}

function renderMegaCourseCards() {
    setChapterSectionTitle('Choose Your Course');
    chapterList.innerHTML = MEGA_COURSE_CATALOG.map((course, index) => `
        <button class="card course-card" type="button" onclick="selectMegaCourse('${course.id}')">
            <div class="course-card-icon"><i class="fas ${course.icon}"></i></div>
            <div class="chapter-number">${index + 1}</div>
            <h3>${escapeHtml(course.title)}</h3>
            <p>${escapeHtml(course.description)}</p>
            <span class="course-card-status">${escapeHtml(course.status)}</span>
        </button>`).join('');
}

function renderCourseCards() {
    const selectedMegaCourse = getMegaCourseById(selectedMegaCourseId);
    if (!selectedMegaCourse) {
        selectedMegaCourseId = '';
        renderMegaCourseCards();
        return;
    }

    const courseIds = Array.isArray(selectedMegaCourse.courseIds) ? selectedMegaCourse.courseIds : [];
    const courses = courseIds
        .map((courseId) => getCourseById(courseId, selectedMegaCourse.id))
        .filter(Boolean);
    setChapterSectionTitle(selectedMegaCourse.title, selectedMegaCourse.icon);
    chapterList.innerHTML = getMegaCourseToolbarHtml(selectedMegaCourse) + courses.map((course, index) => `
        <article class="card course-card ${course.isEmpty ? 'course-card-empty' : ''}" data-course-purchase-id="${course.paymentCourseId}" onclick="selectCourse('${course.id}')">
            <div class="course-card-icon"><i class="fas ${course.icon}"></i></div>
            <div class="chapter-number">${index + 1}</div>
            <h3>${escapeHtml(course.title)}</h3>
            ${getCoursePriceHtml(selectedMegaCourse)}
            ${getCoursePurchaseActionsHtml(course)}
        </article>`).join('');
    refreshCoursePurchaseUI();
}

function selectMegaCourse(megaCourseId) {
    selectedMegaCourseId = megaCourseId;
    selectedCourseId = '';
    generateChapterList();
}

function selectCourse(courseId) {
    selectedCourseId = courseId;
    generateChapterList();
}

function showCourseCards() {
    selectedCourseId = '';
    generateChapterList();
}

function showMegaCourseCards() {
    selectedMegaCourseId = '';
    selectedCourseId = '';
    generateChapterList();
}

function generateChapterList() {
    chapterList = document.getElementById('chapter-list');
    historyList = document.getElementById('history-list');
    if (!chapterList) return;

    clearStalePausedTestState();
    chapterList.innerHTML = '';
    const selectedCourse = getCourseById(selectedCourseId, selectedMegaCourseId);
    if (!selectedCourse) {
        selectedCourseId = '';
        renderCourseCards();
        updateDashboard();
        updateHistory();
        return;
    }

    setChapterSectionTitle(selectedCourse.title, selectedCourse.icon);

    if (selectedCourse.isEmpty) {
        chapterList.innerHTML = `
            ${getCourseToolbarHtml(selectedCourse)}
            <div class="course-empty-state">
                <i class="fas fa-folder-open"></i>
                <h3>No chapters added yet</h3>
            </div>`;
        updateDashboard();
        updateHistory();
        return;
    }

    let num = 1;
    const rawChapterNames = Array.isArray(selectedCourse.chapterNames) && selectedCourse.chapterNames.length
        ? selectedCourse.chapterNames
        : getChapterNames();
    const chapterRecords = rawChapterNames
        .map(getChapterEntryRecord)
        .filter(Boolean);
    const toolbarHtml = getCourseToolbarHtml(selectedCourse, `${chapterRecords.length} chapters available below.`);

    if (chapterRecords.length === 0) {
        chapterList.innerHTML = `
            ${toolbarHtml}
            <div class="dashboard" style="grid-column:1/-1;text-align:center;">
                <h3 style="color:var(--warning);margin-bottom:0.75rem;">No chapters available</h3>
                <p style="color:var(--text-secondary);">Add questions to the chapter bank to show tests here.</p>
            </div>`;
        updateDashboard();
        updateHistory();
        return;
    }

    chapterList.innerHTML = toolbarHtml;
    chapterRecords.forEach((chapterRecord, chapterIndex) => {
        const ch           = chapterRecord.name;
        const chapterTitle = chapterRecord.title || getChapterDisplayName(ch);
        const history      = chapterHistory[ch] || [];
        const attempts     = history.length;
        const totalQs      = getChapterQuestionCount(ch);
        const partCount    = getChapterPartCount(ch);
        const perAttemptQs = Math.min(Number(getChapterRecord(ch)?.perPart || CHAPTER_PART_SIZE), totalQs);
        const bestAttempt  = attempts > 0
            ? history.reduce((best, attempt) => {
                if (!best) return attempt;
                if (attempt.accuracy > best.accuracy) return attempt;
                if (attempt.accuracy === best.accuracy && attempt.score > best.score) return attempt;
                return best;
            }, null)
            : null;
        const bestScore    = bestAttempt
            ? `${bestAttempt.score}/${bestAttempt.total || perAttemptQs}`
            : totalQs > 0 ? `0/${perAttemptQs}` : '-';
        const isPaused     = pausedTestState && pausedTestState.chapter === ch;

        chapterList.innerHTML += `
            <div class="card" onclick='openChapterParts(${escapeHtml(JSON.stringify(ch))}, ${chapterIndex})'>
                <div class="chapter-number">${num++}</div>
                <h3 style="padding-top:0.5rem;">${escapeHtml(chapterTitle)}</h3>
                <div class="chapter-info">
                    <p style="color:var(--text-secondary)">${totalQs} questions available | ${partCount} quizzes | ${perAttemptQs} per quiz</p>
                    ${isPaused ? '<p style="color:var(--warning);font-weight:700;margin-top:0.5rem;">Resume available</p>' : ''}
                    <div class="chapter-stats">
                        <div class="stat-item">
                            <span class="stat-value">${attempts}</span>
                            <span>Attempts</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${bestScore}</span>
                            <span>Best Score</span>
                        </div>
                    </div>
                </div>
            </div>`;
    });

    updateDashboard();
    updateHistory();
}

function getReferralCodeForCurrentUser() {
    return normalizeReferralCode(currentUser?.referralCode);
}

function getReferralLink() {
    const code = getReferralCodeForCurrentUser();
    const origin = window.location.origin || 'https://your-learnloot-site.netlify.app';
    return `${origin.replace(/\/+$/, '')}/signup?ref=${encodeURIComponent(code)}`;
}

async function copyTextToClipboard(text, successMessage) {
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
        } else {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.setAttribute('readonly', '');
            textarea.style.position = 'fixed';
            textarea.style.left = '-9999px';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            textarea.remove();
        }
        showPointsNotification(successMessage, 'points-added');
    } catch (error) {
        showPointsNotification('Could not copy. Please copy it manually.', 'points-lost');
    }
}

function copyReferralCode() {
    const code = getReferralCodeForCurrentUser();
    if (!code) {
        showPointsNotification('Referral code is still being generated. Refresh once after login.', 'points-lost');
        return;
    }
    copyTextToClipboard(code, 'Referral code copied.');
}

function copyReferralLink() {
    const code = getReferralCodeForCurrentUser();
    if (!code) {
        showPointsNotification('Referral link is not ready yet.', 'points-lost');
        return;
    }
    copyTextToClipboard(getReferralLink(), 'Referral link copied.');
}

function shareReferralOnWhatsApp() {
    const code = getReferralCodeForCurrentUser();
    if (!code) {
        showPointsNotification('Referral code is not ready yet.', 'points-lost');
        return;
    }
    const message = `Hey! Join LearnLoot and start learning with quizzes and reward points. Use my referral code: ${code}`;
    const shareUrl = `https://wa.me/?text=${encodeURIComponent(`${message} ${getReferralLink()}`)}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
}

function hideReferralCard() {
    const card = document.getElementById('referral-card');
    if (card) card.style.display = 'none';
}

function openReferralCard() {
    const card = document.getElementById('referral-card');
    if (!card) return;
    card.style.display = 'block';
    renderReferralCard();
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeReferralCard() {
    const card = document.getElementById('referral-card');
    if (!card) return;
    card.style.display = 'none';
    scrollToPageTop();
}

function renderReferralCard() {
    const container = document.getElementById('referral-content');
    if (!container) return;

    if (!currentUser) {
        container.innerHTML = '<div class="admin-empty">Sign in to view your referral code.</div>';
        return;
    }

    const readyCode = getReferralCodeForCurrentUser();
    const code = readyCode || 'Generating...';
    const link = readyCode ? getReferralLink() : 'Referral link will appear after your profile loads.';
    const totalReferrals = getNumericValue(currentUser.totalReferrals);
    const referralPoints = getNumericValue(currentUser.referralPoints);
    const historyHtml = referralHistory.length
        ? referralHistory.map((entry) => `
            <div class="referral-history-item ${entry.suspicious ? 'flagged' : ''}">
                <div>
                    <strong>${escapeHtml(entry.referredName || entry.referredEmail || entry.referredUserId || 'New user')}</strong>
                    <span>${escapeHtml(entry.referredEmail || entry.referredUserId || 'Referral user')}</span>
                </div>
                <div>
                    <strong>${formatPointAmount(entry.rewardPoints)} points</strong>
                    <span>${escapeHtml(entry.status)} | ${formatDateTime(entry.createdAtMs)}</span>
                </div>
            </div>
        `).join('')
        : '<div class="admin-empty">No referral history yet.</div>';

    container.innerHTML = `
        <div class="referral-grid">
            <div class="referral-code-box">
                <span>Your referral code</span>
                <strong>${escapeHtml(code)}</strong>
                <button class="btn btn-primary btn-sm" onclick="copyReferralCode()" type="button">
                    <i class="fas fa-copy"></i> Copy Code
                </button>
            </div>
            <div class="referral-link-box">
                <span>Referral link</span>
                <p>${escapeHtml(link)}</p>
                <div class="referral-actions">
                    <button class="btn btn-primary btn-sm" onclick="copyReferralLink()" type="button">
                        <i class="fas fa-link"></i> Copy Link
                    </button>
                    <button class="btn btn-success btn-sm" onclick="shareReferralOnWhatsApp()" type="button">
                        <i class="fab fa-whatsapp"></i> WhatsApp
                    </button>
                </div>
            </div>
        </div>
        <div class="referral-stats">
            <div class="stat-card">
                <div class="stat-number">${totalReferrals}</div>
                <div>Total Referrals</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${formatPointAmount(referralPoints)}</div>
                <div>Referral Points</div>
            </div>
        </div>
        ${referralPoints > 0 ? `<div class="referral-success-note">Congratulations! You earned ${formatPointAmount(REFERRAL_REWARD_POINTS)} LearnLoot Points for a successful referral.</div>` : ''}
        <div class="referral-history">
            <h3>Referral History</h3>
            ${historyHtml}
        </div>
        <div class="referral-terms">
            Invite your friends to LearnLoot and get ${formatPointAmount(REFERRAL_REWARD_POINTS)} when they sign up using your referral code. Referral rewards are LearnLoot Points and are subject to LearnLoot rules. Fake accounts, self-referrals, or suspicious activity may lead to cancellation of points.
        </div>
    `;
}

function updateDashboard() {
    const el = id => document.getElementById(id);
    if (el('tests-completed-display')) el('tests-completed-display').innerText = testsCompleted;
    if (el('total-points-display'))    el('total-points-display').innerText    = getCashEarnedDisplayValue();
    const acc = totalQuestionsAttempted > 0
        ? Math.round((totalCorrectAnswers / totalQuestionsAttempted) * 100)
        : 0;
    if (el('accuracy-display')) el('accuracy-display').innerText = `${acc}%`;
    const h = Math.floor(totalTimeSpent / 3600);
    const m = Math.floor((totalTimeSpent % 3600) / 60);
    if (el('time-spent-display')) el('time-spent-display').innerText = `${h}h ${m}m`;
    renderReferralCard();
}

function updateHistory() {
    const historySection = document.getElementById('history-section');
    if (historySection) historySection.style.display = currentUser?.isAdmin ? 'none' : 'block';
    if (currentUser?.isAdmin) return;

    historyList = document.getElementById('history-list');
    if (!historyList) return;

    if (testHistory.length === 0) {
        historyList.innerHTML = `
            <div class="text-center" style="padding:2rem;">
                <i class="fas fa-history fa-3x mb-2" style="color:var(--text-light);"></i>
                <p style="color:var(--text-secondary);margin-top:1rem;">No attempts yet. Start a test!</p>
            </div>`;
        return;
    }

    let html = '';
    [...testHistory].sort((a, b) => b.timestamp - a.timestamp).forEach((attempt) => {
        const suspiciousText = attempt.cheatLog.flagged
            ? '<div style="font-size:0.8rem;color:#fecaca;font-weight:700;">Suspicious Attempt</div>'
            : '';
        html += `
            <div class="leaderboard-item">
                <div>
                    <strong>${escapeHtml(getChapterDisplayName(attempt.chapter))}</strong>
                    <div style="font-size:0.85rem;color:rgba(255,255,255,0.6);">${escapeHtml(attempt.partLabel || 'Full Quiz')} | ${formatDateTime(attempt.timestamp)}</div>
                    ${suspiciousText}
                </div>
                <div style="text-align:right;">
                    <div style="font-weight:700;color:var(--success);">${attempt.score}/${attempt.total}</div>
                    <div style="font-size:0.85rem;color:rgba(255,255,255,0.6);">Cash ${attempt.points}</div>
                </div>
            </div>`;
    });
    historyList.innerHTML = html;
}

// ============================================================
// ===== QUIZ ENGINE =====
// ============================================================
async function startTest(ch, partNumber = 1) {
    clearStalePausedTestState();
    const partInfo = getChapterPartInfo(ch, partNumber);
    const accessContext = getQuizAccessContext(ch, partInfo.partNumber || partNumber);
    if (!canAccessQuiz(accessContext.courseId, accessContext.chapterIndex, accessContext.quizIndex)) {
        showLockedQuizModal(accessContext.courseId);
        return;
    }
    if (partInfo.questionCount === 0) {
        alert('No questions are available for this part yet.');
        return;
    }

    const isResumingRequestedPart = Boolean(
        pausedTestState
        && pausedTestState.chapter === ch
        && Number(pausedTestState.partNumber || 1) === partInfo.partNumber
    );
    if (hasAttemptedQuizPart(ch, partInfo.partNumber) && !isResumingRequestedPart) {
        alert('You have already attempted this quiz. Each quiz can be attempted only once.');
        return;
    }

    if (pausedTestState && pausedTestState.chapter === ch) {
        const pausedPartNumber = Number(pausedTestState.partNumber || 1);
        if (pausedPartNumber !== partInfo.partNumber) {
            if (!confirm('Starting this part will discard your paused test for this chapter. Continue?')) return;
            setPausedTestState(null);
        }
    }

    if (pausedTestState && pausedTestState.chapter !== ch) {
        setPausedTestState(null);
    }

    const isResumingSamePart = Boolean(
        pausedTestState
        && pausedTestState.chapter === ch
        && Number(pausedTestState.partNumber || 1) === partInfo.partNumber
    );
    let quizPayload = null;
    if (!isResumingSamePart) {
        try {
            quizPayload = await loadQuizQuestionsFromBackend(ch, partInfo.partNumber);
        } catch (error) {
            console.error('Could not load quiz questions from backend:', error);
            alert(error.message || 'Could not load quiz questions. Make sure the backend is running.');
            return;
        }
        if (!quizPayload.questions.length) {
            alert('No questions are available for this part yet.');
            return;
        }
        if (!quizPayload.attemptId) {
            alert('The backend did not issue a quiz attempt. Please refresh and try again.');
            return;
        }
    }

    const acceptedRecordingInstructions = await showPreQuizRecordingInstructions();
    if (!acceptedRecordingInstructions) return;

    currentRecordingAttemptId = String(Date.now());
    const cameraReady = await initCamera();
    if (!cameraReady) return;

    const fullscreenReady = await requireFullscreenBeforeQuiz();
    if (!fullscreenReady) {
        stopCamera();
        return;
    }

    if (pausedTestState && pausedTestState.chapter === ch) {
        const pausedPartNumber = Number(pausedTestState.partNumber || 1);
        if (pausedPartNumber === partInfo.partNumber) {
            currentChapter = pausedTestState.chapter;
            currentPartNumber = pausedTestState.partNumber || partInfo.partNumber;
            currentPartLabel = pausedTestState.partLabel || partInfo.label;
            currentQuizSeed = String(pausedTestState.quizSeed || '');
            currentQuizAttemptId = String(pausedTestState.quizAttemptId || pausedTestState.clientAttemptId || '');
            if (!currentQuizAttemptId) {
                setPausedTestState(null);
                stopCamera();
                alert('This paused test must be restarted because it was not issued by the backend.');
                return;
            }
            currentQuestionIds = Array.isArray(pausedTestState.questionIds)
                ? pausedTestState.questionIds.map((id) => String(id || '')).filter(Boolean)
                : [];
            if (!(await startRecording())) {
                stopCamera();
                return;
            }
            closeChapterPartsModal();
            resumePausedTest();
            return;
        }
    }

    clearInterval(timer);
    clearQuestionAdvanceTimeout();
    clearHiddenViolationTimeout();

    home    = document.getElementById('home');
    quiz    = document.getElementById('quiz');
    result  = document.getElementById('result');

    testStartSnapshot = {
        totalPoints,
        testsCompleted,
        totalTimeSpent,
        totalCorrectAnswers,
        totalQuestionsAttempted
    };

    const activePartInfo = quizPayload?.partInfo || partInfo;
    currentDifficulty    = 'all';
    currentChapter       = ch;
    currentPartNumber    = Number(activePartInfo.partNumber || partInfo.partNumber);
    currentPartLabel     = activePartInfo.label || partInfo.label;
    qList = Array.isArray(quizPayload?.questions) ? quizPayload.questions.map(cloneQuizQuestion) : [];
    currentQuizAttemptId = String(quizPayload?.attemptId || '');
    currentQuizSeed = String(quizPayload?.quizSeed || '');
    currentQuestionIds = Array.isArray(quizPayload?.questionIds) && quizPayload.questionIds.length > 0
        ? quizPayload.questionIds.map((id) => String(id || '')).filter(Boolean)
        : qList.map((question) => question.questionId).filter(Boolean);
    if (qList.length === 0) {
        alert('No questions are available for this chapter yet.');
        stopCamera();
        home.style.display = 'block';
        quiz.style.display = 'none';
        result.style.display = 'none';
        setHomeSidebarButtonVisible(true);
        return;
    }
    index                = 0;
    answers              = new Array(qList.length).fill(null);
    marked               = new Array(qList.length).fill(false);
    timedOutQuestions    = new Array(qList.length).fill(false);
    resumeAnswerLockIndex = -1;
    sessionPoints        = 0;
    optionSelected       = false;
    liveDemoWalletBalance = Number(testStartSnapshot.totalPoints || 0);
    elapsedTimeBeforePauseMs = 0;
    cheatLog             = createEmptyCheatLog();
    fullscreenWarningGiven = false;
    currentQuestionStartedAt = 0;
    questionResumeCarryMs = 0;
    quizTimerEndsAt = 0;
    time                 = QUIZ_TOTAL_SECONDS;
    startTime            = Date.now();

    if (!(await startRecording())) {
        stopCamera();
        return;
    }
    if (!currentQuizAttemptId) {
        alert('The backend-issued quiz attempt is missing. Please start the quiz again.');
        stopCamera();
        home.style.display = 'block';
        quiz.style.display = 'none';
        result.style.display = 'none';
        setHomeSidebarButtonVisible(true);
        return;
    }

    closeChapterPartsModal();
    home.style.display   = 'none';
    quiz.style.display   = 'block';
    result.style.display = 'none';
    setHomeSidebarButtonVisible(false);
    scrollToPageTop();

    document.getElementById('chapter-title').innerText   = `${getChapterDisplayName(ch)} - ${currentPartLabel}`;
    document.getElementById('total-questions').innerText = qList.length;

    // Update difficulty badge
    const badge = document.getElementById('difficulty-badge');
    if (badge) {
        badge.textContent = currentPartLabel;
        badge.className   = `difficulty-badge ${DIFF_CLASS[currentDifficulty]}`;
    }

    buildNav();
    await showQuizScoringPopup();
    loadQ();
    startTimer();
    updateWallet();
    saveCurrentTestProgress();
}

function loadQ() {
    if (index >= qList.length) { submitTest(); return; }

    const q = qList[index];
    const isTimedOut = Boolean(timedOutQuestions[index]);
    if (isTimedOut) questionResumeCarryMs = 0;
    currentQuestionStartedAt = isTimedOut ? 0 : Date.now();
    const qTextEl = document.getElementById('qText');
    if (q.qHtml) {
        qTextEl.innerHTML = `<span>${index + 1}.</span> ${q.qHtml}`;
    } else {
        qTextEl.innerText = `${index + 1}. ${q.q}`;
    }
    document.getElementById('current-question').innerText = index + 1;

    let html = '';
    q.o.forEach((opt, i) => {
        const sel      = answers[index] === i;
        let cls = 'option';
        if (isTimedOut && !sel) cls += ' disabled';
        if (sel) cls += ' selected';
        const optionHtml = Array.isArray(q.oHtml) && q.oHtml[i]
            ? q.oHtml[i]
            : escapeHtml(opt);

        html += `<div class="${cls}" onclick="selectOption(${i})">
            <span style="font-weight:700">${String.fromCharCode(65+i)}.</span> ${optionHtml}
        </div>`;
    });
    document.getElementById('options').innerHTML = html;
    typesetQuizMath();

    highlightNav();
    updateButtonStates();
    updateMarkButton();
}

function typesetQuizMath() {
    const nodes = [
        document.getElementById('qText'),
        document.getElementById('options')
    ].filter(Boolean);

    if (!nodes.length) return;

    if (window.MathJax && typeof window.MathJax.typesetPromise === 'function') {
        if (typeof window.MathJax.typesetClear === 'function') {
            window.MathJax.typesetClear(nodes);
        }
        window.MathJax.typesetPromise(nodes).catch((error) => {
            console.warn('MathJax could not render quiz math:', error);
        });
        return;
    }

    window.setTimeout(() => {
        if (window.MathJax && typeof window.MathJax.typesetPromise === 'function') {
            typesetQuizMath();
        }
    }, 250);
}

function selectOption(i) {
    if (timedOutQuestions[index]) return;

    const hadAnswer = answers[index] !== null;
    answers[index] = i;
    if (resumeAnswerLockIndex === index) resumeAnswerLockIndex = -1;
    optionSelected = true;
    clearQuestionAdvanceTimeout();

    if (!hadAnswer) {
        const questionElapsedMs = questionResumeCarryMs + (currentQuestionStartedAt ? Math.max(0, Date.now() - currentQuestionStartedAt) : 0);
        const secondsTaken = Number((questionElapsedMs / 1000).toFixed(1));
        if (!cheatLog) cheatLog = createEmptyCheatLog();
        cheatLog.questionTimes.push({
            questionNumber: index + 1,
            secondsTaken,
            answered: true,
            correct: null
        });
        if (secondsTaken <= RAPID_ANSWER_SECONDS_THRESHOLD) cheatLog.rapidAnswerCount++;
        questionResumeCarryMs = 0;
    }

    const opts = document.querySelectorAll('.option');
    opts.forEach((optEl, optIndex) => {
        optEl.classList.toggle('selected', optIndex === i);
        optEl.classList.remove('disabled');
    });
    if (opts[i]) opts[i].style.animation = 'bounceIn 0.5s ease';

    updateWallet();
    highlightNav();
    updateButtonStates();
    updatePauseButtonState();
    saveCurrentTestProgress();
}

function createConfetti() {
    for (let i = 0; i < 20; i++) {
        const c = document.createElement('div');
        c.className = 'confetti';
        c.style.left = Math.random() * 100 + 'vw';
        c.style.background = ['var(--success)','var(--primary)','var(--warning)','var(--info)'][Math.floor(Math.random()*4)];
        c.style.animationDelay = Math.random() * 0.5 + 's';
        document.body.appendChild(c);
        setTimeout(() => c.remove(), 2000);
    }
}

function showPointsNotification(message, type) {
    const n = document.createElement('div');
    n.className = `points-notification ${type}`;
    n.innerHTML = `<i class="fas ${type === 'points-added' ? 'fa-check-circle' : 'fa-times-circle'}"></i> ${message}`;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 2600);
}

function updateWallet() {
    const el = document.getElementById('points');
    updateWithdrawButtonState();
    if (!el) return;

    const quizEl = document.getElementById('quiz');
    const maskPointsDuringTest = Boolean(
        quizEl
        && quizEl.style.display !== 'none'
        && testStartSnapshot
    );
    el.innerText = maskPointsDuringTest
        ? getCashEarnedDisplayValue(testStartSnapshot.totalPoints)
        : getCashEarnedDisplayValue();
}

function lockCurrentQuestionOnTimeout() {
    if (timedOutQuestions[index] || answers[index] !== null) return;

    const questionElapsedMs = questionResumeCarryMs + (currentQuestionStartedAt ? Math.max(0, Date.now() - currentQuestionStartedAt) : 0);
    const secondsTaken = Number((questionElapsedMs / 1000).toFixed(1));

    timedOutQuestions[index] = true;
    if (resumeAnswerLockIndex === index) resumeAnswerLockIndex = -1;
    optionSelected = false;
    questionResumeCarryMs = 0;
    currentQuestionStartedAt = 0;

    if (!cheatLog) cheatLog = createEmptyCheatLog();
    cheatLog.questionTimes.push({
        questionNumber: index + 1,
        secondsTaken,
        answered: false,
        correct: null
    });
    saveCurrentTestProgress();
}

function clearQuestionAdvanceTimeout() {
    if (questionAdvanceTimeout) {
        clearTimeout(questionAdvanceTimeout);
        questionAdvanceTimeout = null;
    }
    updatePauseButtonState();
}

function updatePauseButtonState() {
}

function restorePreTestState() {
    if (!testStartSnapshot) return;
    totalPoints = testStartSnapshot.totalPoints;
    totalCorrectAnswers = testStartSnapshot.totalCorrectAnswers;
    totalQuestionsAttempted = testStartSnapshot.totalQuestionsAttempted;
    timedOutQuestions = [];
    resumeAnswerLockIndex = -1;
    cheatLog = null;
    currentQuestionStartedAt = 0;
    questionResumeCarryMs = 0;
    quizTimerEndsAt = 0;
    liveDemoWalletBalance = Number(testStartSnapshot.totalPoints || 0);
    updateWallet();
    updateDashboard();
    testStartSnapshot = null;
}

function saveCurrentTestProgress(options = {}) {
    if (!currentChapter || !testStartSnapshot) return;
    syncQuizTimeRemaining();

    const { resumeAtNextQuestion = false } = options;
    const elapsedThisRun = startTime ? Math.max(0, Date.now() - startTime) : 0;
    const currentQuestionElapsedMs = currentQuestionStartedAt ? Math.max(0, Date.now() - currentQuestionStartedAt) : 0;
    const shouldResumeAtNextQuestion = Boolean(resumeAtNextQuestion && index < qList.length - 1);
    const pausedIndex = shouldResumeAtNextQuestion ? index + 1 : index;
    const pausedTime = time;
    const pausedQuestionElapsedMs = shouldResumeAtNextQuestion
        ? 0
        : questionResumeCarryMs + currentQuestionElapsedMs;

    setPausedTestState({
        questionBankVersion: QUESTION_BANK_CLIENT_VERSION,
        ownerId: getPausedTestStorageOwner(),
        savedAt: Date.now(),
        chapter: currentChapter,
        partNumber: currentPartNumber,
        partLabel: currentPartLabel,
        quizAttemptId: currentQuizAttemptId,
        quizSeed: currentQuizSeed,
        questionIds: [...currentQuestionIds],
        difficulty: currentDifficulty,
        qList: qList.map(cloneQuizQuestion),
        index: pausedIndex,
        answers: [...answers],
        marked: [...marked],
        timedOutQuestions: [...timedOutQuestions],
        sessionPoints,
        liveDemoWalletBalance,
        time: pausedTime,
        totalPoints,
        testsCompleted,
        totalTimeSpent,
        totalCorrectAnswers,
        totalQuestionsAttempted,
        elapsedTimeBeforePauseMs: elapsedTimeBeforePauseMs + elapsedThisRun,
        currentQuestionElapsedMsBeforePause: pausedQuestionElapsedMs,
        cheatLog: cloneCheatLog(cheatLog),
        testStartSnapshot: {
            ...testStartSnapshot
        }
    });
    lastProgressAutosaveAt = Date.now();
}

function resumePausedTest() {
    if (!pausedTestState) return;
    if (!isPausedTestStateCurrent(pausedTestState)) {
        setPausedTestState(null);
        goHome();
        return;
    }

    clearInterval(timer);
    clearQuestionAdvanceTimeout();

    home    = document.getElementById('home');
    quiz    = document.getElementById('quiz');
    result  = document.getElementById('result');

    currentDifficulty    = pausedTestState.difficulty || 'all';
    currentChapter       = pausedTestState.chapter;
    currentPartNumber    = pausedTestState.partNumber || 1;
    currentPartLabel     = pausedTestState.partLabel || getChapterPartInfo(currentChapter, currentPartNumber).label;
    currentQuizAttemptId = String(pausedTestState.quizAttemptId || pausedTestState.clientAttemptId || '');
    currentQuizSeed      = String(pausedTestState.quizSeed || '');
    if (!currentQuizAttemptId) {
        alert('This paused test must be restarted because it was not issued by the backend.');
        setPausedTestState(null);
        goHome();
        return;
    }
    qList                = getPausedQuestionList(pausedTestState);
    currentQuestionIds   = Array.isArray(pausedTestState.questionIds) && pausedTestState.questionIds.length > 0
        ? pausedTestState.questionIds.map((id) => String(id || '')).filter(Boolean)
        : qList.map((question) => question.questionId).filter(Boolean);
    index                = Math.min(pausedTestState.index || 0, Math.max(qList.length - 1, 0));
    answers              = Array.from({ length: qList.length }, (_, i) => pausedTestState.answers[i] ?? null);
    marked               = Array.from({ length: qList.length }, (_, i) => Boolean(pausedTestState.marked[i]));
    timedOutQuestions    = Array.from({ length: qList.length }, (_, i) => Boolean(pausedTestState.timedOutQuestions?.[i]));
    sessionPoints        = pausedTestState.sessionPoints || 0;
    optionSelected       = false;
    liveDemoWalletBalance = Number(pausedTestState.liveDemoWalletBalance || pausedTestState.liveDemoCashDelta || 0);
    time                 = Number(pausedTestState.time || QUIZ_TOTAL_SECONDS);
    quizTimerEndsAt      = 0;
    totalPoints          = pausedTestState.totalPoints || 0;
    testsCompleted       = pausedTestState.testsCompleted || testsCompleted;
    totalTimeSpent       = pausedTestState.totalTimeSpent || totalTimeSpent;
    totalCorrectAnswers  = pausedTestState.totalCorrectAnswers || 0;
    totalQuestionsAttempted = pausedTestState.totalQuestionsAttempted || 0;
    elapsedTimeBeforePauseMs = pausedTestState.elapsedTimeBeforePauseMs || 0;
    questionResumeCarryMs = pausedTestState.currentQuestionElapsedMsBeforePause || 0;
    cheatLog             = cloneCheatLog(pausedTestState.cheatLog);
    cheatLog.resumeCount++;
    fullscreenWarningGiven = Number(cheatLog.fullscreenExitCount || 0) > 0;
    resumeAnswerLockIndex = -1;
    testStartSnapshot    = pausedTestState.testStartSnapshot || null;
    startTime            = Date.now();
    setPausedTestState(null);

    home.style.display   = 'none';
    quiz.style.display   = 'block';
    result.style.display = 'none';
    setHomeSidebarButtonVisible(false);
    scrollToPageTop();

    document.getElementById('chapter-title').innerText   = `${getChapterDisplayName(currentChapter)} - ${currentPartLabel}`;
    document.getElementById('total-questions').innerText = qList.length;

    const badge = document.getElementById('difficulty-badge');
    if (badge) {
        badge.textContent = getAttemptLabel();
        badge.className   = `difficulty-badge ${DIFF_CLASS[currentDifficulty]}`;
    }

    buildNav();
    loadQ();
    startTimer();
    updateWallet();
    updateDashboard();
    updatePauseButtonState();
    saveCurrentTestProgress();
}

function nextQ() {
    if (index < qList.length - 1) {
        questionResumeCarryMs = 0;
        currentQuestionStartedAt = 0;
        index++;
        optionSelected = false;
        loadQ(); startTimer();
        updatePauseButtonState();
        saveCurrentTestProgress();
    }
}

function prevQ() {
    if (index > 0) {
        questionResumeCarryMs = 0;
        currentQuestionStartedAt = 0;
        index--;
        optionSelected = answers[index] !== null;
        loadQ();
        startTimer();
        updatePauseButtonState();
        saveCurrentTestProgress();
    }
}

function updateButtonStates() {
    const prev = document.getElementById('prev-btn');
    const next = document.getElementById('next-btn');
    if (prev) {
        prev.disabled = index <= 0;
        prev.title = index > 0 ? 'Go to the previous question.' : 'This is the first question.';
    }
    if (next) {
        const canContinue = index < qList.length - 1;
        next.disabled = !canContinue;
        next.title = canContinue
            ? 'Go to the next question.'
            : 'This is the last question.';
    }
}

function markQuestion() {
    marked[index] = !marked[index];
    updateMarkButton();
    highlightNav();
    saveCurrentTestProgress();
    const btn = document.getElementById('mark-btn');
    if (btn) { btn.style.animation = 'bounceIn 0.4s ease'; setTimeout(() => btn.style.animation='', 400); }
}

function updateMarkButton() {
    const btn = document.getElementById('mark-btn');
    if (btn) btn.innerHTML = marked[index]
        ? '<i class="fas fa-bookmark"></i> Unmark Question'
        : '<i class="fas fa-bookmark"></i> Mark for Review';
}

function buildNav() {
    let html = '';
    for (let i = 0; i < qList.length; i++) {
        let cls = 'nav-btn';
        if (i === index)    cls += ' current';
        if (answers[i] !== null || timedOutQuestions[i]) cls += ' answered';
        if (marked[i])      cls += ' marked';
        html += `<button class="${cls}" onclick="goToQuestion(${i})">${i+1}</button>`;
    }
    document.getElementById('nav').innerHTML = html;
}

function goToQuestion(i) {
    const nextIndex = Number(i);
    if (!Number.isInteger(nextIndex) || nextIndex < 0 || nextIndex >= qList.length || nextIndex === index) return;
    questionResumeCarryMs = 0;
    currentQuestionStartedAt = 0;
    index = nextIndex;
    optionSelected = answers[index] !== null;
    loadQ();
    startTimer();
    updatePauseButtonState();
    saveCurrentTestProgress();
}

function highlightNav() { buildNav(); }

function syncQuizTimeRemaining() {
    if (quizTimerEndsAt) {
        time = Math.max(0, Math.ceil((quizTimerEndsAt - Date.now()) / 1000));
    } else {
        time = Math.max(0, Number(time || 0));
    }
    return time;
}

function startTimer() {
    clearInterval(timer);
    if (!quizTimerEndsAt) {
        quizTimerEndsAt = Date.now() + Math.max(0, Number(time || 0)) * 1000;
    }
    syncQuizTimeRemaining();
    updateTimerDisplay();
    updateProgress();
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        handleOfflineDuringQuiz();
        return;
    }
    if (time <= 0) {
        submitTest({ silent: true });
        return;
    }
    timer = setInterval(() => {
        syncQuizTimeRemaining();
        updateTimerDisplay();
        updateProgress();
        saveCurrentTestProgressThrottled();
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            clearInterval(timer);
            handleOfflineDuringQuiz();
            return;
        }
        if (time <= 10 && time > 0) playTickSound();
        if (time <= 0) {
            clearInterval(timer);
            showPointsNotification('Quiz time is over. Submitting your test.', 'points-lost');
            submitTest({ silent: true });
        }
    }, 1000);
    updatePauseButtonState();
}

function updateTimerDisplay() {
    const mins = Math.floor(time / 60);
    const secs = time % 60;
    const el = document.getElementById('timer');
    if (!el) return;
    el.innerHTML = `<i class="fas fa-clock"></i> ${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
    el.className = 'timer' + (time <= 10 ? ' danger' : time <= 30 ? ' warning' : '');
}

function updateProgress() {
    const max = DIFF_TIMES[currentDifficulty];
    const el  = document.getElementById('progress');
    if (el) el.style.width = `${((max - time) / max) * 100}%`;
}

function resetSubmittedQuizState() {
    testStartSnapshot = null;
    setPausedTestState(null);
    elapsedTimeBeforePauseMs = 0;
    cheatLog = null;
    resumeAnswerLockIndex = -1;
    currentQuestionStartedAt = 0;
    questionResumeCarryMs = 0;
    currentQuizAttemptId = '';
}

async function persistAttemptToCloud(attempt) {
    if (!currentUser) return;

    if (isBackendEnabled()) {
        try {
            const response = await callBackend('/api/attempts', {
                method: 'POST',
                body: attempt
            });

            applyCloudProfile(response.profile);
            if (Array.isArray(response.leaderboard)) {
                leaderboard = response.leaderboard;
                leaderboardFetchedAt = Date.now();
            }

            if (response.adminDashboard) {
                adminUsers = Array.isArray(response.adminDashboard.users) ? response.adminDashboard.users : [];
                adminAttempts = Array.isArray(response.adminDashboard.attempts)
                    ? response.adminDashboard.attempts.map((entry) => normalizeAttemptData(entry))
                    : [];
                adminWithdrawalRequests = Array.isArray(response.adminDashboard.withdrawalRequests)
                    ? response.adminDashboard.withdrawalRequests.map((entry) => normalizeWithdrawalRequest(entry))
                    : adminWithdrawalRequests;
                adminReferrals = Array.isArray(response.adminDashboard.referrals)
                    ? response.adminDashboard.referrals.map((entry) => normalizeReferralRecord(entry))
                    : adminReferrals;
                adminPayments = Array.isArray(response.adminDashboard.payments)
                    ? response.adminDashboard.payments
                    : adminPayments;
                adminLoadError = '';
                renderAdminDashboard();
            }
            return response;
        } catch (error) {
            if (!canUseClientFirestoreFallback()) throw error;
            console.warn('Backend attempt save failed; falling back to Firestore client save.', error);
        }
    }

    ensureBackendOrFallbackAvailable();
    throw new Error('Backend grading is required because answer keys are no longer loaded in the browser.');
}

async function submitTestWithBackendGrading(options = {}) {
    if (isSubmittingTest) return;
    isSubmittingTest = true;
    const { silent = false, violationReason = '', systemReason = '', queueOnFailure = false } = options;
    let attempt = null;

    try {
        syncQuizTimeRemaining();
        clearInterval(timer);
        quizTimerEndsAt = 0;
        clearQuestionAdvanceTimeout();
        clearHiddenViolationTimeout();

        quiz = document.getElementById('quiz');
        result = document.getElementById('result');
        if (quiz && result) {
            quiz.style.display = 'none';
            result.style.display = 'block';
            setHomeSidebarButtonVisible(false);
            scrollToPageTop();
            document.getElementById('score-display').innerHTML = `
                <h3>Submitting your test...</h3>
                <div class="recording-upload-summary">
                    <strong>Recording Upload</strong>
                    <div class="recording-upload-instruction">
                        Please wait here while the recording upload is in progress. Do not close, refresh, or leave this page until the upload is complete.
                    </div>
                    <div id="recording-result-status">Finalizing recording</div>
                    <div id="recording-result-progress">Waiting for pending chunks</div>
                    <div id="recording-result-warning" class="recording-warning"></div>
                </div>
            `;
            document.getElementById('review-section').innerHTML = '';
        }

        const recordingBlob = await stopRecording();
        stopCamera();
        if (!silent) playVictorySound();

        const elapsedThisRun = startTime ? Math.max(0, Date.now() - startTime) : 0;
        const timeSpent = Math.floor((elapsedTimeBeforePauseMs + elapsedThisRun) / 1000);
        const total = qList.length || 0;
        const attemptedCount = answers.filter((answer) => Number.isInteger(answer)).length;
        const timedOutCount = timedOutQuestions.filter(Boolean).length;
        if (!currentQuizAttemptId) {
            throw new Error('Backend-issued quiz attempt is missing. Please restart the quiz.');
        }
        const finalizedCheatLog = cloneCheatLog(cheatLog, {
            accuracy: 0,
            score: 0,
            total,
            timeSpent
        });
        if (systemReason) {
            finalizedCheatLog.reasons = Array.from(new Set([
                ...(finalizedCheatLog.reasons || []),
                systemReason
            ]));
        }

        attempt = {
            clientAttemptId: currentQuizAttemptId,
            chapter: currentChapter,
            partNumber: currentPartNumber,
            partLabel: currentPartLabel,
            quizSeed: currentQuizSeed,
            questionIds: [...currentQuestionIds],
            difficulty: currentDifficulty,
            score: 0,
            total,
            accuracy: 0,
            attemptedCount,
            incorrectCount: 0,
            timedOutCount,
            unattemptedCount: Math.max(0, total - attemptedCount - timedOutCount),
            points: 0,
            answers: answers.map((answer) => Number.isInteger(answer) ? answer : null),
            timedOutQuestions: timedOutQuestions.map(Boolean),
            markedQuestions: marked.map(Boolean),
            timestamp: Date.now(),
            timeSpent,
            userId: currentUser?.uid || '',
            userName: currentUser?.name || 'Student',
            userAvatar: getDisplayAvatar(currentUser?.avatar),
            cheatLog: finalizedCheatLog
        };

        quiz = document.getElementById('quiz');
        result = document.getElementById('result');
        quiz.style.display = 'none';
        result.style.display = 'block';
        setHomeSidebarButtonVisible(false);
        scrollToPageTop();

        document.getElementById('score-display').innerHTML = `
            <h3>Submitting your test...</h3>
            <div class="recording-upload-summary">
                <strong>Recording Upload</strong>
                <div class="recording-upload-instruction">
                    Please wait here while the recording upload is in progress. Do not close, refresh, or leave this page until the upload is complete.
                </div>
                <div id="recording-result-status">${recordingBlob ? 'Recording stopped' : 'No recording captured'}</div>
                <div id="recording-result-progress">${recordingBlob ? 'Upload pending' : 'Upload skipped'}</div>
                <div id="recording-result-warning" class="recording-warning"></div>
            </div>
        `;
        document.getElementById('review-section').innerHTML = '';

        let recordingInfo = null;
        if (recordingBlob) {
            try {
                recordingInfo = await uploadRecording(recordingBlob);
                if (recordingInfo?.downloadURL) {
                    attempt.recordingUrl = recordingInfo.downloadURL;
                }
                if (recordingInfo?.path) {
                    attempt.recordingPath = recordingInfo.path;
                }
                if (recordingInfo?.attemptId) {
                    attempt.recordingAttemptId = recordingInfo.attemptId;
                }
                await updateRecordingMetadataFromAttempt(attempt);
            } catch (error) {
                console.error('Failed to upload quiz recording:', error);
                showPointsNotification(getFirebaseStorageErrorMessage(error), 'points-lost');
            }
        } else {
            updateRecordingUi({
                status: 'No recording captured',
                progress: 'Upload skipped'
            });
        }

        const response = await persistAttemptToCloud(attempt);
        const savedAttempt = normalizeAttemptData(response?.attempt || attempt, currentUser);
        const reviewItems = Array.isArray(savedAttempt.review) ? savedAttempt.review : [];
        const score = Number(savedAttempt.score || 0);
        const serverTotal = Number(savedAttempt.total || total);
        const accuracy = Number(savedAttempt.accuracy || 0);
        sessionPoints = Number(savedAttempt.points || 0);
        recordAttemptLocally(savedAttempt);
        if (savedAttempt.localOnly && !response?.profile) {
            const startingPoints = Number(testStartSnapshot?.totalPoints || totalPoints || 0);
            const startingTests = Number(testStartSnapshot?.testsCompleted || testsCompleted || 0);
            const startingTime = Number(testStartSnapshot?.totalTimeSpent || totalTimeSpent || 0);
            const startingCorrect = Number(testStartSnapshot?.totalCorrectAnswers || totalCorrectAnswers || 0);
            const startingAttempted = Number(testStartSnapshot?.totalQuestionsAttempted || totalQuestionsAttempted || 0);
            totalPoints = Math.max(0, startingPoints + sessionPoints);
            testsCompleted = startingTests + 1;
            totalTimeSpent = startingTime + Number(savedAttempt.timeSpent || 0);
            totalCorrectAnswers = startingCorrect + score;
            totalQuestionsAttempted = startingAttempted + Number(savedAttempt.attemptedCount || 0);
        }

        resetSubmittedQuizState();

        const displayedCashEarned = getCashEarnedDisplayValue(totalPoints);
        document.getElementById('score-display').innerHTML = `
            ${violationReason ? `
            <div style="margin-bottom:1rem;padding:0.9rem 1rem;border-radius:14px;background:rgba(239,68,68,0.16);border:1px solid rgba(248,113,113,0.5);color:#fecaca;font-weight:700;">
                Test auto-submitted because ${escapeHtml(violationReason)} was detected. This quiz reward was cancelled; your existing wallet balance was not reset.
            </div>` : ''}
            <h3>Chapter: ${escapeHtml(getChapterDisplayName(currentChapter))}</h3>
            <h3 style="color:var(--text-secondary);font-size:1rem;">${escapeHtml(getAttemptLabel())}</h3>
            <div class="score-display">${score}/${serverTotal}</div>
            <div style="font-size:1.1rem;color:var(--text-secondary);">
                Accuracy: ${accuracy}% &nbsp;|&nbsp; Time: ${Math.floor(savedAttempt.timeSpent / 60)}m ${savedAttempt.timeSpent % 60}s
            </div>
            <h3 style="color:var(--success);margin-top:1rem;">Wallet Added This Test: ${sessionPoints}</h3>
            <div style="font-size:1rem;color:var(--text-secondary);margin-top:0.5rem;">
                Current Wallet: ${displayedCashEarned}
            </div>
            <div class="recording-upload-summary">
                <strong>Recording Upload</strong>
                <div class="recording-upload-instruction">
                    ${recordingInfo?.chunkCount ? 'Recording chunks are saved and will be merged automatically into one full video for review.' : attempt.recordingUrl ? 'Recording upload is complete. You may safely leave this page.' : recordingBlob ? 'If upload is still in progress, please wait here and do not close, refresh, or leave this page.' : 'No recording upload was needed for this attempt.'}
                </div>
                <div id="recording-result-status">${recordingInfo?.chunkCount ? 'Recording queued for merge' : attempt.recordingUrl ? 'Recording uploaded' : recordingBlob ? 'Recording upload failed or skipped' : 'No recording captured'}</div>
                <div id="recording-result-progress">${recordingInfo?.chunkCount ? `Saved ${recordingInfo.chunkCount} chunk${recordingInfo.chunkCount === 1 ? '' : 's'} for auto-merge` : attempt.recordingUrl ? 'Upload complete' : recordingBlob ? 'Check warning above' : 'Upload skipped'}</div>
                <div id="recording-result-warning" class="recording-warning"></div>
            </div>
        `;

        document.getElementById('total-points').innerText = displayedCashEarned;
        document.getElementById('tests-completed').innerText = testsCompleted;
        document.getElementById('average-score').innerText = `${accuracy}%`;

        const incorrectCount = Number(savedAttempt.incorrectCount || 0);
        const savedTimedOutCount = Number(savedAttempt.timedOutCount || 0);
        const unattemptedCount = Number(savedAttempt.unattemptedCount || 0);
        let reviewHTML = `
            <h3>Question Review</h3>
            <div style="margin-bottom:1rem;padding:1rem 1.1rem;border-radius:16px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);">
                <div style="font-weight:700;margin-bottom:0.4rem;">Final Test Summary</div>
                <div style="color:var(--text-secondary);line-height:1.7;">
                    Correct: ${score} &nbsp;|&nbsp; Incorrect: ${incorrectCount} &nbsp;|&nbsp; Timed Out: ${savedTimedOutCount} &nbsp;|&nbsp; Not Attempted: ${unattemptedCount}<br>
                    Wallet Added This Test: ${sessionPoints} &nbsp;|&nbsp; Current Wallet: ${displayedCashEarned}
                </div>
            </div>
        `;

        reviewItems.forEach((item, i) => {
            const correct = Boolean(item.correct);
            const timedOut = Boolean(item.timedOut);
            const attempted = Boolean(item.attempted);
            const cls = 'review-item' + (correct ? ' correct' : timedOut ? ' unattempted' : !attempted ? ' unattempted' : ' incorrect');
            const statusColor = correct ? 'var(--success)' : attempted ? 'var(--danger)' : timedOut ? 'var(--warning)' : 'var(--text-secondary)';

            reviewHTML += `
                <div class="${cls}">
                    <p><strong>Q${i + 1}:</strong> ${escapeHtml(item.q || '')}</p>
                    <p><strong>Status:</strong> <span style="color:${statusColor};">${escapeHtml(item.statusLabel || 'Not Attempted')}</span></p>
                    <p>Your answer: <strong>${escapeHtml(item.userAnswer || 'Not attempted')}</strong></p>
                    <p>Correct answer: <strong style="color:var(--success)">${escapeHtml(item.correctAnswer || '')}</strong></p>
                    <p><strong>Wallet:</strong> <span style="color:${item.pointsColor || 'var(--text-secondary)'};">${escapeHtml(item.pointsLabel || 'No points earned.')}</span></p>
                    <p><strong>Running Wallet:</strong> ${Number(item.runningReviewPoints || 0)}</p>
                    ${item.marked ? '<p style="color:var(--warning);margin-top:0.5rem;"><i class="fas fa-bookmark"></i> Marked for review</p>' : ''}
                </div>`;
        });
        document.getElementById('review-section').innerHTML = reviewHTML;

        updateWallet();
        updateDashboard();
        renderLeaderboard();
        renderCharts();
        renderAdminDashboard();
    } catch (error) {
        console.error('Failed to submit test with backend grading:', error);
        if (queueOnFailure && attempt && isLikelyOfflineError(error)) {
            savePendingOfflineAttempt(attempt, systemReason || OFFLINE_AUTOSUBMIT_REASON);
            recordAttemptLocally({
                ...attempt,
                localOnly: true,
                pendingSync: true
            });
            resetSubmittedQuizState();
            renderPendingOfflineSubmission(attempt, systemReason || OFFLINE_AUTOSUBMIT_REASON);
            showPointsNotification('Quiz saved. It will sync when internet returns.', 'points-lost');
            return;
        }
        const scoreDisplay = document.getElementById('score-display');
        if (scoreDisplay) {
            scoreDisplay.innerHTML = `
                <h3>Test could not be submitted</h3>
                <p class="auth-status error">${escapeHtml(error.message || 'Backend sync failed. Check backend setup and try again.')}</p>
            `;
        }
        showPointsNotification('Backend sync failed. Check backend setup.', 'points-lost');
    } finally {
        isSubmittingTest = false;
    }
}


async function submitTest(options = {}) {
    return submitTestWithBackendGrading(options);
    if (isSubmittingTest) return;
    isSubmittingTest = true;
    const { silent = false, violationReason = '' } = options;
    syncQuizTimeRemaining();
    clearInterval(timer);
    quizTimerEndsAt = 0;
    clearQuestionAdvanceTimeout();
    clearHiddenViolationTimeout();
    const recordingBlob = await stopRecording();
    stopCamera();
    if (!silent) playVictorySound();

    const gradeResult = { review: [], score: 0, total: qList.length, accuracy: 0, points: 0 };

    const elapsedThisRun = startTime ? Math.max(0, Date.now() - startTime) : 0;
    const timeSpent = Math.floor((elapsedTimeBeforePauseMs + elapsedThisRun) / 1000);
    totalTimeSpent += timeSpent;

    const score = Number(gradeResult.score || 0);
    const total = Number(gradeResult.total || qList.length || 0);
    const accuracy = Number.isFinite(Number(gradeResult.accuracy))
        ? Number(gradeResult.accuracy)
        : total ? Math.round((score / total) * 100) : 0;
    const attemptedCount = Number(gradeResult.attemptedCount || 0);
    const reviewItems = Array.isArray(gradeResult.review) ? gradeResult.review : [];

    if (cheatLog) {
        cheatLog.questionTimes = cheatLog.questionTimes.map((entry) => {
            const reviewItem = reviewItems[Number(entry.questionNumber || 1) - 1];
            return {
                ...entry,
                correct: typeof reviewItem?.correct === 'boolean' ? reviewItem.correct : entry.correct
            };
        });
    }

    testsCompleted++;
    sessionPoints = violationReason ? 0 : Number(gradeResult.points || 0);
    const startingPoints = Number(testStartSnapshot?.totalPoints || totalPoints || 0);
    totalPoints = Math.max(0, startingPoints + sessionPoints);
    totalCorrectAnswers = Number(testStartSnapshot?.totalCorrectAnswers || totalCorrectAnswers || 0) + score;
    totalQuestionsAttempted = Number(testStartSnapshot?.totalQuestionsAttempted || totalQuestionsAttempted || 0) + attemptedCount;

    const finalizedCheatLog = cloneCheatLog(cheatLog, {
        accuracy,
        score,
        total,
        timeSpent
    });
    const attempt = {
        clientAttemptId: currentQuizAttemptId,
        chapter: currentChapter,
        partNumber: currentPartNumber,
        partLabel: currentPartLabel,
        quizSeed: currentQuizSeed,
        questionIds: [...currentQuestionIds],
        difficulty: currentDifficulty,
        score,
        total,
        accuracy,
        attemptedCount,
        incorrectCount: Number(gradeResult.incorrectCount || 0),
        timedOutCount: Number(gradeResult.timedOutCount || 0),
        unattemptedCount: Number(gradeResult.unattemptedCount || 0),
        points: sessionPoints,
        answers: answers.map((answer) => Number.isInteger(answer) ? answer : null),
        timedOutQuestions: timedOutQuestions.map(Boolean),
        markedQuestions: marked.map(Boolean),
        timestamp: Date.now(),
        timeSpent,
        userId: currentUser?.uid || '',
        userName: currentUser?.name || 'Student',
        userAvatar: getDisplayAvatar(currentUser?.avatar),
        cheatLog: finalizedCheatLog
    };

    const displayedCashEarned = getCashEarnedDisplayValue(totalPoints);
    testStartSnapshot = null;
    setPausedTestState(null);
    elapsedTimeBeforePauseMs = 0;
    cheatLog = null;
    resumeAnswerLockIndex = -1;
    currentQuestionStartedAt = 0;
    questionResumeCarryMs = 0;

    quiz   = document.getElementById('quiz');
    result = document.getElementById('result');
    quiz.style.display   = 'none';
    result.style.display = 'block';
    setHomeSidebarButtonVisible(false);
    scrollToPageTop();

    document.getElementById('score-display').innerHTML = `
        ${violationReason ? `
        <div style="margin-bottom:1rem;padding:0.9rem 1rem;border-radius:14px;background:rgba(239,68,68,0.16);border:1px solid rgba(248,113,113,0.5);color:#fecaca;font-weight:700;">
            Test auto-submitted because ${escapeHtml(violationReason)} was detected. This quiz reward was cancelled; your existing wallet balance was not reset.
        </div>` : ''}
        <h3>Chapter: ${escapeHtml(getChapterDisplayName(currentChapter))}</h3>
        <h3 style="color:var(--text-secondary);font-size:1rem;">${escapeHtml(getAttemptLabel())}</h3>
        <div class="score-display">${score}/${total}</div>
        <div style="font-size:1.1rem;color:var(--text-secondary);">
            Accuracy: ${accuracy}% &nbsp;|&nbsp; Time: ${Math.floor(timeSpent/60)}m ${timeSpent%60}s
        </div>
        <h3 style="color:var(--success);margin-top:1rem;">Wallet Added This Test: ${sessionPoints}</h3>
        <div style="font-size:1rem;color:var(--text-secondary);margin-top:0.5rem;">
            Current Wallet: ${displayedCashEarned}
        </div>
        <div class="recording-upload-summary">
            <strong>Recording Upload</strong>
            <div class="recording-upload-instruction">
                Please wait here while the recording upload is in progress. Do not close, refresh, or leave this page until the upload is complete.
            </div>
            <div id="recording-result-status">${recordingBlob ? 'Recording stopped' : 'No recording captured'}</div>
            <div id="recording-result-progress">${recordingBlob ? 'Upload pending' : 'Upload skipped'}</div>
            <div id="recording-result-warning" class="recording-warning"></div>
        </div>
    `;

    document.getElementById('total-points').innerText   = displayedCashEarned;
    document.getElementById('tests-completed').innerText = testsCompleted;
    document.getElementById('average-score').innerText  = `${accuracy}%`;

    const incorrectCount = Number(gradeResult.incorrectCount || 0);
    const timedOutCount = Number(gradeResult.timedOutCount || 0);
    const unattemptedCount = Number(gradeResult.unattemptedCount || 0);
    let reviewHTML = `
        <h3>?? Question Review</h3>
        <div style="margin-bottom:1rem;padding:1rem 1.1rem;border-radius:16px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);">
            <div style="font-weight:700;margin-bottom:0.4rem;">Final Test Summary</div>
            <div style="color:var(--text-secondary);line-height:1.7;">
                Correct: ${score} &nbsp;|&nbsp; Incorrect: ${incorrectCount} &nbsp;|&nbsp; Timed Out: ${timedOutCount} &nbsp;|&nbsp; Not Attempted: ${unattemptedCount}<br>
                Wallet Added This Test: ${sessionPoints} &nbsp;|&nbsp; Current Wallet: ${displayedCashEarned}
            </div>
        </div>
    `;

    reviewItems.forEach((item, i) => {
        const correct = Boolean(item.correct);
        const timedOut = Boolean(item.timedOut);
        const attempted = Boolean(item.attempted);
        const cls = 'review-item' + (correct ? ' correct' : timedOut ? ' unattempted' : !attempted ? ' unattempted' : ' incorrect');
        const statusColor = correct ? 'var(--success)' : attempted ? 'var(--danger)' : timedOut ? 'var(--warning)' : 'var(--text-secondary)';

        reviewHTML += `
            <div class="${cls}">
                <p><strong>Q${i+1}:</strong> ${escapeHtml(item.q || '')}</p>
                <p><strong>Status:</strong> <span style="color:${statusColor};">${escapeHtml(item.statusLabel || 'Not Attempted')}</span></p>
                <p>Your answer: <strong>${escapeHtml(item.userAnswer || 'Not attempted')}</strong></p>
                <p>Correct answer: <strong style="color:var(--success)">${escapeHtml(item.correctAnswer || '')}</strong></p>
                <p><strong>Wallet:</strong> <span style="color:${item.pointsColor || 'var(--text-secondary)'};">${escapeHtml(item.pointsLabel || 'No points earned.')}</span></p>
                <p><strong>Running Wallet:</strong> ${Number(item.runningReviewPoints || 0)}</p>
                ${item.marked ? '<p style="color:var(--warning);margin-top:0.5rem;"><i class="fas fa-bookmark"></i> Marked for review</p>' : ''}
            </div>`;
    });
    document.getElementById('review-section').innerHTML = reviewHTML;

    updateWallet();
    updateDashboard();

    if (recordingBlob) {
        try {
            const recordingInfo = await uploadRecording(recordingBlob);
            if (recordingInfo?.downloadURL) {
                attempt.recordingUrl = recordingInfo.downloadURL;
            }
            if (recordingInfo?.path) attempt.recordingPath = recordingInfo.path;
            if (recordingInfo?.attemptId) attempt.recordingAttemptId = recordingInfo.attemptId;
            await updateRecordingMetadataFromAttempt(attempt);
        } catch (error) {
            console.error('Failed to upload quiz recording:', error);
            showPointsNotification(getFirebaseStorageErrorMessage(error), 'points-lost');
        }
    } else {
        updateRecordingUi({
            status: 'No recording captured',
            progress: 'Upload skipped'
        });
    }

    recordAttemptLocally(attempt);

    try {
        await persistAttemptToCloud(attempt);
    } catch (error) {
        console.error('Failed to sync test result to Firestore:', error);
        showPointsNotification('Cloud sync failed. Check Firebase setup.', 'points-lost');
    } finally {
        isSubmittingTest = false;
    }
}

function goHome() {
    clearInterval(timer);
    quizTimerEndsAt = 0;
    clearQuestionAdvanceTimeout();
    clearHiddenViolationTimeout();
    home   = document.getElementById('home');
    quiz   = document.getElementById('quiz');
    result = document.getElementById('result');
    home.style.display   = 'block';
    quiz.style.display   = 'none';
    result.style.display = 'none';
    setHomeSidebarButtonVisible(true);
    scrollToPageTop();
    void stopRecording().finally(stopCamera);
    updatePauseButtonState();
    generateChapterList();
    updateWallet();
    renderLeaderboard();
    renderCharts();
    renderAdminDashboard();
}

// ============================================================
// ===== UTILITIES =====
// ============================================================
function escapeHtml(str) {
    return String(str)
        .replace(/&/g,'&amp;')
        .replace(/</g,'&lt;')
        .replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;');
}

function id(s) { return document.getElementById(s); }

// ============================================================
// ===== INIT =====
// ============================================================
document.addEventListener('DOMContentLoaded', refreshCoursePurchaseUI);
window.addEventListener('focus', async () => {
    if (!currentUser || !getPendingCourseId()) return;
    const unlocked = await refreshVerifiedPurchases();
    if (!unlocked && !document.getElementById('pending-payment-modal')?.classList.contains('active')) {
        showPendingPaymentModal();
    }
});
window.addEventListener('storage', (event) => {
    if (event.key === LEARNLOOT_PENDING_COURSE_KEY) {
        refreshCoursePurchaseUI();
    }
});
window.onload = initApp;
