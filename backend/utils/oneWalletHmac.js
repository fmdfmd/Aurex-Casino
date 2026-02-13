const crypto = require('crypto');

function formatHmacValue(value) {
  if (typeof value === 'boolean') return value ? '1' : '';
  if (value === null || value === undefined) return '';
  return String(value);
}

function buildActionsString(actions) {
  let actionsString = '';
  for (const action of actions) {
    // Actions are JSON objects. Sort keys and concatenate values in that key order.
    const keys = Object.keys(action).sort();
    for (const key of keys) {
      actionsString += formatHmacValue(action[key]);
    }
  }
  return actionsString;
}

function buildHmacBase(message) {
  const base = { ...message };
  delete base.hmac;

  // Per OneWallet spec: arrays like `actions` must be flattened by sorting object keys
  // inside each item and concatenating values in original array order.
  for (const [key, value] of Object.entries(base)) {
    if (Array.isArray(value)) {
      base[key] = buildActionsString(value);
    }
  }

  let hmacBase = '';
  Object.keys(base)
    .sort()
    .forEach((key) => {
      hmacBase += formatHmacValue(base[key]);
    });

  return hmacBase;
}

function deriveHmacKey(secret) {
  // Spec: use SHA256(secret) binary as HMAC key.
  return crypto.createHash('sha256').update(String(secret), 'utf8').digest();
}

function generateHmac(message, secret) {
  const key = deriveHmacKey(secret);
  const hmacBase = buildHmacBase(message);
  return crypto.createHmac('sha256', key).update(hmacBase, 'utf8').digest('hex');
}

function timingSafeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false;
  }
}

function validateHmac(message, secret) {
  const received = message?.hmac;
  if (!received) return { ok: false, reason: 'Missing HMAC' };
  const calculated = generateHmac(message, secret);
  if (!timingSafeEqualHex(String(received), calculated)) {
    return { ok: false, reason: 'Invalid HMAC', calculated };
  }
  return { ok: true };
}

module.exports = {
  buildHmacBase,
  generateHmac,
  validateHmac,
  timingSafeEqualHex
};

