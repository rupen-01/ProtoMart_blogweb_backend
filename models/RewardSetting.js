const mongoose = require('mongoose');

const rewardSettingSchema = new mongoose.Schema({
  photoApprovalReward: {
    type: Number,
    default: 1,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

module.exports = mongoose.model('RewardSetting', rewardSettingSchema);
