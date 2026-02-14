const express = require('express');
const router = express.Router();
const Setting = require('../models/Setting');
const auth = require('../middleware/auth');
const User = require('../models/User');

// Middleware ตรวจสอบ Admin (เฉพาะใน Route นี้)
const checkAdmin = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const user = await User.findById(userId);
    if (user && user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ message: 'Access Denied: Admins Only' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// GET Link (Public - ใครก็เรียกได้)
router.get('/download-link', async (req, res) => {
  try {
    const setting = await Setting.findOne({ key: 'appDownloadLink' });
    res.json({ link: setting ? setting.value : '' });
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// POST Link (Admin Only - บันทึกค่า)
router.post('/download-link', auth, checkAdmin, async (req, res) => {
  try {
    const { link } = req.body;
    await Setting.findOneAndUpdate(
      { key: 'appDownloadLink' },
      { value: link },
      { upsert: true, new: true }
    );
    res.json({ message: 'Link updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;