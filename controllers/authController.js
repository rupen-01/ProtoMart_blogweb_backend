const User = require("../models/User");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const emailService = require("../services/emailService");
const geocodingService = require("../services/geocodingService");

/**
 * Generate JWT Token
 */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

/**
 * Generate Refresh Token
 */
const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE,
  });
};

/**
 * =========================
 * REGISTER
 * =========================
 */
exports.register = async (req, res) => {
  try {
    const { name, email, password, phone, dateOfBirth, pinCode } = req.body;
    const normalizedEmail = email.toLowerCase();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    let addressData = {};
    if (pinCode) {
      const pinData = await geocodingService.getPinCodeDetails(pinCode);
      if (pinData) {
        addressData = {
          fullAddress: pinData.fullAddress,
          city: pinData.city,
          state: pinData.state,
          country: pinData.country,
        };
      }
    }

    const user = await User.create({
      name,
      email: normalizedEmail,
      password,
      phone,
      dateOfBirth,
      pinCode,
      address: addressData,
    });

    const verificationToken = crypto.randomBytes(20).toString("hex");

    user.emailVerificationToken = crypto
      .createHash("sha256")
      .update(verificationToken)
      .digest("hex");

    await user.save();

    await emailService.sendVerificationEmail(
      user.email,
      user.name,
      verificationToken
    );

    res.status(201).json({
      success: true,
      message: "User registered successfully. Please verify your email.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Registration failed",
      error: error.message,
    });
  }
};

/**
 * =========================
 * LOGIN
 * =========================
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({
      email: email.toLowerCase(),
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    if (user.provider === "google") {
      return res.status(400).json({
        success: false,
        message: "Please login using Google",
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    res.json({
      success: true,
      data: {
        user,
        token,
        refreshToken,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Login failed",
      error: error.message,
    });
  }
};

/**
 * =========================
 * GOOGLE AUTH SUCCESS
 * =========================
 */
exports.googleAuthSuccess = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/login?error=google_failed`
      );
    }

    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    res.redirect(
      `${process.env.FRONTEND_URL}/google-auth-success?token=${token}&refreshToken=${refreshToken}`
    );
  } catch (error) {
    res.redirect(
      `${process.env.FRONTEND_URL}/login?error=server_error`
    );
  }
};

/**
 * =========================
 * GET ME
 * =========================
 */
exports.getMe = async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json({ success: true, data: user });
};

/**
 * =========================
 * VERIFY EMAIL
 * =========================
 */
exports.verifyEmail = async (req, res) => {
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
  });

  if (!user) {
    return res.status(400).json({
      success: false,
      message: "Invalid or expired token",
    });
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  await user.save();

  res.json({
    success: true,
    message: "Email verified successfully",
  });
};

/**
 * =========================
 * FORGOT PASSWORD
 * =========================
 */
exports.forgotPassword = async (req, res) => {
  const user = await User.findOne({ email: req.body.email.toLowerCase() });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  const resetToken = crypto.randomBytes(20).toString("hex");

  user.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  user.resetPasswordExpire = Date.now() + 30 * 60 * 1000;
  await user.save();

  await emailService.sendPasswordResetEmail(
    user.email,
    user.name,
    resetToken
  );

  res.json({
    success: true,
    message: "Password reset link sent to email",
  });
};

/**
 * =========================
 * RESET PASSWORD
 * =========================
 */
exports.resetPassword = async (req, res) => {
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).json({
      success: false,
      message: "Invalid or expired token",
    });
  }

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  res.json({
    success: true,
    message: "Password reset successful",
  });
};

/**
 * =========================
 * REFRESH TOKEN
 * =========================
 */
exports.refreshToken = async (req, res) => {
  try {
    const decoded = jwt.verify(
      req.body.refreshToken,
      process.env.JWT_REFRESH_SECRET
    );

    const token = generateToken(decoded.id);
    const refreshToken = generateRefreshToken(decoded.id);

    res.json({
      success: true,
      data: { token, refreshToken },
    });
  } catch {
    res.status(401).json({
      success: false,
      message: "Invalid refresh token",
    });
  }
};
