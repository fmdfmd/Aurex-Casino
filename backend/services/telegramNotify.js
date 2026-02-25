/**
 * Telegram Notification Service
 * Отправляет уведомления о тикетах менеджерам в Telegram бота
 */

const axios = require('axios');
const pool = require('../config/database');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

class TelegramNotifyService {
  
  /**
   * Отправить сообщение пользователю
   */
  async sendMessage(chatId, text, options = {}) {
    if (!BOT_TOKEN) {
      console.warn('TELEGRAM_BOT_TOKEN not set, skipping notification');
      return null;
    }
    
    try {
      const response = await axios.post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
        ...options
      });
      return response.data;
    } catch (error) {
      console.error('Telegram send error:', error.response?.data || error.message);
      return null;
    }
  }
  
  /**
   * Получить всех активных менеджеров из БД
   */
  async getActiveManagers() {
    try {
      const result = await pool.query(
        'SELECT telegram_id FROM support_managers WHERE is_active = true'
      );
      return result.rows.map(r => r.telegram_id);
    } catch (error) {
      console.error('Get managers error:', error.message);
      return [];
    }
  }
  
  /**
   * Уведомить всех менеджеров о новом тикете с сайта
   */
  async notifyNewTicket(ticket, user) {
    const managers = await this.getActiveManagers();
    
    if (managers.length === 0) {
      console.warn('No active managers to notify');
      return;
    }
    
    const priorityEmoji = {
      urgent: '🔴 СРОЧНО',
      high: '🟠 Высокий',
      medium: '🟡 Средний',
      low: '🟢 Низкий'
    };
    
    const categoryNames = {
      deposit: '💰 Депозит',
      withdraw: '💳 Вывод',
      bonus: '🎁 Бонусы',
      technical: '🔧 Технический',
      verification: '📄 Верификация',
      general: '💬 Общий'
    };
    
    const message = `🌐 <b>Новый тикет с сайта!</b>

📋 <b>#${ticket.id}</b>
👤 ${user.username || user.email} (ID: ${user.id})
📧 ${user.email}

${priorityEmoji[ticket.priority] || '🟡'} | ${categoryNames[ticket.category] || ticket.category}

<b>Тема:</b> ${this.escapeHtml(ticket.subject)}

<b>Сообщение:</b>
${this.escapeHtml(ticket.message?.substring(0, 500) || '')}${ticket.message?.length > 500 ? '...' : ''}

<i>Ответьте через админ-панель сайта или через /manager в боте</i>`;

    const keyboard = {
      inline_keyboard: [[
        { text: '📋 Открыть в админке', url: `${process.env.FRONTEND_URL}/admin/tickets/${ticket.id}` }
      ]]
    };
    
    for (const managerId of managers) {
      await this.sendMessage(managerId, message, { reply_markup: keyboard });
    }
    
    console.log(`Notified ${managers.length} managers about ticket #${ticket.id}`);
  }
  
  /**
   * Уведомить о новом сообщении в тикете
   */
  async notifyTicketMessage(ticket, user, messageText, isFromUser = true) {
    if (!isFromUser) return; // Не уведомляем о сообщениях от менеджеров
    
    const managers = await this.getActiveManagers();
    
    const message = `💬 <b>Новое сообщение в тикете #${ticket.id}</b>

👤 ${user.username || user.email}
<b>Тема:</b> ${this.escapeHtml(ticket.subject)}

<b>Сообщение:</b>
${this.escapeHtml(messageText?.substring(0, 500) || '')}`;

    for (const managerId of managers) {
      await this.sendMessage(managerId, message);
    }
  }
  
  /**
   * Уведомить пользователя об ответе на тикет (если есть telegram_id)
   */
  async notifyUserReply(userId, ticketId, replyText) {
    try {
      // Проверяем есть ли у пользователя привязанный Telegram
      const result = await pool.query(
        'SELECT telegram_id FROM users WHERE id = $1 AND telegram_id IS NOT NULL',
        [userId]
      );
      
      if (result.rows.length === 0 || !result.rows[0].telegram_id) {
        return; // У пользователя нет привязанного Telegram
      }
      
      const telegramId = result.rows[0].telegram_id;
      
      const message = `📩 <b>Ответ на ваш тикет #${ticketId}</b>

<b>Оператор:</b>
${this.escapeHtml(replyText)}

<i>Ответить можно на сайте в разделе "Поддержка"</i>`;

      await this.sendMessage(telegramId, message);
      
    } catch (error) {
      console.error('Notify user reply error:', error.message);
    }
  }
  
  /**
   * Уведомить менеджеров о новом тикете из LIVE CHAT виджета
   */
  async notifyNewChatTicket(ticket, userInfo) {
    const managers = await this.getActiveManagers();
    if (managers.length === 0) {
      console.warn('No active managers for live chat ticket');
      return;
    }

    const regDate = userInfo.created_at ? new Date(userInfo.created_at).toLocaleDateString('ru-RU') : '—';
    const vipLabel = String(userInfo.vip_level || 'none').toUpperCase();

    const message = `🔔 <b>Запрос оператора из чата!</b>

📋 <b>Тикет #${ticket.id}</b>

👤 <b>Клиент:</b>
├ Логин: ${this.escapeHtml(userInfo.username || '—')}
├ Email: ${this.escapeHtml(userInfo.email || '—')}
├ Телефон: ${userInfo.phone || '—'}
├ ID: ${userInfo.id}
├ Регистрация: ${regDate}
└ Верификация: ${userInfo.is_verified ? '✅ Да' : '❌ Нет'}

💰 <b>Финансы:</b>
├ Баланс: ${parseFloat(userInfo.balance || 0).toFixed(2)} ₽
├ Депозиты: ${parseFloat(userInfo.total_deposits || 0).toFixed(2)} ₽ (${userInfo.deposit_count || 0} шт.)
├ Выводы: ${parseFloat(userInfo.total_withdrawals || 0).toFixed(2)} ₽
└ VIP: ${vipLabel}

💬 <b>Сообщение:</b>
${this.escapeHtml((ticket.message || '').substring(0, 500))}

<i>Нажмите "Взять" чтобы начать чат</i>`;

    const keyboard = {
      inline_keyboard: [[
        { text: '✅ Взять тикет', callback_data: `take_web:${ticket.id}` }
      ]]
    };

    for (const managerId of managers) {
      await this.sendMessage(managerId, message, { reply_markup: keyboard });
    }

    console.log(`Live chat ticket #${ticket.id} sent to ${managers.length} managers`);
  }

  /**
   * Переслать сообщение из чата привязанному менеджеру
   */
  async notifyChatMessage(ticket, user, messageText, fileUrl, fileType) {
    const caption = `💬 <b>Чат-тикет #${ticket.id}</b>\n👤 ${this.escapeHtml(user.username || user.email || 'User')}:\n\n${this.escapeHtml((messageText || '').substring(0, 500))}`;

    let targetManagers = [];
    if (ticket.operator_telegram_id) {
      targetManagers = [ticket.operator_telegram_id];
    } else {
      try {
        const result = await pool.query('SELECT telegram_id FROM support_managers WHERE is_active = true');
        targetManagers = result.rows.map(r => r.telegram_id);
      } catch (err) {
        console.error('notifyChatMessage get managers error:', err.message);
        return;
      }
    }

    for (const managerId of targetManagers) {
      if (fileUrl) {
        const fullUrl = fileUrl.startsWith('http') ? fileUrl : `${process.env.BACKEND_URL || 'https://aurex-casino-production.up.railway.app'}${fileUrl}`;
        const isImage = (fileType && fileType.startsWith('image/')) || fileUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i);
        if (isImage) {
          await this.sendTelegramFile(managerId, 'sendPhoto', 'photo', fullUrl, caption);
        } else {
          await this.sendTelegramFile(managerId, 'sendDocument', 'document', fullUrl, caption);
        }
      } else {
        await this.sendMessage(managerId, caption);
      }
    }
  }

  async sendTelegramFile(chatId, method, fieldName, fileUrl, caption) {
    if (!BOT_TOKEN) return;
    try {
      const axios = require('axios');
      await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
        chat_id: chatId,
        [fieldName]: fileUrl,
        caption: caption?.substring(0, 1024),
        parse_mode: 'HTML'
      });
    } catch (err) {
      console.error(`${method} error, falling back to text:`, err.message);
      await this.sendMessage(chatId, `${caption}\n\n📎 Файл: ${fileUrl}`);
    }
  }

  /**
   * Отправить файл всем менеджерам
   */
  async sendFileToManagers(ticket, file, user) {
    if (!BOT_TOKEN) return;
    
    const managers = await this.getActiveManagers();
    const fs = require('fs');
    const FormData = require('form-data');
    const path = require('path');
    
    const filePath = file.path;
    const mimeType = file.mimetype;
    
    for (const managerId of managers) {
      try {
        const form = new FormData();
        form.append('chat_id', managerId);
        form.append('caption', `📎 <b>Тикет #${ticket.id}</b>\n👤 ${user.username || user.email}\n📄 ${file.originalname}`);
        form.append('parse_mode', 'HTML');
        
        // Determine file type and endpoint
        let endpoint = 'sendDocument';
        let fieldName = 'document';
        
        if (mimeType.startsWith('image/')) {
          endpoint = 'sendPhoto';
          fieldName = 'photo';
        } else if (mimeType.startsWith('video/')) {
          endpoint = 'sendVideo';
          fieldName = 'video';
        }
        
        form.append(fieldName, fs.createReadStream(filePath), {
          filename: file.originalname,
          contentType: mimeType
        });
        
        await axios.post(`${TELEGRAM_API}/${endpoint}`, form, {
          headers: form.getHeaders()
        });
        
      } catch (error) {
        console.error(`Failed to send file to manager ${managerId}:`, error.message);
      }
    }
  }
  
  /**
   * Escape HTML для безопасной отправки
   */
  escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}

module.exports = new TelegramNotifyService();
