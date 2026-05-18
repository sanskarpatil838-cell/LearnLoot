const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const app = express();
const MAX_ADMIN_USERS = Number(process.env.MAX_ADMIN_USERS || 200);
const MAX_ADMIN_ATTEMPTS = Number(process.env.MAX_ADMIN_ATTEMPTS || 250);
const POINTS_PER_QUESTION = 50;
const INCORRECT_POINTS_PENALTY = 50;
const CHAPTER_PART_SIZE = Number(process.env.CHAPTER_PART_SIZE || 20);
const CHAPTER_QUESTION_LIMIT = Number(process.env.CHAPTER_QUESTION_LIMIT || 100);
const NUMERICAL_VARIANTS_PER_ATTEMPT = Number(process.env.NUMERICAL_VARIANTS_PER_ATTEMPT || 2);
const DAILY_REWARD_CAP = Math.max(0, Number(process.env.DAILY_REWARD_CAP || 1000));
const MAX_QUIZ_STARTS_PER_HOUR = Math.max(1, Number(process.env.MAX_QUIZ_STARTS_PER_HOUR || 12));
const QUIZ_ATTEMPT_TTL_MS = Math.max(
  15 * 60 * 1000,
  Number(process.env.QUIZ_ATTEMPT_TTL_MS || 3 * 60 * 60 * 1000)
);
const REQUIRE_APP_CHECK = process.env.REQUIRE_APP_CHECK === 'true';
const DEFAULT_CORS_ORIGINS = [
  'https://learnloot.netlify.app',
  'https://learn-loot.netlify.app',
  'https://earnlearn-68952.web.app',
  'https://earnlearn-68952.firebaseapp.com'
];
const MIN_WITHDRAWAL_POINTS = Number(process.env.MIN_WITHDRAWAL_POINTS || 10000);
const MAX_WITHDRAWAL_REQUESTS = Number(process.env.MAX_WITHDRAWAL_REQUESTS || 150);
const WITHDRAWAL_STATUSES = new Set(['Pending', 'Approved', 'Rejected', 'Paid']);
const WITHDRAWAL_SUBMIT_COOLDOWN_MS = Number(process.env.WITHDRAWAL_SUBMIT_COOLDOWN_MS || 30 * 1000);
const adminEmails = new Set(
  String(process.env.ADMIN_EMAILS || 'sanskarpatil838@gmail.com')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
);

function getAllowedOrigins() {
  const raw = String(process.env.CORS_ORIGINS || '').trim();
  const production = process.env.NODE_ENV === 'production';
  if (!raw || raw === '*') return production ? DEFAULT_CORS_ORIGINS : true;
  return raw.split(',').map((origin) => origin.trim()).filter(Boolean);
}

app.use((req, res, next) => {
  if (
    process.env.ALLOW_PRIVATE_NETWORK_ACCESS !== 'false'
    && req.get('access-control-request-private-network') === 'true'
  ) {
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
  }
  next();
});

app.use(cors({ origin: getAllowedOrigins(), credentials: true }));
app.use(express.json({ limit: '1mb' }));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID || undefined
  });
}

const db = admin.firestore();
const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;

app.use('/api', requireAppCheck);

function isAdminEmail(email) {
  return adminEmails.has(String(email || '').trim().toLowerCase());
}

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function clampText(value, maxLength, fallback = '') {
  return String(value || fallback).trim().slice(0, maxLength);
}

function toFiniteNumber(value, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function toNonNegativeNumber(value, fallback = 0) {
  return Math.max(0, toFiniteNumber(value, fallback));
}

function toInteger(value, fallback = 0) {
  return Math.round(toFiniteNumber(value, fallback));
}

function sanitizeClientAttemptId(value) {
  return clampText(value, 120)
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function getHourBucket(nowMs = Date.now()) {
  const date = new Date(nowMs);
  return date.toISOString().slice(0, 13).replace(/[-:T]/g, '');
}

function getHourStartMs(nowMs = Date.now()) {
  const date = new Date(nowMs);
  date.setUTCMinutes(0, 0, 0);
  return date.getTime();
}

function getDailyRewardBucket(nowMs = Date.now()) {
  return new Date(nowMs).toISOString().slice(0, 10);
}

function sanitizeQuestionTimes(questionTimes) {
  if (!Array.isArray(questionTimes)) return [];
  return questionTimes.slice(0, 100).map((entry, index) => ({
    questionNumber: toInteger(entry && entry.questionNumber, index + 1),
    secondsTaken: toNonNegativeNumber(entry && entry.secondsTaken, 0),
    answered: entry && entry.answered !== false,
    correct: typeof (entry && entry.correct) === 'boolean' ? entry.correct : null
  }));
}

function sanitizeAnswerIndexes(answers, total) {
  if (!Array.isArray(answers)) return Array(total).fill(null);
  return Array.from({ length: total }, (_, index) => {
    const value = answers[index];
    return Number.isInteger(value) && value >= 0 && value <= 3 ? value : null;
  });
}

function sanitizeBooleanList(values, total) {
  if (!Array.isArray(values)) return Array(total).fill(false);
  return Array.from({ length: total }, (_, index) => Boolean(values[index]));
}

function sanitizeCheatLog(raw = {}) {
  const questionTimes = sanitizeQuestionTimes(raw.questionTimes);

  return {
    tabSwitchCount: toInteger(raw.tabSwitchCount),
    blurCount: toInteger(raw.blurCount),
    copyCount: toInteger(raw.copyCount),
    pasteCount: toInteger(raw.pasteCount),
    screenshotAttemptCount: toInteger(raw.screenshotAttemptCount),
    fullscreenExitCount: toInteger(raw.fullscreenExitCount),
    resumeCount: toInteger(raw.resumeCount),
    questionTimes,
    rapidAnswerCount: toInteger(raw.rapidAnswerCount),
    avgSecondsPerQuestion: toNonNegativeNumber(raw.avgSecondsPerQuestion),
    suspicionScore: toInteger(raw.suspicionScore),
    flagged: Boolean(raw.flagged),
    autoSubmitted: Boolean(raw.autoSubmitted),
    autoSubmitReason: clampText(raw.autoSubmitReason, 180),
    reasons: Array.isArray(raw.reasons)
      ? raw.reasons.slice(0, 20).map((reason) => clampText(reason, 180)).filter(Boolean)
      : []
  };
}

let questionBankApi = null;

function getQuestionBankApi() {
  if (questionBankApi) return questionBankApi;

  const questionBankPath = path.resolve(__dirname, 'question-bank.js');
  const code = fs.readFileSync(questionBankPath, 'utf8');
  const sandbox = {
    console,
    CHAPTER_PART_SIZE,
    CHAPTER_QUESTION_LIMIT,
    NUMERICAL_VARIANTS_PER_ATTEMPT,
    POINTS_PER_QUESTION,
    INCORRECT_POINTS_PENALTY
  };

  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: questionBankPath });

  if (
    typeof sandbox.getQuizQuestionsForAttempt !== 'function'
    || typeof sandbox.getQuizQuestionsByIds !== 'function'
    || typeof sandbox.gradeQuiz !== 'function'
    || typeof sandbox.getChapterNames !== 'function'
    || typeof sandbox.getChapterQuestionCount !== 'function'
    || typeof sandbox.getChapterPartCount !== 'function'
    || typeof sandbox.getChapterPartInfo !== 'function'
  ) {
    throw new Error('Question bank helpers are not available to the backend.');
  }

  questionBankApi = {
    getChapterNames: sandbox.getChapterNames,
    getChapterQuestionCount: sandbox.getChapterQuestionCount,
    getChapterPartCount: sandbox.getChapterPartCount,
    getChapterPartInfo: sandbox.getChapterPartInfo,
    getQuizQuestionsForAttempt: sandbox.getQuizQuestionsForAttempt,
    getQuizQuestionsByIds: sandbox.getQuizQuestionsByIds,
    gradeQuiz: sandbox.gradeQuiz
  };
  return questionBankApi;
}

function questionForClient(question, index) {
  const clientQuestion = {
    questionId: clampText(question && question.questionId, 120),
    questionNumber: index + 1,
    q: clampText(question && question.q, 2000),
    o: Array.isArray(question && question.o)
      ? question.o.slice(0, 4).map((option) => clampText(option, 1000))
      : []
  };

  return clientQuestion;
}

function createQuizSeed() {
  return crypto.randomBytes(16).toString('hex');
}

function sanitizeQuestionIds(questionIds, limit = CHAPTER_PART_SIZE) {
  if (!Array.isArray(questionIds)) return [];
  return questionIds
    .slice(0, limit)
    .map((id) => clampText(id, 120))
    .filter(Boolean);
}

function sanitizeWithdrawalStatus(status) {
  const next = clampText(status, 24, 'Pending');
  return WITHDRAWAL_STATUSES.has(next) ? next : 'Pending';
}

function normalizeWithdrawalRequestDoc(doc) {
  const data = typeof doc.data === 'function' ? doc.data() || {} : doc || {};
  return {
    id: doc.id || data.id || '',
    userId: clampText(data.userId, 120),
    userName: clampText(data.userName, 80, 'Student'),
    email: clampText(data.email, 160),
    phone: clampText(data.phone, 30),
    upiId: clampText(data.upiId, 120),
    walletBalance: toInteger(data.walletBalance),
    requestedPoints: toInteger(data.requestedPoints),
    status: sanitizeWithdrawalStatus(data.status),
    requestDateTime: toInteger(data.requestDateTime || data.requestedAtMs),
    requestedAtMs: toInteger(data.requestedAtMs || data.requestDateTime),
    updatedAtMs: toInteger(data.updatedAtMs),
    updatedBy: clampText(data.updatedBy, 160)
  };
}

function questionIdsMatch(left, right) {
  const leftIds = sanitizeQuestionIds(left);
  const rightIds = sanitizeQuestionIds(right);
  if (leftIds.length !== rightIds.length) return false;
  return leftIds.every((id, index) => id === rightIds[index]);
}

function getChapterCatalog() {
  const bank = getQuestionBankApi();
  return bank.getChapterNames().map((name) => {
    const totalQuestions = bank.getChapterQuestionCount(name);
    const totalParts = bank.getChapterPartCount(name);
    return {
      name,
      totalQuestions,
      totalParts,
      perPart: CHAPTER_PART_SIZE
    };
  });
}

function getQuizQuestionPayload(chapter, partNumber = 1) {
  const bank = getQuestionBankApi();
  const chapterNames = bank.getChapterNames();
  if (!chapterNames.includes(chapter)) {
    throw createHttpError(400, 'Unknown quiz chapter.');
  }

  const partInfo = bank.getChapterPartInfo(chapter, partNumber);
  const quizSeed = createQuizSeed();
  const serverQuestions = bank.getQuizQuestionsForAttempt(chapter, partInfo.partNumber, quizSeed);
  const questions = serverQuestions.map((question, index) => questionForClient(question, index));
  const questionIds = questions.map((question) => question.questionId).filter(Boolean);

  return {
    chapter,
    partInfo: {
      ...partInfo,
      questionCount: questions.length
    },
    quizSeed,
    questionIds,
    questions
  };
}

function getQuestionsForIssuedAttempt(issuedAttempt = {}) {
  const bank = getQuestionBankApi();
  const chapter = clampText(issuedAttempt.chapter, 120);
  const questionIds = sanitizeQuestionIds(issuedAttempt.questionIds);

  if (!bank.getChapterNames().includes(chapter)) {
    throw createHttpError(400, 'Unknown quiz attempt chapter.');
  }

  const questions = bank.getQuizQuestionsByIds(chapter, questionIds);

  if (!questionIds.length || questions.length !== questionIds.length) {
    throw createHttpError(400, 'Issued quiz attempt could not be verified.');
  }

  return questions;
}

function gradeAttemptPayload(raw = {}, startingBalance = 0, issuedAttempt = null) {
  if (!issuedAttempt) {
    throw createHttpError(400, 'Start the quiz again before submitting. No issued attempt was found.');
  }

  const bank = getQuestionBankApi();
  const questions = getQuestionsForIssuedAttempt(issuedAttempt);
  const answers = sanitizeAnswerIndexes(raw.answers, questions.length);
  const timedOutQuestions = sanitizeBooleanList(raw.timedOutQuestions, questions.length);
  const markedQuestions = sanitizeBooleanList(raw.markedQuestions || raw.marked, questions.length);
  const grade = bank.gradeQuiz(questions, answers, timedOutQuestions, markedQuestions, startingBalance);
  const questionIds = questions.map((question) => question.questionId).filter(Boolean);

  return {
    ...grade,
    quizSeed: clampText(issuedAttempt.quizSeed, 160),
    questionIds,
    answers,
    timedOutQuestions,
    markedQuestions
  };
}

function sanitizeAttempt(raw = {}, user, startingBalance = 0, issuedAttempt = null) {
  const backendAttemptId = sanitizeClientAttemptId(issuedAttempt && issuedAttempt.attemptId);
  const clientAttemptId = sanitizeClientAttemptId(raw.clientAttemptId) || backendAttemptId;
  if (!issuedAttempt || !backendAttemptId) {
    throw createHttpError(400, 'Submitted attempt does not match the issued quiz attempt.');
  }

  const grade = gradeAttemptPayload(raw, startingBalance, issuedAttempt);
  const total = Math.max(0, toInteger(grade.total));
  const score = Math.min(total, Math.max(0, toInteger(grade.score)));
  const attemptedCount = Math.min(total, Math.max(0, toInteger(grade.attemptedCount, total)));
  const accuracy = total ? Math.round((score / total) * 100) : 0;
  const cheatLog = sanitizeCheatLog(raw.cheatLog || {});

  const review = Array.isArray(grade.review) ? grade.review : [];
  cheatLog.questionTimes = cheatLog.questionTimes.map((entry) => {
    const reviewItem = review[Number(entry.questionNumber || 1) - 1];
    return {
      ...entry,
      correct: typeof reviewItem?.correct === 'boolean' ? reviewItem.correct : entry.correct
    };
  });

  const attempt = {
    attemptId: backendAttemptId,
    clientAttemptId,
    chapter: clampText(issuedAttempt.chapter, 120, 'Untitled Chapter'),
    partNumber: Math.max(1, toInteger(issuedAttempt.partNumber, 1)),
    partLabel: clampText(issuedAttempt.partLabel, 80),
    quizSeed: clampText(issuedAttempt.quizSeed, 160),
    questionIds: Array.isArray(grade.questionIds) ? grade.questionIds : [],
    difficulty: clampText(raw.difficulty, 32, 'all'),
    score,
    total,
    accuracy,
    attemptedCount,
    incorrectCount: Math.max(0, toInteger(grade.incorrectCount)),
    timedOutCount: Math.max(0, toInteger(grade.timedOutCount)),
    unattemptedCount: Math.max(0, toInteger(grade.unattemptedCount)),
    recordingUrl: clampText(raw.recordingUrl, 2000),
    recordingPath: clampText(raw.recordingPath, 500),
    recordingAttemptId: clampText(raw.recordingAttemptId, 160),
    points: cheatLog.autoSubmitted ? 0 : toInteger(grade.points),
    answers: grade.answers,
    timedOutQuestions: grade.timedOutQuestions,
    markedQuestions: grade.markedQuestions,
    timestamp: Date.now(),
    timeSpent: Math.min(toNonNegativeNumber(raw.timeSpent), 12 * 60 * 60),
    userId: user.uid,
    userName: clampText(raw.userName, 60, user.name || 'Student'),
    userAvatar: clampText(raw.userAvatar, 12, user.avatar || 'ST'),
    cheatLog
  };

  return { attempt, review };
}

function publicProfileFromDoc(uid, data = {}, decoded = null) {
  const email = decoded ? decoded.email || '' : data.email || '';
  return {
    uid,
    name: data.name || (email ? email.split('@')[0] : 'Student'),
    avatar: data.avatar || 'ST',
    email,
    isAdmin: isAdminEmail(email),
    totalPoints: toInteger(data.totalPoints),
    testsCompleted: toInteger(data.testsCompleted),
    totalTimeSpent: toNonNegativeNumber(data.totalTimeSpent),
    totalCorrectAnswers: toInteger(data.totalCorrectAnswers),
    totalQuestionsAttempted: toInteger(data.totalQuestionsAttempted)
  };
}

function publicLeaderboardEntry(doc) {
  const data = doc.data() || {};
  return {
    id: doc.id,
    uid: doc.id,
    name: data.name || 'Student',
    avatar: data.avatar || 'ST',
    totalPoints: toInteger(data.totalPoints),
    testsCompleted: toInteger(data.testsCompleted)
  };
}

function normalizeAttemptForResponse(raw = {}, userMeta = {}) {
  return {
    ...raw,
    chapter: raw.chapter || 'Untitled Chapter',
    quizSeed: raw.quizSeed || '',
    questionIds: Array.isArray(raw.questionIds) ? raw.questionIds : [],
    score: toInteger(raw.score),
    total: toInteger(raw.total),
    accuracy: toInteger(raw.accuracy),
    points: toInteger(raw.points),
    timestamp: toNonNegativeNumber(raw.timestamp, Date.now()),
    timeSpent: toNonNegativeNumber(raw.timeSpent),
    userId: raw.userId || userMeta.uid || '',
    userName: raw.userName || userMeta.name || 'Student',
    userAvatar: raw.userAvatar || userMeta.avatar || 'ST',
    cheatLog: raw.cheatLog || {}
  };
}

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) {
      res.status(401).json({ error: 'Missing Firebase ID token.' });
      return;
    }

    req.auth = await admin.auth().verifyIdToken(token);
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid Firebase ID token.' });
  }
}

async function requireAppCheck(req, res, next) {
  if (!REQUIRE_APP_CHECK) {
    next();
    return;
  }

  try {
    const token = req.get('x-firebase-appcheck') || '';
    if (!token) {
      res.status(401).json({ error: 'Missing Firebase App Check token.' });
      return;
    }

    req.appCheck = await admin.appCheck().verifyToken(token);
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid Firebase App Check token.' });
  }
}

function requireAdmin(req, res, next) {
  if (!isAdminEmail(req.auth && req.auth.email)) {
    res.status(403).json({ error: 'Admin access required.' });
    return;
  }
  next();
}

async function issueQuizAttempt(decoded, rawChapter, rawPartNumber = 1) {
  const payload = getQuizQuestionPayload(rawChapter, rawPartNumber);
  const nowMs = Date.now();
  const attemptId = crypto.randomUUID();
  const expiresAtMs = nowMs + QUIZ_ATTEMPT_TTL_MS;
  const userRef = db.collection('users').doc(decoded.uid);
  const attemptRef = userRef.collection('quizSessions').doc(attemptId);
  const hourBucket = getHourBucket(nowMs);
  const rateRef = userRef.collection('rateLimits').doc(`quiz-start-${hourBucket}`);

  await db.runTransaction(async (transaction) => {
    const rateSnapshot = await transaction.get(rateRef);
    const rateData = rateSnapshot.exists ? rateSnapshot.data() || {} : {};
    const startCount = toInteger(rateData.count);

    if (startCount >= MAX_QUIZ_STARTS_PER_HOUR) {
      throw createHttpError(429, 'Too many quizzes started. Please wait before starting another one.');
    }

    transaction.set(rateRef, {
      bucket: hourBucket,
      windowStartMs: getHourStartMs(nowMs),
      count: startCount + 1,
      updatedAt: serverTimestamp()
    }, { merge: true });

    transaction.set(attemptRef, {
      attemptId,
      uid: decoded.uid,
      status: 'issued',
      chapter: payload.chapter,
      partNumber: payload.partInfo.partNumber,
      partLabel: payload.partInfo.label,
      quizSeed: payload.quizSeed,
      questionIds: payload.questionIds,
      questionCount: payload.questionIds.length,
      maxPositivePoints: payload.questionIds.length * POINTS_PER_QUESTION,
      issuedAtMs: nowMs,
      expiresAtMs,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  });

  return {
    ...payload,
    attemptId,
    expiresAtMs
  };
}

async function findIssuedQuizSession(transaction, userRef, rawAttempt, clientAttemptId, nowMs) {
  if (clientAttemptId) {
    const directRef = userRef.collection('quizSessions').doc(clientAttemptId);
    const directSnapshot = await transaction.get(directRef);
    if (directSnapshot.exists) {
      return { ref: directRef, snapshot: directSnapshot };
    }
  }

  const quizSeed = clampText(rawAttempt.quizSeed, 160);
  if (!quizSeed) {
    throw createHttpError(400, 'A backend-issued quiz attempt is required.');
  }

  const fallbackSnapshot = await transaction.get(
    userRef.collection('quizSessions')
      .where('quizSeed', '==', quizSeed)
      .limit(5)
  );
  const submittedChapter = clampText(rawAttempt.chapter, 120);
  const submittedPartNumber = Math.max(1, toInteger(rawAttempt.partNumber, 1));
  const submittedQuestionIds = sanitizeQuestionIds(rawAttempt.questionIds);

  for (const doc of fallbackSnapshot.docs) {
    const data = doc.data() || {};
    if (
      data.status === 'issued'
      && data.uid === userRef.id
      && toNonNegativeNumber(data.expiresAtMs) >= nowMs
      && clampText(data.chapter, 120) === submittedChapter
      && Math.max(1, toInteger(data.partNumber, 1)) === submittedPartNumber
      && questionIdsMatch(data.questionIds, submittedQuestionIds)
    ) {
      return { ref: doc.ref, snapshot: doc };
    }
  }

  throw createHttpError(400, 'Start the quiz again before submitting. This attempt was not issued by the backend.');
}

async function ensureUserProfile(decoded, seed = {}) {
  const userRef = db.collection('users').doc(decoded.uid);
  const snapshot = await userRef.get();
  const existing = snapshot.exists ? snapshot.data() : {};
  const seedName = clampText(seed.name, 60);
  const seedAvatar = clampText(seed.avatar, 12);
  const profile = {
    uid: decoded.uid,
    email: decoded.email || existing.email || '',
    name: seedName || clampText(existing.name || decoded.name || (decoded.email || '').split('@')[0] || 'Student', 60),
    avatar: seedAvatar || clampText(existing.avatar || 'ST', 12),
    totalPoints: toInteger(existing.totalPoints),
    testsCompleted: toInteger(existing.testsCompleted),
    totalTimeSpent: toNonNegativeNumber(existing.totalTimeSpent),
    totalCorrectAnswers: toInteger(existing.totalCorrectAnswers),
    totalQuestionsAttempted: toInteger(existing.totalQuestionsAttempted),
    updatedAt: serverTimestamp(),
    lastLoginAt: serverTimestamp()
  };

  if (!snapshot.exists) {
    profile.createdAt = serverTimestamp();
  }

  await userRef.set(profile, { merge: true });
  return publicProfileFromDoc(decoded.uid, profile, decoded);
}

async function getLeaderboard() {
  const snapshot = await db.collection('users')
    .orderBy('totalPoints', 'desc')
    .limit(10)
    .get();

  return snapshot.docs.map((doc) => ({
    ...publicLeaderboardEntry(doc)
  }));
}

async function getUserAttempts(uid) {
  const snapshot = await db.collection('users').doc(uid)
    .collection('attempts')
    .orderBy('timestamp', 'desc')
    .limit(100)
    .get();

  return snapshot.docs
    .map((doc) => normalizeAttemptForResponse(doc.data(), { uid }))
    .sort((a, b) => a.timestamp - b.timestamp);
}

function normalizeAdminAttemptDoc(doc, userMetaById) {
  const data = doc.data();
  const userId = data.userId || (doc.ref.parent.parent && doc.ref.parent.parent.id) || '';
  return normalizeAttemptForResponse({
    userId,
    ...data
  }, userMetaById.get(userId) || { uid: userId });
}

async function getAdminAttemptsFromUsers(usersSnapshot, userMetaById) {
  const attemptSnapshots = await Promise.all(
    usersSnapshot.docs.map((userDoc) => userDoc.ref
      .collection('attempts')
      .orderBy('timestamp', 'desc')
      .limit(MAX_ADMIN_ATTEMPTS)
      .get())
  );

  return attemptSnapshots
    .flatMap((snapshot) => snapshot.docs.map((doc) => normalizeAdminAttemptDoc(doc, userMetaById)))
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, MAX_ADMIN_ATTEMPTS);
}

async function getAdminWithdrawalRequests() {
  const snapshot = await db.collection('withdrawalRequests')
    .orderBy('requestedAtMs', 'desc')
    .limit(MAX_WITHDRAWAL_REQUESTS)
    .get();

  return snapshot.docs.map((doc) => normalizeWithdrawalRequestDoc(doc));
}

async function getAdminDashboardData() {
  const usersSnapshot = await db.collection('users')
    .orderBy('totalPoints', 'desc')
    .limit(MAX_ADMIN_USERS)
    .get();

  const users = usersSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data()
  }));

  const userMetaById = new Map(users.map((user) => [user.id, {
    uid: user.id,
    name: user.name || 'Student',
    avatar: user.avatar || 'ST'
  }]));

  let attempts = [];
  try {
    const attemptsSnapshot = await db.collectionGroup('attempts')
      .orderBy('timestamp', 'desc')
      .limit(MAX_ADMIN_ATTEMPTS)
      .get();
    attempts = attemptsSnapshot.docs.map((doc) => normalizeAdminAttemptDoc(doc, userMetaById));
  } catch (error) {
    console.warn('Admin collection-group attempt query failed; falling back to per-user reads.', error);
    attempts = await getAdminAttemptsFromUsers(usersSnapshot, userMetaById);
  }

  const withdrawalRequests = await getAdminWithdrawalRequests();

  return { users, attempts, withdrawalRequests };
}

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'jee-maths-master-backend' });
});

app.post('/api/profile', requireAuth, async (req, res, next) => {
  try {
    const profile = await ensureUserProfile(req.auth, req.body || {});
    res.json({ profile });
  } catch (error) {
    next(error);
  }
});

app.get('/api/me', requireAuth, async (req, res, next) => {
  try {
    const profile = await ensureUserProfile(req.auth);
    const [attempts, leaderboard] = await Promise.all([
      getUserAttempts(req.auth.uid),
      getLeaderboard()
    ]);

    res.json({ profile, attempts, leaderboard });
  } catch (error) {
    next(error);
  }
});

app.get('/api/leaderboard', requireAuth, async (req, res, next) => {
  try {
    res.json({ leaderboard: await getLeaderboard() });
  } catch (error) {
    next(error);
  }
});

app.get('/api/quiz/chapters', requireAuth, async (req, res, next) => {
  try {
    res.json({
      chapters: getChapterCatalog(),
      settings: {
        pointsPerQuestion: POINTS_PER_QUESTION,
        incorrectPointsPenalty: INCORRECT_POINTS_PENALTY,
        dailyRewardCap: DAILY_REWARD_CAP,
        maxQuizStartsPerHour: MAX_QUIZ_STARTS_PER_HOUR,
        chapterPartSize: CHAPTER_PART_SIZE,
        quizTotalSeconds: 40 * 60
      }
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/quiz/questions', requireAuth, async (req, res, next) => {
  try {
    const chapter = clampText(req.query.chapter, 120);
    const partNumber = Math.max(1, toInteger(req.query.partNumber, 1));
    res.json(await issueQuizAttempt(req.auth, chapter, partNumber));
  } catch (error) {
    next(error);
  }
});

app.post('/api/withdrawals', requireAuth, async (req, res, next) => {
  try {
    const raw = req.body || {};
    const phone = clampText(raw.phone, 30);
    const upiId = clampText(raw.upiId, 120);
    const requestedPoints = toInteger(raw.requestedPoints);
    const nowMs = Date.now();

    if (!phone) {
      throw createHttpError(400, 'Phone number is required.');
    }

    if (!upiId) {
      throw createHttpError(400, 'UPI ID is required.');
    }

    if (requestedPoints < MIN_WITHDRAWAL_POINTS) {
      throw createHttpError(400, `Minimum ${MIN_WITHDRAWAL_POINTS.toLocaleString('en-US')} points required to request withdrawal.`);
    }

    const userRef = db.collection('users').doc(req.auth.uid);
    const requestRef = db.collection('withdrawalRequests').doc();
    const rateRef = userRef.collection('rateLimits').doc('withdrawal-submit');
    let savedRequest = null;

    await db.runTransaction(async (transaction) => {
      const [userSnapshot, rateSnapshot] = await Promise.all([
        transaction.get(userRef),
        transaction.get(rateRef)
      ]);
      const profile = userSnapshot.exists ? userSnapshot.data() || {} : {};
      const walletBalance = toInteger(profile.totalPoints);
      const rateData = rateSnapshot.exists ? rateSnapshot.data() || {} : {};
      const lastRequestAtMs = toInteger(rateData.lastRequestAtMs);

      if (lastRequestAtMs && nowMs - lastRequestAtMs < WITHDRAWAL_SUBMIT_COOLDOWN_MS) {
        throw createHttpError(429, 'Please wait a moment before submitting another withdrawal request.');
      }

      if (walletBalance < MIN_WITHDRAWAL_POINTS) {
        throw createHttpError(400, `Minimum ${MIN_WITHDRAWAL_POINTS.toLocaleString('en-US')} points required to request withdrawal.`);
      }

      if (requestedPoints > walletBalance) {
        throw createHttpError(400, 'Withdrawal points cannot be greater than your current wallet balance.');
      }

      savedRequest = {
        id: requestRef.id,
        userId: req.auth.uid,
        userName: clampText(profile.name || req.auth.name || (req.auth.email || '').split('@')[0] || 'Student', 80),
        email: clampText(profile.email || req.auth.email, 160),
        phone,
        upiId,
        walletBalance,
        requestedPoints,
        status: 'Pending',
        requestDateTime: nowMs,
        requestedAtMs: nowMs,
        requestedAt: serverTimestamp(),
        updatedAtMs: nowMs,
        updatedAt: serverTimestamp()
      };

      transaction.set(requestRef, savedRequest);
      transaction.set(rateRef, {
        lastRequestAtMs: nowMs,
        updatedAt: serverTimestamp()
      }, { merge: true });
    });

    res.status(201).json({
      withdrawalRequest: normalizeWithdrawalRequestDoc(savedRequest)
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/attempts', requireAuth, async (req, res, next) => {
  try {
    const userRef = db.collection('users').doc(req.auth.uid);
    const rawAttempt = req.body || {};
    const clientAttemptId = sanitizeClientAttemptId(rawAttempt.clientAttemptId);
    const nowMs = Date.now();
    const dailyRewardBucket = getDailyRewardBucket(nowMs);
    const dailyRewardRef = userRef.collection('rewardLimits').doc(dailyRewardBucket);
    let persistedAttempt = null;
    let persistedReview = [];

    const totals = await db.runTransaction(async (transaction) => {
      const latestUserSnapshot = await transaction.get(userRef);
      const issuedSession = await findIssuedQuizSession(transaction, userRef, rawAttempt, clientAttemptId, nowMs);
      const issuedAttempt = issuedSession.snapshot.data() || {};
      const backendAttemptId = sanitizeClientAttemptId(issuedAttempt.attemptId);
      if (!backendAttemptId) {
        throw createHttpError(400, 'Submitted attempt does not match the issued quiz attempt.');
      }
      const attemptRef = userRef.collection('attempts').doc(backendAttemptId);
      const existingAttemptSnapshot = await transaction.get(attemptRef);
      const dailyRewardSnapshot = await transaction.get(dailyRewardRef);
      const latest = latestUserSnapshot.exists ? latestUserSnapshot.data() : {};
      const previousTotalPoints = toInteger(latest.totalPoints);
      const currentProfile = publicProfileFromDoc(req.auth.uid, latest, req.auth);

      if (existingAttemptSnapshot.exists) {
        persistedAttempt = normalizeAttemptForResponse(existingAttemptSnapshot.data(), currentProfile);
        persistedReview = Array.isArray(persistedAttempt.review) ? persistedAttempt.review : [];
        return latest;
      }

      if (issuedAttempt.uid !== req.auth.uid || issuedAttempt.status !== 'issued') {
        throw createHttpError(409, 'This quiz attempt has already been used or is no longer valid.');
      }

      if (toNonNegativeNumber(issuedAttempt.expiresAtMs) < nowMs) {
        throw createHttpError(409, 'This quiz attempt expired. Please start the quiz again.');
      }

      const { attempt, review } = sanitizeAttempt(rawAttempt, currentProfile, previousTotalPoints, issuedAttempt);
      const resetPoints = Boolean(attempt.cheatLog && attempt.cheatLog.autoSubmitted);
      const rawAttemptPoints = resetPoints ? 0 : toInteger(attempt.points);
      const dailyRewardData = dailyRewardSnapshot.exists ? dailyRewardSnapshot.data() || {} : {};
      const previousDailyEarned = toNonNegativeNumber(dailyRewardData.earned);
      const dailyRewardRemaining = Math.max(0, DAILY_REWARD_CAP - previousDailyEarned);
      const cappedAttemptPoints = rawAttemptPoints > 0
        ? Math.min(rawAttemptPoints, dailyRewardRemaining)
        : rawAttemptPoints;
      const nextTotalPoints = resetPoints
        ? 0
        : Math.max(0, previousTotalPoints + cappedAttemptPoints);
      const attemptToSave = {
        ...attempt,
        points: resetPoints ? 0 : nextTotalPoints - previousTotalPoints,
        originalPoints: rawAttemptPoints,
        rewardCapped: rawAttemptPoints > cappedAttemptPoints,
        rewardCap: DAILY_REWARD_CAP,
        dailyRewardBucket,
        dailyRewardRemainingBefore: dailyRewardRemaining,
        startingBalance: previousTotalPoints,
        submittedAtMs: nowMs,
        review
      };

      const nextTotals = {
        totalPoints: nextTotalPoints,
        testsCompleted: toInteger(latest.testsCompleted) + 1,
        totalTimeSpent: toNonNegativeNumber(latest.totalTimeSpent) + toNonNegativeNumber(attempt.timeSpent),
        totalCorrectAnswers: toInteger(latest.totalCorrectAnswers) + toInteger(attempt.score),
        totalQuestionsAttempted: toInteger(latest.totalQuestionsAttempted) + toInteger(attempt.attemptedCount),
        name: currentProfile.name,
        avatar: currentProfile.avatar,
        email: currentProfile.email,
        lastPlayedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      persistedAttempt = attemptToSave;
      persistedReview = review;
      transaction.set(attemptRef, attemptToSave);
      transaction.set(issuedSession.ref, {
        status: 'completed',
        consumedAtMs: nowMs,
        consumedAt: serverTimestamp(),
        attemptPath: attemptRef.path,
        updatedAt: serverTimestamp()
      }, { merge: true });
      if (cappedAttemptPoints > 0) {
        transaction.set(dailyRewardRef, {
          bucket: dailyRewardBucket,
          cap: DAILY_REWARD_CAP,
          earned: previousDailyEarned + cappedAttemptPoints,
          updatedAt: serverTimestamp()
        }, { merge: true });
      }
      transaction.set(userRef, nextTotals, { merge: true });
      return nextTotals;
    });

    const [leaderboard, adminDashboard] = await Promise.all([
      getLeaderboard(),
      isAdminEmail(req.auth.email) ? getAdminDashboardData() : Promise.resolve(null)
    ]);

    res.json({
      attempt: {
        ...persistedAttempt,
        review: persistedReview
      },
      profile: publicProfileFromDoc(req.auth.uid, totals, req.auth),
      leaderboard,
      adminDashboard
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/dashboard', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    res.json(await getAdminDashboardData());
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/withdrawals', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    res.json({ withdrawalRequests: await getAdminWithdrawalRequests() });
  } catch (error) {
    next(error);
  }
});

app.patch('/api/admin/withdrawals/:requestId/status', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const requestId = sanitizeClientAttemptId(req.params.requestId);
    const status = clampText(req.body && req.body.status, 24);

    if (!requestId) {
      throw createHttpError(400, 'Withdrawal request id is required.');
    }

    if (!WITHDRAWAL_STATUSES.has(status)) {
      throw createHttpError(400, 'Invalid withdrawal status.');
    }

    const requestRef = db.collection('withdrawalRequests').doc(requestId);
    const snapshot = await requestRef.get();
    if (!snapshot.exists) {
      throw createHttpError(404, 'Withdrawal request not found.');
    }

    const nowMs = Date.now();
    await requestRef.set({
      status,
      updatedAtMs: nowMs,
      updatedAt: serverTimestamp(),
      updatedBy: req.auth.email || req.auth.uid
    }, { merge: true });

    const updatedSnapshot = await requestRef.get();
    res.json({ withdrawalRequest: normalizeWithdrawalRequestDoc(updatedSnapshot) });
  } catch (error) {
    next(error);
  }
});

app.use((error, req, res, next) => {
  console.error(error);
  const status = Number(error.status || 500);
  res.status(status).json({
    error: status >= 500 ? 'Backend request failed.' : error.message,
    detail: process.env.NODE_ENV === 'production' ? undefined : error.message
  });
});

module.exports = {
  apiApp: app
};
