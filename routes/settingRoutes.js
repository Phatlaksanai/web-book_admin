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

// GET Links (Public - ใครก็เรียกได้)
router.get('/download-links', async (req, res) => {
  try {
    const settings = await Setting.find({ key: { $in: ['appDownloadLink', 'appDownloadLinkIos'] } });
    const links = {
      android: settings.find(s => s.key === 'appDownloadLink')?.value || '',
      ios: settings.find(s => s.key === 'appDownloadLinkIos')?.value || ''
    };
    res.json(links);
  } catch (err) {
    console.error(err);
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
    res.json({ message: 'Android link updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// POST iOS Link (Admin Only - บันทึกค่า)
router.post('/download-link-ios', auth, checkAdmin, async (req, res) => {
  try {
    const { link } = req.body;
    await Setting.findOneAndUpdate(
      { key: 'appDownloadLinkIos' },
      { value: link },
      { upsert: true, new: true }
    );
    res.json({ message: 'iOS link updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;