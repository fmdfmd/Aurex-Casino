function normalizePhone(input) {
  if (!input) return null;
  const digits = String(input).replace(/\D/g, '');

  // Accept: +7XXXXXXXXXX, 8XXXXXXXXXX, 7XXXXXXXXXX
  if (digits.length === 11 && digits.startsWith('8')) return `7${digits.slice(1)}`;
  if (digits.length === 11 && digits.startsWith('7')) return digits;

  // Sometimes users paste without country code: XXXXXXXXXX (RU)
  if (digits.length === 10) return `7${digits}`;

  return null;
}

module.exports = { normalizePhone };

