const crypto = require('crypto');
const db = require('./db');

function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

function hashPassword(password, salt) {
  if (!password || !salt) throw new Error('Password and salt are required.');
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function verifyPassword(password, salt, storedHash) {
  if (!password || !salt || !storedHash) return false;
  try {
    const inputHash = crypto.scryptSync(password, salt, 64).toString('hex');
    const storedBuf = Buffer.from(storedHash, 'hex');
    const inputBuf = Buffer.from(inputHash, 'hex');
    if (storedBuf.length !== inputBuf.length) return false;
    return crypto.timingSafeEqual(storedBuf, inputBuf);
  } catch (err) {
    console.error('Password verification error:', err.message);
    return false;
  }
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function parseCookies(cookieHeader) {
  if (!cookieHeader) return {};
  const cookies = {};
  cookieHeader.split(';').forEach(c => {
    const parts = c.trim().split('=');
    if (parts.length >= 2) {
      cookies[parts[0]] = decodeURIComponent(parts.slice(1).join('='));
    }
  });
  return cookies;
}

function extractToken(req) {
  // Check authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  // Check cookies
  const cookies = parseCookies(req.headers.cookie);
  if (cookies.vydeora_session) {
    return cookies.vydeora_session;
  }
  return null;
}

function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({
      error: 'Non authentifié. Veuillez vous connecter pour accéder à cette ressource.'
    });
  }

  const session = db.getSession(token);
  if (!session) {
    return res.status(401).json({
      error: 'Session expirée ou invalide. Veuillez vous reconnecter.'
    });
  }

  const user = db.getUserById(session.userId);
  if (!user) {
    return res.status(401).json({
      error: 'Compte utilisateur introuvable.'
    });
  }

  req.userId = session.userId;
  req.sessionToken = token;
  req.user = user;
  next();
}

function optionalAuth(req) {
  const token = extractToken(req);
  if (!token) return null;
  const session = db.getSession(token);
  if (!session) return null;
  const user = db.getUserById(session.userId);
  if (!user) return null;
  return { userId: user.id, user, token };
}

module.exports = {
  generateSalt,
  hashPassword,
  verifyPassword,
  generateToken,
  requireAuth,
  optionalAuth,
  extractToken
};
