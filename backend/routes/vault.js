const express = require('express');
const { User } = require('../models/temp-models');
const { auth } = require('../middleware/auth');
const router = express.Router();

// In-memory storage for vault bonuses
global.tempVaultBonuses = global.tempVaultBonuses || [];

// GET /api/vault/stats - Get user's vault statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const userBonuses = global.tempVaultBonuses.filter(b => b.userId === req.user.id);
    const activeBonuses = userBonuses.filter(b => !b.isLocked && b.status === 'active');
    const lockedBonuses = userBonuses.filter(b => b.isLocked);
    
    const stats = {
      totalBonuses: userBonuses.length,
      activeBonuses: activeBonuses.length,
      lockedBonuses: lockedBonuses.length,
      totalValue: userBonuses.reduce((sum, b) => sum + (b.valueAmount || 0), 0),
      savedThisMonth: activeBonuses.reduce((sum, b) => sum + (b.valueAmount || 0), 0)
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get vault stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to get vault stats' });
  }
});

// GET /api/vault/bonuses - Get user's vault bonuses
router.get('/bonuses', auth, async (req, res) => {
  try {
    const { status } = req.query;
    
    let userBonuses = global.tempVaultBonuses.filter(b => b.userId === req.user.id);
    
    if (status === 'available') {
      userBonuses = userBonuses.filter(b => !b.isLocked && b.status === 'active');
    } else if (status === 'locked') {
      userBonuses = userBonuses.filter(b => b.isLocked);
    } else if (status === 'used') {
      userBonuses = userBonuses.filter(b => b.status === 'used');
    }

    // If no bonuses, create some default ones for the user
    if (userBonuses.length === 0 && !status) {
      const user = await User.findById(req.user.id);
      const vipLevel = user?.vipLevel || 0;
      const defaultBonuses = createDefaultBonuses(req.user.id, vipLevel);
      global.tempVaultBonuses.push(...defaultBonuses);
      userBonuses = defaultBonuses;
    }

    res.json({
      success: true,
      data: userBonuses
    });
  } catch (error) {
    console.error('Get vault bonuses error:', error);
    res.status(500).json({ success: false, error: 'Failed to get bonuses' });
  }
});

// POST /api/vault/activate/:bonusId - Activate a vault bonus
router.post('/activate/:bonusId', auth, async (req, res) => {
  try {
    const bonusIndex = global.tempVaultBonuses.findIndex(
      b => b.id === req.params.bonusId && b.userId === req.user.id
    );

    if (bonusIndex === -1) {
      return res.status(404).json({ success: false, error: 'Бонус не найден' });
    }

    const bonus = global.tempVaultBonuses[bonusIndex];

    if (bonus.isLocked) {
      return res.status(400).json({ success: false, error: bonus.unlockCondition || 'Бонус заблокирован' });
    }

    if (bonus.status === 'used') {
      return res.status(400).json({ success: false, error: 'Бонус уже использован' });
    }

    // Activate the bonus
    global.tempVaultBonuses[bonusIndex] = {
      ...bonus,
      status: 'activated',
      activatedAt: new Date().toISOString()
    };

    // Apply bonus to user
    const userResult = User.findById(req.user.id);
    const user = await userResult.select('-password');
    
    if (user && bonus.type === 'cashback') {
      user.balance = (user.balance || 0) + (bonus.valueAmount || 0);
      await user.save();
    }

    res.json({
      success: true,
      message: `Бонус "${bonus.name}" активирован!`,
      data: global.tempVaultBonuses[bonusIndex]
    });
  } catch (error) {
    console.error('Activate vault bonus error:', error);
    res.status(500).json({ success: false, error: 'Failed to activate bonus' });
  }
});

// Helper: Create default bonuses for new users
function createDefaultBonuses(userId, vipLevel = 0) {
  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const monthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // VIP бонус разблокирован для VIP 3+ (Gold и выше)
  const isVipUnlocked = vipLevel >= 3;

  return [
    {
      id: `vault-${userId}-1`,
      odid: `AUREX-VAULT-${Date.now()}-1`,
      userId,
      type: 'freespins',
      name: 'Приветственные фриспины',
      description: '25 фриспинов в Sweet Bonanza',
      value: '25 FS',
      valueAmount: 250,
      icon: '🎰',
      expiresAt: weekFromNow.toISOString(),
      isLocked: false,
      status: 'active',
      createdAt: now.toISOString()
    },
    {
      id: `vault-${userId}-2`,
      odid: `AUREX-VAULT-${Date.now()}-2`,
      userId,
      type: 'reload',
      name: 'Weekend Reload',
      description: '50% бонус на пополнение в выходные',
      value: '50%',
      valueAmount: 0,
      icon: '💎',
      expiresAt: weekFromNow.toISOString(),
      isLocked: false,
      status: 'active',
      createdAt: now.toISOString()
    },
    {
      id: `vault-${userId}-3`,
      odid: `AUREX-VAULT-${Date.now()}-3`,
      userId,
      type: 'vip',
      name: 'VIP бонус',
      description: 'Эксклюзивный бонус для VIP игроков',
      value: '₽5,000',
      valueAmount: 5000,
      icon: '👑',
      expiresAt: monthFromNow.toISOString(),
      isLocked: !isVipUnlocked,
      unlockCondition: isVipUnlocked ? undefined : 'Достигните VIP уровня Gold (3+)',
      status: 'active',
      createdAt: now.toISOString()
    }
  ];
}

module.exports = router;
