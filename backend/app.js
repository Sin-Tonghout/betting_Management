const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const { apiLimiter } = require('./middleware/rateLimiter');
const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const betRoutes = require('./routes/bet.routes');
const liveRoutes = require('./routes/live.routes');
const { requireAuth } = require('./middleware/auth.middleware');
const statisticsRoutes = require('./routes/statistics.routes');
const app = express();

const sessionStore = new MySQLStore({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24,
  },
}));

app.use('/api', apiLimiter);

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/bets', betRoutes);
app.use('/api/live-bets', liveRoutes);
app.use('/api/statistics', statisticsRoutes);

app.use('/translations', express.static(path.join(__dirname, '..', 'translations')));
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/dashboard.html'));
});

const pageFile = (name) => path.join(__dirname, '..', 'frontend', 'pages', name);

app.get('/bets', (req, res) => {
  res.sendFile(pageFile('bets.html'));
});

app.get('/bets/create', (req, res) => {
  res.sendFile(pageFile('bet-form.html'));
});

app.get('/bets/:id', (req, res, next) => {
  if (!/^\d+$/.test(req.params.id)) {
    return next();
  }

  res.sendFile(pageFile('bet-form.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'pages', 'index.html'));
});
app.get('/statistics', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/statistics.html'));
});
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'pages', 'login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'pages', 'register.html'));
});

app.get('/live-bets', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/live.html'));
});

app.use(
  '/vendor/bootstrap',
  express.static(path.join(__dirname, '../node_modules/bootstrap/dist'))
);

app.use(
  '/vendor/bootstrap-icons',
  express.static(path.join(__dirname, '../node_modules/bootstrap-icons/font'))
);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, next) => {
  console.error(err);

  res.status(err.status || 500).json({
    error: err.message || 'Server error',
  });
});



module.exports = app;