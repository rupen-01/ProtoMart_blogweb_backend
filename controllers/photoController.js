const Photo = require('../models/Photo');
const User = require('../models/User');
const Place = require('../models/Place');
const Transaction = require('../models/Transaction');
const WatermarkSetting = require('../models/WatermarkSetting');
const cloudinaryService = require('../services/cloudinaryService');
const geocodingService = require('../services/geocodingService');

/**
 * Upload single photo
 * POST /api/photos/upload
 */
// exports.uploadPhoto = async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({
//         success: false,
//         message: 'Please upload a photo'
//       });
//     }

//     const userId = req.user._id;
//     const fileBuffer = req.file.buffer;
    
//     // Get manual coordinates from request body (from map click)
//     const manualLat = req.body.latitude;
//     const manualLng = req.body.longitude;
    
//     let coordinates = null;
    
//     // Prioritize manual coordinates over EXIF
//     if (manualLat && manualLng) {
//       coordinates = [parseFloat(manualLng), parseFloat(manualLat)];
//     } else {
//       // Only use EXIF if no manual coordinates provided
//       const exifResult = cloudinaryService.extractExifData(fileBuffer);
//       if (exifResult.coordinates && exifResult.coordinates[0] && exifResult.coordinates[1]) {
//         coordinates = exifResult.coordinates;
//       }
//     }

//     // Extract EXIF data (without coordinates)
//     const { exifData } = cloudinaryService.extractExifData(fileBuffer);

//     // Upload to Cloudinary
//     const cloudinaryResult = await cloudinaryService.uploadPhoto(fileBuffer, {
//       folder: `${process.env.CLOUDINARY_FOLDER}/users/${userId}`
//     });

//     // Prepare photo data
//     const photoData = {
//       userId,
//       cloudinaryId: cloudinaryResult.public_id,
//       originalUrl: cloudinaryResult.secure_url,
//       fileName: req.file.originalname,
//       fileSize: cloudinaryResult.bytes,
//       dimensions: {
//         width: cloudinaryResult.width,
//         height: cloudinaryResult.height
//       },
//       mimeType: req.file.mimetype,
//       exifData,
//       source: 'direct_upload'
//     };

//     // If coordinates exist (manual or EXIF), process location
//     if (coordinates && coordinates[0] && coordinates[1]) {
//       photoData.location = {
//         type: 'Point',
//         coordinates: coordinates
//       };

//       try {
//         const locationData = await geocodingService.reverseGeocode(
//           coordinates[1], // latitude
//           coordinates[0]  // longitude
//         );

//         if (locationData) {
//           photoData.placeName = locationData.placeName;
//           photoData.city = locationData.city;
//           photoData.state = locationData.state;
//           photoData.country = locationData.country;

//           // Find or create Place
//           let place = await Place.findOne({
//             name: locationData.placeName,
//             'location.coordinates': {
//               $near: {
//                 $geometry: {
//                   type: 'Point',
//                   coordinates: coordinates
//                 },
//                 $maxDistance: 1000 // 1km radius
//               }
//             }
//           });

//           if (!place) {
//             place = await Place.create({
//               name: locationData.placeName,
//               location: {
//                 type: 'Point',
//                 coordinates: coordinates
//               },
//               city: locationData.city,
//               state: locationData.state,
//               country: locationData.country
//             });
//           }

//           photoData.placeId = place._id;
//         }
//       } catch (geoError) {
//         console.error('Geocoding error:', geoError);
//         // Continue without location data
//       }
//     }

//     // Create photo record
//     const photo = await Photo.create(photoData);

//     // Populate user and place data
//     await photo.populate('userId', 'name email profilePhoto');
//     if (photo.placeId) {
//       await photo.populate('placeId', 'name city state country');
//     }

//     res.status(201).json({
//       success: true,
//       message: 'Photo uploaded successfully. Waiting for approval.',
//       data: photo
//     });

//   } catch (error) {
//     console.error('Photo upload error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to upload photo',
//       error: error.message
//     });
//   }
// };

/**
 * Bulk upload images & videos
 * POST /api/photos/upload/bulk
 */
exports.bulkUpload = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please upload files'
      });
    }

    const userId = req.user._id;
    const uploadedPhotos = [];

    for (const file of req.files) {
      const cloudResult = await cloudinaryService.uploadMedia(
        file.buffer,
        file.mimetype,
        {
          folder: `${process.env.CLOUDINARY_FOLDER}/users/${userId}`
        }
      );

      const photo = await Photo.create({
        userId,
        cloudinaryId: cloudResult.public_id,
        originalUrl: cloudResult.secure_url,
        fileName: file.originalname,
        fileSize: cloudResult.bytes,
        mimeType: file.mimetype,
        mediaType: file.mimetype.startsWith('video') ? 'video' : 'image',
        source: 'bulk_upload'
      });

      uploadedPhotos.push(photo);
    }

    res.status(201).json({
      success: true,
      message: 'upload successful',
      count: uploadedPhotos.length,
      data: uploadedPhotos
    });

  } catch (error) {
    console.error('Bulk upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Bulk upload failed',
      error: error.message
    });
  }
};

/**
 * Get photo with watermark
 * GET /api/photos/:id
 */
exports.getPhoto = async (req, res) => {
  try {
    const photo = await Photo.findById(req.params.id)
      .populate('userId', 'name profilePhoto')
      .populate('placeId', 'name city state country');

    if (!photo) {
      return res.status(404).json({
        success: false,
        message: 'Photo not found'
      });
    }

    // Only show approved photos to non-owners
    if (photo.approvalStatus !== 'approved' && 
        photo.userId._id.toString() !== req.user?._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'This photo is not yet approved'
      });
    }

    // Get active watermark settings
    const watermarkSettings = await WatermarkSetting.findOne({ isActive: true });

    if (watermarkSettings) {
      // Generate watermarked URLs
      const variants = cloudinaryService.getPhotoVariants(
        photo.cloudinaryId,
        watermarkSettings
      );

      photo.watermarkedUrl = variants.original;
      photo.thumbnailUrl = variants.thumbnail;
      photo.mediumUrl = variants.medium;
    }

    // Increment view count
    await Photo.findByIdAndUpdate(photo._id, { $inc: { views: 1 } });

    res.json({
      success: true,
      data: photo
    });

  } catch (error) {
    console.error('Get photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch photo',
      error: error.message
    });
  }
};

/**
 * Get all photos with filters
 * GET /api/photos
 */
exports.getPhotos = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      placeId,
      userId,
      status = 'approved',
      sortBy = 'createdAt',
      order = 'desc'
    } = req.query;

    const query = { approvalStatus: status };

    if (placeId) query.placeId = placeId;
    if (userId) query.userId = userId;

    const skip = (page - 1) * limit;
    const sortOrder = order === 'desc' ? -1 : 1;

    const photos = await Photo.find(query)
      .populate('userId', 'name profilePhoto')
      .populate('placeId', 'name city state country')
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Photo.countDocuments(query);

    // Get active watermark settings
    const watermarkSettings = await WatermarkSetting.findOne({ isActive: true });

    // Add watermarked URLs to each photo
    if (watermarkSettings) {
      photos.forEach(photo => {
        const variants = cloudinaryService.getPhotoVariants(
          photo.cloudinaryId,
          watermarkSettings
        );
        photo.watermarkedUrl = variants.medium;
        photo.thumbnailUrl = variants.thumbnail;
      });
    }

    res.json({
      success: true,
      data: photos,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalPhotos: total,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get photos error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch photos',
      error: error.message
    });
  }
};
exports.getPhotosByCoordinates = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      placeId,
      userId,
      status = 'approved',
      sortBy = 'createdAt',
      order = 'desc'
    } = req.query;

    const query = { approvalStatus: status };

    query.location = { $exists: true, $ne: null };
    query['location.coordinates'] = { $exists: true, $ne: [] };

    if (placeId) query.placeId = placeId;
    if (userId) query.userId = userId;

    const skip = (page - 1) * limit;
    const sortOrder = order === 'desc' ? -1 : 1;

    const photos = await Photo.find(query)
      .populate('userId', 'name profilePhoto')
      .populate('placeId', 'name city state country')
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Photo.countDocuments(query);

    // Get active watermark settings
    const watermarkSettings = await WatermarkSetting.findOne({ isActive: true });

    // Add watermarked URLs to each photo
    if (watermarkSettings) {
      photos.forEach(photo => {
        const variants = cloudinaryService.getPhotoVariants(
          photo.cloudinaryId,
          watermarkSettings
        );
        photo.watermarkedUrl = variants.medium;
        photo.thumbnailUrl = variants.thumbnail;
      });
    }

    res.json({
      success: true,
      data: photos,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalPhotos: total,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get photos error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch photos',
      error: error.message
    });
  }
};

/**
 * Get photos by location (within radius)
 * GET /api/photos/nearby
 */
exports.getNearbyPhotos = async (req, res) => {
  try {
    const { latitude, longitude, radius = 5000 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const photos = await Photo.find({
      approvalStatus: 'approved',
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: parseInt(radius) // meters
        }
      }
    })
    .populate('userId', 'name profilePhoto')
    .populate('placeId', 'name city state country')
    .limit(50);

    res.json({
      success: true,
      count: photos.length,
      data: photos
    });

  } catch (error) {
    console.error('Get nearby photos error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch nearby photos',
      error: error.message
    });
  }
};

/**
 * Delete photo
 * DELETE /api/photos/:id
 */
exports.deletePhoto = async (req, res) => {
  try {
    const photo = await Photo.findById(req.params.id);

    if (!photo) {
      return res.status(404).json({
        success: false,
        message: 'Photo not found'
      });
    }

    // Check if user owns the photo or is admin
    if (photo.userId.toString() !== req.user._id.toString() && 
        req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this photo'
      });
    }

    // Delete from Cloudinary
    await cloudinaryService.deletePhoto(photo.cloudinaryId);

    // Delete from database
    await photo.deleteOne();

    // If reward was given, deduct from wallet
    if (photo.rewardGiven) {
      await User.findByIdAndUpdate(photo.userId, {
        $inc: { walletBalance: -1 }
      });

      await Transaction.create({
        userId: photo.userId,
        amount: -1,
        type: 'refund',
        description: 'Photo deleted - reward reversed',
        photoId: photo._id
      });
    }

    res.json({
      success: true,
      message: 'Photo deleted successfully'
    });

  } catch (error) {
    console.error('Delete photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete photo',
      error: error.message
    });
  }
};

/**
 * Like/Unlike photo
 * POST /api/photos/:id/like
 */
exports.toggleLike = async (req, res) => {
  try {
    const photo = await Photo.findById(req.params.id);

    if (!photo) {
      return res.status(404).json({
        success: false,
        message: 'Photo not found'
      });
    }

    // Toggle like (implement proper like tracking in separate collection if needed)
    await Photo.findByIdAndUpdate(photo._id, {
      $inc: { likes: 1 }
    });

    res.json({
      success: true,
      message: 'Photo liked'
    });

  } catch (error) {
    console.error('Like photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to like photo',
      error: error.message
    });
  }
};

/**
 * Get user's uploaded photos
 * GET /api/photos/my-photos
 */
exports.getMyPhotos = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;

    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const userId = req.user._id;
    const query = { userId };
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query.approvalStatus = status;
    }

    const skip = (page - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    const [photos, total] = await Promise.all([
      Photo.find(query)
        .populate('placeId', 'name city state country')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Photo.countDocuments(query)
    ]);

    // Generate Cloudinary URLs for each photo
    photos.forEach(photo => {
      const cloudinaryId = photo.cloudinaryId;
      const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
      
      // Generate different variants
      photo.thumbnailUrl = `https://res.cloudinary.com/${cloudName}/image/upload/w_400,h_300,c_fill,q_auto:good/${cloudinaryId}`;
      
      photo.watermarkedUrl = `https://res.cloudinary.com/${cloudName}/image/upload/co_3148a5,g_south_east,l_text:Arial_24:%40%20ProtoMart,o_0.8,x_20,y_20/q_auto:good/${cloudinaryId}`;
      
      photo.displayUrl = `https://res.cloudinary.com/${cloudName}/image/upload/w_1200,q_auto:good/${cloudinaryId}`;
    });

    res.json({
      success: true,
      data: photos,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limitNum),
        totalPhotos: total,
        limit: limitNum,
        hasMore: skip + photos.length < total
      }
    });

  } catch (error) {
    console.error('Get my photos error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch photos',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};


/**
 * Home page photos
 * GET /api/photos/home
 */
exports.getHomePhotos = async (req, res) => {
  try {
    const photos = await Photo.find({ approvalStatus: 'approved' })
      .populate('userId', 'name profilePhoto')
      .populate('placeId', 'name city country')
      .sort({ createdAt: -1 }) // latest first
      .limit(12);

    const watermarkSettings = await WatermarkSetting.findOne({ isActive: true });

    if (watermarkSettings) {
      photos.forEach(photo => {
        const variants = cloudinaryService.getPhotoVariants(
          photo.cloudinaryId,
          watermarkSettings
        );
        photo.thumbnailUrl = variants.thumbnail;
        photo.watermarkedUrl = variants.medium;
      });
    }

    res.json({
      success: true,
      data: photos
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch home photos'
    });
  }
};
