// Единый источник VIP конфигурации — используется во всех роутах
const VIP_LEVELS = [
  { level: 1, name: 'Bronze', pointsRequired: 0, cashbackPercent: 5, weeklyBonus: 1000, birthdayBonus: 5000 },
  { level: 2, name: 'Silver', pointsRequired: 5000, cashbackPercent: 7, weeklyBonus: 2500, birthdayBonus: 10000 },
  { level: 3, name: 'Gold', pointsRequired: 25000, cashbackPercent: 10, weeklyBonus: 5000, birthdayBonus: 25000 },
  { level: 4, name: 'Platinum', pointsRequired: 100000, cashbackPercent: 12, weeklyBonus: 10000, birthdayBonus: 50000 },
  { level: 5, name: 'Emperor', pointsRequired: 500000, cashbackPercent: 15, weeklyBonus: 25000, birthdayBonus: 100000 }
];

function getLevelByPoints(points) {
  let result = VIP_LEVELS[0];
  for (const lvl of VIP_LEVELS) {
    if (points >= lvl.pointsRequired) result = lvl;
  }
  return result;
}

function getCashbackPercent(vipLevel) {
  const lvl = VIP_LEVELS.find(l => l.level === vipLevel);
  return lvl ? lvl.cashbackPercent : 5;
}

async function updateVipLevel(pool, userId) {
  const res = await pool.query('SELECT vip_points, vip_level FROM users WHERE id = $1', [userId]);
  if (!res.rows[0]) return;
  const pts = res.rows[0].vip_points || 0;
  const currentLevel = res.rows[0].vip_level || 1;
  const newLvl = getLevelByPoints(pts);
  if (newLvl.level > currentLevel) {
    await pool.query('UPDATE users SET vip_level = $1 WHERE id = $2', [newLvl.level, userId]);
    return newLvl;
  }
  return null;
}

module.exports = { VIP_LEVELS, getLevelByPoints, getCashbackPercent, updateVipLevel };
