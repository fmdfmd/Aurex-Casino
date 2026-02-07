import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, 
  X, 
  Send, 
  Paperclip, 
  Phone,
  Mail,
  Clock,
  CheckCheck,
  User,
  Headphones,
  Sparkles
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  type: 'user' | 'agent' | 'system';
  text: string;
  timestamp: Date;
  read?: boolean;
}

export default function LiveChatWidget() {
  const { user, isAuthenticated } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Начальное приветствие
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const greeting: Message = {
        id: '1',
        type: 'agent',
        text: `Здравствуйте${user ? `, ${user.username}` : ''}! 👋 Добро пожаловать в AUREX Support. Чем могу помочь?`,
        timestamp: new Date(),
      };
      setMessages([greeting]);
    }
  }, [isOpen, user]);

  // Скролл вниз при новых сообщениях
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Сброс непрочитанных при открытии
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
    }
  }, [isOpen]);

  const handleSend = () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      text: inputText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    // Автоответ — оператор подключится позже
    setTimeout(() => {
      setIsTyping(false);
      
      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'agent',
        text: 'Спасибо за ваше сообщение! Наш оператор скоро подключится к чату. Среднее время ответа — 2-3 минуты.',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, agentMessage]);
      
      if (!isOpen) {
        setUnreadCount(prev => prev + 1);
      }
    }, 2000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickReplies = [
    'Проблема с депозитом',
    'Вопрос по бонусу',
    'Не могу вывести',
    'Другой вопрос'
  ];

  return (
    <>
      {/* Chat Button */}
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
        
        {/* Pulse effect */}
        <span className="absolute inset-0 rounded-full bg-aurex-gold-500 animate-ping opacity-25"></span>
        
        {/* Unread badge */}
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold"
          >
            {unreadCount}
          </motion.span>
        )}

        {/* Tooltip */}
        <span className="absolute right-20 bg-aurex-obsidian-800 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          Нужна помощь? 💬
        </span>
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-48px)] h-[600px] max-h-[calc(100vh-100px)] bg-aurex-obsidian-900 rounded-2xl shadow-2xl border border-aurex-obsidian-700 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-aurex-gold-600 to-aurex-gold-500 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-aurex-obsidian-900/20 flex items-center justify-center">
                    <Headphones className="w-6 h-6 text-aurex-obsidian-900" />
                  </div>
                  <div>
                    <h3 className="font-bold text-aurex-obsidian-900">AUREX Support</h3>
                    <div className="flex items-center gap-2 text-sm text-aurex-obsidian-800">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      Онлайн • ~2 мин
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-aurex-obsidian-900/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-aurex-obsidian-900" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] ${
                    msg.type === 'user' 
                      ? 'bg-aurex-gold-500 text-aurex-obsidian-900' 
                      : 'bg-aurex-obsidian-800 text-white'
                  } rounded-2xl px-4 py-3`}>
                    <p className="text-sm">{msg.text}</p>
                    <div className={`flex items-center gap-1 mt-1 text-xs ${
                      msg.type === 'user' ? 'text-aurex-obsidian-700' : 'text-aurex-platinum-500'
                    }`}>
                      <span>
                        {msg.timestamp.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {msg.type === 'user' && <CheckCheck className="w-3 h-3" />}
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Typing indicator */}
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

            {/* Quick Replies */}
            {messages.length <= 1 && (
              <div className="px-4 pb-2">
                <div className="flex flex-wrap gap-2">
                  {quickReplies.map((reply) => (
                    <button
                      key={reply}
                      onClick={() => {
                        setInputText(reply);
                        handleSend();
                      }}
                      className="px-3 py-1.5 bg-aurex-obsidian-800 hover:bg-aurex-obsidian-700 border border-aurex-obsidian-600 rounded-full text-sm text-aurex-platinum-300 transition-colors"
                    >
                      {reply}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-aurex-obsidian-700">
              <div className="flex items-center gap-2">
                <button className="p-2 text-aurex-platinum-500 hover:text-aurex-gold-500 transition-colors">
                  <Paperclip className="w-5 h-5" />
                </button>
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Напишите сообщение..."
                  className="flex-1 bg-aurex-obsidian-800 border border-aurex-obsidian-600 rounded-xl px-4 py-3 text-white placeholder-aurex-platinum-500 focus:outline-none focus:border-aurex-gold-500 transition-colors"
                />
                <motion.button
                  onClick={handleSend}
                  disabled={!inputText.trim()}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-3 bg-aurex-gold-500 rounded-xl text-aurex-obsidian-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </motion.button>
              </div>
            </div>

            {/* Alternative contacts */}
            <div className="px-4 pb-4 flex justify-center gap-6 text-xs text-aurex-platinum-500">
              <a href="mailto:support@aurex.io" className="flex items-center gap-1 hover:text-aurex-gold-500 transition-colors">
                <Mail className="w-3 h-3" /> Email
              </a>
              <a href="https://t.me/aurex_support" target="_blank" rel="noopener" className="flex items-center gap-1 hover:text-aurex-gold-500 transition-colors">
                <Send className="w-3 h-3" /> Telegram
              </a>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> 24/7
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
