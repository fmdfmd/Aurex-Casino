const https = require('https');

const rates = {
  RUB: 1,
  EUR: parseFloat(process.env.EXCHANGE_RATE_EUR_RUB || '100'),
  USD: parseFloat(process.env.EXCHANGE_RATE_USD_RUB || '92'),
  UZS: parseFloat(process.env.EXCHANGE_RATE_UZS_RUB || '0.0072'),
  CNY: parseFloat(process.env.EXCHANGE_RATE_CNY_RUB || '12.7'),
};

let lastFetch = 0;
const REFRESH_INTERVAL = 3600_000;

function fetchRates() {
  return new Promise((resolve) => {
    const req = https.get('https://open.er-api.com/v6/latest/RUB', { timeout: 10000 }, (resp) => {
      if (resp.statusCode !== 200) { resolve(false); return; }
      let body = '';
      resp.on('data', c => body += c);
      resp.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (data.result === 'success' && data.rates) {
            for (const [cur, rateToRub] of Object.entries(data.rates)) {
              if (rateToRub > 0) {
                rates[cur] = 1 / rateToRub;
              }
            }
            rates.RUB = 1;
            lastFetch = Date.now();
            console.log('[ExchangeRates] Updated: EUR=' + rates.EUR.toFixed(2) + ', USD=' + rates.USD.toFixed(2));
            resolve(true);
          } else { resolve(false); }
        } catch { resolve(false); }
      });
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

function ensureFresh() {
  if (Date.now() - lastFetch > REFRESH_INTERVAL) {
    fetchRates().catch(() => {});
  }
}

function convert(amount, fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) return amount;
  ensureFresh();
  const fromRate = rates[fromCurrency] || 1;
  const toRate = rates[toCurrency] || 1;
  return (amount * fromRate) / toRate;
}

function getRate(fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) return 1;
  const fromRate = rates[fromCurrency] || 1;
  const toRate = rates[toCurrency] || 1;
  return fromRate / toRate;
}

fetchRates().catch(() => {});

module.exports = { convert, getRate, rates, fetchRates };
