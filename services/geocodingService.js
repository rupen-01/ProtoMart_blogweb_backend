const axios = require('axios');

exports.reverseGeocode = async (latitude, longitude) => {
  try {
    // Using Nominatim (OpenStreetMap) - Free
    const response = await axios.get(
      `https://nominatim.openstreetmap.org/reverse`,
      {
        params: {
          lat: latitude,
          lon: longitude,
          format: 'json',
          addressdetails: 1
        },
        headers: {
          'User-Agent': 'PhotoApp/1.0' // Required by Nominatim
        }
      }
    );

    if (response.data && response.data.address) {
      const addr = response.data.address;
      
      return {
        placeName: addr.tourism || addr.attraction || addr.amenity || 
                   addr.building || addr.road || addr.neighbourhood || 
                   addr.suburb || addr.village || addr.town || addr.city || 
                   response.data.display_name,
        city: addr.city || addr.town || addr.village || addr.municipality,
        state: addr.state || addr.region,
        country: addr.country
      };
    }

    return null;
  } catch (error) {
    console.error('Reverse geocoding error:', error.message);
    return null;
  }
};

exports.getPinCodeDetails = async (pinCode) => {
  try {
    // Using Zippopotam.us - Free
    const response = await axios.get(
      `http://api.zippopotam.us/us/${pinCode}`
    );
    if (response.data) {
      const place = response.data.places[0];
      return {
        fullAddress: `${place['place name']}, ${place['state abbreviation']}, ${response.data['country abbreviation']}`,
        city: place['place name'],
        state: place['state abbreviation'],
        country: response.data['country abbreviation']
      };
    }
    return null;
  }
  catch (error) {
    console.error('Pin code geocoding error:', error.message);
    return null;
  }
};
