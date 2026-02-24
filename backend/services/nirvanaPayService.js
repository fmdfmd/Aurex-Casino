const axios = require('axios');
const config = require('../config/config');

// H2H API client (payouts, status checks)
const apiClient = axios.create({
  baseURL: config.nirvanaPay.apiUrl,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'ApiPublic': config.nirvanaPay.apiKey,
    'ApiPrivate': config.nirvanaPay.apiKey
  }
});

// Payment Form API client (deposit orders with redirect)
const formClient = axios.create({
  baseURL: 'https://f.nirvanapay.pro',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'ApiPublic': config.nirvanaPay.apiKey,
    'ApiPrivate': config.nirvanaPay.apiKey
  }
});

apiClient.interceptors.request.use((req) => {
  console.log(`[NirvanaPay] ${req.method.toUpperCase()} ${req.baseURL}${req.url}`, req.data ? JSON.stringify(req.data).slice(0, 400) : '');
  return req;
});

apiClient.interceptors.response.use(
  (res) => {
    console.log(`[NirvanaPay] Response ${res.status}:`, JSON.stringify(res.data).slice(0, 500));
    return res;
  },
  (err) => {
    const data = err.response?.data;
    console.error(`[NirvanaPay] Error ${err.response?.status}:`, JSON.stringify(data).slice(0, 500));
    throw err;
  }
);

formClient.interceptors.request.use((req) => {
  console.log(`[NirvanaPay Form] ${req.method.toUpperCase()} ${req.baseURL}${req.url}`, req.data ? JSON.stringify(req.data).slice(0, 400) : '');
  return req;
});

formClient.interceptors.response.use(
  (res) => {
    console.log(`[NirvanaPay Form] Response ${res.status}:`, JSON.stringify(res.data).slice(0, 500));
    return res;
  },
  (err) => {
    const data = err.response?.data;
    console.error(`[NirvanaPay Form] Error ${err.response?.status}:`, JSON.stringify(data).slice(0, 500));
    throw err;
  }
);

const RUB_TOKENS = {
  'SBP': 'СБП',
  'C2C': 'Межбанк',
  'SBER': 'Сбербанк',
  'SBER_SBP': 'СБЕР СБП',
  'ALFA': 'Альфабанк',
  'ALFA_SBP': 'Альфа СБП',
  'VTB': 'ВТБ',
  'VTB_SBP': 'ВТБ СБП',
  'NSPK': 'НСПК'
};

class NirvanaPayService {

  /**
   * Create deposit via Payment Form (f.nirvanapay.pro).
   * Returns redirectURL — user goes to Nirvana's payment page.
   * tokenCode is optional; if omitted, user picks method on Nirvana's form.
   */
  async createDepositForm({ amount, transactionId, tokenCode, currency = 'RUB', returnUrl, userIp, userAgent, userEmail, userId }) {
    const callbackBase = config.nirvanaPay.callbackUrl;
    const externalID = `dep_${transactionId}`;

    const payload = {
      amount,
      redirectURL: returnUrl || config.avePay.returnUrl || 'https://aurex.casino/wallet',
      siteName: 'AUREX Casino',
      callbackURL: `${callbackBase}?txId=${transactionId}&type=deposit`,
      externalID,
      currency
    };

    if (tokenCode) {
      payload.tokenCode = tokenCode;
    }

    if (userIp || userAgent || userEmail || userId) {
      payload.userInfo = {};
      if (userIp) payload.userInfo.ip = userIp;
      if (userAgent) payload.userInfo.userAgent = userAgent;
      if (userEmail) payload.userInfo.email = userEmail;
      if (userId) payload.userInfo.id = String(userId);
    }

    const response = await formClient.post('/api/v2/order', payload);
    const data = response.data;

    if (!data?.data?.redirectURL) {
      throw new Error('Nirvana Pay: no redirectURL in response');
    }

    return {
      redirectUrl: data.data.redirectURL,
      externalID
    };
  }

  /**
   * Check order status via Payment Form API.
   */
  async getOrderStatus(externalId) {
    const response = await formClient.get(`/api/v2/order?externalId=${externalId}`);
    return response.data?.data || response.data;
  }

  /**
   * Create a payin (deposit) via H2H API.
   * Returns receiver details (card/phone) — shown to user directly.
   * Use createDepositForm() instead for redirect-based flow.
   */
  async createDepositH2H({ amount, transactionId, token = 'СБП', currency = 'RUB', userIp, userAgent, userEmail, userId }) {
    const callbackBase = config.nirvanaPay.callbackUrl;
    const clientID = `dep_${transactionId}`;

    const payload = {
      clientID,
      amount,
      token,
      currency,
      callbackUrl: `${callbackBase}?txId=${transactionId}&type=deposit`
    };

    if (userIp || userAgent || userEmail || userId) {
      payload.userInfo = {};
      if (userIp) payload.userInfo.ip = userIp;
      if (userAgent) payload.userInfo.ua = userAgent;
      if (userEmail) payload.userInfo.email = userEmail;
      if (userId) payload.userInfo.id = String(userId);
    }

    const response = await apiClient.post('/create/in', payload);
    const data = response.data;

    if (data.status === 'ERROR') {
      throw new Error(data.reason || 'Nirvana Pay payin error');
    }

    return {
      trackerID: data.trackerID,
      receiver: data.receiver,
      status: data.status,
      bankName: data.extra?.bankName || token,
      recipientName: data.extra?.recipientName || '',
      clientID
    };
  }

  /**
   * Create a payout (withdrawal).
   */
  async createWithdrawal({ amount, transactionId, token = 'СБП', currency = 'RUB', receiver, bankName, recipientName }) {
    const callbackBase = config.nirvanaPay.callbackUrl;
    const clientID = `wd_${transactionId}`;

    const payload = {
      clientID,
      amount,
      token,
      currency,
      receiver,
      extra: {
        bankName: bankName || token,
        recipientName: recipientName || ''
      },
      callbackUrl: `${callbackBase}?txId=${transactionId}&type=withdrawal`
    };

    const response = await apiClient.post('/create/out', payload);
    const data = response.data;

    if (data.status === 'ERROR') {
      throw new Error(data.reason || 'Nirvana Pay payout error');
    }

    return {
      trackerID: data.trackerID || '',
      status: data.status,
      clientID
    };
  }

  /**
   * Check transaction status by clientID.
   */
  async getStatus(clientID) {
    const response = await apiClient.post('/transaction/status', { clientID });
    return response.data;
  }

  /**
   * Get merchant balance.
   */
  async getBalance() {
    const response = await apiClient.get('/client/balance');
    return response.data;
  }

  /**
   * Pick the best token based on payment method.
   */
  getToken(paymentMethod) {
    const map = {
      'NIRVANA_SBP': 'СБП',
      'NIRVANA_C2C': 'Межбанк',
      'NIRVANA_NSPK': 'НСПК',
      'NIRVANA_SBER': 'Сбербанк',
      'NIRVANA_SBER_SBP': 'СБЕР СБП',
      'NIRVANA_ALFA': 'Альфабанк',
      'NIRVANA_ALFA_SBP': 'Альфа СБП',
      'NIRVANA_VTB': 'ВТБ',
      'NIRVANA_VTB_SBP': 'ВТБ СБП',
      'NIRVANA_TRANS_SBP': 'ТрансСБП',
      'NIRVANA_TRANS_C2C': 'ТрансМежбанк'
    };
    return map[paymentMethod] || 'СБП';
  }
}

module.exports = new NirvanaPayService();
module.exports.RUB_TOKENS = RUB_TOKENS;
