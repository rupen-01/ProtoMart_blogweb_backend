const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');
const ExifParser = require('exif-parser');

class CloudinaryService {
  
  /**
   * Upload photo to Cloudinary
   * @param {Buffer} fileBuffer - File buffer from multer
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} Upload result
   */
  async uploadPhoto(fileBuffer, options = {}) {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: options.folder || process.env.CLOUDINARY_FOLDER || 'travel-photos',
          resource_type: 'image',
          use_filename: true,
          unique_filename: true,
          overwrite: false,
          quality: 'auto:best',
          format: 'jpg',
          // Store original with high quality
          transformation: [
            { quality: 'auto:best' }
          ],
          ...options
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      );

      streamifier.createReadStream(fileBuffer).pipe(uploadStream);
    });
  }

  /**
   * Generate watermarked URL using Cloudinary transformations
   * @param {String} cloudinaryId - Cloudinary public ID
   * @param {Object} watermarkSettings - Watermark configuration
   * @returns {String} Watermarked image URL
   */
  getWatermarkedUrl(cloudinaryId, watermarkSettings) {
    const {
      text = '© BodyCureHealth Travel',
      fontSize = 24,
      color = 'FFFFFF',
      position = { x: 50, y: 90 },
      opacity = 70
    } = watermarkSettings;

    // Remove # from color if present
    const hexColor = color.replace('#', '');

    // Calculate gravity based on position percentages
    let gravity = 'south_east';
    if (position.x < 33 && position.y < 33) gravity = 'north_west';
    else if (position.x > 66 && position.y < 33) gravity = 'north_east';
    else if (position.x < 33 && position.y > 66) gravity = 'south_west';
    else if (position.x > 66 && position.y > 66) gravity = 'south_east';
    else if (position.y < 33) gravity = 'north';
    else if (position.y > 66) gravity = 'south';
    else if (position.x < 33) gravity = 'west';
    else if (position.x > 66) gravity = 'east';
    else gravity = 'center';

    return cloudinary.url(cloudinaryId, {
      transformation: [
        {
          overlay: {
            font_family: 'Arial',
            font_size: fontSize,
            text: text
          },
          gravity: gravity,
          x: 10,
          y: 10,
          color: hexColor,
          opacity: opacity
        },
        { quality: 'auto:good' }
      ],
      secure: true
    });
  }

  /**
   * Generate multiple size variants with watermark
   * @param {String} cloudinaryId 
   * @param {Object} watermarkSettings 
   * @returns {Object} URLs for different sizes
   */
  getPhotoVariants(cloudinaryId, watermarkSettings) {
    const baseTransformation = this.getWatermarkTransformation(watermarkSettings);

    return {
      thumbnail: cloudinary.url(cloudinaryId, {
        transformation: [
          { width: 300, height: 300, crop: 'fill' },
          ...baseTransformation,
          { quality: 'auto:low' }
        ],
        secure: true
      }),
      medium: cloudinary.url(cloudinaryId, {
        transformation: [
          { width: 800, crop: 'limit' },
          ...baseTransformation,
          { quality: 'auto:good' }
        ],
        secure: true
      }),
      large: cloudinary.url(cloudinaryId, {
        transformation: [
          { width: 1920, crop: 'limit' },
          ...baseTransformation,
          { quality: 'auto:good' }
        ],
        secure: true
      }),
      original: this.getWatermarkedUrl(cloudinaryId, watermarkSettings)
    };
  }

  /**
   * Helper to create watermark transformation object
   */
  getWatermarkTransformation(watermarkSettings) {
    const {
      text = '© BodyCureHealth Travel',
      fontSize = 24,
      color = 'FFFFFF',
      position = { x: 50, y: 90 },
      opacity = 70
    } = watermarkSettings;

    const hexColor = color.replace('#', '');
    
    let gravity = 'south_east';
    if (position.x < 33 && position.y < 33) gravity = 'north_west';
    else if (position.x > 66 && position.y < 33) gravity = 'north_east';
    else if (position.x < 33 && position.y > 66) gravity = 'south_west';
    else if (position.x > 66 && position.y > 66) gravity = 'south_east';
    else if (position.y < 33) gravity = 'north';
    else if (position.y > 66) gravity = 'south';
    else if (position.x < 33) gravity = 'west';
    else if (position.x > 66) gravity = 'east';
    else gravity = 'center';

    return [
      {
        overlay: {
          font_family: 'Arial',
          font_size: fontSize,
          text: text
        },
        gravity: gravity,
        x: 10,
        y: 10,
        color: hexColor,
        opacity: opacity
      }
    ];
  }

  /**
   * Delete photo from Cloudinary
   * @param {String} cloudinaryId 
   * @returns {Promise<Object>}
   */
  async deletePhoto(cloudinaryId) {
    try {
      const result = await cloudinary.uploader.destroy(cloudinaryId);
      return result;
    } catch (error) {
      throw new Error(`Failed to delete photo from Cloudinary: ${error.message}`);
    }
  }

  /**
   * Extract EXIF data from buffer
   * @param {Buffer} fileBuffer 
   * @returns {Object} EXIF data
   */
  extractExifData(fileBuffer) {
    try {
      const parser = ExifParser.create(fileBuffer);
      const result = parser.parse();
      
      const exifData = {
        dateTaken: result.tags.DateTimeOriginal ? new Date(result.tags.DateTimeOriginal * 1000) : null,
        camera: result.tags.Make && result.tags.Model ? `${result.tags.Make} ${result.tags.Model}` : null,
        iso: result.tags.ISO || null,
        aperture: result.tags.FNumber ? `f/${result.tags.FNumber}` : null,
        shutterSpeed: result.tags.ExposureTime ? `1/${Math.round(1/result.tags.ExposureTime)}` : null,
        focalLength: result.tags.FocalLength ? `${result.tags.FocalLength}mm` : null
      };

      // Extract GPS coordinates
      let coordinates = null;
      if (result.tags.GPSLatitude && result.tags.GPSLongitude) {
        const lat = result.tags.GPSLatitude;
        const lng = result.tags.GPSLongitude;
        coordinates = [lng, lat]; // [longitude, latitude] for GeoJSON
      }

      return { exifData, coordinates };
    } catch (error) {
      console.error('EXIF extraction error:', error);
      return { exifData: {}, coordinates: null };
    }
  }

  /**
   * Get photo details from Cloudinary
   * @param {String} cloudinaryId 
   * @returns {Promise<Object>}
   */
  async getPhotoDetails(cloudinaryId) {
    try {
      const result = await cloudinary.api.resource(cloudinaryId, {
        image_metadata: true
      });
      return result;
    } catch (error) {
      throw new Error(`Failed to get photo details: ${error.message}`);
    }
  }
}

module.exports = new CloudinaryService();