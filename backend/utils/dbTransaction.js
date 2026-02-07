/**
 * Утилита для безопасных транзакций с балансом.
 * Все операции с деньгами ОБЯЗАНЫ идти через withTransaction.
 * 
 * Использование:
 *   const { withTransaction } = require('../utils/dbTransaction');
 *   
 *   await withTransaction(pool, async (client) => {
 *     const user = await client.query('SELECT * FROM users WHERE id = $1 FOR UPDATE', [userId]);
 *     await client.query('UPDATE users SET balance = balance - $1 WHERE id = $2', [amount, userId]);
 *     await client.query('INSERT INTO transactions ...', [...]);
 *   });
 */

async function withTransaction(pool, callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { withTransaction };
