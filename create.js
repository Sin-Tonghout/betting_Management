const fs = require("fs");
const path = require("path");

const root = "betting-management";

const directories = [
  "backend/config",
  "backend/controllers",
  "backend/middleware",
  "backend/models",
  "backend/routes",
  "backend/services",
  "backend/validators",
  "backend/utils",
  "frontend/pages",
  "frontend/components",
  "frontend/css",
  "frontend/js",
  "frontend/assets",
  "database/migrations",
  "database/seeds",
  "translations",
  "docs"
];

const files = [
  "backend/config/db.js",
  "backend/middleware/rateLimiter.js",
  "backend/routes/health.routes.js",
  "backend/app.js",
  "backend/server.js",
  "frontend/pages/index.html",
  ".env.example",
  ".gitignore",
  "package.json",
  "README.md"
];

for (const dir of directories) {
  fs.mkdirSync(path.join(root, dir), { recursive: true });
}

for (const file of files) {
  const filePath = path.join(root, file);

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, "", "utf8");
  }
}

console.log("Betting Management project structure created successfully!");