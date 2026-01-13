const Photo = require('../models/Photo');
const User = require('../models/User');
const Place = require('../models/Place');
const Transaction = require('../models/Transaction');
const WatermarkSetting = require('../models/WatermarkSetting');
const cloudinaryService = require('../services/cloudinaryService');
const geocodingService = require('../services/geocodingService');
const { normalizeCoordinates } = require('../utils/geo.util');

/**
 * Bulk upload images & videos
 * POST /api/photos/upload/bulk
 */
// exports.bulkUpload = async (req, res) => {
//   try {
//     if (!req.files || req.files.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: 'Please upload files'
//       });
//     }

//     const userId = req.user._id;
//     const uploadedPhotos = [];

//     // Get coordinates from request
//     const latitude = parseFloat(req.body.latitude);
//     const longitude = parseFloat(req.body.longitude);

//     let placeId = null;
//     let locationData = null;

//     // If coordinates provided, find or create place
//     if (latitude && longitude) {
//       const coordinates = [longitude, latitude]; // GeoJSON format

//       // Search for existing place within 500 meters (0.5km)
//       let place = await Place.findOne({
//         location: {
//           $near: {
//             $geometry: {
//               type: 'Point',
//               coordinates: coordinates
//             },
//             $maxDistance: 500 // 500 meters radius
//           }
//         }
//       });

//       // If no nearby place found, create new one
//       if (!place) {
//         try {
//           // Get location details from reverse geocoding
//           locationData = await geocodingService.reverseGeocode(latitude, longitude);

//           if (locationData) {
//             place = await Place.create({
//               name: locationData.placeName || `Location at ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
//               location: {
//                 type: 'Point',
//                 coordinates: coordinates
//               },
//               city: locationData.city,
//               state: locationData.state,
//               country: locationData.country,
//               photoCount: 0
//             });
//           } else {
//             // Fallback if geocoding fails
//             place = await Place.create({
//               name: `Location at ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
//               location: {
//                 type: 'Point',
//                 coordinates: coordinates
//               },
//               country: 'Unknown',
//               photoCount: 0
//             });
//           }
//         } catch (geoError) {
//           console.error('Geocoding error:', geoError);
//           // Create place without detailed location data
//           place = await Place.create({
//             name: `Location at ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
//             location: {
//               type: 'Point',
//               coordinates: coordinates
//             },
//             country: 'Unknown',
//             photoCount: 0
//           });
//         }
//       }

//       placeId = place._id;

//       // Use place's location data for photos
//       locationData = {
//         placeName: place.name,
//         city: place.city,
//         state: place.state,
//         country: place.country
//       };
//     }

//     // Upload each file
//     for (const file of req.files) {
//       const cloudResult = await cloudinaryService.uploadMedia(
//         file.buffer,
//         file.mimetype,
//         {
//           folder: `${process.env.CLOUDINARY_FOLDER}/users/${userId}`
//         }
//       );

//       const photoData = {
//         userId,
//         cloudinaryId: cloudResult.public_id,
//         originalUrl: cloudResult.secure_url,
//         fileName: file.originalname,
//         fileSize: cloudResult.bytes,
//         mimeType: file.mimetype,
//         mediaType: file.mimetype.startsWith('video') ? 'video' : 'image',
//         source: 'bulk_upload'
//       };

//       // Add location data if available
//       if (latitude && longitude) {
//         photoData.location = {
//           type: 'Point',
//           coordinates: [longitude, latitude]
//         };
        
//         if (placeId) {
//           photoData.placeId = placeId;
//         }
        
//         if (locationData) {
//           photoData.placeName = locationData.placeName;
//           photoData.city = locationData.city;
//           photoData.state = locationData.state;
//           photoData.country = locationData.country;
//         }
//       }

//       const photo = await Photo.create(photoData);
//       uploadedPhotos.push(photo);
//     }

//     // Update place photo count
//     if (placeId) {
//       await Place.findByIdAndUpdate(placeId, {
//         $inc: { photoCount: uploadedPhotos.length }
//       });
//     }

//     res.status(201).json({
//       success: true,
//       message: 'Upload successful',
//       count: uploadedPhotos.length,
//       data: uploadedPhotos,
//       place: placeId ? await Place.findById(placeId) : null
//     });

//   } catch (error) {
//     console.error('Bulk upload error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Bulk upload failed',
//       error: error.message
//     });
//   }
// };



/**
 * Bulk upload images & videos
 */
exports.bulkUpload = async (req, res) => {
  try {
    if (!Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please upload files'
      });
    }

    const userId = req.user._id;
    const uploadedPhotos = [];

    const coordinates = normalizeCoordinates(
      req.body.latitude,
      req.body.longitude
    );

    let place = null;
    let locationData = null;

    // -------- LOCATION LOGIC --------
    // NEW: Check if placeId is provided directly
    if (req.body.placeId) {
      place = await Place.findById(req.body.placeId);
      
      if (!place) {
        return res.status(404).json({
          success: false,
          message: 'Place not found'
        });
      }

      locationData = {
        placeName: place.name,
        city: place.city,
        state: place.state,
        country: place.country
      };
    } 
    // EXISTING: Find or create place from coordinates
    else if (coordinates) {
      place = await Place.findOne({
        location: {
          $near: {
            $geometry: { type: 'Point', coordinates },
            $maxDistance: 500
          }
        }
      });

      if (!place) {
        try {
          locationData = await geocodingService.reverseGeocode(
            coordinates[1],
            coordinates[0]
          );
        } catch {}

        place = await Place.create({
          name:
            locationData?.placeName ||
            `Location ${coordinates[1].toFixed(4)}, ${coordinates[0].toFixed(4)}`,
          location: { type: 'Point', coordinates },
          city: locationData?.city,
          state: locationData?.state,
          country: locationData?.country || 'Unknown',
          photoCount: 0
        });
      }

      locationData = {
        placeName: place.name,
        city: place.city,
        state: place.state,
        country: place.country
      };
    }

    // -------- FILE UPLOAD --------
    for (const file of req.files) {
      const cloud = await cloudinaryService.uploadMedia(
        file.buffer,
        file.mimetype,
        {
          folder: `${process.env.CLOUDINARY_FOLDER}/users/${userId}`
        }
      );

      const photoData = {
        userId,
        cloudinaryId: cloud.public_id,
        originalUrl: cloud.secure_url,
        fileName: file.originalname,
        fileSize: cloud.bytes,
        mimeType: file.mimetype,
        mediaType: file.mimetype.startsWith('video') ? 'video' : 'image',
        source: 'bulk_upload'
      };

      // MODIFIED: Handle location data
      if (place) {
        // Use place's coordinates if placeId was provided, otherwise use provided coordinates
        photoData.location = { 
          type: 'Point', 
          coordinates: req.body.placeId ? place.location.coordinates : coordinates 
        };
        photoData.placeId = place._id;
        Object.assign(photoData, locationData);
      } else if (coordinates) {
        // No place found/created, but coordinates provided
        photoData.location = { type: 'Point', coordinates };
      }

      uploadedPhotos.push(await Photo.create(photoData));
    }

    if (place) {
      await Place.findByIdAndUpdate(place._id, {
        $inc: { photoCount: uploadedPhotos.length }
      });
    }

    res.status(201).json({
      success: true,
      count: uploadedPhotos.length,
      data: uploadedPhotos,
      place
    });

  } catch (err) {
    console.error('Bulk upload error:', err);
    res.status(500).json({
      success: false,
      message: err.message
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

exports.getPlacesWithPhotos = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 100,
      status = 'approved'
    } = req.query;

    // Aggregate photos by placeId
    const placesWithPhotos = await Photo.aggregate([
      {
        $match: {
          approvalStatus: status,
          placeId: { $exists: true, $ne: null },
          location: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$placeId',
          photoCount: { $sum: 1 },
          photos: { $push: '$$ROOT' },
          location: { $first: '$location' },
          placeName: { $first: '$placeName' },
          city: { $first: '$city' },
          state: { $first: '$state' },
          country: { $first: '$country' }
        }
      },
      {
        $lookup: {
          from: 'places',
          localField: '_id',
          foreignField: '_id',
          as: 'placeDetails'
        }
      },
      {
        $project: {
          placeId: '$_id',
          photoCount: 1,
          location: 1,
          placeName: 1,
          city: 1,
          state: 1,
          country: 1,
          photos: { $slice: ['$photos', 5] }, // First 5 photos per place
          placeDetails: { $arrayElemAt: ['$placeDetails', 0] }
        }
      },
      { $skip: (page - 1) * parseInt(limit) },
      { $limit: parseInt(limit) }
    ]);

    res.json({
      success: true,
      data: placesWithPhotos,
      count: placesWithPhotos.length
    });

  } catch (error) {
    console.error('Get places with photos error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch places with photos',
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
    if (photo.rewardGiven && photo.rewardAmount > 0) {
  await User.findByIdAndUpdate(photo.userId, {
    $inc: { walletBalance: -photo.rewardAmount }
  });

  await Transaction.create({
    userId: photo.userId,
    amount: -photo.rewardAmount,
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





exports.getNearbyPhotos = async (req, res) => {
  const coords = normalizeCoordinates(req.query.latitude, req.query.longitude);
  if (!coords) {
    return res.status(400).json({
      success: false,
      message: 'Invalid latitude or longitude'
    });
  }

  const radius = parseInt(req.query.radius || 5000);

  const photos = await Photo.find({
    approvalStatus: 'approved',
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: coords },
        $maxDistance: radius
      }
    }
  })
    .populate('userId', 'name profilePhoto')
    .populate('placeId', 'name city state country')
    .limit(50);

  res.json({ success: true, data: photos });
};
