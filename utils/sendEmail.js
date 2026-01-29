const nodemailer = require("nodemailer");

const sendOtpEmail = async (email) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: `"Admin Register" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Your Register to Web Admin",
    text: `https://register-web-book-startup.onrender.com`,
  };

  await transporter.sendMail(mailOptions);

  console.log("✅ OTP sent to email:", email);
};

module.exports = sendOtpEmail;
