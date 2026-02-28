const axios = require('axios');
const crypto = require('crypto');

const SHOP_ID = process.env.RUKASSA_SHOP_ID || '3596';
const TOKEN = process.env.RUKASSA_TOKEN || 'bf451c373f382bf178d47a461ba058524';
const EMAIL = process.env.RUKASSA_EMAIL || '';
const PASSWORD = process.env.RUKASSA_PASSWORD || '';
const API_URL = 'https://lk.rukassa.io/api/v1';

const METHOD_MAP = {
  'RUKASSA_CARD':   'card',
  'RUKASSA_SBP':    'sbp',
  'RUKASSA_CRYPTO': 'crypta'
};

class RukassaService {

  async createPayment({ amount, transactionId, userId, paymentMethod }) {
    const orderId = `dep_${transactionId}`;
    const methodCode = METHOD_MAP[paymentMethod] || null;

    const payload = {
      shop_id: SHOP_ID,
      token: TOKEN,
      order_id: orderId,
      amount: String(Math.round(amount)),
      data: JSON.stringify({ userId: String(userId) }),
      user_code: String(userId)
    };

    if (methodCode) payload.method = methodCode;

    const params = new URLSearchParams(payload);

    console.log(`[Rukassa] Creating payment: order=${orderId} amount=${amount} method=${methodCode}`);

    const response = await axios.post(`${API_URL}/create`, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    console.log('[Rukassa] Response:', response.data);

    if (response.data.error) {
      throw new Error(response.data.message || `Rukassa error ${response.data.error}`);
    }

    if (!response.data.url) {
      throw new Error('Rukassa: no payment URL returned');
    }

    return {
      paymentUrl: response.data.url,
      rukassaId: response.data.id,
      hash: response.data.hash
    };
  }

  verifyWebhook(id, createdDateTime, amount, receivedSign) {
    const expected = crypto
      .createHmac('sha256', TOKEN)
      .update(`${id}|${createdDateTime}|${amount}`)
      .digest('hex');
    return expected === receivedSign;
  }

  async getPaymentInfo(orderId) {
    const params = new URLSearchParams({
      order_id: orderId,
      shop_id: SHOP_ID,
      token: TOKEN
    });
    const response = await axios.post(`${API_URL}/getPayInfo`, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  }

  async createWithdraw({ amount, wallet, way, orderId }) {
    const params = new URLSearchParams({
      email: EMAIL,
      password: PASSWORD,
      way,
      wallet,
      amount: String(amount),
      order_id: orderId,
      who_fee: '1'
    });

    console.log(`[Rukassa] Creating withdrawal: way=${way} wallet=${wallet} amount=${amount}`);

    const response = await axios.post(`${API_URL}/createWithdraw`, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    console.log('[Rukassa] Withdraw response:', response.data);

    if (response.data.error) {
      throw new Error(response.data.message || `Rukassa withdraw error ${response.data.error}`);
    }

    return response.data;
  }
}

module.exports = new RukassaService();
