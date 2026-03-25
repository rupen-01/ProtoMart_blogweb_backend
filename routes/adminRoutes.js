const express = require('express');
const router = express.Router();

const adminController = require('../controllers/adminController');
const { protect, admin } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

router.get('/watermark', adminController.getWatermarkSettings);

router.put(
  '/watermark',
  upload.single('watermarkImage'),
  adminController.updateWatermarkSettings
);

router.use(protect);
router.use(admin);

router.get('/photos/pending', adminController.getPendingPhotos);

router.post('/photos/:id/approve', adminController.approvePhoto);

router.post('/photos/:id/reject', adminController.rejectPhoto);

router.get('/stats', adminController.getStats);

router.get('/rewards/settings', adminController.getRewardSetting);

router.put('/rewards/settings', adminController.updateRewardSetting);

module.exports = router;