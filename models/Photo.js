// const mongoose = require('mongoose');

// const photoSchema = new mongoose.Schema({
//   userId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true
//   },
//   // Cloudinary URLs
//   cloudinaryId: {
//     type: String,
//     required: true,
//     unique: true
//   },
//   originalUrl: {
//     type: String,
//     required: true
//   },
//   watermarkedUrl: {
//     type: String // Cloudinary transformation URL
//   },
//   thumbnailUrl: String,
//   mediumUrl: String,

//   fileName: {
//     type: String,
//     required: true
//   },
//   fileSize: {
//     type: Number,
//     required: true
//   },
//   dimensions: {
//     width: Number,
//     height: Number
//   },
//   mediaType: {
//   type: String,
//   enum: ['image', 'video'],
//   default: 'image'
// },

//   // Location data
//   location: {
//     type: {
//       type: String,
//       enum: ['Point'],
//       default: 'Point'
//     },
//     coordinates: {
//       type: [Number], // [longitude, latitude]
//       // index: '2dsphere'
//     }
//   },
//   placeId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Place'
//   },
//   placeName: String,
//   city: String,
//   state: String,
//   country: String,

//   // EXIF data
//   exifData: {
//     dateTaken: Date,
//     camera: String,
//     lens: String,
//     iso: Number,
//     aperture: String,
//     shutterSpeed: String,
//     focalLength: String
//   },

//   // Approval workflow
//   approvalStatus: {
//     type: String,
//     enum: ['pending', 'approved', 'rejected'],
//     default: 'pending'
//   },
//   rejectionReason: String,
//   approvedAt: Date,
//   approvedBy: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User'
//   },
//   rewardGiven: {
//     type: Boolean,
//     default: false
//   },

//   // Engagement metrics
//   views: {
//     type: Number,
//     default: 0
//   },
//   likes: {
//     type: Number,
//     default: 0
//   },

//   // Source tracking
//   source: {
//     type: String,
//     enum: ['direct_upload', 'google_photos', 'bulk_upload', 'admin_upload'],
//     default: 'direct_upload'
//   },
//   googlePhotoId: String,
//   googleAlbumId: String
// }, {
//   timestamps: true
// });

// // Indexes for faster queries
// photoSchema.index({ userId: 1, approvalStatus: 1 });
// photoSchema.index({ placeId: 1, approvalStatus: 1 });
// photoSchema.index({ approvalStatus: 1, createdAt: -1 });
// photoSchema.index({ 'location': '2dsphere' });
// photoSchema.index({ cloudinaryId: 1 });

// module.exports = mongoose.model('Photo', photoSchema);

// const mongoose = require('mongoose');

// const photoSchema = new mongoose.Schema(
//   {
//     userId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'User',
//       required: true
//     },

//     // Cloudinary URLs
//     cloudinaryId: {
//       type: String,
//       required: true,
//       unique: true
//     },
//     originalUrl: {
//       type: String,
//       required: true
//     },
//     watermarkedUrl: {
//       type: String // Cloudinary transformation URL
//     },
//     thumbnailUrl: String,
//     mediumUrl: String,

//     fileName: {
//       type: String,
//       required: true
//     },
//     fileSize: {
//       type: Number,
//       required: true
//     },
//     mimeType: String,
//     dimensions: {
//       width: Number,
//       height: Number
//     },
//     mediaType: {
//       type: String,
//       enum: ['image', 'video'],
//       default: 'image'
//     },

//     // Location data
//     location: {
//       type: {
//         type: String,
//         enum: ['Point']
//         // NOTE: yahan default: 'Point' hata diya hai,
//         // taki bina coordinates ke location object na create ho
//       },
//       coordinates: {
//         type: [Number] // [longitude, latitude]
//       }
//     },
//     placeId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'Place'
//     },
//     placeName: String,
//     city: String,
//     state: String,
//     country: String,

//     // EXIF data
//     exifData: {
//       dateTaken: Date,
//       camera: String,
//       lens: String,
//       iso: Number,
//       aperture: String,
//       shutterSpeed: String,
//       focalLength: String
//     },

//     // Approval workflow
//     approvalStatus: {
//       type: String,
//       enum: ['pending', 'approved', 'rejected'],
//       default: 'pending'
//     },
//     rejectionReason: String,
//     approvedAt: Date,
//     approvedBy: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'User'
//     },
//     rewardGiven: {
//       type: Boolean,
//       default: false
//     },

//     // Engagement metrics
//     views: {
//       type: Number,
//       default: 0
//     },
//     likes: {
//       type: Number,
//       default: 0
//     },

//     // Source tracking
//     source: {
//       type: String,
//       enum: ['direct_upload', 'google_photos', 'bulk_upload', 'admin_upload'],
//       default: 'direct_upload'
//     },
//     googlePhotoId: String,
//     googleAlbumId: String
//   },
//   {
//     timestamps: true
//   }
// );

// // Indexes for faster queries
// photoSchema.index({ userId: 1, approvalStatus: 1 });
// photoSchema.index({ placeId: 1, approvalStatus: 1 });
// photoSchema.index({ approvalStatus: 1, createdAt: -1 });
// photoSchema.index({ location: '2dsphere' });
// photoSchema.index({ cloudinaryId: 1 });

// module.exports = mongoose.model('Photo', photoSchema);
const mongoose = require("mongoose");

const photoSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    cloudinaryId: { type: String, required: true, unique: true },
    originalUrl: { type: String, required: true },
    watermarkedUrl: {
      type: String,
    },
    fileName: String,
    fileSize: Number,
    mimeType: String,

    mediaType: { type: String, enum: ["image", "video"], default: "image" },

    location: {
      type: {
        type: String,
        enum: ["Point"],
      },
      coordinates: {
        type: [Number],
        validate: {
          validator: (v) =>
            !v ||
            (v.length === 2 &&
              v[0] >= -180 &&
              v[0] <= 180 &&
              v[1] >= -90 &&
              v[1] <= 90),
          message: "Invalid Geo coordinates",
        },
      },
    },

    placeId: { type: mongoose.Schema.Types.ObjectId, ref: "Place" },
    placeName: String,
    city: String,
    state: String,
    country: String,

    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    rewardGiven: {
      type: Boolean,
      default: false,
    },
    rewardAmount: {
      type: Number,
      default: 0,
    },
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },

    // ✅ FIXED: Added 'google_photos' to the source enum
    source: {
      type: String,
      enum: ["direct_upload", "bulk_upload", "admin_upload", "google_photos"],
      default: "direct_upload",
    },

    // ✅ ADDED: Fields for Google Photos sync
    googlePhotoId: {
      type: String,
      sparse: true, // Allows null values, creates index only for non-null
      index: true
    },

    // ✅ ADDED: Store EXIF data from photos
    exifData: {
      type: Object,
      default: {}
    },

    experienceDate: {
  type: Date,
},
experiencePerson: {
  type: String,
  trim: true
},
uploadedByPerson: {
  type: String,
  trim: true
},
experienceDescription: {
  type: String,
  trim: true
},
zipCode: {
  type: String,
  trim: true
},
    // ✅ ADDED: Dimensions for better display
    dimensions: {
      width: Number,
      height: Number
    },
  },
  { timestamps: true }
);

// Add this AFTER schema definition
photoSchema.index({
  placeName: "text",
  city: "text",
  state: "text",
  country: "text",
});

photoSchema.index({ location: "2dsphere" });
photoSchema.index({ approvalStatus: 1, createdAt: -1 });

// ✅ ADDED: Index for Google Photos sync tracking
photoSchema.index({ userId: 1, googlePhotoId: 1 });
photoSchema.index({ source: 1, createdAt: -1 });

module.exports = mongoose.model("Photo", photoSchema);