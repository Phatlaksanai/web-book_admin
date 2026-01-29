const OTP = require("../models/OTP");
const otpGenerator = require("otp-generator");
const sendOtpEmail = require("../utils/sendEmail");

exports.addAdmin = async (req, res) => {
  try {
    console.log("BODY:", req.body); // 👈 สำคัญมาก

    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const otpCode = otpGenerator.generate(6, {
      digits: true,
      alphabets: false,
      upperCase: false,
      specialChars: false,
    });

    await OTP.create({
      email,
      otp: otpCode,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    await sendOtpEmail(email, otpCode);

    res.json({ message: "OTP sent to email" });
  } catch (err) {
    console.error("ADD ADMIN ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};
