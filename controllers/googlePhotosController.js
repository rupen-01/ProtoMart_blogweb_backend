const {
  googlePhotosService,
  googlePhotosJobStore,
} = require("../services/googlePhotosService");
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

    const {
      shareLink,
      latitude,
      longitude,
      placeId,
      experienceDate,
      experiencePerson,
      uploadedByPerson,
      experienceDescription,
      zipCode,
    } = req.body;
    const userId = req.user._id;

    if (!shareLink) {
      return res.status(400).json({
        success: false,
        message: "Album share link is required",
      });
    }

    const parsedLatitude = Number.parseFloat(latitude);
    const parsedLongitude = Number.parseFloat(longitude);
    const manualCoordinates =
      Number.isFinite(parsedLatitude) && Number.isFinite(parsedLongitude)
        ? {
            latitude: parsedLatitude,
            longitude: parsedLongitude,
          }
        : null;

    const { job, reused } = googlePhotosJobStore.createJob({
      userId,
      shareLink,
    });

    if (!reused) {
      googlePhotosService.startSyncJob(job.jobId, {
        userId,
        shareLink,
        manualCoordinates,
        placeId: placeId || null,
        metadata: {
          experienceDate: experienceDate || undefined,
          experiencePerson: experiencePerson || undefined,
          uploadedByPerson: uploadedByPerson || undefined,
          experienceDescription: experienceDescription || undefined,
          zipCode: zipCode || undefined,
        },
      });
    }

    return res.status(202).json({
      success: true,
      jobId: job.jobId,
      status: job.status,
      duplicate: reused,
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
 * Get Google Photos sync progress
 * GET /api/google-photos/progress/:jobId
 * USER AUTH REQUIRED
 */
exports.getSyncProgress = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { jobId } = req.params;
    const job = googlePhotosJobStore.getJob(jobId);

    if (!job || job.userId !== req.user._id.toString()) {
      return res.status(404).json({
        success: false,
        message: "Sync job not found",
      });
    }

    return res.json({
      success: true,
      jobId: job.jobId,
      status: job.status,
      progress: job.progress,
      processedImages: job.processedImages,
      totalImages: job.totalImages,
      error: job.error,
      results: job.results,
    });
  } catch (error) {
    console.error("Get sync progress error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get sync progress",
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
