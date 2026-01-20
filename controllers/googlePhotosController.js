const googlePhotosService = require("../services/googlePhotosService");
const Photo = require("../models/Photo");

/**
 * Validate share link
 * POST /api/google-photos/validate-link
 * USER AUTH REQUIRED (even though album is public)
 */
exports.validateLink = async (req, res) => {
  try {
    const { shareLink } = req.body;

    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!shareLink) {
      return res.status(400).json({
        success: false,
        message: "Share link is required",
      });
    }

    const validation = await googlePhotosService.validateShareLink(shareLink);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message:
          validation.error ||
          "Invalid album link. Make sure the album is publicly shared.",
      });
    }

    res.json({
      success: true,
      message: "Album link is valid",
      data: {
        title: validation.title,
      },
    });
  } catch (error) {
    console.error("Validate link error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to validate link",
    });
  }
};

/**
 * Sync photos from PUBLIC Google Photos share link
 * POST /api/google-photos/sync
 * USER AUTH REQUIRED
 */
exports.syncFromLink = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { shareLink } = req.body;
    const userId = req.user._id;

    if (!shareLink) {
      return res.status(400).json({
        success: false,
        message: "Album share link is required",
      });
    }

    const results = await googlePhotosService.syncFromShareLink(
      userId,
      shareLink
    );

    res.json({
      success: true,
      message: "Photos synced successfully",
      data: results,
    });
  } catch (error) {
    console.error("Sync from link error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to sync photos",
    });
  }
};

/**
 * Get Google Photos sync status
 * GET /api/google-photos/sync-status
 * USER AUTH REQUIRED
 */
exports.getSyncStatus = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const userId = req.user._id;

    const [totalSynced, pendingApproval, approved, rejected] =
      await Promise.all([
        Photo.countDocuments({ userId, source: "google_photos" }),
        Photo.countDocuments({
          userId,
          source: "google_photos",
          approvalStatus: "pending",
        }),
        Photo.countDocuments({
          userId,
          source: "google_photos",
          approvalStatus: "approved",
        }),
        Photo.countDocuments({
          userId,
          source: "google_photos",
          approvalStatus: "rejected",
        }),
      ]);

    res.json({
      success: true,
      data: {
        totalSynced,
        pendingApproval,
        approved,
        rejected,
      },
    });
  } catch (error) {
    console.error("Get sync status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get sync status",
    });
  }
};
