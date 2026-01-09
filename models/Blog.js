// const mongoose = require('mongoose');

// const blogSchema = new mongoose.Schema({
//   authorId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true
//   },
//   placeId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Place',
//     required: true
//   },
//   title: {
//     type: String,
//     required: [true, 'Blog title is required'],
//     trim: true,
//     maxlength: 200
//   },
//   content: {
//     type: String,
//     required: [true, 'Blog content is required']
//   },
//   coverImage: String,
//   tags: [String],
//   status: {
//     type: String,
//     enum: ['draft', 'published'],
//     default: 'draft'
//   },
//   publishedAt: Date,
//   views: {
//     type: Number,
//     default: 0
//   },
//   likes: {
//     type: Number,
//     default: 0
//   }
// }, {
//   timestamps: true
// });

// // Indexes
// blogSchema.index({ placeId: 1, status: 1 });
// blogSchema.index({ authorId: 1 });
// blogSchema.index({ title: 'text', content: 'text', tags: 'text' });

// module.exports = mongoose.model('Blog', blogSchema);


const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  placeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Place',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true
  },

  // ✅ MULTIPLE COVER IMAGES
  coverImages: [
    {
      url: String,
      publicId: String
    }
  ],

  tags: [String],
  status: {
  type: String,
  enum: ['draft', 'published'],
  default: 'published' // ✅ DIRECT PUBLISH
},
publishedAt: {
  type: Date,
  default: Date.now
},

  views: { type: Number, default: 0 },
  likes: { type: Number, default: 0 }
}, { timestamps: true });

blogSchema.index({ title: 'text', content: 'text', tags: 'text' });

module.exports = mongoose.model('Blog', blogSchema);
