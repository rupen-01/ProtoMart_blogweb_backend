// const multer = require('multer');

// // Memory storage - file buffer me store hoga
// const storage = multer.memoryStorage();

// // File filter - only images allow
// const fileFilter = (req, file, cb) => {
//   const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif'];
  
//   if (allowedTypes.includes(file.mimetype)) {
//     cb(null, true);
//   } else {
//     cb(new Error('Invalid file type. Only JPEG, PNG, and HEIC images are allowed.'), false);
//   }
// };

// // Multer configuration
// const upload = multer({
//   storage: storage,
//   limits: {
//     fileSize: 50 * 1024 * 1024, // 50MB max file size
//   },
//   fileFilter: fileFilter
// });

// module.exports = upload;


const multer = require('multer');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/heic',
    'image/heif',
    'video/mp4',
    'video/mov',
    'video/quicktime',
    'video/webm'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image & video files are allowed'), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB per file
  },
  fileFilter
});

module.exports = upload;
