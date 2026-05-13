require('dotenv').config();

const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const MAX_ADMIN_USERS = Number(process.env.MAX_ADMIN_USERS || 200);
const MAX_ADMIN_ATTEMPTS = Number(process.env.MAX_ADMIN_ATTEMPTS || 250);
const POINTS_PER_QUESTION = 50;
const INCORRECT_POINTS_PENALTY = 50;
const CHAPTER_PART_SIZE = Number(process.env.CHAPTER_PART_SIZE || 20);
const CHAPTER_QUESTION_LIMIT = Number(process.env.CHAPTER_QUESTION_LIMIT || 100);
const NUMERICAL_VARIANTS_PER_ATTEMPT = Number(process.env.NUMERICAL_VARIANTS_PER_ATTEMPT || 2);
const adminEmails = new Set(
  String(process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
);

function getAllowedOrigins() {
  const raw = String(process.env.CORS_ORIGINS || '').trim();
  const production = process.env.NODE_ENV === 'production';
  if (!raw || raw === '*') return production ? [] : true;
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
  return {
    questionId: clampText(question && question.questionId, 120),
    questionNumber: index + 1,
    q: clampText(question && question.q, 2000),
    o: Array.isArray(question && question.o)
      ? question.o.slice(0, 4).map((option) => clampText(option, 1000))
      : []
  };
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
  if (!bank.getChapterNames().includes(chapter)) {
    throw createHttpError(400, 'Unknown quiz chapter.');
  }

  const partInfo = bank.getChapterPartInfo(chapter, partNumber);
  const quizSeed = createQuizSeed();
  const serverQuestions = bank.getQuizQuestionsForAttempt(chapter, partInfo.partNumber, quizSeed);
  const questions = serverQuestions.map(questionForClient);
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

function gradeAttemptPayload(raw = {}, startingBalance = 0) {
  const bank = getQuestionBankApi();
  const chapter = clampText(raw.chapter, 120);
  const partNumber = Math.max(1, toInteger(raw.partNumber, 1));
  const quizSeed = clampText(raw.quizSeed, 160);
  const rawQuestionIds = sanitizeQuestionIds(raw.questionIds);

  if (!bank.getChapterNames().includes(chapter)) {
    throw createHttpError(400, 'Unknown quiz chapter or part.');
  }

  let questions = rawQuestionIds.length
    ? bank.getQuizQuestionsByIds(chapter, rawQuestionIds)
    : [];

  if (rawQuestionIds.length && questions.length !== rawQuestionIds.length) {
    throw createHttpError(400, 'Question list did not match the selected quiz.');
  }

  if (!questions.length && quizSeed) {
    questions = bank.getQuizQuestionsForAttempt(chapter, partNumber, quizSeed);
  }

  if (!questions.length) {
    questions = bank.getQuizQuestionsForAttempt(chapter, partNumber);
  }

  if (!questions.length) {
    throw createHttpError(400, 'Unknown quiz chapter or part.');
  }

  const answers = sanitizeAnswerIndexes(raw.answers, questions.length);
  const timedOutQuestions = sanitizeBooleanList(raw.timedOutQuestions, questions.length);
  const markedQuestions = sanitizeBooleanList(raw.markedQuestions || raw.marked, questions.length);
  const grade = bank.gradeQuiz(questions, answers, timedOutQuestions, markedQuestions, startingBalance);
  const questionIds = questions.map((question) => question.questionId).filter(Boolean);

  return {
    ...grade,
    quizSeed,
    questionIds,
    answers,
    timedOutQuestions,
    markedQuestions
  };
}

function sanitizeAttempt(raw = {}, user, startingBalance = 0) {
  const clientAttemptId = sanitizeClientAttemptId(raw.clientAttemptId);
  const grade = gradeAttemptPayload(raw, startingBalance);
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
    clientAttemptId,
    chapter: clampText(raw.chapter, 120, 'Untitled Chapter'),
    partNumber: Math.max(1, toInteger(raw.partNumber, 1)),
    partLabel: clampText(raw.partLabel, 80),
    quizSeed: clampText(raw.quizSeed, 160),
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

function requireAdmin(req, res, next) {
  if (!isAdminEmail(req.auth && req.auth.email)) {
    res.status(403).json({ error: 'Admin access required.' });
    return;
  }
  next();
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

  return { users, attempts };
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
    res.json(getQuizQuestionPayload(chapter, partNumber));
  } catch (error) {
    next(error);
  }
});

app.post('/api/attempts', requireAuth, async (req, res, next) => {
  try {
    const userRef = db.collection('users').doc(req.auth.uid);
    const rawAttempt = req.body || {};
    const clientAttemptId = sanitizeClientAttemptId(rawAttempt.clientAttemptId);
    const fallbackAttemptRef = clientAttemptId ? null : userRef.collection('attempts').doc();
    let persistedAttempt = null;
    let persistedReview = [];

    const totals = await db.runTransaction(async (transaction) => {
      const latestUserSnapshot = await transaction.get(userRef);
      const latest = latestUserSnapshot.exists ? latestUserSnapshot.data() : {};
      const previousTotalPoints = toInteger(latest.totalPoints);
      const currentProfile = publicProfileFromDoc(req.auth.uid, latest, req.auth);
      const attemptRef = clientAttemptId
        ? userRef.collection('attempts').doc(clientAttemptId)
        : fallbackAttemptRef;
      const existingAttemptSnapshot = await transaction.get(attemptRef);
      if (existingAttemptSnapshot.exists) {
        persistedAttempt = normalizeAttemptForResponse(existingAttemptSnapshot.data(), currentProfile);
        return latest;
      }

      const { attempt, review } = sanitizeAttempt(rawAttempt, currentProfile, previousTotalPoints);
      const resetPoints = Boolean(attempt.cheatLog && attempt.cheatLog.autoSubmitted);
      const nextTotalPoints = resetPoints
        ? 0
        : Math.max(0, previousTotalPoints + toInteger(attempt.points));
      const attemptToSave = {
        ...attempt,
        points: resetPoints ? 0 : nextTotalPoints - previousTotalPoints
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

app.use((error, req, res, next) => {
  console.error(error);
  const status = Number(error.status || 500);
  res.status(status).json({
    error: status >= 500 ? 'Backend request failed.' : error.message,
    detail: process.env.NODE_ENV === 'production' ? undefined : error.message
  });
});

app.listen(PORT, () => {
  console.log(`JEE Maths Master backend running on http://127.0.0.1:${PORT}`);
});
