const Book = require("../models/Book");
const BookCode = require("../models/BookCode");
const cloudinary = require("../config/cloudinary");
const QRCode = require("qrcode");
const bwipjs = require("bwip-js");
const crypto = require("crypto");

const normalizeTitle = (title) => {
  return title
    .toLowerCase()
    .replace(/\s+/g, "") // remove spaces
    .replace(/[-_.]/g, "") // remove - _ .
    .trim();
};
/* =========================
   ➕ CREATE BOOK
========================= */
exports.createBook = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const title = req.body.title?.trim();
    const detail = req.body.detail?.trim();

    if (!title) return res.status(400).json({ message: "Title is required" });

    if (!detail) return res.status(400).json({ message: "Detail is required" });

    // ===============================
    // ✅ 1) TITLE ต้องไม่ซ้ำ
    // ===============================
    const normalized = normalizeTitle(title);
    const folderName = normalized; // ใช้ชื่อที่ normalize แล้วเป็นชื่อโฟลเดอร์

    const titleExists = await Book.findOne({
      titleNormalized: normalized,
    });

    if (titleExists) {
      return res.status(400).json({
        message: "❌ ชื่อเรื่องซ้ำ กรุณาใส่ vol.1 / vol.2 ให้ชัดเจน",
      });
    }

    // ===============================
    // ✅ 2) PDF ต้องไม่ซ้ำ
    // ===============================
    if (!req.files?.pdf?.length)
      return res.status(400).json({ message: "PDF file is missing" });

    const pdfBuffer = req.files.pdf[0].buffer;

    const pdfHash = crypto.createHash("sha256").update(pdfBuffer).digest("hex");

    const pdfExists = await Book.findOne({ pdfHash });

    if (pdfExists) {
      return res.status(400).json({
        message: "❌ PDF นี้ถูกอัปโหลดแล้ว",
      });
    }

    // ===============================
    // ✅ 3) COVER ต้องไม่ซ้ำ
    // ===============================
    let coverUploadResult = null;
    let coverHash = null;

    if (req.files?.cover?.length) {
      const coverBuffer = req.files.cover[0].buffer;

      coverHash = crypto.createHash("sha256").update(coverBuffer).digest("hex");

      const coverExists = await Book.findOne({ coverHash });

      if (coverExists) {
        return res.status(400).json({
          message: "❌ รูปปกนี้ถูกใช้แล้ว",
        });
      }

      coverUploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream({ folder: `books/${folderName}` }, (err, result) => {
            if (err) reject(err);
            else resolve(result);
          })
          .end(coverBuffer);
      });
    }

    // ===============================
    // ✅ Upload PDF
    // ===============================
    const pdfUploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          { folder: `books/${folderName}`, resource_type: "auto" },
          (err, result) => {
            if (err) reject(err);
            else resolve(result);
          },
        )
        .end(pdfBuffer);
    });

    // ===============================
    // ✅ Generate Pages (PDF -> JPG)
    // ===============================
    const pages = [];
    const totalPages = pdfUploadResult.pages || 0; // Cloudinary คืนค่าจำนวนหน้ามาให้

    for (let i = 1; i <= totalPages; i++) {
      // สร้าง URL สำหรับดึงรูปภาพหน้า i จากไฟล์ PDF
      const pageUrl = cloudinary.url(pdfUploadResult.public_id, {
        page: i,
        format: "jpg",
        secure: true,
      });

      pages.push({
        pageNumber: i,
        imageUrl: pageUrl,
        public_id: pdfUploadResult.public_id, // ใช้ public_id ของ PDF อ้างอิง
      });
    }

    // ===============================
    // ✅ Save Book
    // ===============================
    const book = await Book.create({
      title,
      titleNormalized: normalized,
      folder: folderName,
      detail,
      pdfHash,
      pdfFile: {
        url: pdfUploadResult.secure_url,
        public_id: pdfUploadResult.public_id,
      },

      coverHash,
      coverImage: coverUploadResult
        ? {
            url: coverUploadResult.secure_url,
            public_id: coverUploadResult.public_id,
          }
        : undefined,

      pages,
      totalPages,
      status: "ready", // เปลี่ยนสถานะเป็นพร้อมใช้งานทันที
      addedBy: req.session.user.id,
    });

    res.status(201).json({
      message: "✅ Book created successfully",
      book,
    });
  } catch (err) {
    console.error("CREATE BOOK ERROR:", err);

    if (err.code === 11000) {
      return res.status(409).json({
        message: "❌ Duplicate detected (title/pdf/cover)",
      });
    }

    res.status(500).json({ message: "Internal server error" });
  }
};

/* =========================
   📚 GET ALL BOOKS
========================= */
exports.getBooks = async (req, res) => {
  try {
    const userId = req.session.user?.id;

    const books = await Book.aggregate([
      {
        $lookup: {
          from: "bookcodes",
          localField: "_id",
          foreignField: "bookId",
          as: "codes",
        },
      },
      {
        $lookup: {
          from: "admins",
          localField: "addedBy",
          foreignField: "_id",
          as: "addedBy",
        },
      },
      {
        $unwind: {
          path: "$addedBy",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          totalCodes: { $size: "$codes" },
          usedCodes: {
            $size: {
              $filter: {
                input: "$codes",
                as: "code",
                cond: { $eq: ["$$code.used", true] },
              },
            },
          },
          isOwner: { $eq: [{ $toString: "$addedBy._id" }, userId] },
        },
      },
      { $project: { codes: 0, "addedBy.password": 0 } },
      { $sort: { createdAt: -1 } },
    ]);

    res.json(books);
  } catch (err) {
    console.error("GET BOOKS ERROR:", err);
    res.status(500).json({ message: "Failed to fetch books" });
  }
};

/* =========================
   📘 GET BOOK BY ID
========================= */
exports.getBookById = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    res.json(book);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =========================
   ✏️ UPDATE BOOK
========================= */
exports.updateBook = async (req, res) => {
  try {
    const id = req.params.id;
    const userId = req.session.user?.id;

    if (!req.body.detail || !req.body.detail.trim()) {
      return res.status(400).json({ message: "Detail is required" });
    }

    const updateData = {
      title: req.body.title?.trim(),
      detail: req.body.detail.trim(),
    };

    if (req.files?.cover?.length) {
      updateData.coverImage = {
        url: req.files.cover[0].path,
        public_id: req.files.cover[0].filename,
      };
    }

    if (req.files?.pdf?.length) {
      updateData.pdfFile = {
        url: req.files.pdf[0].path,
        public_id: req.files.pdf[0].filename,
      };
    }

    // 🔒 Check ownership before update
    const existingBook = await Book.findById(id);
    if (!existingBook) {
      return res.status(404).json({ message: "Book not found" });
    }
    if (existingBook.addedBy?.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "Unauthorized to update this book" });
    }

    const book = await Book.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true },
    );

    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    // 🔁 sync title in BookCode
    await BookCode.updateMany(
      { bookId: id },
      { $set: { bookTitle: updateData.title } },
    );

    res.json(book);
  } catch (err) {
    console.error("UPDATE BOOK ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};

/* =========================
   ❌ DELETE BOOK
========================= */
exports.deleteBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    const userId = req.session.user?.id;

    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    if (book.addedBy?.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "Unauthorized to delete this book" });
    }

    await book.deleteOne();
    res.json({ message: "Book deleted successfully" });
  } catch (err) {
    console.error("DELETE BOOK ERROR:", err);
    res.status(500).json({ message: "Failed to delete book" });
  }
};

/* =========================
   🔑 GET BOOK CODES
========================= */
exports.getBookCodes = async (req, res) => {
  try {
    const codes = await BookCode.find().sort({ createdAt: -1 }).lean();

    res.json(codes);
  } catch (err) {
    console.error("GET BOOK CODES ERROR:", err);
    res.status(500).json({ message: "Load codes failed" });
  }
};

/* =========================
   🔑 CREATE BOOK CODE
========================= */
exports.createBookCode = async (req, res) => {
  try {
    const { bookId, bookTitle } = req.body;

    if (!bookId || !bookTitle) {
      return res.status(400).json({ message: "ข้อมูลไม่ครบ" });
    }

    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    await BookCode.create({
      code,
      bookId,
      bookTitle,
      used: false,
    });

    res.json({ message: "สร้างรหัสสำเร็จ" });
  } catch (err) {
    console.error("CREATE CODE ERROR:", err);
    res.status(500).json({ message: "Create code failed" });
  }
};

/* =========================
   🔳 GENERATE QR CODE
========================= */
exports.generateQRCode = async (req, res) => {
  try {
    const { codeId } = req.params;

    const bookCode = await BookCode.findById(codeId);
    if (!bookCode) {
      return res.status(404).json({ message: "Code not found" });
    }

    const qrBuffer = await QRCode.toBuffer(bookCode.code, {
      width: 300,
      margin: 2,
    });

    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ folder: "book-qrcode" }, (error, result) => {
          if (error) reject(error);
          else resolve(result);
        })
        .end(qrBuffer);
    });

    bookCode.qrImage = {
      url: uploadResult.secure_url,
      public_id: uploadResult.public_id,
    };

    await bookCode.save();

    const updatedCode = await BookCode.findById(codeId).lean();
    res.json(updatedCode);
  } catch (err) {
    console.error("GENERATE QR ERROR:", err);
    res.status(500).json({ message: "Generate QR failed" });
  }
};

/* =========================
 🟦 GENERATE BARCODE
========================= */
exports.generateBarcode = async (req, res) => {
  try {
    const { codeId } = req.params;

    const bookCode = await BookCode.findById(codeId);
    if (!bookCode) {
      return res.status(404).json({ message: "Code not found" });
    }

    // ❌ มีแล้วไม่ต้องสร้างซ้ำ
    if (bookCode.barcodeImage?.url) {
      return res.json(bookCode);
    }

    // 1️⃣ สร้าง barcode buffer
    const png = await bwipjs.toBuffer({
      bcid: "code128",
      text: bookCode.code,
      scale: 3,
      height: 10,
      includetext: true,
      textxalign: "center",
    });

    // 2️⃣ upload cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ folder: "book-barcode" }, (error, result) => {
          if (error) reject(error);
          else resolve(result);
        })
        .end(png);
    });

    // 3️⃣ save db
    bookCode.barcodeImage = {
      url: uploadResult.secure_url,
      public_id: uploadResult.public_id,
    };
    await bookCode.save();

    const updatedCode = await BookCode.findById(codeId).lean();
    res.json(updatedCode);
  } catch (err) {
    console.error("GENERATE BARCODE ERROR:", err);
    res.status(500).json({ message: "Generate barcode failed" });
  }
};

/* =========================
   📊 DASHBOARD DATA
========================= */
exports.getDashboardData = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = req.session.user.id;

    const totalBooks = await Book.countDocuments();
    const myBooks = await Book.countDocuments({ addedBy: userId });

    const totalCodes = await BookCode.countDocuments();
    const usedCodes = await BookCode.countDocuments({ used: true });

    const history = await Book.find({ addedBy: userId })
      .populate("addedBy", "email")
      .sort({ createdAt: -1 })
      .limit(5)
      .select("title createdAt");

    res.json({
      totalBooks,
      myBooks,
      totalCodes,
      usedCodes,
      history,
    });
  } catch (err) {
    console.error("DASHBOARD ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};
