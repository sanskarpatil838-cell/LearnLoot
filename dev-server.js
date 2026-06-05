const http = require('http');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const { normalizeMathSymbols, hasBrokenMathFragments, toReadableMathText } = require('./functions/math-normalizer');

const root = __dirname;
const appBasePath = `/${path.basename(root)}`;
const port = Number(process.argv[2] || process.env.PORT || 5500);
const host = process.argv[3] || process.env.HOST || '127.0.0.1';
const cloudApiBaseUrl = 'https://us-central1-earnlearn-68952.cloudfunctions.net/api';
const POINTS_PER_QUESTION = 50;
const INCORRECT_POINTS_PENALTY = 50;
const CHAPTER_PART_SIZE = Number(process.env.CHAPTER_PART_SIZE || 20);
const CHAPTER_QUESTION_LIMIT = Number(process.env.CHAPTER_QUESTION_LIMIT || 100);
const NUMERICAL_VARIANTS_PER_ATTEMPT = Number(process.env.NUMERICAL_VARIANTS_PER_ATTEMPT || 2);
const QUIZ_ATTEMPT_TTL_MS = 3 * 60 * 60 * 1000;
const REFERRAL_REWARD_POINTS = 100;
const MAX_LEADERBOARD_USERS = Number(process.env.MAX_LEADERBOARD_USERS || 10);
const localQuizSessions = new Map();
const localProfiles = new Map();
const localAttempts = new Map();
const localWithdrawalRequests = [];
const localReferrals = [];
const localPointsHistory = new Map();
const localDevDataRoot = path.join(root, '.local-dev-data');
const localDevDataPath = path.join(localDevDataRoot, 'learnloot-local-data.json');
const localRecordingRoot = path.join(root, '.local-recordings');
let questionBankApi = null;
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webm': 'video/webm'
};

const devCorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization,Content-Type,X-Firebase-AppCheck,X-LearnLoot-Backend-Mode'
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, { ...devCorsHeaders, ...headers });
  res.end(body);
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function sendJson(res, status, body) {
  send(res, status, JSON.stringify(body), {
    'Content-Type': 'application/json; charset=utf-8'
  });
}

function sendStaticFile(req, res, filePath) {
  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      send(res, 404, 'Not found');
      return;
    }

    const contentType = mimeTypes[path.extname(filePath)] || 'application/octet-stream';
    const headers = {
      'Content-Type': contentType,
      'Cache-Control': 'no-store, max-age=0',
      'Accept-Ranges': 'bytes'
    };
    const rangeHeader = req.headers.range;

    if (rangeHeader) {
      const rangeMatch = String(rangeHeader).match(/^bytes=(\d*)-(\d*)$/);
      if (!rangeMatch) {
        send(res, 416, '', {
          ...headers,
          'Content-Range': `bytes */${stats.size}`
        });
        return;
      }

      const start = rangeMatch[1] ? Number(rangeMatch[1]) : 0;
      const end = rangeMatch[2] ? Number(rangeMatch[2]) : stats.size - 1;
      if (
        !Number.isInteger(start)
        || !Number.isInteger(end)
        || start < 0
        || end < start
        || start >= stats.size
      ) {
        send(res, 416, '', {
          ...headers,
          'Content-Range': `bytes */${stats.size}`
        });
        return;
      }

      const safeEnd = Math.min(end, stats.size - 1);
      res.writeHead(206, {
        ...devCorsHeaders,
        ...headers,
        'Content-Range': `bytes ${start}-${safeEnd}/${stats.size}`,
        'Content-Length': safeEnd - start + 1
      });
      fs.createReadStream(filePath, { start, end: safeEnd }).pipe(res);
      return;
    }

    res.writeHead(200, {
      ...devCorsHeaders,
      ...headers,
      'Content-Length': stats.size
    });
    fs.createReadStream(filePath).pipe(res);
  });
}

function clampText(value, maxLength, fallback = '') {
  return String(value || fallback).trim().slice(0, maxLength);
}

function toInteger(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : fallback;
}

function readArray(value) {
  return Array.isArray(value) ? value : [];
}

function readMapEntries(value) {
  return Array.isArray(value) ? value.filter((entry) => Array.isArray(entry) && entry.length >= 2) : [];
}

function saveLocalDevData() {
  try {
    fs.mkdirSync(localDevDataRoot, { recursive: true });
    const payload = {
      savedAtMs: Date.now(),
      quizSessions: Array.from(localQuizSessions.entries()),
      profiles: Array.from(localProfiles.values()),
      attempts: Array.from(localAttempts.entries()),
      withdrawalRequests: [...localWithdrawalRequests],
      referrals: [...localReferrals],
      pointsHistory: Array.from(localPointsHistory.entries())
    };
    const tempPath = `${localDevDataPath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(payload, null, 2));
    fs.renameSync(tempPath, localDevDataPath);
  } catch (error) {
    console.warn('Could not save local LearnLoot dev data:', error.message);
  }
}

function loadLocalDevData() {
  try {
    if (!fs.existsSync(localDevDataPath)) return;
    const payload = JSON.parse(fs.readFileSync(localDevDataPath, 'utf8'));

    localQuizSessions.clear();
    readMapEntries(payload.quizSessions).forEach(([attemptId, session]) => {
      if (attemptId && session && typeof session === 'object') {
        localQuizSessions.set(String(attemptId), session);
      }
    });

    localProfiles.clear();
    readArray(payload.profiles).forEach((profile) => {
      if (profile && profile.uid) localProfiles.set(String(profile.uid), profile);
    });

    localAttempts.clear();
    readMapEntries(payload.attempts).forEach(([uid, attempts]) => {
      localAttempts.set(String(uid), readArray(attempts));
    });

    localWithdrawalRequests.splice(0, localWithdrawalRequests.length, ...readArray(payload.withdrawalRequests));
    localReferrals.splice(0, localReferrals.length, ...readArray(payload.referrals));

    localPointsHistory.clear();
    readMapEntries(payload.pointsHistory).forEach(([uid, history]) => {
      localPointsHistory.set(String(uid), readArray(history));
    });

    pruneLocalQuizSessions();
  } catch (error) {
    console.warn('Could not load local LearnLoot dev data:', error.message);
  }
}

loadLocalDevData();

function sanitizeClientAttemptId(value) {
  return clampText(value, 120)
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function sanitizeStorageSegment(value, fallback = 'item', maxLength = 160) {
  const safeValue = String(value || fallback)
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, maxLength);
  return safeValue || fallback;
}

function getQuizPartAttemptKey(chapter, partNumber) {
  return crypto
    .createHash('sha1')
    .update(`${clampText(chapter, 120)}::${Math.max(1, toInteger(partNumber, 1))}`)
    .digest('hex');
}

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function isLocalBackendMode(req) {
  return String(req.headers['x-learnloot-backend-mode'] || '').trim().toLowerCase() === 'local';
}

function normalizeReferralCode(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 20);
}

function createLocalReferralCode(authUser, seed = {}) {
  const base = String(seed.name || authUser.name || authUser.email || authUser.uid || 'USER')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 7) || 'USER';
  let code = '';
  do {
    code = normalizeReferralCode(`${base}${crypto.randomBytes(3).toString('hex').toUpperCase()}`).slice(0, 12);
  } while (Array.from(localProfiles.values()).some((profile) => profile.referralCode === code));
  return code;
}

function findLocalReferralOwner(code) {
  const referralCode = normalizeReferralCode(code);
  return Array.from(localProfiles.values()).find((profile) => profile.referralCode === referralCode) || null;
}

function decodeBase64UrlJson(value) {
  try {
    const base64 = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
  } catch (error) {
    return {};
  }
}

function getLocalAuthUser(req) {
  const authorization = String(req.headers.authorization || '');
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1] || '';
  const payload = token.split('.').length >= 2 ? decodeBase64UrlJson(token.split('.')[1]) : {};
  const email = clampText(payload.email, 160);
  const fallbackName = email ? email.split('@')[0] : 'Student';

  return {
    uid: clampText(payload.user_id || payload.sub || 'local-student', 160),
    email,
    name: clampText(payload.name || fallbackName, 80, 'Student'),
    isAdmin: email.toLowerCase() === 'sanskarpatil838@gmail.com'
  };
}

function getOrCreateLocalProfile(req, seed = {}) {
  const authUser = getLocalAuthUser(req);
  const existing = localProfiles.get(authUser.uid) || {};
  const isNewProfile = !localProfiles.has(authUser.uid);
  const incomingReferralCode = normalizeReferralCode(seed.referralCode || seed.referredBy || seed.ref);
  const referralCode = existing.referralCode || createLocalReferralCode(authUser, seed);
  let referredBy = existing.referredBy || '';

  if (isNewProfile && authUser.email) {
    const emailAlreadyUsed = Array.from(localProfiles.values()).some((profile) => (
      String(profile.email || '').toLowerCase() === authUser.email.toLowerCase()
      && profile.uid !== authUser.uid
    ));
    if (emailAlreadyUsed) {
      throw createHttpError(409, 'An account with this email already exists.');
    }
  }

  if (incomingReferralCode && isNewProfile) {
    if (incomingReferralCode === referralCode) {
      throw createHttpError(400, 'You cannot use your own referral code.');
    }

    const referrer = findLocalReferralOwner(incomingReferralCode);
    if (!referrer) {
      throw createHttpError(400, 'Invalid referral code.');
    }
    if (referrer.uid === authUser.uid) {
      throw createHttpError(400, 'You cannot use your own referral code.');
    }
    if (localReferrals.some((entry) => entry.referredUserId === authUser.uid)) {
      throw createHttpError(409, 'Referral bonus already credited.');
    }

    referrer.totalPoints = toInteger(referrer.totalPoints) + REFERRAL_REWARD_POINTS;
    referrer.points = referrer.totalPoints;
    referrer.totalReferrals = toInteger(referrer.totalReferrals) + 1;
    referrer.numberOfReferrals = referrer.totalReferrals;
    referrer.noOfReferrals = referrer.totalReferrals;
    referrer.referralPoints = toInteger(referrer.referralPoints) + REFERRAL_REWARD_POINTS;
    referrer.updatedAtMs = Date.now();
    localProfiles.set(referrer.uid, referrer);
    referredBy = referrer.uid;

    const referral = {
      id: `${referrer.uid}_${authUser.uid}`,
      referrerUserId: referrer.uid,
      referrerEmail: referrer.email || '',
      referrerName: referrer.name || 'Student',
      referredUserId: authUser.uid,
      referredEmail: authUser.email || '',
      referredName: clampText(seed.name || authUser.name, 80, 'Student'),
      referralCode: incomingReferralCode,
      status: 'completed',
      rewardPoints: REFERRAL_REWARD_POINTS,
      createdAtMs: Date.now(),
      updatedAtMs: Date.now(),
      suspicious: false,
      suspiciousReason: '',
      localOnly: true
    };
    localReferrals.unshift(referral);
    const history = localPointsHistory.get(referrer.uid) || [];
    history.unshift({
      type: 'referral_bonus',
      points: REFERRAL_REWARD_POINTS,
      message: 'Referral bonus credited for inviting a new user',
      referredUserId: authUser.uid,
      referralId: referral.id,
      createdAtMs: Date.now(),
      localOnly: true
    });
    localPointsHistory.set(referrer.uid, history);
  }

  const totalReferrals = toInteger(existing.totalReferrals ?? existing.numberOfReferrals ?? existing.noOfReferrals);
  const profile = {
    uid: authUser.uid,
    id: authUser.uid,
    name: clampText(seed.name || existing.name || authUser.name, 80, 'Student'),
    avatar: clampText(seed.avatar || existing.avatar || 'ST', 20, 'ST'),
    email: authUser.email,
    isAdmin: authUser.isAdmin,
    totalPoints: toInteger(existing.totalPoints),
    points: toInteger(existing.totalPoints),
    referralCode,
    referredBy,
    totalReferrals,
    numberOfReferrals: totalReferrals,
    noOfReferrals: totalReferrals,
    referralPoints: toInteger(existing.referralPoints),
    testsCompleted: toInteger(existing.testsCompleted),
    totalTimeSpent: toInteger(existing.totalTimeSpent),
    totalCorrectAnswers: toInteger(existing.totalCorrectAnswers),
    totalQuestionsAttempted: toInteger(existing.totalQuestionsAttempted),
    createdAtMs: existing.createdAtMs || Date.now(),
    updatedAtMs: Date.now(),
    localOnly: true
  };

  localProfiles.set(authUser.uid, profile);
  saveLocalDevData();
  return profile;
}

function getLocalUserAttempts(uid) {
  return localAttempts.get(uid) || [];
}

function getLocalLeaderboard() {
  return Array.from(localProfiles.values())
    .sort((a, b) => (
      toInteger(b.totalPoints) - toInteger(a.totalPoints)
      || toInteger(b.testsCompleted) - toInteger(a.testsCompleted)
      || String(a.name || '').localeCompare(String(b.name || ''))
    ))
    .slice(0, MAX_LEADERBOARD_USERS)
    .map((profile) => ({
      id: profile.uid,
      uid: profile.uid,
      name: profile.name,
      avatar: profile.avatar,
      totalPoints: toInteger(profile.totalPoints),
      testsCompleted: toInteger(profile.testsCompleted),
      totalTimeSpent: toInteger(profile.totalTimeSpent),
      totalCorrectAnswers: toInteger(profile.totalCorrectAnswers),
      totalQuestionsAttempted: toInteger(profile.totalQuestionsAttempted),
      localOnly: true
    }));
}

function getLocalAdminDashboard() {
  const users = Array.from(localProfiles.values()).map((profile) => ({
    ...profile,
    id: profile.uid
  }));
  const attempts = Array.from(localAttempts.values()).flat();

  return {
    users,
    attempts,
    withdrawalRequests: [...localWithdrawalRequests],
    referrals: [...localReferrals]
  };
}

function getLocalReferralHistory(uid) {
  return localReferrals.filter((referral) => referral.referrerUserId === uid);
}

function validateLocalReferralCode(code, uid = '') {
  const referralCode = normalizeReferralCode(code);
  const referrer = findLocalReferralOwner(referralCode);
  if (!referralCode || !referrer) {
    throw createHttpError(400, 'Invalid referral code.');
  }
  if (uid && referrer.uid === uid) {
    throw createHttpError(400, 'You cannot use your own referral code.');
  }
  return {
    valid: true,
    referralCode,
    referrerUserId: referrer.uid,
    referrerName: referrer.name || 'Student',
    localOnly: true
  };
}

function persistLocalAttempt(req, rawAttempt) {
  const response = submitLocalQuizAttempt(req, rawAttempt);
  const profile = getOrCreateLocalProfile(req);
  const attempt = {
    ...response.attempt,
    userId: profile.uid,
    userName: profile.name,
    userAvatar: profile.avatar
  };
  const attempts = [attempt, ...getLocalUserAttempts(profile.uid)].slice(0, 100);
  localAttempts.set(profile.uid, attempts);

  profile.totalPoints = Math.max(0, toInteger(profile.totalPoints) + toInteger(attempt.points));
  profile.points = profile.totalPoints;
  profile.testsCompleted = toInteger(profile.testsCompleted) + 1;
  profile.totalTimeSpent = toInteger(profile.totalTimeSpent) + Math.max(0, toInteger(attempt.timeSpent));
  profile.totalCorrectAnswers = toInteger(profile.totalCorrectAnswers) + toInteger(attempt.score);
  profile.totalQuestionsAttempted = toInteger(profile.totalQuestionsAttempted) + toInteger(attempt.attemptedCount);
  profile.updatedAtMs = Date.now();
  localProfiles.set(profile.uid, profile);
  saveLocalDevData();

  return {
    attempt,
    profile,
    leaderboard: getLocalLeaderboard(),
    adminDashboard: profile.isAdmin ? getLocalAdminDashboard() : undefined,
    localOnly: true
  };
}

function createLocalWithdrawalRequest(req, raw = {}) {
  const profile = getOrCreateLocalProfile(req);
  const requestedPoints = Math.max(0, toInteger(raw.requestedPoints));
  const nowMs = Date.now();
  const withdrawalRequest = {
    id: crypto.randomUUID(),
    userId: profile.uid,
    userName: profile.name,
    email: profile.email,
    phone: clampText(raw.phone, 30),
    upiId: clampText(raw.upiId, 120),
    walletBalance: toInteger(profile.totalPoints),
    requestedPoints,
    status: 'Pending',
    requestDateTime: nowMs,
    requestedAtMs: nowMs,
    updatedAtMs: nowMs,
    localOnly: true
  };

  localWithdrawalRequests.unshift(withdrawalRequest);
  saveLocalDevData();
  return { withdrawalRequest };
}

function normalizeBooleanList(value, length) {
  return Array.from({ length }, (_, index) => Boolean(Array.isArray(value) ? value[index] : false));
}

function normalizeAnswerList(value, length) {
  return Array.from({ length }, (_, index) => {
    const answer = Array.isArray(value) ? value[index] : null;
    return Number.isInteger(answer) ? answer : null;
  });
}

async function readJsonRequestBody(req) {
  const body = await readRequestBody(req);
  if (!body.length) return {};

  try {
    return JSON.parse(body.toString('utf8'));
  } catch (error) {
    const parseError = new Error('Invalid JSON request body.');
    parseError.status = 400;
    throw parseError;
  }
}

function getQuestionBankApi() {
  if (questionBankApi) return questionBankApi;

  const questionBankPath = path.resolve(root, 'functions', 'question-bank.js');
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

  ['jee-math-question-bank.js', 'physics-question-bank.js', 'chemistry-question-bank.js', 'jee-advanced-pyq-question-bank.js', 'mht-cet-jee-main-pyq-question-bank.js'].forEach((fileName) => {
    const supplementalPath = path.resolve(root, 'functions', fileName);
    if (fs.existsSync(supplementalPath)) {
      const supplementalCode = fs.readFileSync(supplementalPath, 'utf8');
      vm.runInContext(supplementalCode, sandbox, { filename: supplementalPath });
    }
  });

  const requiredHelpers = [
    'getChapterNames',
    'getChapterQuestionCount',
    'getChapterPartCount',
    'getChapterPartInfo',
    'getChapterPartSize',
    'getQuizQuestionsForAttempt',
    'getQuizQuestionsByIds',
    'gradeQuiz'
  ];
  const missingHelper = requiredHelpers.find((name) => typeof sandbox[name] !== 'function');
  if (missingHelper) {
    throw new Error(`Question bank helper ${missingHelper} is not available.`);
  }

  questionBankApi = Object.fromEntries(
    requiredHelpers.map((name) => [name, sandbox[name]])
  );
  return questionBankApi;
}

function questionForClient(question, index) {
  const exactPaperText = Boolean(question && question.exactPaperText);
  const qHtml = question && question.qHtml
    ? exactPaperText
      ? clampText(question.qHtml, 10000)
      : normalizeMathSymbols(clampText(question.qHtml, 10000))
    : '';
  const optionHtml = question && Array.isArray(question.oHtml)
    ? question.oHtml.slice(0, 4).map((option) => exactPaperText
      ? clampText(option, 3000)
      : normalizeMathSymbols(clampText(option, 3000)))
    : [];
  const questionText = safeQuestionText(question && question.q, 6000);
  const optionText = Array.isArray(question && question.o)
    ? question.o.slice(0, 4).map((option) => safeQuestionText(option, 2000))
    : [];

  return {
    questionId: clampText(question && question.questionId, 120),
    questionNumber: index + 1,
    q: questionText,
    o: optionText,
    qHtml: qHtml && (exactPaperText || !hasBrokenMathFragments(qHtml)) ? qHtml : '',
    oHtml: optionHtml.map((option) => (exactPaperText || !hasBrokenMathFragments(option)) ? option : '')
  };
}

function safeQuestionText(value, limit) {
  const normalized = normalizeMathSymbols(clampText(value, limit));
  return hasBrokenMathFragments(normalized) ? toReadableMathText(normalized) : normalized;
}

function getLocalChapterCatalog() {
  const bank = getQuestionBankApi();
  return bank.getChapterNames().map((name) => ({
    name,
    totalQuestions: bank.getChapterQuestionCount(name),
    totalParts: bank.getChapterPartCount(name),
    perPart: bank.getChapterPartSize(name)
  }));
}

function createQuizSeed() {
  return crypto.randomBytes(16).toString('hex');
}

function pruneLocalQuizSessions() {
  const nowMs = Date.now();
  let changed = false;
  for (const [attemptId, session] of localQuizSessions.entries()) {
    if (toInteger(session.expiresAtMs) < nowMs) {
      localQuizSessions.delete(attemptId);
      changed = true;
    }
  }
  if (changed) saveLocalDevData();
}

function issueLocalQuizAttempt(req, chapter, partNumber) {
  const bank = getQuestionBankApi();
  if (!bank.getChapterNames().includes(chapter)) {
    const error = new Error('Unknown quiz chapter.');
    error.status = 400;
    throw error;
  }

  const partInfo = bank.getChapterPartInfo(chapter, partNumber);
  if (!partInfo.totalParts) {
    const error = new Error('No questions are available for this chapter yet.');
    error.status = 404;
    throw error;
  }

  const profile = getOrCreateLocalProfile(req);
  const quizKey = getQuizPartAttemptKey(chapter, partInfo.partNumber);
  const alreadyAttempted = getLocalUserAttempts(profile.uid).some((attempt) => (
    attempt.quizKey === quizKey
    || (
      attempt.chapter === chapter
      && toInteger(attempt.partNumber) === partInfo.partNumber
    )
  ));
  if (alreadyAttempted) {
    throw createHttpError(409, 'You have already attempted this quiz. Each quiz can be attempted only once.');
  }

  const quizSeed = createQuizSeed();
  const serverQuestions = bank.getQuizQuestionsForAttempt(chapter, partInfo.partNumber, quizSeed);
  const questions = serverQuestions.map(questionForClient);
  const questionIds = questions.map((question) => question.questionId).filter(Boolean);
  const attemptId = crypto.randomUUID();
  const expiresAtMs = Date.now() + QUIZ_ATTEMPT_TTL_MS;

  localQuizSessions.set(attemptId, {
    attemptId,
    uid: profile.uid,
    chapter,
    partNumber: partInfo.partNumber,
    partLabel: partInfo.label,
    quizKey,
    quizSeed,
    questionIds,
    expiresAtMs
  });
  saveLocalDevData();

  return {
    chapter,
    partInfo: {
      ...partInfo,
      questionCount: questions.length
    },
    quizSeed,
    questionIds,
    questions,
    attemptId,
    expiresAtMs,
    localOnly: true
  };
}

function submitLocalQuizAttempt(req, rawAttempt) {
  const bank = getQuestionBankApi();
  const clientAttemptId = sanitizeClientAttemptId(rawAttempt.clientAttemptId || rawAttempt.attemptId);
  const session = localQuizSessions.get(clientAttemptId);
  if (!session) {
    const error = new Error('Local quiz attempt was not found. Start the quiz again.');
    error.status = 409;
    throw error;
  }

  if (toInteger(session.expiresAtMs) < Date.now()) {
    localQuizSessions.delete(clientAttemptId);
    saveLocalDevData();
    const error = new Error('Local quiz attempt expired. Start the quiz again.');
    error.status = 409;
    throw error;
  }

  const profile = getOrCreateLocalProfile(req);
  if (session.uid !== profile.uid) {
    throw createHttpError(409, 'This quiz attempt belongs to another user.');
  }

  const quizKey = session.quizKey || getQuizPartAttemptKey(session.chapter, session.partNumber);
  const alreadyAttempted = getLocalUserAttempts(profile.uid).some((attempt) => (
    attempt.clientAttemptId !== session.attemptId
    && (
      attempt.quizKey === quizKey
      || (
        attempt.chapter === session.chapter
        && toInteger(attempt.partNumber) === toInteger(session.partNumber)
      )
    )
  ));
  if (alreadyAttempted) {
    throw createHttpError(409, 'You have already attempted this quiz. Each quiz can be attempted only once.');
  }

  const questions = bank.getQuizQuestionsByIds(session.chapter, session.questionIds);
  if (!questions.length || questions.length !== session.questionIds.length) {
    const error = new Error('Local quiz attempt could not be verified.');
    error.status = 400;
    throw error;
  }

  const answers = normalizeAnswerList(rawAttempt.answers, questions.length);
  const timedOutQuestions = normalizeBooleanList(rawAttempt.timedOutQuestions, questions.length);
  const markedQuestions = normalizeBooleanList(rawAttempt.markedQuestions || rawAttempt.marked, questions.length);
  const grade = bank.gradeQuiz(questions, answers, timedOutQuestions, markedQuestions, 0);
  const cheatLog = rawAttempt.cheatLog && typeof rawAttempt.cheatLog === 'object'
    ? rawAttempt.cheatLog
    : {};

  const attempt = {
    ...rawAttempt,
    attemptId: session.attemptId,
    clientAttemptId: session.attemptId,
    quizKey,
    chapter: session.chapter,
    partNumber: session.partNumber,
    partLabel: session.partLabel,
    quizSeed: session.quizSeed,
    questionIds: session.questionIds,
    score: toInteger(grade.score),
    total: toInteger(grade.total),
    accuracy: toInteger(grade.accuracy),
    attemptedCount: toInteger(grade.attemptedCount),
    incorrectCount: toInteger(grade.incorrectCount),
    timedOutCount: toInteger(grade.timedOutCount),
    unattemptedCount: toInteger(grade.unattemptedCount),
    points: cheatLog.autoSubmitted ? 0 : toInteger(grade.points),
    answers,
    timedOutQuestions,
    markedQuestions,
    review: Array.isArray(grade.review) ? grade.review : [],
    timestamp: Date.now(),
    timeSpent: Math.max(0, toInteger(rawAttempt.timeSpent)),
    localOnly: true
  };

  localQuizSessions.delete(clientAttemptId);
  saveLocalDevData();
  return { attempt };
}

async function saveLocalRecordingChunk(req) {
  const raw = await readJsonRequestBody(req);
  const authUser = getLocalAuthUser(req);
  const index = toInteger(raw.index);
  const attemptId = sanitizeStorageSegment(raw.attemptId, '', 160);
  const quizId = sanitizeStorageSegment(raw.quizId, 'quiz', 120);
  const studentId = sanitizeStorageSegment(authUser.uid, '', 160);
  const requestedContentType = String(raw.contentType || '').trim();
  const contentType = /^video\/webm/i.test(requestedContentType) || /^video\/x-matroska/i.test(requestedContentType)
    ? requestedContentType
    : 'video/webm;codecs=vp8,opus';
  const rawBase64 = String(raw.dataBase64 || raw.base64 || raw.data || '')
    .replace(/^data:[^;]+;base64,/i, '')
    .trim();

  if (!studentId) throw createHttpError(400, 'Recording upload requires a signed-in user.');
  if (!/^[A-Za-z0-9_-]{3,160}$/.test(attemptId)) throw createHttpError(400, 'A valid recording attempt ID is required.');
  if (!quizId) throw createHttpError(400, 'A valid quiz ID is required.');
  if (index < 1 || index > 9999) throw createHttpError(400, 'A valid recording chunk index is required.');
  if (!rawBase64 || !/^[A-Za-z0-9+/=_-]+$/.test(rawBase64)) {
    throw createHttpError(400, 'Recording chunk data is missing or invalid.');
  }

  const buffer = Buffer.from(rawBase64.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  if (!buffer.length || buffer.length > 20 * 1024 * 1024) {
    throw createHttpError(400, 'Recording chunk is empty or too large.');
  }

  const fileName = `chunk_${String(index).padStart(4, '0')}.webm`;
  const relativePath = path.join('quiz-recordings', studentId, quizId, attemptId, 'chunks', fileName);
  const absolutePath = path.join(localRecordingRoot, relativePath);
  if (!absolutePath.startsWith(localRecordingRoot)) {
    throw createHttpError(400, 'Invalid recording path.');
  }

  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, buffer);

  return {
    chunk: {
      index,
      path: relativePath.replace(/\\/g, '/'),
      localPath: absolutePath,
      size: buffer.length,
      contentType,
      status: 'uploaded',
      localOnly: true
    },
    localOnly: true
  };
}

function findLocalRecordingDir({ attemptId, studentId = '', quizId = '' }) {
  const safeAttemptId = sanitizeStorageSegment(attemptId, '', 160);
  if (!safeAttemptId) return null;

  const recordingsRoot = path.join(localRecordingRoot, 'quiz-recordings');
  const safeStudentId = sanitizeStorageSegment(studentId, '', 160);
  const safeQuizId = sanitizeStorageSegment(quizId, '', 120);
  if (safeStudentId && safeQuizId) {
    const directDir = path.join(recordingsRoot, safeStudentId, safeQuizId, safeAttemptId);
    if (directDir.startsWith(localRecordingRoot) && fs.existsSync(path.join(directDir, 'chunks'))) {
      return directDir;
    }
  }

  if (!fs.existsSync(recordingsRoot)) return null;
  for (const userEntry of fs.readdirSync(recordingsRoot, { withFileTypes: true })) {
    if (!userEntry.isDirectory()) continue;
    const userDir = path.join(recordingsRoot, userEntry.name);
    for (const quizEntry of fs.readdirSync(userDir, { withFileTypes: true })) {
      if (!quizEntry.isDirectory()) continue;
      const attemptDir = path.join(userDir, quizEntry.name, safeAttemptId);
      if (attemptDir.startsWith(localRecordingRoot) && fs.existsSync(path.join(attemptDir, 'chunks'))) {
        return attemptDir;
      }
    }
  }

  return null;
}

function getLocalRecordingChunks({ attemptId, studentId = '', quizId = '' }) {
  const attemptDir = findLocalRecordingDir({ attemptId, studentId, quizId });
  if (!attemptDir) return { attemptDir: null, chunks: [] };

  const chunksDir = path.join(attemptDir, 'chunks');
  const chunks = fs.readdirSync(chunksDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^chunk_[0-9]{4}\.webm$/i.test(entry.name))
    .map((entry) => {
      const absolutePath = path.join(chunksDir, entry.name);
      const stats = fs.statSync(absolutePath);
      const index = Number(entry.name.match(/chunk_([0-9]{4})\.webm/i)?.[1] || 0);
      const relativePath = path.relative(localRecordingRoot, absolutePath).replace(/\\/g, '/');
      return {
        id: entry.name.replace(/\.webm$/i, ''),
        index,
        path: relativePath,
        localPath: absolutePath,
        size: stats.size,
        contentType: 'video/webm',
        status: 'uploaded',
        uploadedVia: 'local_backend',
        localOnly: true
      };
    })
    .sort((a, b) => a.index - b.index);

  return { attemptDir, chunks };
}

function listLocalRecordingChunks(req) {
  const requestUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const result = getLocalRecordingChunks({
    attemptId: requestUrl.searchParams.get('attemptId'),
    studentId: requestUrl.searchParams.get('studentId'),
    quizId: requestUrl.searchParams.get('quizId')
  });

  return {
    chunks: result.chunks,
    chunkCount: result.chunks.length,
    localOnly: true
  };
}

function tryRemuxLocalWebm(joinedPath, finalPath) {
  try {
    const ffmpegPath = require(path.join(root, 'functions', 'node_modules', 'ffmpeg-static'));
    if (!ffmpegPath || !fs.existsSync(ffmpegPath)) return false;
    const result = spawnSync(ffmpegPath, [
      '-hide_banner',
      '-y',
      '-i',
      joinedPath,
      '-c',
      'copy',
      finalPath
    ], { encoding: 'utf8' });
    return result.status === 0 && fs.existsSync(finalPath);
  } catch (error) {
    return false;
  }
}

async function mergeLocalRecordingChunks(req) {
  const raw = await readJsonRequestBody(req);
  const attemptId = sanitizeStorageSegment(raw.attemptId, '', 160);
  if (!/^[A-Za-z0-9_-]{3,160}$/.test(attemptId)) {
    throw createHttpError(400, 'A valid recording attempt ID is required.');
  }

  const { attemptDir, chunks } = getLocalRecordingChunks({
    attemptId,
    studentId: raw.studentId,
    quizId: raw.quizId
  });
  if (!attemptDir || !chunks.length) {
    throw createHttpError(404, 'No local recording chunks were found for this attempt.');
  }

  const expectedChunkCount = Math.max(toInteger(raw.chunkCount), chunks.length);
  if (chunks.length < expectedChunkCount) {
    throw createHttpError(409, `Waiting for all chunks to load before merging. Found ${chunks.length}/${expectedChunkCount}.`);
  }
  for (let expectedIndex = 1; expectedIndex <= expectedChunkCount; expectedIndex += 1) {
    if (chunks[expectedIndex - 1]?.index !== expectedIndex) {
      throw createHttpError(409, `Recording is missing chunk ${expectedIndex}.`);
    }
  }

  const finalDir = path.join(attemptDir, 'final');
  fs.mkdirSync(finalDir, { recursive: true });
  const joinedPath = path.join(finalDir, 'joined-recording.webm');
  const finalPath = path.join(finalDir, 'full-recording.webm');
  const fileHandle = fs.openSync(joinedPath, 'w');
  try {
    for (const chunk of chunks) {
      fs.writeSync(fileHandle, fs.readFileSync(chunk.localPath));
    }
  } finally {
    fs.closeSync(fileHandle);
  }

  if (!tryRemuxLocalWebm(joinedPath, finalPath)) {
    fs.copyFileSync(joinedPath, finalPath);
  }

  const relativeFinalPath = path.relative(root, finalPath).replace(/\\/g, '/');
  const origin = `http://${req.headers.host || `127.0.0.1:${port}`}`;
  return {
    attemptId,
    finalVideoPath: relativeFinalPath,
    finalVideoUrl: `${origin}/${relativeFinalPath}`,
    chunkCount: chunks.length,
    localOnly: true
  };
}

function shouldHandleLocalApi(localPath, method, req) {
  if (method === 'GET' && (localPath === '/health' || localPath === '/api/health')) return true;
  if (!isLocalBackendMode(req)) return false;

  return (method === 'POST' && localPath === '/api/profile')
    || (method === 'GET' && localPath === '/api/me')
    || (method === 'GET' && localPath === '/api/referrals/validate')
    || (method === 'GET' && localPath === '/api/leaderboard')
    || (method === 'POST' && localPath === '/api/withdrawals')
    || (method === 'GET' && localPath === '/api/admin/dashboard')
    || (method === 'PATCH' && /^\/api\/admin\/withdrawals\/[^/]+\/status$/.test(localPath))
    || (method === 'PATCH' && /^\/api\/admin\/referrals\/[^/]+\/status$/.test(localPath))
    || (method === 'GET' && localPath === '/api/quiz/chapters')
    || (method === 'GET' && localPath === '/api/quiz/questions')
    || (method === 'POST' && localPath === '/api/attempts')
    || (method === 'POST' && localPath === '/api/recordings/chunks')
    || (method === 'GET' && localPath === '/api/recordings/chunks')
    || (method === 'POST' && localPath === '/api/recordings/merge');
}

async function handleLocalApiRequest(req, res, localPath) {
  try {
    pruneLocalQuizSessions();

    if (req.method === 'GET' && (localPath === '/health' || localPath === '/api/health')) {
      sendJson(res, 200, { ok: true, service: 'learnloot-local-dev-backend', localOnly: true });
      return;
    }

    if (req.method === 'POST' && localPath === '/api/profile') {
      const seed = await readJsonRequestBody(req);
      sendJson(res, 200, { profile: getOrCreateLocalProfile(req, seed), localOnly: true });
      return;
    }

    if (req.method === 'GET' && localPath === '/api/me') {
      const profile = getOrCreateLocalProfile(req);
      sendJson(res, 200, {
        profile,
        attempts: getLocalUserAttempts(profile.uid),
        leaderboard: getLocalLeaderboard(),
        referralHistory: getLocalReferralHistory(profile.uid),
        localOnly: true
      });
      return;
    }

    if (req.method === 'GET' && localPath === '/api/referrals/validate') {
      const requestUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
      const authUser = getLocalAuthUser(req);
      sendJson(res, 200, validateLocalReferralCode(requestUrl.searchParams.get('code'), authUser.uid));
      return;
    }

    if (req.method === 'GET' && localPath === '/api/leaderboard') {
      getOrCreateLocalProfile(req);
      sendJson(res, 200, { leaderboard: getLocalLeaderboard(), localOnly: true });
      return;
    }

    if (req.method === 'GET' && localPath === '/api/quiz/chapters') {
      sendJson(res, 200, {
        chapters: getLocalChapterCatalog(),
        settings: {
          pointsPerQuestion: POINTS_PER_QUESTION,
          incorrectPointsPenalty: INCORRECT_POINTS_PENALTY,
          dailyRewardCap: 1000,
          maxQuizStartsPerHour: 12,
          chapterPartSize: CHAPTER_PART_SIZE,
          quizTotalSeconds: 40 * 60,
          localOnly: true
        }
      });
      return;
    }

    if (req.method === 'GET' && localPath === '/api/quiz/questions') {
      const requestUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
      const chapter = clampText(requestUrl.searchParams.get('chapter'), 120);
      const partNumber = Math.max(1, toInteger(requestUrl.searchParams.get('partNumber'), 1));
      sendJson(res, 200, issueLocalQuizAttempt(req, chapter, partNumber));
      return;
    }

    if (req.method === 'POST' && localPath === '/api/attempts') {
      const rawAttempt = await readJsonRequestBody(req);
      sendJson(res, 200, persistLocalAttempt(req, rawAttempt || {}));
      return;
    }

    if (req.method === 'POST' && localPath === '/api/recordings/chunks') {
      sendJson(res, 201, await saveLocalRecordingChunk(req));
      return;
    }

    if (req.method === 'GET' && localPath === '/api/recordings/chunks') {
      sendJson(res, 200, listLocalRecordingChunks(req));
      return;
    }

    if (req.method === 'POST' && localPath === '/api/recordings/merge') {
      sendJson(res, 200, await mergeLocalRecordingChunks(req));
      return;
    }

    if (req.method === 'POST' && localPath === '/api/withdrawals') {
      const rawWithdrawal = await readJsonRequestBody(req);
      sendJson(res, 201, createLocalWithdrawalRequest(req, rawWithdrawal || {}));
      return;
    }

    if (req.method === 'GET' && localPath === '/api/admin/dashboard') {
      getOrCreateLocalProfile(req);
      sendJson(res, 200, getLocalAdminDashboard());
      return;
    }

    if (req.method === 'PATCH' && /^\/api\/admin\/withdrawals\/[^/]+\/status$/.test(localPath)) {
      const rawStatus = await readJsonRequestBody(req);
      const requestId = decodeURIComponent(localPath.split('/')[4] || '');
      const safeStatus = ['Pending', 'Approved', 'Rejected', 'Paid'].includes(rawStatus.status)
        ? rawStatus.status
        : 'Pending';
      const request = localWithdrawalRequests.find((entry) => entry.id === requestId);
      if (!request) {
        const error = new Error('Withdrawal request was not found.');
        error.status = 404;
        throw error;
      }

      request.status = safeStatus;
      request.updatedAtMs = Date.now();
      saveLocalDevData();
      sendJson(res, 200, {
        withdrawalRequest: request,
        user: localProfiles.get(request.userId) || null,
        localOnly: true
      });
      return;
    }

    if (req.method === 'PATCH' && /^\/api\/admin\/referrals\/[^/]+\/status$/.test(localPath)) {
      const rawStatus = await readJsonRequestBody(req);
      const referralId = decodeURIComponent(localPath.split('/')[4] || '');
      const safeStatus = ['completed', 'cancelled'].includes(rawStatus.status)
        ? rawStatus.status
        : 'completed';
      const referral = localReferrals.find((entry) => entry.id === referralId);
      if (!referral) {
        throw createHttpError(404, 'Referral record was not found.');
      }

      const referrer = localProfiles.get(referral.referrerUserId);
      if (safeStatus === 'cancelled' && referral.status !== 'cancelled' && referrer) {
        referrer.totalPoints = Math.max(0, toInteger(referrer.totalPoints) - toInteger(referral.rewardPoints, REFERRAL_REWARD_POINTS));
        referrer.points = referrer.totalPoints;
        referrer.referralPoints = Math.max(0, toInteger(referrer.referralPoints) - toInteger(referral.rewardPoints, REFERRAL_REWARD_POINTS));
        referrer.totalReferrals = Math.max(0, toInteger(referrer.totalReferrals) - 1);
        referrer.numberOfReferrals = referrer.totalReferrals;
        referrer.noOfReferrals = referrer.totalReferrals;
        referrer.updatedAtMs = Date.now();
        localProfiles.set(referrer.uid, referrer);
      }

      referral.status = safeStatus;
      referral.suspicious = safeStatus === 'cancelled';
      referral.suspiciousReason = safeStatus === 'cancelled'
        ? clampText(rawStatus.suspiciousReason || 'Cancelled by admin review', 240)
        : referral.suspiciousReason;
      referral.updatedAtMs = Date.now();
      referral.cancelledAtMs = safeStatus === 'cancelled' ? Date.now() : 0;
      saveLocalDevData();
      sendJson(res, 200, {
        referral,
        user: referrer || null,
        localOnly: true
      });
      return;
    }
  } catch (error) {
    sendJson(res, error.status || 500, {
      error: error.status ? error.message : 'Local quiz API failed.',
      detail: error.message
    });
  }
}

async function proxyApiRequest(req, res, localPath) {
  try {
    const body = await readRequestBody(req);
    const upstreamUrl = `${cloudApiBaseUrl}${localPath}${(req.url || '').includes('?') ? `?${(req.url || '').split('?').slice(1).join('?')}` : ''}`;
    const headers = { ...req.headers };
    delete headers.host;
    delete headers.connection;
    delete headers['content-length'];
    delete headers['accept-encoding'];
    delete headers.origin;
    delete headers.referer;

    const upstreamResponse = await fetch(upstreamUrl, {
      method: req.method,
      headers,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : body
    });

    const responseHeaders = {};
    upstreamResponse.headers.forEach((value, key) => {
      if (!['content-encoding', 'transfer-encoding', 'connection'].includes(key.toLowerCase())) {
        responseHeaders[key] = value;
      }
    });

    const responseBody = Buffer.from(await upstreamResponse.arrayBuffer());
    send(res, upstreamResponse.status, responseBody, responseHeaders);
  } catch (error) {
    send(res, 502, JSON.stringify({
      error: 'Local dev proxy could not reach the backend API.',
      detail: error.message
    }), {
      'Content-Type': 'application/json; charset=utf-8'
    });
  }
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    send(res, 204, '');
    return;
  }

  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  const localPath = urlPath === appBasePath
    ? '/'
    : urlPath.startsWith(`${appBasePath}/`)
      ? urlPath.slice(appBasePath.length)
      : urlPath;

  if (shouldHandleLocalApi(localPath, req.method, req)) {
    handleLocalApiRequest(req, res, localPath);
    return;
  }

  if (localPath === '/health' || localPath.startsWith('/api/')) {
    proxyApiRequest(req, res, localPath);
    return;
  }

  const relativePath = localPath === '/' ? 'index.html' : localPath.replace(/^\/+/, '');
  const requestedPath = relativePath === 'index.html' || path.extname(relativePath)
    ? relativePath
    : 'index.html';
  const filePath = path.resolve(root, requestedPath);

  if (!filePath.startsWith(root)) {
    send(res, 403, 'Forbidden');
    return;
  }

  sendStaticFile(req, res, filePath);
});

server.listen(port, host, () => {
  console.log(`JEE Maths Master running at http://${host}:${port}/`);
});
