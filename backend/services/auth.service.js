const bcrypt = require('bcrypt');
const userModel = require('../models/user.model');

const SALT_ROUNDS = 12;

async function register({ name, email, password }) {
  const existing = await userModel.findByEmail(email);
  if (existing) {
    const err = new Error('An account with this email already exists.');
    err.status = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  return userModel.createUser({ name, email, passwordHash });
}

async function login({ email, password }) {
  const user = await userModel.findByEmail(email);
  if (!user) {
    const err = new Error('Invalid email or password.');
    err.status = 401;
    throw err;
  }

  if (user.status === 'suspended') {
    const err = new Error('This account has been suspended.');
    err.status = 403;
    throw err;
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    const err = new Error('Invalid email or password.');
    err.status = 401;
    throw err;
  }

  return user;
}

module.exports = { register, login };