const User = require('../models/User');
const Transaction = require('../models/Transaction');
const cloudinaryService = require('../services/cloudinaryService');
const geocodingService = require('../services/geocodingService');

/**
 * Get user profile
 * GET /api/users/profile
 */
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: error.message
    });
  }
};

/**
 * Update user profile
 * PUT /api/users/profile
 */
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, dateOfBirth, pinCode } = req.body;
    const userId = req.user._id;

    const updateData = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (dateOfBirth) updateData.dateOfBirth = dateOfBirth;

    // If pin code is updated, fetch new address
    if (pinCode && pinCode !== req.user.pinCode) {
      const pinCodeDetails = await geocodingService.getPinCodeDetails(pinCode);
      if (pinCodeDetails) {
        updateData.pinCode = pinCode;
        updateData.address = {
          fullAddress: pinCodeDetails.fullAddress,
          city: pinCodeDetails.city,
          state: pinCodeDetails.state,
          country: pinCodeDetails.country
        };
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid pin code'
        });
      }
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
};

/**
 * Upload profile photo
 * POST /api/users/profile-photo
 */
exports.uploadProfilePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a photo'
      });
    }

    const userId = req.user._id;

    // Delete old profile photo if exists
    if (req.user.profilePhoto) {
      try {
        const cloudinaryId = req.user.profilePhoto.split('/').pop().split('.')[0];
        await cloudinaryService.deletePhoto(`${process.env.CLOUDINARY_FOLDER}/profiles/${cloudinaryId}`);
      } catch (error) {
        console.error('Error deleting old profile photo:', error);
      }
    }

    // Upload new photo
    const result = await cloudinaryService.uploadPhoto(req.file.buffer, {
      folder: `${process.env.CLOUDINARY_FOLDER}/profiles`,
      transformation: [
        { width: 400, height: 400, crop: 'fill' },
        { quality: 'auto:good' }
      ]
    });

    // Update user
    const user = await User.findByIdAndUpdate(
      userId,
      { profilePhoto: result.secure_url },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Profile photo updated successfully',
      data: {
        profilePhoto: user.profilePhoto
      }
    });

  } catch (error) {
    console.error('Upload profile photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload profile photo',
      error: error.message
    });
  }
};

/**
 * Delete profile photo
 * DELETE /api/users/profile-photo
 */
exports.deleteProfilePhoto = async (req, res) => {
  try {
    const userId = req.user._id;

    if (req.user.profilePhoto) {
      try {
        const cloudinaryId = req.user.profilePhoto.split('/').pop().split('.')[0];
        await cloudinaryService.deletePhoto(`${process.env.CLOUDINARY_FOLDER}/profiles/${cloudinaryId}`);
      } catch (error) {
        console.error('Error deleting profile photo:', error);
      }
    }

    await User.findByIdAndUpdate(userId, { profilePhoto: null });

    res.json({
      success: true,
      message: 'Profile photo deleted successfully'
    });

  } catch (error) {
    console.error('Delete profile photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete profile photo',
      error: error.message
    });
  }
};

/**
 * Get wallet balance
 * GET /api/users/wallet
 */
exports.getWallet = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('walletBalance');

    res.json({
      success: true,
      data: {
        balance: user.walletBalance
      }
    });
  } catch (error) {
    console.error('Get wallet error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch wallet balance',
      error: error.message
    });
  }
};

/**
 * Get transaction history
 * GET /api/users/transactions
 */
exports.getTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const transactions = await Transaction.find({ userId: req.user._id })
      .populate('photoId', 'originalUrl thumbnailUrl placeName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Transaction.countDocuments({ userId: req.user._id });

    res.json({
      success: true,
      data: transactions,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalTransactions: total,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions',
      error: error.message
    });
  }
};