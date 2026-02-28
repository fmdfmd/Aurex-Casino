const axios = require('axios');
const crypto = require('crypto');

const SHOP_ID = process.env.RUKASSA_SHOP_ID || '3596';
const TOKEN = process.env.RUKASSA_TOKEN || 'bf451c373f382bf178d47a461ba058524';
const API_URL = 'https://lk.rukassa.pro/api/v1';

class RukassaService {
  generateSign(shopId, token, orderId) {
    return crypto.createHash('md5').update(`${shopId}${token}${orderId}`).digest('hex');
  }

  async createPayment({ amount, transactionId, userId }) {
    const orderId = `dep_${transactionId}`;

    const params = new URLSearchParams({
      shop_id: SHOP_ID,
      token: TOKEN,
      order_id: orderId,
      amount: String(Math.round(amount)),
      data: JSON.stringify({ userId: String(userId) })
    });

    console.log(`[Rukassa] Creating payment: order=${orderId} amount=${amount}`);

    const response = await axios.post(`${API_URL}/create`, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    console.log('[Rukassa] Response:', response.data);

    if (!response.data.url) {
      throw new Error(response.data.message || 'Rukassa: no payment URL returned');
    }

    return {
      paymentUrl: response.data.url,
      rukassaId: response.data.id
    };
  }

  async getPaymentInfo(rukassaId) {
    const params = new URLSearchParams({
      id: String(rukassaId),
      shop_id: SHOP_ID,
      token: TOKEN
    });

    const response = await axios.post(`${API_URL}/getPayInfo`, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    return response.data;
  }

  verifyWebhook(shopId, token, orderId, receivedSign) {
    const expected = this.generateSign(shopId, token, orderId);
    return expected === receivedSign;
  }
}

module.exports = new RukassaService();
