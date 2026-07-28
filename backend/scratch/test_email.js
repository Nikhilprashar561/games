const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'nikhilprashar561@gmail.com',
    pass: 'qxqvudnjiwkhaswo',
  },
  tls: {
    rejectUnauthorized: false,
  },
});

console.log('Testing Port 587 STARTTLS Gmail delivery...');

transporter.sendMail({
  from: '"Baazi Board Arena" <nikhilprashar561@gmail.com>',
  to: 'nikhilprashar561@gmail.com',
  subject: '🎮 Test Port 587 OTP - Baazi Board',
  text: 'Your test 4-digit OTP is 5678',
}, (err, info) => {
  if (err) {
    console.error('❌ Gmail Port 587 Error:', err);
  } else {
    console.log('✅ Email sent successfully via Port 587! MessageId:', info.messageId, 'Response:', info.response);
  }
});
