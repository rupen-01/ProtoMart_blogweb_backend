const mongoose = require('mongoose');

const placeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      index: '2dsphere'
    }
  },
  city: String,
  state: String,
  country: {
    type: String,
    required: true
  },
  pinCode: String,
  photoCount: {
    type: Number,
    default: 0
  },
  totalViews: {
    type: Number,
    default: 0
  },
  description: String,
  coverPhoto: String
}, {
  timestamps: true
});

// Indexes
placeSchema.index({ name: 'text', city: 'text', state: 'text', country: 'text' });
placeSchema.index({ country: 1, state: 1, city: 1 });

module.exports = mongoose.model('Place', placeSchema);