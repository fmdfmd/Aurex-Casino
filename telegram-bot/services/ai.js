const axios = require('axios');
const config = require('../config');
const db = require('./database');

class AIService {
  constructor() {
    this.apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
    this.headers = {
      'Authorization': `Bearer ${config.openRouterKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': config.websiteUrl,
      'X-Title': 'AUREX Support Bot'
    };
  }

  async chat(telegramId, username, userMessage) {
    try {
      // Save user message to history
      await db.saveConversation(telegramId, username, 'user', userMessage);
      
      // Get conversation history
      const history = await db.getConversationHistory(telegramId, config.maxConversationHistory);
      
      // Build messages array
      const messages = [
        { role: 'system', content: config.systemPrompt },
        ...history.map(h => ({
          role: h.role === 'user' ? 'user' : 'assistant',
          content: h.message
        }))
      ];

      // Call OpenRouter
      const response = await axios.post(this.apiUrl, {
        model: config.aiModel,
        messages: messages,
        max_tokens: 500,
        temperature: 0.7
      }, { headers: this.headers });

      const aiResponse = response.data.choices[0].message.content;
      
      // Save AI response to history
      await db.saveConversation(telegramId, username, 'assistant', aiResponse);
      
      return aiResponse;

    } catch (error) {
      console.error('AI Service Error:', error.response?.data || error.message);
      
      // Fallback response
      return `Извините, я временно не могу обработать ваш запрос. 😔

Пожалуйста, нажмите кнопку "👤 Позвать оператора", и наш специалист поможет вам.

Или попробуйте задать вопрос позже.`;
    }
  }

  async clearHistory(telegramId) {
    await db.clearConversation(telegramId);
  }
}

module.exports = new AIService();
