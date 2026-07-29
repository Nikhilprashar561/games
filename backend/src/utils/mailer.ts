import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
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
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background-color: #000000;
          color: #ffffff;
          margin: 0;
          padding: 0;
          -webkit-font-smoothing: antialiased;
        }
        .wrapper {
          width: 100%;
          background-color: #000000;
          padding: 40px 10px;
        }
        .container {
          max-width: 520px;
          margin: 0 auto;
          background: #090d16;
          border-radius: 24px;
          overflow: hidden;
          border: 1px solid #1e293b;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.9);
        }
        .header {
          background-color: #0d1322;
          padding: 32px 20px 24px 20px;
          text-align: center;
          border-bottom: 1px solid #1e293b;
        }
        .brand-badge {
          display: inline-block;
          padding: 6px 16px;
          background: #10b9811f;
          border: 1px solid #10b98140;
          border-radius: 100px;
          color: #34d399;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          margin-bottom: 12px;
        }
        .header h1 {
          margin: 0;
          color: #ffffff;
          font-size: 26px;
          font-weight: 900;
          letter-spacing: 0.5px;
        }
        .content {
          padding: 40px 32px;
          text-align: center;
        }
        .greeting {
          font-size: 20px;
          font-weight: 800;
          color: #ffffff;
          margin-bottom: 14px;
        }
        .message {
          font-size: 14px;
          color: #cbd5e1;
          line-height: 1.6;
          margin-bottom: 30px;
        }
        /* IMPRESSIVE OTP BUTTON: CLEAN WHITE BACKGROUND WITH BOLD BLACK TEXT */
        .otp-button-card {
          background-color: #ffffff !important;
          color: #000000 !important;
          border-radius: 16px;
          padding: 22px 30px;
          display: inline-block;
          margin: 10px 0 25px 0;
          box-shadow: 0 10px 30px rgba(255, 255, 255, 0.18), 0 4px 12px rgba(0, 0, 0, 0.8);
          border: 2px solid #f1f5f9;
        }
        .otp-code {
          font-family: 'Courier New', Courier, monospace, monospace;
          letter-spacing: 16px;
          font-size: 38px;
          font-weight: 900;
          color: #000000 !important;
          margin-right: -16px; /* Offset last letter-spacing */
          line-height: 1;
        }
        .otp-subtext {
          font-size: 10px;
          font-weight: 800;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 2px;
          margin-top: 6px;
        }
        .expiry-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 8px 18px;
          background: #f59e0b1f;
          border: 1px solid #f59e0b40;
          border-radius: 12px;
          color: #fbbf24;
          font-size: 12px;
          font-weight: 700;
          margin-top: 10px;
        }
        .footer {
          background-color: #05070b;
          padding: 24px;
          text-align: center;
          font-size: 11px;
          color: #64748b;
          border-top: 1px solid #1e293b;
        }
        .footer a {
          color: #10b981;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="container">
          
          <!-- DARK HEADER -->
          <div class="header">
            <div class="brand-badge">⚡ Instant Verification</div>
            <h1>🎮 BAAZI BOARD ARENA</h1>
          </div>

          <!-- PURE DARK BODY CONTENT -->
          <div class="content">
            <div class="greeting">Hello ${userName}!</div>
            <div class="message">
              ${isEmailChange 
                ? 'You requested to update your email address on Baazi Board Arena. Copy the 4-digit verification code below to confirm your new email:' 
                : 'Enter the 4-digit secret verification code below to complete your login and jump into live multiplayer game rooms:'}
            </div>

            <!-- IMPRESSIVE WHITE BACKGROUND + BOLD BLACK TEXT OTP BUTTON -->
            <div class="otp-button-card">
              <div class="otp-code">${otp}</div>
              <div class="otp-subtext">4-Digit Security OTP</div>
            </div>

            <div>
              <div class="expiry-badge">⏳ Code valid for 10 minutes &bull; Keep Private</div>
            </div>
          </div>

          <!-- FOOTER -->
          <div class="footer">
            Baazi Board Gaming Arena &bull; Fair Play & Instant Multiplayer Rooms<br>
            © 2026 Baazi Board. All rights reserved.
          </div>

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
