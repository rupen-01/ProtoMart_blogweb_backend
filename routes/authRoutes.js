const express = require("express");
const router = express.Router();
const passport = require("passport");
const authController = require("../controllers/authController");
const { protect } = require("../middlewares/authMiddleware");

// ====================
// Normal Auth Routes
// ====================
router.post("/register", authController.register);
router.post("/login", authController.login);
router.get("/verify-email/:token", authController.verifyEmail);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password/:token", authController.resetPassword);
router.post("/refresh-token", authController.refreshToken);
router.get("/getAllUsers", authController.getAllUsers);

// ====================
// Google Auth Routes
// ====================
router.get("/google", (req, res, next) => {
  console.log("Google auth route hit");
  next();
}, passport.authenticate("google", {
  scope: [
  "profile",
  "email",
  "https://www.googleapis.com/auth/photoslibrary.readonly"
]

}));


router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/login`
  }),
  authController.googleAuthSuccess
);

// ====================
// Protected Routes
// ====================
router.get("/me", protect, authController.getMe);

module.exports = router;
