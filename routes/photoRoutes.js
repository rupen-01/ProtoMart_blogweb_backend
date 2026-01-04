const express = require('express');
const router = express.Router();
const photoController = require('../controllers/photoController');
const { protect, optionalAuth } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

// Public routes (with optional auth)
router.get('/my-photos', protect, photoController.getMyPhotos);
router.get('/', optionalAuth, photoController.getPhotos);
router.get('/nearby', optionalAuth, photoController.getNearbyPhotos);
router.get('/:id', optionalAuth, photoController.getPhoto);

// Protected routes
router.post('/upload', protect, upload.array('photo'), photoController.bulkUpload);
router.delete('/:id', protect, photoController.deletePhoto);
router.post('/:id/like', protect, photoController.toggleLike);

router.get('/home', photoController.getHomePhotos);


module.exports = router;