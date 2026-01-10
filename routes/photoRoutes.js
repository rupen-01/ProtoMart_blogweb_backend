const express = require('express');
const router = express.Router();
const photoController = require('../controllers/photoController');
const { protect, optionalAuth } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

// ---------- STATIC ROUTES FIRST ----------
router.get('/home', photoController.getHomePhotos);
router.get('/my-photos', protect, photoController.getMyPhotos);
router.get('/nearby', optionalAuth, photoController.getNearbyPhotos);
router.get('/places-with-photos', optionalAuth, photoController.getPlacesWithPhotos);

// ---------- UPLOAD ----------
router.post(
  '/upload',
  protect,
  upload.any(), // OLD frontend support
  photoController.bulkUpload
);

// ---------- DYNAMIC LAST ----------
router.get('/', optionalAuth, photoController.getPhotos);
router.get('/:id', optionalAuth, photoController.getPhoto);

router.delete('/:id', protect, photoController.deletePhoto);
router.post('/:id/like', protect, photoController.toggleLike);

module.exports = router;
