const paymentCourseNames = Object.freeze({
  "jee-class-11-maths": "JEE Class 11 Mathematics",
  "jee-class-12-maths": "JEE Class 12 Mathematics",
  "jee-class-11-physics": "JEE Class 11 Physics",
  "jee-class-12-physics": "JEE Class 12 Physics",
  "jee-class-11-chemistry": "JEE Class 11 Chemistry",
  "jee-class-12-chemistry": "JEE Class 12 Chemistry",
  "mhtcet-class-11-maths": "MHT-CET Class 11 Mathematics",
  "mhtcet-class-12-maths": "MHT-CET Class 12 Mathematics",
  "mhtcet-class-11-physics": "MHT-CET Class 11 Physics",
  "mhtcet-class-12-physics": "MHT-CET Class 12 Physics",
  "mhtcet-class-11-chemistry": "MHT-CET Class 11 Chemistry",
  "mhtcet-class-12-chemistry": "MHT-CET Class 12 Chemistry"
});

const LEARNLOOT_PENDING_COURSE_KEY = "learnloot_pending_course";
const verifiedPurchasedCourseIds = new Set();
let paymentStartInProgress = false;

function isKnownPaymentCourse(courseId) {
  return Boolean(paymentCourseNames[String(courseId || "").trim()]);
}

function getPurchasedCourses() {
  return Array.from(verifiedPurchasedCourseIds);
}

function setVerifiedPurchasedCourses(courseIds = []) {
  verifiedPurchasedCourseIds.clear();
  if (Array.isArray(courseIds)) {
    courseIds
      .map((courseId) => String(courseId || "").trim())
      .filter(isKnownPaymentCourse)
      .forEach((courseId) => verifiedPurchasedCourseIds.add(courseId));
  }
  return getPurchasedCourses();
}

function clearVerifiedPurchasedCourses() {
  verifiedPurchasedCourseIds.clear();
}

function isCoursePurchased(courseId) {
  return verifiedPurchasedCourseIds.has(String(courseId || "").trim());
}

function isFreeDemoQuiz(chapterIndex, quizIndex) {
  return Number(chapterIndex) === 0 && Number(quizIndex) === 0;
}

function canAccessQuiz(courseId, chapterIndex, quizIndex) {
  return isCoursePurchased(courseId) || isFreeDemoQuiz(chapterIndex, quizIndex);
}

function getPendingCourseId() {
  const courseId = String(localStorage.getItem(LEARNLOOT_PENDING_COURSE_KEY) || "").trim();
  return isKnownPaymentCourse(courseId) ? courseId : "";
}

async function buyCourse(courseId) {
  const normalizedCourseId = String(courseId || "").trim();
  if (!isKnownPaymentCourse(normalizedCourseId)) {
    alert("Payment is not available for this course yet.");
    return;
  }

  const signedInUser = typeof firebase !== "undefined" && firebase.auth
    ? firebase.auth().currentUser
    : null;
  if (!signedInUser) {
    alert("Please login before buying this course.");
    if (typeof window.showLoginScreen === "function") window.showLoginScreen();
    return;
  }

  if (paymentStartInProgress) return;
  paymentStartInProgress = true;

  try {
    if (typeof window.callBackend !== "function") {
      throw new Error("Secure payment service is unavailable.");
    }

    const result = await window.callBackend("/api/payments/create-link", {
      method: "POST",
      body: { courseId: normalizedCourseId }
    });

    if (result.alreadyPurchased) {
      setVerifiedPurchasedCourses([...getPurchasedCourses(), normalizedCourseId]);
      localStorage.removeItem(LEARNLOOT_PENDING_COURSE_KEY);
      if (typeof window.refreshCoursePurchaseUI === "function") window.refreshCoursePurchaseUI();
      if (typeof window.showPointsNotification === "function") {
        window.showPointsNotification("This course is already purchased.", "points-added");
      }
      return;
    }

    if (!result.success || !result.paymentUrl) {
      throw new Error("Unable to start payment. Please try again.");
    }

    localStorage.setItem(LEARNLOOT_PENDING_COURSE_KEY, normalizedCourseId);
    window.location.href = result.paymentUrl;
  } catch (error) {
    console.error("Secure payment start failed:", error);
    alert(error.message || "Payment could not be started. Please try again.");
  } finally {
    paymentStartInProgress = false;
  }
}

window.LearnLootPayments = Object.freeze({
  paymentCourseNames,
  pendingCourseKey: LEARNLOOT_PENDING_COURSE_KEY,
  getPurchasedCourses,
  setVerifiedPurchasedCourses,
  clearVerifiedPurchasedCourses
});
