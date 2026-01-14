const mongoose = require('mongoose');
const watermarkSettingSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['text', 'image'],
    default: 'text'
  },
  // Text watermark fields
  text: String,
  fontFamily: String,
  fontSize: Number,
  color: String,
  
  // Image watermark fields
  watermarkImageId: String,     // ✅ Cloudinary public_id
  watermarkImageUrl: String,    // ✅ Full URL for display
  
  // Common fields
  position: {
    x: { type: Number, default: 50 },
    y: { type: Number, default: 90 }
  },
  opacity: {
    type: Number,
    default: 0.7,
    min: 0,
    max: 1
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });
module.exports = mongoose.model('WatermarkSetting', watermarkSettingSchema);