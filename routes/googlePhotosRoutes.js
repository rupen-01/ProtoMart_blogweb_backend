const express = require('express');
const router = express.Router();
const googlePhotosController = require('../controllers/googlePhotosController');
const { protect } = require('../middlewares/authMiddleware');

// All routes require authentication
router.use(protect);

// Validate album share link
router.post('/validate-link', googlePhotosController.validateLink);

// Sync photos from share link (NO OAUTH NEEDED)
router.post('/sync', googlePhotosController.syncFromLink);

// Get sync status
router.get('/sync-status', googlePhotosController.getSyncStatus);

module.exports = router;