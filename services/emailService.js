const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(email, name, token) {
    const verificationUrl = `${process.env.BASE_URL}/api/auth/verify-email/${token}`;

    const mailOptions = {
      from: `"Travel Photos" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Verify Your Email - Travel Photos',
      html: `
        <h1>Welcome ${name}!</h1>
        <p>Thank you for registering with Travel Photos.</p>
        <p>Please click the link below to verify your email:</p>
        <a href="${verificationUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email</a>
        <p>Or copy this link: ${verificationUrl}</p>
        <p>This link will expire in 24 hours.</p>
      `
    };

    return this.transporter.sendMail(mailOptions);
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email, name, token) {
    const resetUrl = `${process.env.BASE_URL}/reset-password/${token}`;

    const mailOptions = {
      from: `"Travel Photos" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Reset Your Password - Travel Photos',
      html: `
        <h1>Hello ${name}</h1>
        <p>You requested to reset your password.</p>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}" style="background-color: #2196F3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
        <p>Or copy this link: ${resetUrl}</p>
        <p>This link will expire in 30 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `
    };

    return this.transporter.sendMail(mailOptions);
  }

  /**
   * Send photo approval notification
   */
  async sendPhotoApprovedEmail(email, name, photoId) {
    const photoUrl = `${process.env.BASE_URL}/photos/${photoId}`;

    const mailOptions = {
      from: `"Travel Photos" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your Photo Has Been Approved! 🎉',
      html: `
        <h1>Great News ${name}!</h1>
        <p>Your photo has been approved and is now live on Travel Photos.</p>
        <p>You've earned 1 Rs reward in your wallet! 💰</p>
        <a href="${photoUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Photo</a>
        <p>Keep uploading amazing travel photos!</p>
      `
    };

    return this.transporter.sendMail(mailOptions);
  }
}

module.exports = new EmailService();