const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');
const ExifParser = require('exif-parser');

class CloudinaryService {

  /**
   * CORE upload method (image / video)
   */
  async uploadMedia(fileBuffer, mimetype, options = {}) {
    return new Promise((resolve, reject) => {
      if (!mimetype || typeof mimetype !== 'string') {
        return reject(new Error('Invalid mimetype provided'));
      }

      const isVideo = mimetype.startsWith('video');

      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: options.folder || 'travel-media',
          resource_type: isVideo ? 'video' : 'image',
          quality: isVideo ? undefined : 'auto:good',
          use_filename: true,
          unique_filename: true,
          overwrite: false,
          ...options
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      streamifier.createReadStream(fileBuffer).pipe(uploadStream);
    });
  }

  /**
   * IMAGE upload wrapper
   */
  async uploadPhoto(fileBuffer, mimetype, options = {}) {
    return this.uploadMedia(fileBuffer, mimetype, {
      resource_type: 'image',
      ...options
    });
  }

  /**
   * VIDEO upload wrapper
   */
  async uploadVideo(fileBuffer, mimetype, options = {}) {
    return this.uploadMedia(fileBuffer, mimetype, {
      resource_type: 'video',
      ...options
    });
  }

  // ================= WATERMARK HELPERS =================

  getWatermarkTransformation(watermarkSettings = {}) {
    const {
      type = 'text',
      text = '© BodyCureHealth Travel',
      fontSize = 24,
      color = '#FFFFFF',
      watermarkImageId,
      position = { x: 50, y: 90 },
      opacity = 0.7
    } = watermarkSettings;

    const hexColor = color.replace('#', '');
    const cloudinaryOpacity = Math.round(opacity * 100);

    let gravity = 'south_east';
    if (position.x < 33 && position.y < 33) gravity = 'north_west';
    else if (position.x > 66 && position.y < 33) gravity = 'north_east';
    else if (position.x < 33 && position.y > 66) gravity = 'south_west';
    else if (position.x > 66 && position.y > 66) gravity = 'south_east';
    else gravity = 'center';

    // IMAGE watermark
    if (type === 'image' && watermarkImageId) {
      return [{
        overlay: watermarkImageId,
        gravity,
        opacity: cloudinaryOpacity,
        x: 10,
        y: 10
      }];
    }

    // TEXT watermark
    return [{
      overlay: {
        font_family: 'Arial',
        font_size: fontSize,
        text
      },
      gravity,
      color: hexColor,
      opacity: cloudinaryOpacity,
      x: 10,
      y: 10
    }];
  }

  getWatermarkedUrl(cloudinaryId, watermarkSettings) {
    return cloudinary.url(cloudinaryId, {
      transformation: [
        ...this.getWatermarkTransformation(watermarkSettings),
        { quality: 'auto:good' }
      ],
      secure: true
    });
  }

  getPhotoVariants(cloudinaryId, watermarkSettings) {
    const watermark = this.getWatermarkTransformation(watermarkSettings);

    return {
      thumbnail: cloudinary.url(cloudinaryId, {
        transformation: [
          { width: 300, height: 300, crop: 'fill' },
          ...watermark,
          { quality: 'auto:low' }
        ],
        secure: true
      }),
      medium: cloudinary.url(cloudinaryId, {
        transformation: [
          { width: 800, crop: 'limit' },
          ...watermark,
          { quality: 'auto:good' }
        ],
        secure: true
      }),
      large: cloudinary.url(cloudinaryId, {
        transformation: [
          { width: 1920, crop: 'limit' },
          ...watermark,
          { quality: 'auto:good' }
        ],
        secure: true
      }),
      original: this.getWatermarkedUrl(cloudinaryId, watermarkSettings)
    };
  }

  // ================= CLOUDINARY UTILS =================

  async deletePhoto(publicId) {
    return cloudinary.uploader.destroy(publicId);
  }

  extractExifData(fileBuffer) {
    try {
      const parser = ExifParser.create(fileBuffer);
      const result = parser.parse();

      const exifData = {
        dateTaken: result.tags.DateTimeOriginal
          ? new Date(result.tags.DateTimeOriginal * 1000)
          : null,
        camera: result.tags.Make && result.tags.Model
          ? `${result.tags.Make} ${result.tags.Model}`
          : null,
        iso: result.tags.ISO || null,
        aperture: result.tags.FNumber ? `f/${result.tags.FNumber}` : null,
        shutterSpeed: result.tags.ExposureTime
          ? `1/${Math.round(1 / result.tags.ExposureTime)}`
          : null,
        focalLength: result.tags.FocalLength
          ? `${result.tags.FocalLength}mm`
          : null
      };

      let coordinates = null;
      if (result.tags.GPSLatitude && result.tags.GPSLongitude) {
        coordinates = [result.tags.GPSLongitude, result.tags.GPSLatitude];
      }

      return { exifData, coordinates };
    } catch (err) {
      return { exifData: {}, coordinates: null };
    }
  }

  async getPhotoDetails(publicId) {
    return cloudinary.api.resource(publicId, {
      image_metadata: true
    });
  }
}

module.exports = new CloudinaryService();
