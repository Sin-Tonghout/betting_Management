const authService = require('../services/auth.service');
const { validateRegister, validateLogin } = require('../validators/auth.validator');

function sanitizeUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

async function register(req, res, next) {
  try {
    const errors = validateRegister(req.body);
    if (errors.length) return res.status(400).json({ errors });

    const user = await authService.register(req.body);

    req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.user = sanitizeUser(user);
      res.status(201).json({ user: sanitizeUser(user) });
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const errors = validateLogin(req.body);
    if (errors.length) return res.status(400).json({ errors });

    const user = await authService.login(req.body);

    req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.user = sanitizeUser(user);
      res.json({ user: sanitizeUser(user) });
    });
  } catch (err) {
    next(err);
  }
}

function logout(req, res, next) {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out.' });
  });
}

function me(req, res) {
  if (!req.session.user) return res.status(401).json({ error: 'Not authenticated.' });
  res.json({ user: req.session.user });
}

module.exports = { register, login, logout, me };