const mongoose = require("mongoose");

/**
 * หน้าหนังสือ (ใช้กับ flipbook)
 */
const pageSchema = new mongoose.Schema(
  {
    pageNumber: {
      type: Number,
      required: true,
    },
    imageUrl: {
      type: String,
      required: true, // Cloudinary secure_url
    },
    public_id: {
      type: String,
      required: true, // Cloudinary public_id
    },
  },
  { _id: false }
);

const bookSchema = new mongoose.Schema(
  {
    // ===== ข้อมูลพื้นฐาน =====
    title: {
      type: String,
      required: true,
      trim: true,
    },

    titleNormalized: {
      type: String, // กันชื่อซ้ำแบบไม่สนตัวใหญ่เล็ก
      required: true,
      unique: true,
      index: true,
    },

    folder: {
      type: String,
      required: true,
    },

    detail: {
      type: String,
      required: true,
      trim: true,
    },

    tags: {
      type: [String],
      default: [],
      index: true,
    },

    // ===== ปกหนังสือ =====
    coverImage: {
      url: {
        type: String,
        default: "/images/default-cover.png",
      },
      public_id: {
        type: String,
        default: null,
      },
    },

    coverHash: {
      type: String,
      unique: true,
      sparse: true, // allow null
    },

    // ===== PDF ต้นฉบับ =====
    pdfFile: {
      url: {
        type: String,
        required: true,
      },
      public_id: {
        type: String,
        required: true,
      },
    },

    pdfHash: {
      type: String,
      unique: true,
      required: true,
    },

    // ===== Flipbook pages =====
    pages: {
      type: [pageSchema],
      default: [],
    },

    totalPages: {
      type: Number,
      default: 0,
    },

    // pdf = มาจาก PDF, image = อัปโหลดเป็นรูปตรง
    sourceType: {
      type: String,
      enum: ["pdf", "image"],
      default: "pdf",
    },

    // processing = กำลังแปลง, ready = อ่านได้, error = แปลงพัง
    status: {
      type: String,
      enum: ["processing", "ready", "error"],
      default: "processing",
      index: true,
    },

    // ===== ผู้เพิ่มหนังสือ =====
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// ===== Normalize title ทุกครั้งก่อน save =====
bookSchema.pre("save", async function () {
  if (this.title) {
    this.titleNormalized = this.title
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[-_.]/g, "")
      .trim();
  }
});

module.exports = mongoose.model("Book", bookSchema);
