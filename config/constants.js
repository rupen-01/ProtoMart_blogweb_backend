module.exports = {
  // User roles
  USER_ROLES: {
    USER: 'user',
    ADMIN: 'admin',
    SUPERADMIN: 'superadmin'
  },

  // Photo approval status
  PHOTO_STATUS: {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected'
  },

  // Photo sources
  PHOTO_SOURCES: {
    DIRECT_UPLOAD: 'direct_upload',
    GOOGLE_PHOTOS: 'google_photos'
  },

  // Blog status
  BLOG_STATUS: {
    DRAFT: 'draft',
    PUBLISHED: 'published'
  },

  // Transaction types
  TRANSACTION_TYPES: {
    REWARD: 'reward',
    REDEMPTION: 'redemption',
    REFUND: 'refund'
  },

  // File upload limits
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif'],

  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,

  // Rewards
  PHOTO_APPROVAL_REWARD: 1, // 1 Rs per approved photo

  // Cloudinary folders
  CLOUDINARY_FOLDERS: {
    PHOTOS: 'travel-photos',
    PROFILES: 'profiles',
    BLOGS: 'blogs'
  }
};