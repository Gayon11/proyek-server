// File: server/utils/emailService.js

const nodemailer = require("nodemailer");

// Konfigurasi Transporter (Tukang Pos)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

// Fungsi kirim email (Text biasa atau dengan Attachment)
const sendEmail = async (to, subject, text, attachments = []) => {
  const mailOptions = {
    from: `"KP Platform System" <${process.env.MAIL_USER}>`,
    to: to,
    subject: subject,
    text: text,
    attachments: attachments, // Array file untuk fitur backup nanti
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Email terkirim ke: ${to}`);
    return true;
  } catch (error) {
    console.error("❌ Gagal kirim email:", error);
    return false;
  }
};

module.exports = sendEmail;
