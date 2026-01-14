const Photo = require("../models/Photo");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const WatermarkSetting = require("../models/WatermarkSetting");
const cloudinaryService = require("../services/cloudinaryService");

exports.getPendingPhotos = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const photos = await Photo.find({ approvalStatus: "pending" })
      .populate("userId", "name email profilePhoto")
      .populate("placeId", "name city state country")
      .sort({ createdAt: 1 }) // Oldest first
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Photo.countDocuments({ approvalStatus: "pending" });

    res.json({
      success: true,
      data: photos,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalPhotos: total,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Get pending photos error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch pending photos",
      error: error.message,
    });
  }
};

exports.approvePhoto = async (req, res) => {
  const photo = await Photo.findById(req.params.id);
  if (!photo) return res.status(404).json({ success: false });

  if (photo.approvalStatus === "approved") {
    return res
      .status(400)
      .json({ success: false, message: "Already approved" });
  }

  const rewardSetting = await RewardSetting.findOne({ isActive: true });
  const rewardAmount = rewardSetting?.photoApprovalReward || 0;

  photo.approvalStatus = "approved";
  photo.approvedAt = new Date();
  photo.approvedBy = req.user._id;
  photo.rewardGiven = rewardAmount > 0;
  photo.rewardAmount = rewardAmount; // 🔥 store amount
  await photo.save();

  if (rewardAmount > 0) {
    await User.findByIdAndUpdate(photo.userId, {
      $inc: { walletBalance: rewardAmount },
    });

    await Transaction.create({
      userId: photo.userId,
      amount: rewardAmount,
      type: "reward",
      status: "completed",
      description: `Photo approved - ₹${rewardAmount} credited`,
      photoId: photo._id,
    });
  }

  res.json({
    success: true,
    message: `Photo approved. Reward ₹${rewardAmount} credited`,
  });
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
        message: "Photo not found",
      });
    }

    if (photo.approvalStatus === "rejected") {
      return res.status(400).json({
        success: false,
        message: "Photo is already rejected",
      });
    }

    photo.approvalStatus = "rejected";
    photo.rejectionReason = reason || "Does not meet quality standards";
    await photo.save();

    res.json({
      success: true,
      message: "Photo rejected",
      data: photo,
    });
  } catch (error) {
    console.error("Reject photo error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reject photo",
      error: error.message,
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
      settings = await WatermarkSetting.create({
        type: "text",
        text: "© BodyCureHealth Travel",
        fontFamily: "Arial",
        fontSize: 24,
        color: "#FFFFFF",
        position: { x: 50, y: 90 },
        opacity: 0.7,
        isActive: true,
        createdBy: req.user._id,
      });
    }

    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error("Get watermark settings error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch watermark settings",
      error: error.message,
    });
  }
};

exports.updateWatermarkSettings = async (req, res) => {
  try {
    // ✅ Debug logging
    console.log("Request body:", req.body);
    console.log("Request file:", req.file);
    console.log("Request files:", req.files);

    const { type, text, fontFamily, fontSize, color, opacity, position } =
      req.body;

    let parsedPosition = { x: 50, y: 90 };
    if (position) {
      try {
        parsedPosition =
          typeof position === "string" ? JSON.parse(position) : position;
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: "Invalid position format",
        });
      }
    }

    let settings = await WatermarkSetting.findOne({ isActive: true });

    const updateData = {
      type,
      position: parsedPosition,
      opacity: opacity !== undefined ? parseFloat(opacity) : 0.7,
      isActive: true,
    };

    // ✅ Handle TEXT watermark
    if (type === "text") {
      updateData.text = text || "© BodyCureHealth Travel";
      updateData.fontFamily = fontFamily || "Arial";
      updateData.fontSize = parseInt(fontSize) || 24;
      updateData.color = color || "#FFFFFF";
    }
    // ✅ Handle IMAGE watermark
    else if (type === "image") {
      console.log("Image type selected, checking file..."); // Debug

      if (req.file) {
        console.log("New file found, uploading to Cloudinary..."); // Debug
        const uploadResult = await cloudinaryService.uploadMedia(
          req.file.buffer,
          req.file.mimetype,
          { folder: "watermarks" }
        );
        updateData.watermarkImageId = uploadResult.public_id;
        updateData.watermarkImageUrl = uploadResult.secure_url;
      } else if (settings?.watermarkImageId) {
        console.log("No new file, reusing existing image"); // Debug
        // Reuse existing image
        updateData.watermarkImageId = settings.watermarkImageId;
        updateData.watermarkImageUrl = settings.watermarkImageUrl;
      } else {
        console.log("No file and no existing image"); // Debug
        return res.status(400).json({
          success: false,
          message:
            "Please upload a watermark image or switch back to text mode",
        });
      }
    }

    if (settings) {
      Object.assign(settings, updateData);
      await settings.save();
    } else {
      updateData.createdBy = req.user._id;
      settings = await WatermarkSetting.create(updateData);
    }

    res.json({
      success: true,
      message: "Watermark settings updated successfully",
      data: settings,
    });
  } catch (error) {
    console.error("Update watermark settings error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update watermark settings",
      error: error.message,
    });
  }
};

/**
 * Get admin dashboard stats
 * GET /api/admin/stats
 */
exports.getStats = async (req, res) => {
  try {
    const rewardSum = await Transaction.aggregate([
      { $match: { type: "reward", status: "completed" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const stats = {
      totalUsers: await User.countDocuments(),
      totalPhotos: await Photo.countDocuments(),
      pendingPhotos: await Photo.countDocuments({ approvalStatus: "pending" }),
      approvedPhotos: await Photo.countDocuments({
        approvalStatus: "approved",
      }),
      rejectedPhotos: await Photo.countDocuments({
        approvalStatus: "rejected",
      }),
      totalRewardsGiven: rewardSum[0]?.total || 0,
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false });
  }
};

const RewardSetting = require("../models/RewardSetting");

exports.getRewardSetting = async (req, res) => {
  let setting = await RewardSetting.findOne({ isActive: true });

  if (!setting) {
    setting = await RewardSetting.create({
      photoApprovalReward: 1,
      updatedBy: req.user._id,
    });
  }

  res.json({ success: true, data: setting });
};

exports.updateRewardSetting = async (req, res) => {
  const { photoApprovalReward } = req.body;

  if (photoApprovalReward < 0) {
    return res.status(400).json({
      success: false,
      message: "Reward amount cannot be negative",
    });
  }

  await RewardSetting.updateMany({ isActive: true }, { isActive: false });

  const setting = await RewardSetting.create({
    photoApprovalReward,
    isActive: true,
    updatedBy: req.user._id,
  });

  res.json({
    success: true,
    message: "Reward amount updated",
    data: setting,
  });
};
