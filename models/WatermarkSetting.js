// const mongoose = require('mongoose');

// const watermarkSettingSchema = new mongoose.Schema({
//   text: {
//     type: String,
//     required: true,
//     default: '© BodyCureHealth Travel'
//   },
//   fontFamily: {
//     type: String,
//     default: 'Arial'
//   },
//   fontSize: {
//     type: Number,
//     default: 24,
//     min: 10,
//     max: 100
//   },
//   color: {
//     type: String,
//     default: '#FFFFFF',
//     match: [/^#[0-9A-F]{6}$/i, 'Please enter a valid hex color']
//   },
//   position: {
//     x: {
//       type: Number,
//       default: 50, // percentage from left
//       min: 0,
//       max: 100
//     },
//     y: {
//       type: Number,
//       default: 90, // percentage from top
//       min: 0,
//       max: 100
//     }
//   },
//   opacity: {
//     type: Number,
//     default: 0.7,
//     min: 0,
//     max: 1
//   },
//   isActive: {
//     type: Boolean,
//     default: true
//   },
//   createdBy: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User'
//   }
// }, {
//   timestamps: true
// });

// module.exports = mongoose.model('WatermarkSetting', watermarkSettingSchema);


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