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

// ✅ Get All Librarians (Admin Only)
router.get('/users', auth, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const admin = await User.findById(userId);
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ message: "Access Denied" });
    }
    const users = await User.find({ role: 'librarian' }).select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// ✅ Delete User (Librarian/Admin) - Admin Only
router.delete('/users/:id', auth, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const admin = await User.findById(userId);

    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ message: "Access Denied" });
    }

    if (req.params.id === userId.toString()) {
      return res.status(400).json({ message: "Cannot delete yourself" });
    }

    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "User not found" });

    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
