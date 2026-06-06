const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const publicDir = path.join(root, "netlify-public");

const staticFiles = [
  "index.html",
  "styles.css",
  "script.js",
  "payment-config.js",
  "payment-success.html",
  "firebase-config.js",
  "firebase.js",
  "manifest.webmanifest"
];

fs.rmSync(publicDir, { recursive: true, force: true });
fs.mkdirSync(publicDir, { recursive: true });

for (const file of staticFiles) {
  fs.copyFileSync(path.join(root, file), path.join(publicDir, file));
}

fs.writeFileSync(path.join(publicDir, "_redirects"), "/* /index.html 200\n");
fs.writeFileSync(path.join(publicDir, "netlify.toml"), "[build]\n  publish = \".\"\n");
console.log(`Prepared Netlify public folder at ${publicDir}`);
