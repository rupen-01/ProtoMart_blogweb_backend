const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

// All routes are protected
router.use(protect);

router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.post('/profile-photo', upload.single('photo'), userController.uploadProfilePhoto);
router.delete('/profile-photo', userController.deleteProfilePhoto);
router.get('/wallet', userController.getWallet);
router.get('/transactions', userController.getTransactions);

module.exports = router;