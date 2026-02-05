-- AUREX Support Bot Database Schema

-- Support Managers table (Operators who handle tickets)
CREATE TABLE IF NOT EXISTS support_managers (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  username VARCHAR(100),
  first_name VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  is_online BOOLEAN DEFAULT FALSE,
  tickets_handled INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bot conversations (for AI context)
CREATE TABLE IF NOT EXISTS bot_conversations (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT NOT NULL,
  username VARCHAR(100),
  role VARCHAR(20) NOT NULL, -- 'user' or 'assistant'
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Support tickets (extends existing tickets table concept)
CREATE TABLE IF NOT EXISTS support_tickets (
  id SERIAL PRIMARY KEY,
  ticket_number VARCHAR(20) UNIQUE NOT NULL,
  user_telegram_id BIGINT NOT NULL,
  user_username VARCHAR(100),
  user_first_name VARCHAR(255),
  manager_telegram_id BIGINT,
  subject TEXT,
  status VARCHAR(50) DEFAULT 'open', -- open, assigned, closed
  priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  assigned_at TIMESTAMP,
  closed_at TIMESTAMP,
  closed_by BIGINT
);

-- Ticket messages (chat between user and manager)
CREATE TABLE IF NOT EXISTS support_ticket_messages (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_telegram_id BIGINT NOT NULL,
  sender_type VARCHAR(20) NOT NULL, -- 'user' or 'manager'
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_support_managers_telegram_id ON support_managers(telegram_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_manager ON support_tickets(manager_telegram_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_bot_conversations_telegram_id ON bot_conversations(telegram_id);
