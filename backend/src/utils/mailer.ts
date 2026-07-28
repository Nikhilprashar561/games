import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// High-Speed Pooled Connection Transport for Gmail SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  pool: true, // Enable TCP Connection Pooling for Instant Email Delivery!
  maxConnections: 5,
  maxMessages: 100,
  connectionTimeout: 5000, // Fast 5s timeouts
  greetingTimeout: 5000,
  socketTimeout: 5000,
  auth: {
    user: process.env.NODEMAILER_GMAIL || 'nikhilprashar561@gmail.com',
    pass: process.env.NODEMAILER_GMAIL_PASS || 'qxqvudnjiwkhaswo',
  },
});

export const sendOTPEmail = async (toEmail: string, otp: string, userName: string = 'Gamer', isEmailChange: boolean = false) => {
  const subjectTitle = isEmailChange
    ? `🎮 Baazi Board Email Update OTP: ${otp}`
    : `🎮 Your Baazi Board Login OTP: ${otp} - Enter the Arena!`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #05070b;
          color: #ffffff;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 550px;
          margin: 30px auto;
          background: #0f172a;
          border-radius: 20px;
          overflow: hidden;
          border: 1px solid #1e293b;
          box-shadow: 0 20px 40px rgba(0,0,0,0.5);
        }
        .header {
          background: linear-gradient(135deg, #065f46 0%, #047857 100%);
          padding: 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          color: #ffffff;
          font-size: 26px;
          font-weight: 900;
          letter-spacing: 1px;
        }
        .content {
          padding: 35px 30px;
          text-align: center;
        }
        .greeting {
          font-size: 18px;
          font-weight: 700;
          color: #e2e8f0;
          margin-bottom: 12px;
        }
        .message {
          font-size: 14px;
          color: #94a3b8;
          line-height: 1.6;
          margin-bottom: 25px;
        }
        .otp-box {
          background: #1e293b;
          border: 2px stroke #10b981;
          border-radius: 16px;
          padding: 20px;
          display: inline-block;
          margin: 15px 0;
          letter-spacing: 12px;
          font-size: 34px;
          font-weight: 900;
          color: #34d399;
          box-shadow: inset 0 2px 8px rgba(0,0,0,0.5);
        }
        .expiry {
          font-size: 12px;
          color: #f59e0b;
          font-weight: 700;
          margin-top: 15px;
        }
        .footer {
          background-color: #090d16;
          padding: 20px;
          text-align: center;
          font-size: 11px;
          color: #64748b;
          border-top: 1px solid #1e293b;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎮 BAAZI BOARD ARENA</h1>
        </div>
        <div class="content">
          <div class="greeting">Hello ${userName}!</div>
          <div class="message">
            ${isEmailChange 
              ? 'You requested to update your email address on Baazi Board. Enter the 4-digit OTP below to verify your new email:' 
              : 'Enter the 4-digit secret verification OTP below to log in and join live multiplayer arenas:'}
          </div>

          <div class="otp-box">${otp}</div>

          <div class="expiry">⏳ Valid for 10 minutes only. Do not share this code.</div>
        </div>
        <div class="footer">
          Baazi Board Gaming Arena • Fair Play & Instant Multiplayer Rooms<br>
          © 2026 Baazi Board. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"Baazi Board Arena" <${process.env.NODEMAILER_GMAIL || 'nikhilprashar561@gmail.com'}>`,
      to: toEmail,
      subject: subjectTitle,
      html: htmlContent,
    });
    console.log(`✉️ OTP Email sent successfully to ${toEmail}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send OTP email via Nodemailer:', error);
    return false;
  }
};
