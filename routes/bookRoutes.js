const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const BookCode = require("../models/BookCode");
const Book = require("../models/Book");
const User = require("../models/User");

/* =========================
 CONTROLLERS
========================= */
const {
  createBook,
  getBooks,
  getBookById,
  updateBook,
  deleteBook,
  getDashboardData,
  getBookCodes,
  createBookCode,
  generateQRCode,
  generateBarcode,   // ✅ ชื่อถูกต้อง
} = require("../controllers/bookController");

/* =========================
 MIDDLEWARE
========================= */
const auth = require("../middleware/auth");
const upload = require("../middleware/upload");

/* =========================
 🔑 BOOK CODE ROUTES
========================= */
router.get("/bookcodes", auth, getBookCodes);

router.post("/createcode", auth, async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id || req.user;
    const user = await User.findById(userId);

    // ถ้าเป็น Admin ให้ผ่านได้เลย
    if (user && user.role === 'admin') {
      return next();
    }

    // ถ้าเป็น Librarian ต้องเช็คว่าเป็นเจ้าของหนังสือไหม
    const { bookId } = req.body;
    const book = await Book.findById(bookId);
    
    if (!book) return res.status(404).json({ message: "Book not found" });
    if (book.addedBy.toString() !== userId.toString()) {
      return res.status(403).json({ message: "คุณไม่มีสิทธิ์สร้างรหัสสำหรับหนังสือเล่มนี้ (เฉพาะเจ้าของหนังสือเท่านั้น)" });
    }

    next();
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
}, createBookCode);

// QR Code
router.post(
  "/bookcodes/:codeId/qrcode",
  auth,
  generateQRCode
);

// Barcode
router.post(
  "/bookcodes/:codeId/barcode",
  auth,
  generateBarcode
);

// ✅ Get Redeemed Codes (Admin Only) - ดูรายการหนังสือที่ถูกผู้ใช้ App รับไปแล้ว
router.get("/redeemed", auth, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const admin = await User.findById(userId);
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ message: "Access Denied" });
    }

    const codes = await BookCode.find({ used: true })
      .populate('user', 'email profilePic') // ดึงข้อมูลผู้ใช้ App
      .populate('bookId', 'title coverImage') // ดึงข้อมูลหนังสือ
      .sort({ updatedAt: -1 });
      
    res.json(codes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

// ✅ Delete App User (Admin Only)
router.delete("/app-users/:id", auth, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const admin = await User.findById(userId);
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ message: "Access Denied" });
    }

    // ✅ Determine the correct App User model from BookCode schema reference
    const userRef = BookCode.schema.path('user').options.ref;
    const AppUser = mongoose.model(userRef);

    const deletedUser = await AppUser.findByIdAndDelete(req.params.id);
    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    await BookCode.updateMany({ user: req.params.id }, { user: null, used: false });

    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

// ✅ Revoke Code (Admin Only) - ยกเลิกสิทธิ์การอ่าน (ดึงหนังสือคืน)
router.post("/revoke/:id", auth, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const admin = await User.findById(userId);
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ message: "Access Denied" });
    }

    const code = await BookCode.findById(req.params.id);
    if (!code) return res.status(404).json({ message: "Code not found" });

    code.used = false;
    code.user = null; // ลบความเชื่อมโยงกับผู้ใช้
    await code.save();

    res.json({ message: "Revoked successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});

// delete book code
router.delete("/bookcodes/:id", auth, async (req, res) => {
  try {
    const deleted = await BookCode.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "ไม่พบข้อมูล" });
    }
    res.json({ message: "ลบสำเร็จ" });
  } catch (err) {
    res.status(500).json(err);
  }
});

/* =========================
 📊 DASHBOARD
========================= */
router.get("/dashboard", auth, getDashboardData);

/* =========================
 ➕ CREATE BOOK
========================= */
router.post(
  "/",
  auth,
  upload.fields([
    { name: "cover", maxCount: 1 },
    { name: "pdf", maxCount: 1 },
  ]),
  createBook
);

/* =========================
 📚 GET ALL BOOKS
========================= */
router.get("/", auth, getBooks);

/* =========================
 📘 GET BOOK BY ID
========================= */
router.get("/:id", auth, getBookById);

/* =========================
 ✏️ UPDATE BOOK
========================= */
router.put(
  "/:id",
  auth,
  upload.fields([
    { name: "cover", maxCount: 1 },
    { name: "pdf", maxCount: 1 },
  ]),
  updateBook
);

/* =========================
 ❌ DELETE BOOK
========================= */
router.delete("/:id", auth, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id || req.user;
    const user = await User.findById(userId);
    const book = await Book.findById(req.params.id);

    if (!book) return res.status(404).json({ message: "Book not found" });

    // Allow if Admin OR Owner
    const isAdmin = user && user.role === 'admin';
    const isOwner = book.addedBy && book.addedBy.toString() === userId.toString();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: "Access Denied" });
    }

    await Book.findByIdAndDelete(req.params.id);
    await BookCode.deleteMany({ bookId: req.params.id });

    res.json({ message: "Book deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

module.exports = router;