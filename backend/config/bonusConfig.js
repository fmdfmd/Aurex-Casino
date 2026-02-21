// Single source of truth for deposit bonus configuration
// All wager multipliers: x30

const DEPOSIT_BONUSES = {
  1: { percent: 200, maxBonus: 70000, wager: 30, title: '1-й депозит' },
  2: { percent: 150, maxBonus: 50000, wager: 30, title: '2-й депозит' },
  3: { percent: 100, maxBonus: 30000, wager: 30, title: '3-й депозит' },
  4: { percent: 75,  maxBonus: 20000, wager: 30, title: '4-й депозит' }
};

const BONUS_EXPIRY_DAYS = 30;

/**
 * Track wager progress for deposit bonuses and handle completion.
 * Call this inside a DB transaction whenever a bet is placed.
 * @param {object} client - DB transaction client
 * @param {number} userId - User ID
 * @param {number} betAmount - Bet amount
 */
async function trackDepositBonusWager(client, userId, betAmount) {
  if (!betAmount || betAmount <= 0) return;

  try {
    // Update wagering progress for all active deposit bonuses
    await client.query(
      `UPDATE bonuses 
       SET wagering_completed = LEAST(wagering_completed + $1, wagering_requirement),
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $2 AND status = 'active' 
         AND wagering_completed < wagering_requirement`,
      [betAmount, userId]
    );

    // Find bonuses that just completed their wager
    const completedBonuses = await client.query(
      `UPDATE bonuses 
       SET status = 'completed', completed_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND status = 'active' 
         AND wagering_completed >= wagering_requirement
       RETURNING id, amount, bonus_type`,
      [userId]
    );

    // Convert bonus_balance to real balance for each completed bonus
    for (const bonus of completedBonuses.rows) {
      const bonusAmount = parseFloat(bonus.amount);
      
      // Get current bonus_balance to avoid going negative
      const userRes = await client.query(
        'SELECT bonus_balance FROM users WHERE id = $1',
        [userId]
      );
      const currentBonusBal = parseFloat(userRes.rows[0]?.bonus_balance || 0);
      const transferAmount = Math.min(bonusAmount, currentBonusBal);
      
      if (transferAmount > 0) {
        await client.query(
          'UPDATE users SET balance = balance + $1, bonus_balance = bonus_balance - $1 WHERE id = $2',
          [transferAmount, userId]
        );
        console.log(`✅ Wager completed for ${bonus.bonus_type}! Transferred ₽${transferAmount} from bonus to main balance for user ${userId}`);
      }
    }
  } catch (err) {
    console.error('[bonusConfig] Error tracking deposit bonus wager:', err.message);
  }
}

/**
 * Expire bonuses past their expires_at date.
 * Removes bonus_balance for expired bonuses.
 */
async function expireOldBonuses(pool) {
  try {
    const expired = await pool.query(
      `UPDATE bonuses 
       SET status = 'expired', updated_at = CURRENT_TIMESTAMP
       WHERE status = 'active' AND expires_at < NOW()
       RETURNING id, user_id, amount, bonus_type`
    );

    for (const bonus of expired.rows) {
      const bonusAmount = parseFloat(bonus.amount);
      if (bonusAmount > 0) {
        await pool.query(
          'UPDATE users SET bonus_balance = GREATEST(0, bonus_balance - $1) WHERE id = $2',
          [bonusAmount, bonus.user_id]
        );
        console.log(`⏰ Bonus ${bonus.bonus_type} expired for user ${bonus.user_id}, removed ₽${bonusAmount} from bonus_balance`);
      }
    }

    if (expired.rows.length > 0) {
      console.log(`⏰ Expired ${expired.rows.length} bonus(es)`);
    }
  } catch (err) {
    console.error('[bonusConfig] Error expiring bonuses:', err.message);
  }
}

module.exports = { DEPOSIT_BONUSES, BONUS_EXPIRY_DAYS, trackDepositBonusWager, expireOldBonuses };
