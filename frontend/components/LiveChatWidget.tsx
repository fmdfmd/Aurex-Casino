import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, 
  X, 
  Send, 
  Mail,
  Clock,
  CheckCheck,
  Headphones,
  UserCheck,
  ArrowLeft,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface Message {
  id: string;
  type: 'user' | 'agent' | 'system' | 'operator';
  text: string;
  timestamp: Date;
}

type ChatMode = 'ai' | 'operator' | 'waiting';

export default function LiveChatWidget() {
  const { user, token } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [mode, setMode] = useState<ChatMode>('ai');
  const [ticketId, setTicketId] = useState<number | null>(null);
  const [operatorName, setOperatorName] = useState<string | null>(null);
  const [lastPollTimestamp, setLastPollTimestamp] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: '1',
        type: 'agent',
        text: `Здравствуйте${user ? `, ${user.username}` : ''}! 👋 Я Стефани, AI-ассистент AUREX. Чем могу помочь?`,
        timestamp: new Date(),
      }]);
    }
  }, [isOpen, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) setUnreadCount(0);
  }, [isOpen]);

  const pollMessages = useCallback(async () => {
    if (!ticketId || !token) return;
    try {
      const afterParam = lastPollTimestamp ? `?after=${encodeURIComponent(lastPollTimestamp)}` : '';
      const res = await fetch(`/api/chat/ticket/${ticketId}/messages${afterParam}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!data.success) return;

      if (data.operatorName && !operatorName) {
        setOperatorName(data.operatorName);
        setMode('operator');
      }

      if (data.status === 'resolved') {
        setMode('ai');
        setTicketId(null);
        setOperatorName(null);
        setLastPollTimestamp(null);
        if (pollingRef.current) clearInterval(pollingRef.current);
        pollingRef.current = null;
      }

      if (data.messages && data.messages.length > 0) {
        const newMsgs: Message[] = data.messages
          .filter((m: any) => m.is_staff)
          .map((m: any) => ({
            id: `op_${m.id}`,
            type: 'operator' as const,
            text: m.message,
            timestamp: new Date(m.created_at),
          }));

        if (newMsgs.length > 0) {
          setMessages(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const unique = newMsgs.filter(m => !existingIds.has(m.id));
            if (unique.length === 0) return prev;
            if (!isOpen) setUnreadCount(c => c + unique.length);
            return [...prev, ...unique];
          });
          const latest = data.messages[data.messages.length - 1];
          setLastPollTimestamp(latest.created_at);
        }
      }
    } catch (err) {
      console.error('Poll error:', err);
    }
  }, [ticketId, token, lastPollTimestamp, operatorName, isOpen]);

  useEffect(() => {
    if ((mode === 'waiting' || mode === 'operator') && ticketId) {
      pollingRef.current = setInterval(pollMessages, 3000);
      return () => {
        if (pollingRef.current) clearInterval(pollingRef.current);
      };
    }
  }, [mode, ticketId, pollMessages]);

  const sendToAI = async (text: string) => {
    setIsTyping(true);
    try {
      const res = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId })
      });
      const data = await res.json();
      
      if (data.sessionId && !sessionId) {
        setSessionId(data.sessionId);
      }

      const agentMsg: Message = {
        id: (Date.now() + 1).toString(),
        type: 'agent',
        text: data.response || 'Извините, произошла ошибка. Попробуйте позже.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, agentMsg]);
      if (!isOpen) setUnreadCount(prev => prev + 1);
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        type: 'agent',
        text: 'Извините, не удалось связаться с сервером. Попробуйте позже или напишите нам в Telegram: @aurex_support_bot',
        timestamp: new Date(),
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const sendToOperator = async (text: string) => {
    if (!ticketId || !token) return;
    try {
      await fetch(`/api/chat/ticket/${ticketId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ message: text })
      });
    } catch (err) {
      console.error('Send to operator error:', err);
    }
  };

  const handleCallOperator = async () => {
    if (!user || !token) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        type: 'system',
        text: 'Для связи с оператором необходимо войти в аккаунт.',
        timestamp: new Date(),
      }]);
      return;
    }

    setIsTyping(true);
    try {
      const res = await fetch('/api/chat/ticket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ message: 'Запрос оператора из чата' })
      });
      const data = await res.json();

      if (data.success) {
        setTicketId(data.ticketId);
        setMode('waiting');
        setLastPollTimestamp(null);
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          type: 'system',
          text: '⏳ Запрос отправлен. Ожидаем подключения оператора...',
          timestamp: new Date(),
        }]);
      } else {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          type: 'system',
          text: 'Не удалось создать запрос. Попробуйте позже.',
          timestamp: new Date(),
        }]);
      }
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        type: 'system',
        text: 'Ошибка при создании запроса. Попробуйте позже.',
        timestamp: new Date(),
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleBackToAI = () => {
    setMode('ai');
    setTicketId(null);
    setOperatorName(null);
    setLastPollTimestamp(null);
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = null;
  };

  const handleSend = () => {
    if (!inputText.trim()) return;
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      text: inputText,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    const text = inputText;
    setInputText('');

    if (mode === 'operator') {
      sendToOperator(text);
    } else if (mode === 'ai') {
      sendToAI(text);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickReply = (reply: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      text: reply,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    sendToAI(reply);
  };

  const quickReplies = [
    'Проблема с депозитом',
    'Вопрос по бонусу',
    'Как вывести средства?',
    'Другой вопрос'
  ];

  const headerTitle = mode === 'operator' 
    ? (operatorName || 'Оператор') 
    : mode === 'waiting' 
      ? 'Ожидание оператора...' 
      : 'Стефани — AI Support';

  const headerSubtitle = mode === 'operator'
    ? 'Оператор на связи'
    : mode === 'waiting'
      ? 'Ищем свободного оператора'
      : 'Онлайн 24/7';

  const isInputDisabled = isTyping || mode === 'waiting';

  return (
    <div id="live-chat-widget">
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-16 h-16 rounded-full bg-gradient-to-br from-aurex-gold-500 to-aurex-gold-600 shadow-aurex-gold flex items-center justify-center group"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        initial={{ scale: 0 }}
        animate={{ scale: isOpen ? 0 : 1 }}
        transition={{ type: 'spring', duration: 0.5 }}
      >
        <MessageCircle className="w-7 h-7 text-aurex-obsidian-900" />
        <span className="absolute inset-0 rounded-full bg-aurex-gold-500 animate-ping opacity-25"></span>
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold"
          >
            {unreadCount}
          </motion.span>
        )}
        <span className="absolute right-20 bg-aurex-obsidian-800 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          Нужна помощь? 💬
        </span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-48px)] h-[600px] max-h-[calc(100vh-100px)] bg-aurex-obsidian-900 rounded-2xl shadow-2xl border border-aurex-obsidian-700 overflow-hidden flex flex-col"
          >
            <div className={`p-4 ${
              mode === 'operator' 
                ? 'bg-gradient-to-r from-blue-600 to-blue-500' 
                : mode === 'waiting'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500'
                  : 'bg-gradient-to-r from-aurex-gold-600 to-aurex-gold-500'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {(mode === 'operator' || mode === 'waiting') && (
                    <button
                      onClick={handleBackToAI}
                      className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                      title="Назад к AI"
                    >
                      <ArrowLeft className="w-5 h-5 text-white" />
                    </button>
                  )}
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                    {mode === 'operator' ? (
                      <UserCheck className="w-6 h-6 text-white" />
                    ) : (
                      <Headphones className="w-6 h-6 text-aurex-obsidian-900" />
                    )}
                  </div>
                  <div>
                    <h3 className={`font-bold ${mode === 'operator' || mode === 'waiting' ? 'text-white' : 'text-aurex-obsidian-900'}`}>
                      {headerTitle}
                    </h3>
                    <div className={`flex items-center gap-2 text-sm ${mode === 'operator' || mode === 'waiting' ? 'text-white/80' : 'text-aurex-obsidian-800'}`}>
                      <span className={`w-2 h-2 rounded-full animate-pulse ${
                        mode === 'operator' ? 'bg-green-400' : mode === 'waiting' ? 'bg-yellow-300' : 'bg-green-500'
                      }`}></span>
                      {headerSubtitle}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className={`w-5 h-5 ${mode === 'operator' || mode === 'waiting' ? 'text-white' : 'text-aurex-obsidian-900'}`} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.type === 'user' ? 'justify-end' : msg.type === 'system' ? 'justify-center' : 'justify-start'}`}
                >
                  {msg.type === 'system' ? (
                    <div className="bg-aurex-obsidian-800/60 border border-aurex-obsidian-600 rounded-xl px-4 py-2 max-w-[90%]">
                      <p className="text-xs text-aurex-platinum-400 text-center">{msg.text}</p>
                    </div>
                  ) : (
                    <div className={`max-w-[80%] ${
                      msg.type === 'user' 
                        ? 'bg-aurex-gold-500 text-aurex-obsidian-900' 
                        : msg.type === 'operator'
                          ? 'bg-blue-600 text-white'
                          : 'bg-aurex-obsidian-800 text-white'
                    } rounded-2xl px-4 py-3`}>
                      {msg.type === 'operator' && (
                        <div className="flex items-center gap-1 mb-1">
                          <UserCheck className="w-3 h-3" />
                          <span className="text-xs font-semibold text-blue-200">Оператор</span>
                        </div>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                      <div className={`flex items-center gap-1 mt-1 text-xs ${
                        msg.type === 'user' ? 'text-aurex-obsidian-700' : msg.type === 'operator' ? 'text-blue-200' : 'text-aurex-platinum-500'
                      }`}>
                        <span>
                          {msg.timestamp.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {msg.type === 'user' && <CheckCheck className="w-3 h-3" />}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}

              {isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-aurex-obsidian-800 rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-aurex-platinum-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-2 h-2 bg-aurex-platinum-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-2 h-2 bg-aurex-platinum-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {mode === 'ai' && messages.length <= 1 && (
              <div className="px-4 pb-2">
                <div className="flex flex-wrap gap-2">
                  {quickReplies.map((reply) => (
                    <button
                      key={reply}
                      onClick={() => handleQuickReply(reply)}
                      className="px-3 py-1.5 bg-aurex-obsidian-800 hover:bg-aurex-obsidian-700 border border-aurex-obsidian-600 rounded-full text-sm text-aurex-platinum-300 transition-colors"
                    >
                      {reply}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {mode === 'ai' && (
              <div className="px-4 pb-2">
                <button
                  onClick={handleCallOperator}
                  disabled={isTyping}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <UserCheck className="w-4 h-4" />
                  Позвать оператора
                </button>
              </div>
            )}

            <div className="p-4 border-t border-aurex-obsidian-700">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={mode === 'waiting' ? 'Ожидание оператора...' : 'Напишите сообщение...'}
                  disabled={isInputDisabled}
                  className="flex-1 bg-aurex-obsidian-800 border border-aurex-obsidian-600 rounded-xl px-4 py-3 text-white placeholder-aurex-platinum-500 focus:outline-none focus:border-aurex-gold-500 transition-colors disabled:opacity-50"
                />
                <motion.button
                  onClick={handleSend}
                  disabled={!inputText.trim() || isInputDisabled}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`p-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed ${
                    mode === 'operator' ? 'bg-blue-600 text-white' : 'bg-aurex-gold-500 text-aurex-obsidian-900'
                  }`}
                >
                  <Send className="w-5 h-5" />
                </motion.button>
              </div>
            </div>

            <div className="px-4 pb-4 flex justify-center gap-6 text-xs text-aurex-platinum-500">
              <a href="mailto:support@aurex.casino" className="flex items-center gap-1 hover:text-aurex-gold-500 transition-colors">
                <Mail className="w-3 h-3" /> Email
              </a>
              <a href="https://t.me/aurex_support_bot" target="_blank" rel="noopener" className="flex items-center gap-1 hover:text-aurex-gold-500 transition-colors">
                <Send className="w-3 h-3" /> Telegram
              </a>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> 24/7
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
