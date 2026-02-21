const axios = require('axios');
const config = require('../config/config');

const apiClient = axios.create({
  baseURL: config.avePay.apiUrl,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config.avePay.apiKey}`
  }
});

apiClient.interceptors.request.use((req) => {
  console.log(`[AvePay] ${req.method.toUpperCase()} ${req.baseURL}${req.url}`, req.data ? JSON.stringify(req.data).slice(0, 300) : '');
  return req;
});

apiClient.interceptors.response.use(
  (res) => {
    console.log(`[AvePay] Response ${res.status}:`, JSON.stringify(res.data).slice(0, 500));
    return res;
  },
  (err) => {
    const data = err.response?.data;
    console.error(`[AvePay] Error ${err.response?.status}:`, JSON.stringify(data).slice(0, 500));
    throw err;
  }
);

class AvePayService {

  /**
   * Create a deposit payment (Payment Page redirect)
   * @param {Object} params
   * @param {number} params.amount
   * @param {string} params.currency - RUB, USD, EUR, UZS
   * @param {string} params.transactionId - our internal transaction ID
   * @param {string} params.paymentMethod - BASIC_CARD, CRYPTO, etc.
   * @param {string} [params.description]
   * @param {Object} [params.customer] - { email, firstName, lastName, phone }
   * @returns {Promise<Object>} AVE PAY payment response with redirectUrl
   */
  async createDeposit({ amount, currency, transactionId, paymentMethod = 'P2P_CARD', description, customer, userId, bankCode }) {
    const callbackBase = config.avePay.callbackUrl || `${config.server.frontendUrl}/api/payments/avepay/callback`;
    const returnBase = config.avePay.returnUrl || `${config.server.frontendUrl}/wallet`;

    const payload = {
      paymentType: 'DEPOSIT',
      paymentMethod,
      amount,
      currency,
      referenceId: `deposit_${transactionId}`,
      description: description || `AUREX Casino Deposit #${transactionId}`,
      webhookUrl: callbackBase,
      returnUrl: `${returnBase}?payment_id={id}&status={state}&type={type}`,
      customer: {
        referenceId: String(userId || transactionId),
        routingGroup: 'primary',
        locale: 'ru'
      }
    };

    if (bankCode) payload.customer.bankCode = bankCode;
    if (customer?.email) payload.customer.email = customer.email;
    if (customer?.phone) payload.customer.phone = this.formatPhone(customer.phone);
    if (customer?.firstName) payload.customer.firstName = customer.firstName;
    if (customer?.lastName) payload.customer.lastName = customer.lastName;

    const response = await apiClient.post('/api/v1/payments', payload);
    return response.data;
  }

  /**
   * Create a withdrawal payment
   * @param {Object} params
   * @param {number} params.amount
   * @param {string} params.currency
   * @param {string} params.transactionId
   * @param {string} params.paymentMethod
   * @param {Object} [params.customer]
   * @returns {Promise<Object>}
   */
  async createWithdrawal({ amount, currency, transactionId, paymentMethod = 'P2P_CARD', customer, userId, bankCode, cardNumber, phone }) {
    const callbackBase = config.avePay.callbackUrl || `${config.server.frontendUrl}/api/payments/avepay/callback`;

    const payload = {
      paymentType: 'WITHDRAWAL',
      paymentMethod,
      amount,
      currency,
      referenceId: `withdrawal_${transactionId}`,
      description: `AUREX Casino Withdrawal #${transactionId}`,
      webhookUrl: callbackBase,
      customer: {
        referenceId: String(userId || transactionId),
        routingGroup: 'primary',
        locale: 'ru'
      }
    };

    if (bankCode) payload.customer.bankCode = bankCode;
    if (customer?.email) payload.customer.email = customer.email;
    if (customer?.firstName) payload.customer.firstName = customer.firstName;
    if (customer?.lastName) payload.customer.lastName = customer.lastName;

    if (paymentMethod === 'P2P_CARD' && cardNumber) {
      payload.additionalParameters = { cardNumber };
    }

    if (paymentMethod === 'P2P_SBP' && phone) {
      payload.customer.phone = this.formatPhone(phone);
    } else if (customer?.phone) {
      payload.customer.phone = this.formatPhone(customer.phone);
    }

    const response = await apiClient.post('/api/v1/payments', payload);
    return response.data;
  }

  /**
   * Format phone to AVE PAY format: "7 9081111111" (country_code space number)
   */
  formatPhone(phone) {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('8') && digits.length === 11) {
      return `7 ${digits.slice(1)}`;
    }
    if (digits.startsWith('7') && digits.length === 11) {
      return `7 ${digits.slice(1)}`;
    }
    if (digits.length === 10) {
      return `7 ${digits}`;
    }
    return phone.includes(' ') ? phone : `${digits.slice(0, 1)} ${digits.slice(1)}`;
  }

  /**
   * Get payment by ID
   */
  async getPayment(paymentId) {
    const response = await apiClient.get(`/api/v1/payments/${paymentId}`);
    return response.data;
  }

  /**
   * Get payment operations
   */
  async getPaymentOperations(paymentId) {
    const response = await apiClient.get(`/api/v1/payments/${paymentId}/operations`);
    return response.data;
  }

  /**
   * H2H: Confirm payment and get external refs (card/account details)
   * Used instead of redirect — sends customer IP, returns payment details in externalRefs
   */
  async confirmPaymentH2H(paymentId, customerIp) {
    const response = await apiClient.patch(`/api/v1/payments/${paymentId}`, { customerIp });
    return response.data;
  }

  /**
   * Capture a pre-authorized payment (full or partial)
   * Only works for payments in AUTHORIZED state
   */
  async capturePayment(paymentId, amount) {
    const payload = amount ? { amount } : {};
    const response = await apiClient.post(`/api/v1/payments/${paymentId}/capture`, payload);
    return response.data;
  }

  /**
   * Void (cancel) a pre-authorized payment
   * Only works for payments in AUTHORIZED state → CANCELLED
   */
  async voidPayment(paymentId) {
    const response = await apiClient.post(`/api/v1/payments/${paymentId}/void`);
    return response.data;
  }

  /**
   * List payments with optional filters
   * @param {Object} [filters] - { offset, limit, 'created.gte', 'created.lt', 'updated.gte', 'updated.lt', 'referenceId.eq' }
   */
  async listPayments(filters = {}) {
    const response = await apiClient.get('/api/v1/payments', { params: filters });
    return response.data;
  }

  /**
   * Get merchant balances by currency
   */
  async getBalances() {
    const response = await apiClient.get('/api/v1/balances');
    return response.data;
  }

  /**
   * Get subscription by ID
   */
  async getSubscription(subscriptionId) {
    const response = await apiClient.get(`/api/v1/subscriptions/${subscriptionId}`);
    return response.data;
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionId) {
    const response = await apiClient.patch(`/api/v1/subscriptions/${subscriptionId}`, { state: 'CANCELLED' });
    return response.data;
  }

  /**
   * Verify webhook signature (HMAC-SHA256)
   * @param {string} rawBody - raw JSON body as string
   * @param {string} signature - value from 'Signature' header
   * @returns {boolean}
   */
  verifyWebhookSignature(rawBody, signature) {
    const secret = config.avePay.webhookSecret;
    if (!secret) {
      console.warn('[AvePay] Webhook secret not configured, skipping signature verification');
      return true;
    }
    const crypto = require('crypto');
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature || ''));
  }
}

module.exports = new AvePayService();
