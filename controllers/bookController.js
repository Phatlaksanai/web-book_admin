const Book = require("../models/Book");
const BookCode = require("../models/BookCode");
const User = require("../models/User");
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
    const tags = req.body.tags;

    if (!title) return res.status(400).json({ message: "Title is required" });

    if (!detail) return res.status(400).json({ message: "Detail is required" });

    // Parse tags from comma-separated string to array
    let tagsArray = [];
    if (tags && typeof tags === 'string') {
      tagsArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    }

    // ===============================
    // ✅ 1) TITLE ต้องไม่ซ้ำ
    // ===============================
    const normalized = normalizeTitle(title);
    const folderName = title.trim().replace(/\s+/g, '_'); // ใช้ชื่อหนังสือเป็นชื่อ Folder (แทนช่องว่างด้วย _)

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
      tags: tagsArray,
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
    // ✅ FIX: แก้ปัญหา Route conflict (กรณี /codes หรือ /dashboard วิ่งเข้า /:id)
    if (req.params.id === "codes") {
      return exports.getBookCodes(req, res);
    }
    if (req.params.id === "dashboard") {
      return exports.getDashboardData(req, res);
    }

    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    res.json(book);
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(400).json({ message: "Invalid Book ID" });
    }
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

    // 🔒 Check ownership before update
    const book = await Book.findById(id);
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }
    if (book.addedBy?.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "Unauthorized to update this book" });
    }

    const { title, detail, tags } = req.body;
    if (!title?.trim() || !detail?.trim()) {
      return res.status(400).json({ message: "Title and Detail are required" });
    }

    const updateData = {
      title: title.trim(),
      detail: detail.trim(),
    };

    if (tags !== undefined) {
      updateData.tags = typeof tags === 'string'
        ? tags.split(',').map(tag => tag.trim()).filter(tag => tag)
        : [];
    }

    const folderName = book.folder;

    // Helper to upload stream to Cloudinary
    const uploadStream = (buffer, options) => {
      return new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(options, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        }).end(buffer);
      });
    };

    // Handle new cover image
    if (req.files?.cover?.length) {
      const coverBuffer = req.files.cover[0].buffer;
      const newCoverHash = crypto.createHash("sha256").update(coverBuffer).digest("hex");
      const coverExists = await Book.findOne({ coverHash: newCoverHash, _id: { $ne: id } });
      if (coverExists) {
        return res.status(400).json({ message: "❌ รูปปกนี้ถูกใช้แล้ว" });
      }

      const coverUploadResult = await uploadStream(coverBuffer, { folder: `books/${folderName}` });
      
      if (book.coverImage?.public_id) {
        await cloudinary.uploader.destroy(book.coverImage.public_id);
      }

      updateData.coverImage = {
        url: coverUploadResult.secure_url,
        public_id: coverUploadResult.public_id,
      };
      updateData.coverHash = newCoverHash;
    }

    // Handle new PDF file
    if (req.files?.pdf?.length) {
      const pdfBuffer = req.files.pdf[0].buffer;
      const newPdfHash = crypto.createHash("sha256").update(pdfBuffer).digest("hex");
      const pdfExists = await Book.findOne({ pdfHash: newPdfHash, _id: { $ne: id } });
      if (pdfExists) {
        return res.status(400).json({ message: "❌ PDF นี้ถูกอัปโหลดแล้ว" });
      }

      const pdfUploadResult = await uploadStream(pdfBuffer, { folder: `books/${folderName}`, resource_type: "auto" });

      if (book.pdfFile?.public_id) {
        await cloudinary.uploader.destroy(book.pdfFile.public_id, { invalidate: true });
      }

      const pages = [];
      const totalPages = pdfUploadResult.pages || 0;
      for (let i = 1; i <= totalPages; i++) {
        const pageUrl = cloudinary.url(pdfUploadResult.public_id, { page: i, format: "jpg", secure: true });
        pages.push({
          pageNumber: i,
          imageUrl: pageUrl,
          public_id: pdfUploadResult.public_id,
        });
      }
      
      updateData.pdfFile = { url: pdfUploadResult.secure_url, public_id: pdfUploadResult.public_id };
      updateData.pdfHash = newPdfHash;
      updateData.pages = pages;
      updateData.totalPages = totalPages;
    }

    const updatedBook = await Book.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true },
    );

    // 🔁 sync title in BookCode
    if (updateData.title && updateData.title !== book.title) {
        await BookCode.updateMany(
          { bookId: id },
          { $set: { bookTitle: updateData.title } },
        );
    }

    res.json(updatedBook);
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
    const user = await User.findById(userId);

    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    const isAdmin = user && user.role === 'admin';
    const isOwner = book.addedBy?.toString() === userId;

    if (!isOwner && !isAdmin) {
      return res
        .status(403)
        .json({ message: "Unauthorized to delete this book" });
    }

    // ✅ 1. ลบไฟล์รูปปกและ PDF จาก Cloudinary
    if (book.coverImage?.public_id) {
      await cloudinary.uploader.destroy(book.coverImage.public_id);
    }

    if (book.pdfFile?.public_id) {
      await cloudinary.uploader.destroy(book.pdfFile.public_id);
    }

    // ✅ 2. ลบ QR Code และ Barcode ของ BookCode ที่เกี่ยวข้องออกจาก Cloudinary
    const codes = await BookCode.find({ bookId: book._id });
    for (const code of codes) {
      if (code.qrImage?.public_id) {
        await cloudinary.uploader.destroy(code.qrImage.public_id);
      }
      if (code.barcodeImage?.public_id) {
        await cloudinary.uploader.destroy(code.barcodeImage.public_id);
      }
    }
    await BookCode.deleteMany({ bookId: book._id });

    // ✅ 3. ลบ Folder ใน Cloudinary (Clean up)
    if (book.folder) {
      try {
        const folderPath = `books/${book.folder}`;
        // ลบไฟล์ทั้งหมดใน Folder ก่อน (เผื่อมีไฟล์ค้าง)
        await cloudinary.api.delete_resources_by_prefix(folderPath);
        await cloudinary.api.delete_resources_by_prefix(folderPath, { resource_type: "raw" });
        
        // ลบ Folder
        await cloudinary.api.delete_folder(folderPath);
      } catch (err) {
        console.warn("Cloudinary Folder Delete Warning:", err.message);
      }
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
    const { bookId } = req.body;

    if (!bookId) {
      return res.status(400).json({ message: "Book ID is required" });
    }

    // 1. ดึงข้อมูลหนังสือเพื่อเอาชื่อโฟลเดอร์
    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const folderName = book.folder || normalizeTitle(book.title);

    // 2. สร้าง QR Code และ Barcode
    const qrBuffer = await QRCode.toBuffer(code, { width: 300, margin: 2 });
    
    const barcodeBuffer = await bwipjs.toBuffer({
      bcid: "code128",
      text: code,
      scale: 3,
      height: 10,
      includetext: true,
      textxalign: "center",
    });

    // 3. อัปโหลดขึ้น Cloudinary (เก็บในโฟลเดอร์เดียวกับหนังสือ)
    const uploadToCloudinary = (buffer, publicId) => {
      return new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { folder: `books/${folderName}`, public_id: publicId, overwrite: true },
          (error, result) => (error ? reject(error) : resolve(result))
        ).end(buffer);
      });
    };

    const [qrUpload, barcodeUpload] = await Promise.all([
      uploadToCloudinary(qrBuffer, `qr_${code}`),
      uploadToCloudinary(barcodeBuffer, `barcode_${code}`)
    ]);

    await BookCode.create({
      code,
      bookId,
      bookTitle: book.title,
      used: false,
      qrImage: { url: qrUpload.secure_url, public_id: qrUpload.public_id },
      barcodeImage: { url: barcodeUpload.secure_url, public_id: barcodeUpload.public_id }
    });

    res.json({ message: "สร้างรหัสและรูปภาพสำเร็จ" });
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

    const book = await Book.findById(bookCode.bookId);
    const folderName = book ? (book.folder || normalizeTitle(book.title)) : "book-qrcode";

    const qrBuffer = await QRCode.toBuffer(bookCode.code, {
      width: 300,
      margin: 2,
    });

    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ folder: `books/${folderName}`, public_id: `qr_${bookCode.code}` }, (error, result) => {
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

    const book = await Book.findById(bookCode.bookId);
    const folderName = book ? (book.folder || normalizeTitle(book.title)) : "book-barcode";

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
        .upload_stream({ folder: `books/${folderName}`, public_id: `barcode_${bookCode.code}` }, (error, result) => {
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

    // ✅ เพิ่ม: ดึงข้อมูลสถิติรายหนังสือสำหรับ Scatter Plot
    const bookStats = await Book.aggregate([
      {
        $lookup: {
          from: "bookcodes",
          localField: "_id",
          foreignField: "bookId",
          as: "codes",
        },
      },
      {
        $project: {
          title: 1,
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
        },
      },
    ]);

    res.json({
      totalBooks,
      myBooks,
      totalCodes,
      usedCodes,
      history,
      bookStats,
    });
  } catch (err) {
    console.error("DASHBOARD ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};
