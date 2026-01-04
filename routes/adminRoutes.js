const express = require('express');
const router = express.Router();

const adminController = require('../controllers/adminController');
const { protect, admin } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware'); // 👈 watermark image ke liye

/**
 * =======================
 * ADMIN ROUTES
 * Must be logged in + admin
 * =======================
 */
router.use(protect);
router.use(admin);

/* ===================== PHOTOS ===================== */

// Get all pending photos (pagination)
router.get(
  '/photos/pending',
  adminController.getPendingPhotos
);

// Approve photo
router.post(
  '/photos/:id/approve',
  adminController.approvePhoto
);

// Reject photo
router.post(
  '/photos/:id/reject',
  adminController.rejectPhoto
);

/* ===================== WATERMARK ===================== */

// Get active watermark settings
router.get(
  '/watermark',
  adminController.getWatermarkSettings
);

/**
 * Update watermark settings
 * Supports:
 * - text watermark
 * - image watermark
 * - opacity
 * - x,y position
 */
router.put(
  '/watermark',
  upload.single('watermarkImage'), // 👈 OPTIONAL image upload
  adminController.updateWatermarkSettings
);

/* ===================== DASHBOARD ===================== */

// Admin dashboard stats
router.get(
  '/stats',
  adminController.getStats
);

module.exports = router;
