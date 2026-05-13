const STORAGE_CONFIG_KEYS = ["apiKey", "authDomain", "projectId", "storageBucket", "appId"];

function hasRealStorageConfig(config) {
  return STORAGE_CONFIG_KEYS.every((key) => {
    const value = String(config?.[key] || "").trim();
    return value && !value.startsWith("PASTE_") && !value.startsWith("YOUR_");
  });
}

function getEffectiveFirebaseConfig() {
  if (hasRealStorageConfig(window.firebaseConfig)) return window.firebaseConfig;
  throw new Error("Firebase Storage config is missing. Add storageBucket and the rest of your Firebase web config in firebase-config.js.");
}

let storageInstance = null;

function getRecordingApp() {
  const firebaseCompat = window.firebase;
  if (!firebaseCompat || typeof firebaseCompat.initializeApp !== "function") {
    throw new Error("Firebase SDK is not loaded. Check the Firebase script tags in index.html.");
  }

  const config = getEffectiveFirebaseConfig();
  return firebaseCompat.apps.length ? firebaseCompat.app() : firebaseCompat.initializeApp(config);
}

function getRecordingStorage() {
  if (!storageInstance) {
    const app = getRecordingApp();
    if (typeof app.storage !== "function") {
      throw new Error("Firebase Storage SDK is not loaded. Add firebase-storage-compat.js before script.js in index.html.");
    }
    storageInstance = app.storage();
  }
  return storageInstance;
}

function ref(storage, path) {
  if (!storage || typeof storage.ref !== "function") {
    throw new Error("Firebase Storage service is not available.");
  }
  return storage.ref(path);
}

function uploadBytesResumable(storageRef, blob, metadata = {}) {
  if (!storageRef || typeof storageRef.put !== "function") {
    throw new Error("Firebase Storage upload task could not be created.");
  }
  return storageRef.put(blob, metadata);
}

function getDownloadURL(storageRef) {
  if (!storageRef || typeof storageRef.getDownloadURL !== "function") {
    throw new Error("Firebase Storage download URL could not be created.");
  }
  return storageRef.getDownloadURL();
}

function getMetadata(storageRef) {
  if (!storageRef || typeof storageRef.getMetadata !== "function") {
    throw new Error("Firebase Storage metadata could not be read.");
  }
  return storageRef.getMetadata();
}

export {
  getRecordingStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  getMetadata
};
