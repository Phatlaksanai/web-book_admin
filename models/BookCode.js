const mongoose = require("mongoose");

const BookCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    unique: true,
    required: true,
  },
  bookId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Book"
  },
  bookTitle: {
    type: String,
    required: true,
  },
  used: {
    type: Boolean,
    default: false,
  },

  // ✅ เพิ่มตรงนี้
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
    default: null,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
  qrImage: {
      url: String,
      public_id: String,
    },
    barcodeImage: {
      url: String,
      public_id: String,
    },
  },
  { timestamps: true 
});

module.exports = mongoose.model("BookCode", BookCodeSchema);