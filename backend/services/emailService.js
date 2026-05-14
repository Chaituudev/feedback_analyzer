const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

async function sendAlertEmail(teacherEmail, teacherName, negativePercentage) {
  try {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: teacherEmail,
      subject: '⚠️ High Negative Feedback Alert',
      html: `<div style="font-family: Arial; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc3545;">Feedback Alert</h2>
        <p>Dear ${teacherName},</p>
        <div style="background-color: #fff3cd; padding: 1.5rem; border-left: 4px solid #ffc107;">
          <h3 style="color: #856404;">Alert: ${negativePercentage}% Negative Feedback</h3>
          <p>This exceeds the configured threshold. Please review student feedback on your dashboard.</p>
          <p><a href="${frontendUrl}" style="color:#0b3d91;">Open Dashboard</a></p>
        </div>
        <p style="font-size:0.9rem;color:#333;margin-top:12px;">If you believe this message is in error, please log in and review the feedback details.</p>
      </div>`
    };
    await transporter.sendMail(mailOptions);
    console.log(`✅ Alert email sent to ${teacherEmail}`);
  } catch (err) {
    console.error('Email failed:', err);
  }
}

module.exports = { sendAlertEmail };
