const Place = require('../models/Place');
const Photo = require('../models/Photo');

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