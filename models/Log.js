const mongoose = require("mongoose");

const LOGSchema = new mongoose.Schema(
  {
    level: {
      type: String,
      enum: ["info", "error", "warn"],
    },
    message: String,
    service: String,
    metadata: Object,
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { collection: "logForWeb" }
);

module.exports = mongoose.model("logForWeb", LOGSchema);