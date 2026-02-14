const express = require("express");
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
router.delete("/:id", auth, deleteBook);
router.delete("/bookcodes/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await BookCode.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "ไม่พบข้อมูล" });
    }

    res.json({ message: "ลบสำเร็จ" });
  } catch (err) {
    console.error(err);
    res.status(500).json(err);
  }
});

module.exports = router;