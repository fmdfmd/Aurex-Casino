const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../config/database');
const { auth, adminAuth } = require('../middleware/auth');

// Хранение файлов в памяти (Railway ephemeral disk - файлы не персистентны)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Неподдерживаемый формат файла'));
    }
  }
});

// ============ USER ROUTES ============

// Получить статус верификации
router.get('/status', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM verifications WHERE user_id = $1 ORDER BY submitted_at DESC NULLS LAST LIMIT 1',
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.json({ 
        success: true, 
        data: { 
          status: 'not_started',
          level: 0,
          documents: {}
        } 
      });
    }
    
    const v = result.rows[0];
    res.json({ 
      success: true, 
      data: {
        id: v.id,
        status: v.status,
        level: v.level,
        documents: v.documents || {},
        personalInfo: v.personal_info || {},
        submittedAt: v.submitted_at,
        reviewedAt: v.reviewed_at
      }
    });
  } catch (error) {
    console.error('Get verification status error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Начать верификацию
router.post('/start', auth, async (req, res) => {
  try {
    // Проверяем есть ли уже верификация
    const existing = await pool.query(
      'SELECT * FROM verifications WHERE user_id = $1',
      [req.user.id]
    );
    
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Верификация уже начата' });
    }
    
    const result = await pool.query(
      `INSERT INTO verifications (user_id, status, level, documents, personal_info)
       VALUES ($1, 'pending', 0, $2, $3) RETURNING *`,
      [req.user.id, JSON.stringify({}), JSON.stringify(req.body.personalInfo || {})]
    );
    
    res.json({ success: true, message: 'Верификация начата', data: result.rows[0] });
  } catch (error) {
    console.error('Start verification error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Загрузить документ
router.post('/upload/:docType', auth, upload.single('file'), async (req, res) => {
  try {
    const { docType } = req.params;
    if (!['passport', 'selfie', 'address'].includes(docType)) {
      return res.status(400).json({ success: false, message: 'Неверный тип документа' });
    }

    // Получаем или создаём верификацию
    let result = await pool.query(
      'SELECT * FROM verifications WHERE user_id = $1',
      [req.user.id]
    );
    
    let verificationId;
    let documents = {};
    
    if (result.rows.length === 0) {
      // Создаём новую
      const insert = await pool.query(
        `INSERT INTO verifications (user_id, status, level, documents, personal_info)
         VALUES ($1, 'pending', 0, $2, $3) RETURNING *`,
        [req.user.id, JSON.stringify({}), JSON.stringify({})]
      );
      verificationId = insert.rows[0].id;
    } else {
      verificationId = result.rows[0].id;
      documents = result.rows[0].documents || {};
    }

    // Конвертируем файл в base64 для хранения в БД (Railway ephemeral disk)
    let fileData = null;
    let mimeType = 'image/jpeg';
    if (req.file) {
      fileData = req.file.buffer.toString('base64');
      mimeType = req.file.mimetype;
    }

    documents[docType] = {
      uploaded: true,
      status: 'pending',
      mimeType,
      fileData, // base64 в БД
      uploadedAt: new Date().toISOString()
    };

    await pool.query(
      'UPDATE verifications SET documents = $1, submitted_at = CURRENT_TIMESTAMP WHERE id = $2',
      [JSON.stringify(documents), verificationId]
    );
    
    res.json({ success: true, message: 'Документ загружен', data: { documents } });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ ADMIN ROUTES ============

// Получить все заявки
router.get('/', adminAuth, async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = `
      SELECT v.*, u.username, u.email, u.odid 
      FROM verifications v
      JOIN users u ON v.user_id = u.id
    `;
    const values = [];
    
    if (status && status !== 'all') {
      query += ' WHERE v.status = $1';
      values.push(status);
    }
    
    query += ' ORDER BY CASE WHEN v.status = \'pending\' THEN 0 ELSE 1 END, v.submitted_at DESC';
    
    const result = await pool.query(query, values);
    
    const data = result.rows.map(v => ({
      id: v.id,
      odid: v.odid,
      userId: v.user_id,
      username: v.username,
      email: v.email,
      status: v.status,
      level: v.level,
      documents: v.documents || {},
      personalInfo: v.personal_info || {},
      submittedAt: v.submitted_at,
      reviewedAt: v.reviewed_at
    }));
    
    res.json({ success: true, data });
  } catch (error) {
    console.error('Get verifications error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Получить заявку по ID
router.get('/:id', adminAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT v.*, u.username, u.email, u.odid 
       FROM verifications v
       JOIN users u ON v.user_id = u.id
       WHERE v.id = $1`,
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Заявка не найдена' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get verification error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Одобрить верификацию
router.post('/:id/approve', adminAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE verifications 
       SET status = 'approved', level = $1, reviewed_at = CURRENT_TIMESTAMP, reviewed_by = $2
       WHERE id = $3 RETURNING *`,
      [req.body.level || 1, req.user.id, req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Заявка не найдена' });
    }
    
    // Обновляем статус пользователя
    await pool.query(
      'UPDATE users SET is_verified = true WHERE id = $1',
      [result.rows[0].user_id]
    );
    
    res.json({ success: true, message: 'Верификация одобрена', data: result.rows[0] });
  } catch (error) {
    console.error('Approve verification error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Отклонить верификацию
router.post('/:id/reject', adminAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE verifications 
       SET status = 'rejected', rejection_reason = $1, reviewed_at = CURRENT_TIMESTAMP, reviewed_by = $2
       WHERE id = $3 RETURNING *`,
      [req.body.reason || 'Документы не соответствуют требованиям', req.user.id, req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Заявка не найдена' });
    }
    
    res.json({ success: true, message: 'Верификация отклонена', data: result.rows[0] });
  } catch (error) {
    console.error('Reject verification error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Статистика KYC
router.get('/admin/stats', adminAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'approved') as approved,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected
      FROM verifications
    `);
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Verification stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Скачать документ
router.get('/download/:filename', adminAuth, async (req, res) => {
  try {
    const { filename } = req.params;
    const filepath = path.join(uploadsDir, filename);
    
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ success: false, message: 'Файл не найден' });
    }
    
    res.download(filepath, filename);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
