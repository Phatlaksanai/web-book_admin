const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// ✅ import logout มาด้วย
const { register, login, logout } = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
// exports.logout = (req, res) => {
//   req.session.destroy(err => {
//     if (err) {
//       return res.status(500).json({ message: "Logout failed" });
//     }

//     res.clearCookie("connect.sid", { path: "/" });
//     res.status(200).json({ message: "Logout success" });
//   });
// };

// ✅ Get Current User (เพื่อดึง Role ล่าสุด)
router.get('/me', auth, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const user = await User.findById(userId).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

module.exports = router;
