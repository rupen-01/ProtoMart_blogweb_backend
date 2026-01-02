const axios = require('axios');
const Photo = require('../models/Photo');
const Place = require('../models/Place');
const cloudinaryService = require('./cloudinaryService');
const geocodingService = require('./geocodingService');

class GooglePhotosService {

  /**
   * Extract album ID from share link
   */
  extractAlbumId(shareLink) {
    try {
      shareLink = shareLink.trim();

      // Pattern 1: https://photos.app.goo.gl/XXXXX
      let match = shareLink.match(/photos\.app\.goo\.gl\/([a-zA-Z0-9-_]+)/);
      if (match) return match[1];

      // Pattern 2: https://photos.google.com/share/XXXXX
      match = shareLink.match(/photos\.google\.com\/share\/([a-zA-Z0-9-_]+)/);
      if (match) return match[1];

      // Pattern 3: Direct album link
      match = shareLink.match(/photos\.google\.com\/.*\/album\/([a-zA-Z0-9-_]+)/);
      if (match) return match[1];

      return null;
    } catch (error) {
      console.error('Error extracting album ID:', error);
      return null;
    }
  }

  /**
   * Validate if share link is accessible
   */
  async validateShareLink(shareLink) {
    try {
      const response = await axios.get(shareLink, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });

      const title = this.extractTitleFromHtml(response.data);

      return {
        valid: response.status === 200,
        title: title
      };
    } catch (error) {
      return {
        valid: false,
        error: 'Invalid or private album link. Make sure album is publicly shared.'
      };
    }
  }

  extractTitleFromHtml(html) {
    const match = html.match(/<title>(.*?)<\/title>/);
    return match ? match[1].replace(' - Google Photos', '').trim() : 'Shared Album';
  }

  /**
   * Scrape photos from shared album (NO AUTH NEEDED)
   */
  async scrapeSharedAlbum(shareLink) {
    try {
      const response = await axios.get(shareLink, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const html = response.data;

      // Extract photo URLs from HTML
      const photoUrls = [];
      
      // Google Photos uses lh3.googleusercontent.com for images
      const urlMatches = html.matchAll(/https:\/\/lh3\.googleusercontent\.com\/[a-zA-Z0-9_-]+/g);
      
      for (const match of urlMatches) {
        photoUrls.push(match[0]);
      }

      // Remove duplicates
      return [...new Set(photoUrls)];

    } catch (error) {
      console.error('Error scraping shared album:', error);
      throw new Error('Failed to access shared album. Make sure the link is public.');
    }
  }

  /**
   * Download photo from Google Photos (NO AUTH NEEDED)
   */
  async downloadPhotoFromUrl(photoUrl) {
    try {
      const response = await axios.get(photoUrl, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        maxContentLength: 50 * 1024 * 1024, // 50MB
        timeout: 30000 // 30 seconds
      });

      return Buffer.from(response.data);
    } catch (error) {
      console.error('Error downloading photo:', error);
      throw new Error('Failed to download photo');
    }
  }

  /**
   * Sync photos from shared album link (NO AUTH NEEDED)
   */
  async syncFromShareLink(userId, shareLink) {
    try {
      console.log(`Starting sync for user ${userId} from link: ${shareLink}`);

      // Validate link first
      const validation = await this.validateShareLink(shareLink);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      console.log(`Album: ${validation.title}`);

      // Scrape photo URLs from shared album
      const photoUrls = await this.scrapeSharedAlbum(shareLink);
      console.log(`Found ${photoUrls.length} photos in album`);

      if (photoUrls.length === 0) {
        throw new Error('No photos found in album. Make sure album has photos and is publicly shared.');
      }

      const results = {
        total: photoUrls.length,
        uploaded: 0,
        skipped: 0,
        failed: 0,
        errors: []
      };

      // Process each photo
      for (let i = 0; i < photoUrls.length; i++) {
        const photoUrl = photoUrls[i];
        
        try {
          console.log(`Processing photo ${i + 1}/${photoUrls.length}`);

          // Create unique hash for this photo
          const crypto = require('crypto');
          const photoHash = crypto
            .createHash('md5')
            .update(photoUrl)
            .digest('hex');

          // Check if photo already synced
          const existingPhoto = await Photo.findOne({
            userId,
            googlePhotoId: photoHash
          });

          if (existingPhoto) {
            results.skipped++;
            console.log(`Photo already synced: ${photoHash}`);
            continue;
          }

          // Download photo with full resolution
          const fullSizeUrl = `${photoUrl}=d`; // =d for download/full size
          const photoBuffer = await this.downloadPhotoFromUrl(fullSizeUrl);

          // Extract EXIF data
          const { exifData, coordinates } = cloudinaryService.extractExifData(photoBuffer);

          // Upload to Cloudinary
          const cloudinaryResult = await cloudinaryService.uploadPhoto(photoBuffer, {
            folder: `${process.env.CLOUDINARY_FOLDER}/users/${userId}/google-photos`
          });

          // Prepare photo data
          const photoData = {
            userId,
            cloudinaryId: cloudinaryResult.public_id,
            originalUrl: cloudinaryResult.secure_url,
            fileName: `google_photo_${photoHash}.jpg`,
            fileSize: cloudinaryResult.bytes,
            dimensions: {
              width: cloudinaryResult.width,
              height: cloudinaryResult.height
            },
            mimeType: 'image/jpeg',
            exifData,
            source: 'google_photos',
            googlePhotoId: photoHash,
            approvalStatus: 'pending'
          };

          // Process location data
          if (coordinates && coordinates[0] && coordinates[1]) {
            photoData.location = {
              type: 'Point',
              coordinates: coordinates
            };

            try {
              const locationData = await geocodingService.reverseGeocode(
                coordinates[1],
                coordinates[0]
              );

              if (locationData) {
                photoData.placeName = locationData.placeName;
                photoData.city = locationData.city;
                photoData.state = locationData.state;
                photoData.country = locationData.country;

                // Find or create place
                let place = await Place.findOne({
                  name: locationData.placeName,
                  'location.coordinates': {
                    $near: {
                      $geometry: {
                        type: 'Point',
                        coordinates: coordinates
                      },
                      $maxDistance: 1000
                    }
                  }
                });

                if (!place) {
                  place = await Place.create({
                    name: locationData.placeName,
                    location: {
                      type: 'Point',
                      coordinates: coordinates
                    },
                    city: locationData.city,
                    state: locationData.state,
                    country: locationData.country
                  });
                }

                photoData.placeId = place._id;
              }
            } catch (geoError) {
              console.error('Geocoding error:', geoError);
            }
          }

          // Save photo
          await Photo.create(photoData);
          results.uploaded++;
          console.log(`Successfully uploaded photo ${i + 1}/${photoUrls.length}`);

        } catch (photoError) {
          results.failed++;
          results.errors.push({
            photoUrl,
            error: photoError.message
          });
          console.error(`Failed to process photo:`, photoError.message);
        }
      }

      return results;

    } catch (error) {
      console.error('Sync from share link error:', error);
      throw error;
    }
  }
}

module.exports = new GooglePhotosService();