window.firebaseConfig = {
  apiKey: "AIzaSyA0c_sAloWTVSBYpKHtAp2LOvCurWzTGEw",
  authDomain: "earnlearn-68952.firebaseapp.com",
  projectId: "earnlearn-68952",
  storageBucket: "earnlearn-68952.firebasestorage.app",
  messagingSenderId: "865834260760",
  appId: "1:865834260760:web:50cf5227fd46458af5666d"
};

window.adminConfig = {
  adminEmails: ["sanskarpatil838@gmail.com"],
  suspicionThreshold: 8,
  rapidAnswerSeconds: 3,
  maxAdminUsers: 200,
  maxAdminAttempts: 250,
  maxLeaderboardUsers: 10
};

window.appCheckConfig = {
  enabled: false,
  siteKey: ""
};

const backendApiBaseUrl = (() => {
  const params = new URLSearchParams(window.location.search);
  const backendMode = params.get("backend");
  const isLocalStaticServer = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const cloudBackendUrl = "https://us-central1-earnlearn-68952.cloudfunctions.net/api";
  const localBackendUrl = `${window.location.protocol}//${window.location.hostname}:5500`;
  if (backendMode === "local") return localBackendUrl;
  if (isLocalStaticServer) return localBackendUrl;
  return cloudBackendUrl;
})();

const backendMode = (() => {
  const params = new URLSearchParams(window.location.search);
  const explicitMode = params.get("backend");
  if (explicitMode === "local" || explicitMode === "cloud") return explicitMode;
  return ["localhost", "127.0.0.1"].includes(window.location.hostname) ? "local" : "cloud";
})();

window.backendConfig = {
  apiBaseUrl: backendApiBaseUrl,
  mode: backendMode,
  requireBackend: true,
  allowClientFirestoreFallback: false
};

window.isFirebaseConfigured = function isFirebaseConfigured(config) {
  if (!config) return false;

  const requiredKeys = ["apiKey", "authDomain", "projectId", "appId"];
  return requiredKeys.every((key) => {
    const value = String(config[key] || "").trim();
    return value && !value.startsWith("YOUR_");
  });
};
