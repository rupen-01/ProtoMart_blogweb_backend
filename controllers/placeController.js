const Place = require('../models/Place');
const Photo = require('../models/Photo');
const Blog = require('../models/Blog');

/**
 * Get all places with pagination
 * GET /api/places
 */
exports.getAllPlaces = async (req, res) => {
  try {
    const { page = 1, limit = 50, country, state, search } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    if (country) query.country = country;
    if (state) query.state = state;
    if (search) {
      query.$text = { $search: search };
    }

    const places = await Place.find(query)
      .select('name location city state country photoCount coverPhoto')
      .sort({ photoCount: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Place.countDocuments(query);

    res.json({
      success: true,
      data: places,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalPlaces: total,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get all places error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch places',
      error: error.message
    });
  }
};

/**
 * Get places for map (3D earth visualization)
 * GET /api/places/map
 */
exports.getPlacesForMap = async (req, res) => {
  try {
    const { 
      minLat, maxLat, minLng, maxLng, // Bounding box for zoom area
      minPhotos = 1 // Minimum photos to show place
    } = req.query;

    const query = { photoCount: { $gte: parseInt(minPhotos) } };

    // If bounding box provided, filter by coordinates
    if (minLat && maxLat && minLng && maxLng) {
      query['location.coordinates'] = {
        $geoWithin: {
          $box: [
            [parseFloat(minLng), parseFloat(minLat)],
            [parseFloat(maxLng), parseFloat(maxLat)]
          ]
        }
      };
    }

    const places = await Place.find(query)
      .select('name location.coordinates photoCount city state country')
      .limit(1000); // Limit for performance

    // Format for frontend
    const formattedPlaces = places.map(place => ({
      id: place._id,
      name: place.name,
      latitude: place.location.coordinates[1],
      longitude: place.location.coordinates[0],
      photoCount: place.photoCount,
      city: place.city,
      state: place.state,
      country: place.country
    }));

    res.json({
      success: true,
      count: formattedPlaces.length,
      data: formattedPlaces
    });

  } catch (error) {
    console.error('Get places for map error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch places for map',
      error: error.message
    });
  }
};

/**
 * Get place by ID with details
 * GET /api/places/:id
 */
exports.getPlaceById = async (req, res) => {
  try {
    const place = await Place.findById(req.params.id);

    if (!place) {
      return res.status(404).json({
        success: false,
        message: 'Place not found'
      });
    }

    res.json({
      success: true,
      data: place
    });

  } catch (error) {
    console.error('Get place by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch place',
      error: error.message
    });
  }
};

/**
 * Get photos of a specific place
 * GET /api/places/:id/photos
 */
exports.getPlacePhotos = async (req, res) => {
  try {
    const { page = 1, limit = 20, sortBy = 'createdAt' } = req.query;
    const skip = (page - 1) * limit;

    const photos = await Photo.find({
      placeId: req.params.id,
      approvalStatus: 'approved'
    })
      .populate('userId', 'name profilePhoto')
      .sort({ [sortBy]: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Photo.countDocuments({
      placeId: req.params.id,
      approvalStatus: 'approved'
    });

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
    console.error('Get place photos error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch place photos',
      error: error.message
    });
  }
};

exports.getPlacesHierarchy = async (req, res) => {
  try {
    const hierarchy = await Place.aggregate([
      {
        $match: { photoCount: { $gt: 0 } } // Only places with photos
      },
      {
        $group: {
          _id: {
            country: '$country',
            state: '$state',
            city: '$city'
          },
          places: {
            $push: {
              _id: '$_id',
              name: '$name',
              photoCount: '$photoCount',
              coverPhoto: '$coverPhoto'
            }
          },
          totalPhotos: { $sum: '$photoCount' }
        }
      },
      {
        $group: {
          _id: {
            country: '$_id.country',
            state: '$_id.state'
          },
          cities: {
            $push: {
              city: '$_id.city',
              places: '$places',
              totalPhotos: '$totalPhotos'
            }
          },
          stateTotalPhotos: { $sum: '$totalPhotos' }
        }
      },
      {
        $group: {
          _id: '$_id.country',
          states: {
            $push: {
              state: '$_id.state',
              cities: '$cities',
              totalPhotos: '$stateTotalPhotos'
            }
          },
          countryTotalPhotos: { $sum: '$stateTotalPhotos' }
        }
      },
      { $sort: { countryTotalPhotos: -1 } }
    ]);

    res.json({
      success: true,
      data: hierarchy
    });
  } catch (error) {
    console.error('Get hierarchy error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch hierarchy',
      error: error.message
    });
  }
};

exports.getPlaceBlogs = async (req, res) => {
  try {
    const { page = 1, limit = 10, sortBy = 'createdAt' } = req.query;
    const skip = (page - 1) * limit;

   // Add at top of file

    const blogs = await Blog.find({
      placeId: req.params.id,
      status: 'published'
    })
      .populate('authorId', 'name profilePhoto')
      .sort({ [sortBy]: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Blog.countDocuments({
      placeId: req.params.id,
      status: 'published'
    });

    res.json({
      success: true,
      data: blogs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalBlogs: total,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get place blogs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch place blogs',
      error: error.message
    });
  }
};