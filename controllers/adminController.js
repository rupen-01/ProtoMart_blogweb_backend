const Photo = require('../models/Photo');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const WatermarkSetting = require('../models/WatermarkSetting');

/**
 * Get all pending photos for approval
 * GET /api/admin/photos/pending
 */
exports.getPendingPhotos = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const photos = await Photo.find({ approvalStatus: 'pending' })
      .populate('userId', 'name email profilePhoto')
      .populate('placeId', 'name city state country')
      .sort({ createdAt: 1 }) // Oldest first
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Photo.countDocuments({ approvalStatus: 'pending' });

    res.json({
      success: true,
      data: photos,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalPhotos: total,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get pending photos error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending photos',
      error: error.message
    });
  }
};

/**
 * Approve photo
 * POST /api/admin/photos/:id/approve
 */
exports.approvePhoto = async (req, res) => {
  try {
    const photo = await Photo.findById(req.params.id);

    if (!photo) {
      return res.status(404).json({
        success: false,
        message: 'Photo not found'
      });
    }

    if (photo.approvalStatus === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Photo is already approved'
      });
    }

    // Update photo status
    photo.approvalStatus = 'approved';
    photo.approvedAt = new Date();
    photo.approvedBy = req.user._id;
    photo.rewardGiven = true;
    await photo.save();

    // Add reward to user wallet
    await User.findByIdAndUpdate(photo.userId, {
      $inc: { walletBalance: 1 }
    });

    // Create transaction record
    await Transaction.create({
      userId: photo.userId,
      amount: 1,
      type: 'reward',
      status: 'completed',
      description: 'Photo approved - Reward credited',
      photoId: photo._id
    });

    // Update place photo count if place exists
    if (photo.placeId) {
      await Place.findByIdAndUpdate(photo.placeId, {
        $inc: { photoCount: 1 }
      });
    }

    res.json({
      success: true,
      message: 'Photo approved successfully and reward credited',
      data: photo
    });

  } catch (error) {
    console.error('Approve photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve photo',
      error: error.message
    });
  }
};

/**
 * Reject photo
 * POST /api/admin/photos/:id/reject
 */
exports.rejectPhoto = async (req, res) => {
  try {
    const { reason } = req.body;
    const photo = await Photo.findById(req.params.id);

    if (!photo) {
      return res.status(404).json({
        success: false,
        message: 'Photo not found'
      });
    }

    if (photo.approvalStatus === 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'Photo is already rejected'
      });
    }

    photo.approvalStatus = 'rejected';
    photo.rejectionReason = reason || 'Does not meet quality standards';
    await photo.save();

    res.json({
      success: true,
      message: 'Photo rejected',
      data: photo
    });

  } catch (error) {
    console.error('Reject photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject photo',
      error: error.message
    });
  }
};

/**
 * Get/Update watermark settings
 */
exports.getWatermarkSettings = async (req, res) => {
  try {
    let settings = await WatermarkSetting.findOne({ isActive: true });

    if (!settings) {
      // Create default settings
      settings = await WatermarkSetting.create({
        text: '© BodyCureHealth Travel',
        fontFamily: 'Arial',
        fontSize: 24,
        color: '#FFFFFF',
        position: { x: 50, y: 90 },
        opacity: 0.7,
        isActive: true,
        createdBy: req.user._id
      });
    }

    res.json({
      success: true,
      data: settings
    });

  } catch (error) {
    console.error('Get watermark settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch watermark settings',
      error: error.message
    });
  }
};

exports.updateWatermarkSettings = async (req, res) => {
  try {
    const { text, fontFamily, fontSize, color, position, opacity } = req.body;

    // Deactivate all existing settings
    await WatermarkSetting.updateMany({}, { isActive: false });

    // Create new settings
    const settings = await WatermarkSetting.create({
      text,
      fontFamily: fontFamily || 'Arial',
      fontSize: fontSize || 24,
      color: color || '#FFFFFF',
      position: position || { x: 50, y: 90 },
      opacity: opacity !== undefined ? opacity : 0.7,
      isActive: true,
      createdBy: req.user._id
    });

    res.json({
      success: true,
      message: 'Watermark settings updated successfully',
      data: settings
    });

  } catch (error) {
    console.error('Update watermark settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update watermark settings',
      error: error.message
    });
  }
};

/**
 * Get admin dashboard stats
 * GET /api/admin/stats
 */
exports.getStats = async (req, res) => {
  try {
    const stats = {
      totalUsers: await User.countDocuments(),
      totalPhotos: await Photo.countDocuments(),
      pendingPhotos: await Photo.countDocuments({ approvalStatus: 'pending' }),
      approvedPhotos: await Photo.countDocuments({ approvalStatus: 'approved' }),
      rejectedPhotos: await Photo.countDocuments({ approvalStatus: 'rejected' }),
      totalRewardsGiven: await Transaction.countDocuments({ type: 'reward', status: 'completed' }),
      totalWalletBalance: (await User.aggregate([
        { $group: { _id: null, total: { $sum: '$walletBalance' } } }
      ]))[0]?.total || 0
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stats',
      error: error.message
    });
  }
};