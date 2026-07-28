const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'nikhilprashar561@gmail.com',
    pass: 'qxqvudnjiwkhaswo',
  },
});

console.log('Sending test email via Gmail SMTP...');

transporter.sendMail({
  from: '"Baazi Board Arena" <nikhilprashar561@gmail.com>',
  to: 'nikhilprashar561@gmail.com',
  subject: '🎮 Test OTP Email - Baazi Board',
  text: 'Your test 4-digit OTP is 1234',
}, (err, info) => {
  if (err) {
    console.error('❌ Gmail SMTP Error:', err);
  } else {
    console.log('✅ Email sent successfully! MessageId:', info.messageId, 'Response:', info.response);
  }
});
