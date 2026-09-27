function validateRegister(body) {
  const errors = [];
  const { name, email, password } = body || {};

  if (!name || name.trim().length < 2) errors.push('Name must be at least 2 characters.');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('A valid email is required.');
  if (!password || password.length < 8) errors.push('Password must be at least 8 characters.');

  return errors;
}

function validateLogin(body) {
  const errors = [];
  const { email, password } = body || {};

  if (!email) errors.push('Email is required.');
  if (!password) errors.push('Password is required.');

  return errors;
}

module.exports = { validateRegister, validateLogin };