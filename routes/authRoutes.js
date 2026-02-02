const express = require('express');
const router = express.Router();

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

module.exports = router;
