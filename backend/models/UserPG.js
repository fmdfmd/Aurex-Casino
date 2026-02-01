const pool = require('../config/database');
const bcrypt = require('bcryptjs');

class UserPG {
  // Find user by ID
  static async findById(id) {
    try {
      const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('UserPG.findById error:', error);
      return null;
    }
  }

  // Find user by email or username
  static async findOne(query) {
    try {
      if (query.email) {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [query.email]);
        return result.rows[0] || null;
      }
      if (query.username) {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [query.username]);
        return result.rows[0] || null;
      }
      if (query.$or) {
        const email = query.$or.find(q => q.email)?.email;
        const username = query.$or.find(q => q.username)?.username;
        const result = await pool.query(
          'SELECT * FROM users WHERE email = $1 OR username = $2',
          [email, username]
        );
        return result.rows[0] || null;
      }
      if (query.referralCode) {
        const result = await pool.query('SELECT * FROM users WHERE referral_code = $1', [query.referralCode]);
        return result.rows[0] || null;
      }
      return null;
    } catch (error) {
      console.error('UserPG.findOne error:', error);
      return null;
    }
  }

  // Create new user
  static async create(userData) {
    try {
      const { username, email, password, firstName, lastName } = userData;
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);
      
      // Generate ODID and referral code
      const odid = `AUREX-${Date.now().toString(36).toUpperCase()}`;
      const referralCode = `REF-${username.toUpperCase().slice(0, 6)}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      
      const result = await pool.query(
        `INSERT INTO users (odid, username, email, password, referral_code, balance, bonus_balance, vip_level)
         VALUES ($1, $2, $3, $4, $5, 0, 0, 1) RETURNING *`,
        [odid, username, email, hashedPassword, referralCode]
      );
      
      const user = result.rows[0];
      
      // Add helper methods
      user.comparePassword = async (candidatePassword) => {
        return bcrypt.compare(candidatePassword, user.password);
      };
      
      return user;
    } catch (error) {
      console.error('UserPG.create error:', error);
      throw error;
    }
  }

  // Update user
  static async updateById(id, updates) {
    try {
      const fields = [];
      const values = [];
      let paramIndex = 1;
      
      for (const [key, value] of Object.entries(updates)) {
        // Convert camelCase to snake_case
        const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        fields.push(`${dbKey} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
      
      values.push(id);
      
      const result = await pool.query(
        `UPDATE users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex} RETURNING *`,
        values
      );
      
      return result.rows[0] || null;
    } catch (error) {
      console.error('UserPG.updateById error:', error);
      throw error;
    }
  }

  // Update balance
  static async updateBalance(id, amount, type = 'balance') {
    try {
      const column = type === 'bonus' ? 'bonus_balance' : 'balance';
      const result = await pool.query(
        `UPDATE users SET ${column} = ${column} + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
        [amount, id]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('UserPG.updateBalance error:', error);
      throw error;
    }
  }

  // Set balance
  static async setBalance(id, amount, type = 'balance') {
    try {
      const column = type === 'bonus' ? 'bonus_balance' : 'balance';
      const result = await pool.query(
        `UPDATE users SET ${column} = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
        [amount, id]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('UserPG.setBalance error:', error);
      throw error;
    }
  }

  // Find all users (for admin)
  static async findAll(options = {}) {
    try {
      let query = 'SELECT * FROM users';
      const values = [];
      const conditions = [];
      
      if (options.isAdmin !== undefined) {
        conditions.push(`is_admin = $${values.length + 1}`);
        values.push(options.isAdmin);
      }
      
      if (options.isActive !== undefined) {
        conditions.push(`is_active = $${values.length + 1}`);
        values.push(options.isActive);
      }
      
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
      
      query += ' ORDER BY created_at DESC';
      
      if (options.limit) {
        query += ` LIMIT ${parseInt(options.limit)}`;
      }
      
      if (options.offset) {
        query += ` OFFSET ${parseInt(options.offset)}`;
      }
      
      const result = await pool.query(query, values);
      return result.rows;
    } catch (error) {
      console.error('UserPG.findAll error:', error);
      return [];
    }
  }

  // Count users
  static async count(options = {}) {
    try {
      let query = 'SELECT COUNT(*) as count FROM users';
      const values = [];
      const conditions = [];
      
      if (options.isAdmin !== undefined) {
        conditions.push(`is_admin = $${values.length + 1}`);
        values.push(options.isAdmin);
      }
      
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
      
      const result = await pool.query(query, values);
      return parseInt(result.rows[0].count);
    } catch (error) {
      console.error('UserPG.count error:', error);
      return 0;
    }
  }

  // Compare password helper for found user
  static async comparePassword(user, candidatePassword) {
    return bcrypt.compare(candidatePassword, user.password);
  }
}

module.exports = UserPG;
