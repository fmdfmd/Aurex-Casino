const crypto = require('crypto');
const axios = require('axios');
const config = require('../config/config');

function sign(body) {
  const timestamp = Math.floor(Date.now() / 1000);
  const message = String(timestamp) + (body || '');
  const signature = crypto
    .createHmac('sha512', config.expay.privateKey)
    .update(message)
    .digest('hex');
  return { timestamp, signature };
}

const apiClient = axios.create({
  baseURL: config.expay.apiUrl,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
});

apiClient.interceptors.request.use((req) => {
  const bodyStr = req.data ? JSON.stringify(req.data) : '';
  const { timestamp, signature } = sign(bodyStr);
  req.headers['ApiPublic'] = config.expay.publicKey;
  req.headers['Signature'] = signature;
  req.headers['Timestamp'] = timestamp;
  console.log(`[Expay] ${req.method.toUpperCase()} ${req.url}`, bodyStr.slice(0, 300));
  return req;
});

apiClient.interceptors.response.use(
  (res) => {
    console.log(`[Expay] Response ${res.status}:`, JSON.stringify(res.data).slice(0, 500));
    return res;
  },
  (err) => {
    const data = err.response?.data;
    console.error(`[Expay] Error ${err.response?.status}:`, JSON.stringify(data).slice(0, 500));
    throw err;
  }
);

const DEPOSIT_SUB_TOKEN_MAP = {
  'EXPAY_SBER': { token: 'RUBCISP2P', subToken: 'SBERCISP2P' },
  'EXPAY_SBP':  { token: 'CARDRUBP2P', subToken: 'SBPRUB' },
  'EXPAY_CARD': { token: 'CARDRUBP2P', subToken: 'CARDRUB' },
  'EXPAY_NSPK': { token: 'CARDRUBP2P', subToken: 'NSPKRUB' }
};

const WITHDRAW_SUB_TOKEN_MAP = {
  'EXPAY_SBER': { token: 'CARDRUBP2P', subToken: 'SBERRUB' },
  'EXPAY_SBP':  { token: 'CARDRUBP2P', subToken: 'SBRRUB' },
  'EXPAY_CARD': { token: 'CARDRUBP2P', subToken: 'INTERBANKRUB' },
  'EXPAY_NSPK': { token: 'CARDRUBP2P', subToken: 'NSPKRUB' }
};

class ExpayService {

  getDepositTokens(paymentMethod) {
    return DEPOSIT_SUB_TOKEN_MAP[paymentMethod] || { token: 'CARDRUBP2P', subToken: 'CARDRUB' };
  }

  getWithdrawTokens(paymentMethod) {
    return WITHDRAW_SUB_TOKEN_MAP[paymentMethod] || { token: 'CARDRUBP2P', subToken: 'INTERBANKRUB' };
  }

  async createDeposit({ amount, transactionId, token, subToken, userId, userIp, redirectUrl }) {
    const payload = {
      refer_type: 'p2p_payform',
      token: token || 'CARDRUBP2P',
      sub_token: subToken,
      amount,
      client_transaction_id: `dep_${transactionId}`,
      client_merchant_id: 'aurex',
      fingerprint: String(userId),
      call_back_url: config.expay.callbackUrl,
      alter_refer_custom_options: {
        redirect_url: redirectUrl || 'https://aurex.casino/wallet',
        default_language: 'ru',
        redirect_time_sec: 5
      }
    };
    if (userIp) payload.client_ip = userIp;

    const response = await apiClient.post('/api/transaction/create/in', payload);
    const data = response.data;

    if (data.status !== 'ACCEPTED') {
      throw new Error(data.description || 'Expay: deposit not accepted');
    }

    return {
      redirectUrl: data.alter_refer || null,
      trackerId: data.tracker_id,
      status: data.status
    };
  }

  async createWithdrawal({ amount, transactionId, token, subToken, receiver, recipientName, clientIp }) {
    const payload = {
      token: token || 'CARDRUBP2P',
      sub_token: subToken,
      amount,
      client_transaction_id: `wd_${transactionId}`,
      receiver,
      call_back_url: config.expay.callbackUrl
    };
    if (recipientName) {
      payload.extra_info = { recipient_name: recipientName };
    }
    if (clientIp) payload.client_ip = clientIp;

    const response = await apiClient.post('/api/transaction/create/out', payload);
    const data = response.data;

    if (data.status !== 'ACCEPTED') {
      throw new Error(data.description || 'Expay: withdrawal not accepted');
    }

    return {
      trackerId: data.tracker_id,
      status: data.status
    };
  }

  async getTransactionInfo(trackerId) {
    const response = await apiClient.post('/api/transaction/get', { tracker_id: trackerId });
    return response.data;
  }

  async getTransactionInfoByClientId(clientTransactionId) {
    const response = await apiClient.post('/api/transaction/get', { client_transaction_id: clientTransactionId });
    return response.data;
  }

  async getBalance(token = 'CARDRUBP2P') {
    const response = await apiClient.post('/api/token/balance', { token });
    return response.data;
  }
}

module.exports = new ExpayService();
