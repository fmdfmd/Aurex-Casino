const axios = require('axios');
const config = require('../config/config');

const apiClient = axios.create({
  baseURL: config.nirvanaPay.apiUrl,
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
   * Create a payin (deposit).
   * Returns H2H data: receiver (card/phone), bankName, recipientName.
   * No redirect URL — details are shown to user directly.
   */
  async createDeposit({ amount, transactionId, token = 'СБП', currency = 'RUB', userIp, userAgent, userEmail, userId }) {
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
   * Pick the best token based on amount and method.
   */
  getToken(paymentMethod, amount) {
    if (paymentMethod === 'NIRVANA_SBP') return 'СБП';
    if (paymentMethod === 'NIRVANA_C2C') return 'Межбанк';
    return 'СБП';
  }
}

module.exports = new NirvanaPayService();
module.exports.RUB_TOKENS = RUB_TOKENS;
