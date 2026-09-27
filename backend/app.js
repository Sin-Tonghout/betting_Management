const express = require("express");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const session = require("express-session");

const apiLimiter = require("./middleware/rateLimiter");
const healthRoutes = require("./routes/health.routes");

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24,
    },
  }),
);

app.use("/api", apiLimiter);
app.use("/api/health", healthRoutes);

app.use(express.static(path.join(__dirname, "..", "frontend")));

app.use(express.static(path.join(__dirname, "..", "frontend")));
app.use(express.static(path.join(__dirname, "..", "frontend")));
app.use(
  "/translations",
  express.static(path.join(__dirname, "..", "translations")),
);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "pages", "index.html"));
});

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Server error" });
});

module.exports = app;
