const service = require('../services/bet.service');
const { validateBet } = require('../validators/bet.validator');
const { logAction } = require('../utils/audit');

function sessionUserId(req) {
  return req.session?.user?.id ?? req.session?.userId ?? req.user?.id;
}

function parseId(req) {
  const id = Number(req.params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

const notFound = (res) => res.status(404).json({ success: false, message: 'Bet not found' });

exports.list = async (req, res, next) => {
  try {
    const data = await service.list(sessionUserId(req), req.query);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.meta = async (req, res, next) => {
  try {
    res.json({ success: true, data: await service.meta(sessionUserId(req)) });
  } catch (err) { next(err); }
};

exports.get = async (req, res, next) => {
  try {
    const id = parseId(req);
    if (!id) return notFound(res);
    const bet = await service.getById(sessionUserId(req), id);
    if (!bet) return notFound(res);
    res.json({ success: true, data: bet });
  } catch (err) { next(err); }
};

async function validated(req, res) {
  const { errors, value } = validateBet(req.body);
  if (errors) {
    res.status(422).json({ success: false, message: 'Validation failed', errors });
    return null;
  }
  if (!(await service.sportExists(value.sportId))) {
    res.status(422).json({ success: false, message: 'Validation failed', errors: { sportId: 'invalid' } });
    return null;
  }
  if (value.categoryId && !(await service.categoryExists(value.categoryId))) {
    res.status(422).json({ success: false, message: 'Validation failed', errors: { categoryId: 'invalid' } });
    return null;
  }
  return value;
}

exports.create = async (req, res, next) => {
  try {
    const value = await validated(req, res);
    if (!value) return;
    const bet = await service.create(sessionUserId(req), value);
    await logAction(req, 'bet.create', 'bet', bet.id, { match: bet.matchTitle, stake: bet.stake });
    res.status(201).json({ success: true, data: bet });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const id = parseId(req);
    if (!id) return notFound(res);
    const value = await validated(req, res);
    if (!value) return;
    const bet = await service.update(sessionUserId(req), id, value);
    if (!bet) return notFound(res);
    await logAction(req, 'bet.update', 'bet', id, { result: bet.result, profitLoss: bet.profitLoss });
    res.json({ success: true, data: bet });
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const id = parseId(req);
    if (!id) return notFound(res);
    const ok = await service.remove(sessionUserId(req), id);
    if (!ok) return notFound(res);
    await logAction(req, 'bet.delete', 'bet', id, null);
    res.json({ success: true });
  } catch (err) { next(err); }
};
