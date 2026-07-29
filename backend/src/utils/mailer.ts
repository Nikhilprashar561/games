import dotenv from 'dotenv';

dotenv.config();

/**
 * Nodemailer disabled for preview mode as requested.
 * Logs OTP to backend console & allows instant verification without external email service dependency.
 */
export const sendOTPEmail = async (toEmail: string, otp: string, userName: string = 'Gamer', isEmailChange: boolean = false) => {
  console.log(`\n======================================================`);
  console.log(`🔑 [PREVIEW MODE - NODEMAILER DISABLED] OTP for ${toEmail}: ${otp}`);
  console.log(`======================================================\n`);
  return true;
};
