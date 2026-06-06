const paymentLinks = Object.freeze({
  "jee-class-11-maths": "https://rzp.io/rzp/jek6idxV",
  "jee-class-12-maths": "https://rzp.io/rzp/SMxIcvR",
  "jee-class-11-physics": "https://rzp.io/rzp/BXwtJRuo",
  "jee-class-12-physics": "https://rzp.io/rzp/t28EXIhZ",
  "jee-class-11-chemistry": "https://rzp.io/rzp/ueCjbRI",
  "jee-class-12-chemistry": "https://rzp.io/rzp/ejLnBuB",
  "mhtcet-class-11-maths": "https://rzp.io/rzp/1c0ghHi",
  "mhtcet-class-12-maths": "https://rzp.io/rzp/X5wcsQvr",
  "mhtcet-class-11-physics": "https://rzp.io/rzp/rXym8Os",
  "mhtcet-class-12-physics": "https://rzp.io/rzp/idtwLW0",
  "mhtcet-class-11-chemistry": "https://rzp.io/rzp/62QKyS6",
  "mhtcet-class-12-chemistry": "https://rzp.io/rzp/mNBjw6c"
});

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
const LEARNLOOT_PURCHASED_COURSES_KEY = "learnloot_purchased_courses";

// NOTE:
// This localStorage unlock system is for testing/demo.
// For production, verify Razorpay payment using webhook/backend
// and store purchased courses in Firebase/Firestore per logged-in user.

function isKnownPaymentCourse(courseId) {
  return Boolean(paymentLinks[String(courseId || "").trim()]);
}

function getPurchasedCourses() {
  try {
    const storedValue = JSON.parse(localStorage.getItem(LEARNLOOT_PURCHASED_COURSES_KEY) || "[]");
    if (!Array.isArray(storedValue)) return [];
    return Array.from(new Set(storedValue.filter(isKnownPaymentCourse)));
  } catch (error) {
    console.warn("Could not read purchased LearnLoot courses:", error);
    return [];
  }
}

function markCoursePurchased(courseId) {
  const normalizedCourseId = String(courseId || "").trim();
  if (!isKnownPaymentCourse(normalizedCourseId)) return false;

  const purchasedCourses = getPurchasedCourses();
  if (!purchasedCourses.includes(normalizedCourseId)) {
    purchasedCourses.push(normalizedCourseId);
    localStorage.setItem(LEARNLOOT_PURCHASED_COURSES_KEY, JSON.stringify(purchasedCourses));
  }
  return true;
}

function isCoursePurchased(courseId) {
  return getPurchasedCourses().includes(String(courseId || "").trim());
}

function isFreeDemoQuiz(chapterIndex, quizIndex) {
  return Number(chapterIndex) === 0 && Number(quizIndex) === 0;
}

function canAccessQuiz(courseId, chapterIndex, quizIndex) {
  return isCoursePurchased(courseId) || isFreeDemoQuiz(chapterIndex, quizIndex);
}

function buyCourse(courseId) {
  const normalizedCourseId = String(courseId || "").trim();
  const link = paymentLinks[normalizedCourseId];

  if (!link) {
    alert("Payment link is not added for this course yet.");
    return;
  }

  localStorage.setItem(LEARNLOOT_PENDING_COURSE_KEY, normalizedCourseId);
  window.location.href = link;
}

window.LearnLootPayments = Object.freeze({
  paymentLinks,
  paymentCourseNames,
  pendingCourseKey: LEARNLOOT_PENDING_COURSE_KEY,
  purchasedCoursesKey: LEARNLOOT_PURCHASED_COURSES_KEY
});
