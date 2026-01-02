const googlePhotosService = require('../services/googlePhotosService');
const Photo = require('../models/Photo');

/**
 * Validate share link
 * POST /api/google-photos/validate-link
 */
exports.validateLink = async (req, res) => {
  try {
    const { shareLink } = req.body;

    if (!shareLink) {
      return res.status(400).json({
        success: false,
        message: 'Share link is required'
      });
    }

    const validation = await googlePhotosService.validateShareLink(shareLink);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.error || 'Invalid album link. Make sure the album is publicly shared.'
      });
    }

    res.json({
      success: true,
      message: 'Album link is valid',
      data: {
        title: validation.title
      }
    });

  } catch (error) {
    console.error('Validate link error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate link',
      error: error.message
    });
  }
};

/**
 * Sync photos from share link (NO AUTH NEEDED)
 * POST /api/google-photos/sync
 */
exports.syncFromLink = async (req, res) => {
  try {
    const { shareLink } = req.body;
    const userId = req.user._id;

    if (!shareLink) {
      return res.status(400).json({
        success: false,
        message: 'Album share link is required'
      });
    }

    // Start sync process
    const results = await googlePhotosService.syncFromShareLink(userId, shareLink);

    res.json({
      success: true,
      message: 'Photos synced successfully',
      data: results
    });

  } catch (error) {
    console.error('Sync from link error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to sync photos',
      error: error.message
    });
  }
};

/**
 * Get sync status
 * GET /api/google-photos/sync-status
 */
exports.getSyncStatus = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const totalSynced = await Photo.countDocuments({
      userId,
      source: 'google_photos'
    });

    const pendingApproval = await Photo.countDocuments({
      userId,
      source: 'google_photos',
      approvalStatus: 'pending'
    });

    const approved = await Photo.countDocuments({
      userId,
      source: 'google_photos',
      approvalStatus: 'approved'
    });

    const rejected = await Photo.countDocuments({
      userId,
      source: 'google_photos',
      approvalStatus: 'rejected'
    });

    res.json({
      success: true,
      data: {
        totalSynced,
        pendingApproval,
        approved,
        rejected
      }
    });

  } catch (error) {
    console.error('Get sync status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get sync status',
      error: error.message
    });
  }
};