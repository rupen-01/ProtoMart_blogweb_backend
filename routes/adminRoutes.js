const express = require('express');
const router = express.Router();

const adminPhotoController = require('../controllers/adminController');
const { protect, admin } = require('../middlewares/authMiddleware');

/**
 * All admin routes
 * Must be logged in + admin
 */
router.use(protect);
router.use(admin);

/* ===================== PHOTOS ===================== */

// Get all pending photos (pagination)
router.get(
  '/photos/pending',
  adminPhotoController.getPendingPhotos
);

// Approve photo
router.post(
  '/photos/:id/approve',
  adminPhotoController.approvePhoto
);

// Reject photo
router.post(
  '/photos/:id/reject',
  adminPhotoController.rejectPhoto
);

/* ===================== WATERMARK ===================== */

// Get active watermark settings
router.get(
  '/watermark',
  adminPhotoController.getWatermarkSettings
);

// Update watermark settings
router.put(
  '/watermark',
  adminPhotoController.updateWatermarkSettings
);

/* ===================== DASHBOARD ===================== */

// Admin dashboard stats
router.get(
  '/stats',
  adminPhotoController.getStats
);

module.exports = router;
