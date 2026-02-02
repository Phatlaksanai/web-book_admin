const mongoose = require("mongoose");

const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    titleNormalized: { // กันชื่อซ้ำแบบไม่สนตัวใหญ่เล็ก
      type: String,
      unique: true,
      required: true,
    },

    bookCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    detail: {
      type: String,
      required: true,
      trim: true,
    },

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

    pdfFile: {
      url: String,
      public_id: String,
    },

    coverHash: {  // hash ปกห้ามซ้ำ
      type: String,
      unique: true,
      sparse: true, // allow null
    },

    pdfHash: {  // hash pdf ห้ามซ้ำ
      type: String,
      unique: true,
      required: true,
    },

    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    }
  },
  {
    timestamps: true, // ✅ สร้าง createdAt / updatedAt ให้อัตโนมัติ
  },
);

// ✅ Normalize title ก่อน save ทุกครั้ง
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
