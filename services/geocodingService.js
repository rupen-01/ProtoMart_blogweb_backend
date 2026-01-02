const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

class GeocodingService {
  
  /**
   * Reverse geocode coordinates to get place name
   * @param {Number} latitude 
   * @param {Number} longitude 
   * @returns {Promise<Object>}
   */
  async reverseGeocode(latitude, longitude) {
    try {
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      
      if (!apiKey) {
        console.error('Google Maps API key not configured');
        return null;
      }

      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`;
      
      const response = await axios.get(url);

      if (response.data.status === 'OK' && response.data.results.length > 0) {
        const result = response.data.results[0];
        
        const locationData = {
          placeName: this.extractPlaceName(result.address_components),
          city: this.extractComponent(result.address_components, 'locality'),
          state: this.extractComponent(result.address_components, 'administrative_area_level_1'),
          country: this.extractComponent(result.address_components, 'country'),
          formattedAddress: result.formatted_address
        };

        return locationData;
      }

      return null;
    } catch (error) {
      console.error('Reverse geocoding error:', error.message);
      return null;
    }
  }

  /**
   * Forward geocode place name to coordinates
   * @param {String} placeName 
   * @returns {Promise<Object>}
   */
  async geocode(placeName) {
    try {
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      
      if (!apiKey) {
        console.error('Google Maps API key not configured');
        return null;
      }

      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(placeName)}&key=${apiKey}`;
      
      const response = await axios.get(url);

      if (response.data.status === 'OK' && response.data.results.length > 0) {
        const result = response.data.results[0];
        
        return {
          latitude: result.geometry.location.lat,
          longitude: result.geometry.location.lng,
          formattedAddress: result.formatted_address
        };
      }

      return null;
    } catch (error) {
      console.error('Geocoding error:', error.message);
      return null;
    }
  }

  /**
   * Extract component from address components
   */
  extractComponent(addressComponents, type) {
    const component = addressComponents.find(comp => comp.types.includes(type));
    return component ? component.long_name : null;
  }

  /**
   * Extract place name from address components
   */
  extractPlaceName(addressComponents) {
    // Try to get most specific place name
    const types = [
      'neighborhood',
      'sublocality',
      'locality',
      'administrative_area_level_2',
      'administrative_area_level_1'
    ];

    for (const type of types) {
      const component = addressComponents.find(comp => comp.types.includes(type));
      if (component) {
        return component.long_name;
      }
    }

    return 'Unknown Location';
  }

  /**
   * Get pin code address details
   * @param {String} pinCode 
   * @returns {Promise<Object>}
   */
  async getPinCodeDetails(pinCode) {
    try {
      const url = `${process.env.PINCODE_API_URL}/pincode/${pinCode}`;
      const response = await axios.get(url);

      if (response.data.Status === 'Success' && response.data.PostOffice) {
        const postOffice = response.data.PostOffice[0];
        
        return {
          city: postOffice.District,
          state: postOffice.State,
          country: postOffice.Country,
          fullAddress: `${postOffice.Name}, ${postOffice.District}, ${postOffice.State}, ${postOffice.Country}`
        };
      }

      return null;
    } catch (error) {
      console.error('Pin code API error:', error.message);
      return null;
    }
  }
}

module.exports = new GeocodingService();