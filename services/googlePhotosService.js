const axios = require("axios");
const Photo = require("../models/Photo");
const Place = require("../models/Place");
const cloudinaryService = require("./cloudinaryService");
const geocodingService = require("./geocodingService");

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
      match = shareLink.match(
        /photos\.google\.com\/.*\/album\/([a-zA-Z0-9-_]+)/
      );
      if (match) return match[1];

      return null;
    } catch (error) {
      console.error("Error extracting album ID:", error);
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
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
          Referer: "https://photos.google.com/",
        },
        timeout: 10000,
        maxRedirects: 5,
      });

      const title = this.extractTitleFromHtml(response.data);

      return {
        valid: response.status === 200,
        title: title,
      };
    } catch (error) {
      console.error("Validation error:", error.message);
      return {
        valid: false,
        error:
          "Invalid or private album link. Make sure album is publicly shared.",
      };
    }
  }

  extractTitleFromHtml(html) {
    // Try multiple methods to extract title
    let title = null;

    // Method 1: og:title meta tag
    const ogTitleMatch = html.match(
      /<meta property="og:title" content="([^"]+)"/
    );
    if (ogTitleMatch) {
      title = ogTitleMatch[1];
    }

    // Method 2: Regular title tag
    if (!title) {
      const titleMatch = html.match(/<title>(.*?)<\/title>/);
      if (titleMatch) {
        title = titleMatch[1];
      }
    }

    // Clean up title
    if (title) {
      title = title.replace(" - Google Photos", "").trim();
    }

    return title || "Shared Album";
  }

  /**
   * Scrape photos from shared album (NO AUTH NEEDED)
   * FIXED VERSION - properly extracts complete URLs
   */
  async scrapeSharedAlbum(shareLink) {
    try {
      console.log("🔍 Fetching album page...");

      const response = await axios.get(shareLink, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
          Referer: "https://photos.google.com/",
          Connection: "keep-alive",
        },
        timeout: 15000,
      });

      const html = response.data;
      console.log(`📄 HTML received, length: ${html.length} characters`);

      // Extract photo URLs from HTML
      const photoUrls = new Set();

      // FIXED: Better regex patterns to capture complete URLs
      // Pattern 1: Standard lh3.googleusercontent.com URLs
      const pattern1 =
        /https:\/\/lh3\.googleusercontent\.com\/[a-zA-Z0-9_-]{20,}/g;
      const matches1 = html.match(pattern1);

      if (matches1) {
        console.log(`✅ Pattern 1 found ${matches1.length} matches`);
        matches1.forEach((url) => {
          // Only add URLs that are long enough (complete URLs are typically 60+ chars)
          if (url.length > 50) {
            photoUrls.add(url);
          }
        });
      }

      // Pattern 2: URLs with additional parameters (capture everything before size params)
      const pattern2 =
        /https:\/\/lh3\.googleusercontent\.com\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*/g;
      const matches2 = html.match(pattern2);

      if (matches2) {
        console.log(`✅ Pattern 2 found ${matches2.length} matches`);
        matches2.forEach((url) => {
          const baseUrl = url.split("=")[0]; // Remove size parameters if any
          if (baseUrl.length > 50) {
            photoUrls.add(baseUrl);
          }
        });
      }

      // Pattern 3: Look for URLs in data attributes and JSON
      const pattern3 =
        /"(https:\/\/lh3\.googleusercontent\.com\/[a-zA-Z0-9_\/-]+)"/g;
      let match3;
      while ((match3 = pattern3.exec(html)) !== null) {
        const url = match3[1].split("=")[0];
        if (url.length > 50) {
          photoUrls.add(url);
        }
      }

      const uniqueUrls = Array.from(photoUrls);
      console.log(`📸 Total unique photos found: ${uniqueUrls.length}`);

      // Log first few URLs for debugging
      if (uniqueUrls.length > 0) {
        console.log("Sample URLs:", uniqueUrls.slice(0, 3));
      }

      return uniqueUrls;
    } catch (error) {
      console.error("❌ Error scraping shared album:", error.message);
      throw new Error(
        "Failed to access shared album. Make sure the link is public."
      );
    }
  }

  /**
   * Download photo from Google Photos (NO AUTH NEEDED)
   * FIXED VERSION - properly handles download URLs
   */
  async downloadPhotoFromUrl(photoUrl) {
    try {
      // FIXED: Ensure we have a complete URL and add proper size parameter
      let downloadUrl = photoUrl;

      // Remove any existing size parameters
      downloadUrl = downloadUrl.split("=")[0];

      // Add size parameter for full resolution
      // =d for download, or =w2048-h2048 for specific size
      downloadUrl = `${downloadUrl}=w2048-h2048`;

      console.log(`⬇️ Downloading from: ${downloadUrl.substring(0, 80)}...`);

      const response = await axios.get(downloadUrl, {
        responseType: "arraybuffer",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Referer: "https://photos.google.com/",
          Accept: "image/webp,image/apng,image/*,*/*;q=0.8",
        },
        maxContentLength: 50 * 1024 * 1024, // 50MB
        timeout: 60000, // 60 seconds for large files
        validateStatus: function (status) {
          return status >= 200 && status < 300;
        },
      });

      if (!response.data || response.data.length === 0) {
        throw new Error("Empty response from server");
      }

      console.log(
        `✅ Downloaded ${(response.data.length / 1024 / 1024).toFixed(2)} MB`
      );
      return Buffer.from(response.data);
    } catch (error) {
      console.error("❌ Error downloading photo:", error.message);

      // Provide more specific error messages
      if (error.code === "ECONNABORTED") {
        throw new Error("Download timeout - file may be too large");
      } else if (error.response?.status === 403) {
        throw new Error("Access forbidden - photo may be private");
      } else if (error.response?.status === 404) {
        throw new Error("Photo not found");
      } else {
        throw new Error(`Failed to download photo: ${error.message}`);
      }
    }
  }

  /**
   * Detect mimetype from buffer
   */
  detectMimetype(buffer) {
    // Check file signature (magic numbers)
    const signatures = {
      ffd8ff: "image/jpeg",
      "89504e47": "image/png",
      47494638: "image/gif",
      52494646: "image/webp", // RIFF (WebP uses RIFF container)
      "424d": "image/bmp",
    };

    const hex = buffer.toString("hex", 0, 4);

    for (const [signature, mimetype] of Object.entries(signatures)) {
      if (hex.startsWith(signature)) {
        return mimetype;
      }
    }

    // Default to JPEG if unknown
    console.log("⚠️ Unknown file signature, defaulting to image/jpeg");
    return "image/jpeg";
  }

  /**
   * Sync photos from shared album link (NO AUTH NEEDED)
   * FIXED: Now passes mimetype to uploadMedia
   */
  async syncFromShareLink(
    userId,
    shareLink,
    manualCoordinates = null,
    placeId = null
  ) {
    try {
      console.log(
        `🔄 Starting sync for user ${userId} from link: ${shareLink}`
      );

      // Validate link first
      const validation = await this.validateShareLink(shareLink);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      console.log(`📁 Album: ${validation.title}`);

      // Scrape photo URLs from shared album
      const photoUrls = await this.scrapeSharedAlbum(shareLink);
      console.log(`📸 Found ${photoUrls.length} photos in album`);

      if (photoUrls.length === 0) {
        throw new Error(
          "No photos found in album. Make sure album has photos and is publicly shared."
        );
      }

      const results = {
        total: photoUrls.length,
        uploaded: 0,
        skipped: 0,
        failed: 0,
        errors: [],
      };

      // Process each photo with delay to avoid rate limiting
      for (let i = 0; i < photoUrls.length; i++) {
        const photoUrl = photoUrls[i];

        try {
          console.log(`\n📸 Processing photo ${i + 1}/${photoUrls.length}`);

          // Create unique hash for this photo
          const crypto = require("crypto");
          const photoHash = crypto
            .createHash("md5")
            .update(photoUrl)
            .digest("hex");

          // Check if photo already synced
          const existingPhoto = await Photo.findOne({
            userId,
            googlePhotoId: photoHash,
          });

          if (existingPhoto) {
            results.skipped++;
            console.log(`⏭️ Photo already synced: ${photoHash}`);
            continue;
          }

          // Download photo
          const photoBuffer = await this.downloadPhotoFromUrl(photoUrl);

          // ✅ FIX: Detect mimetype from buffer
          const mimetype = this.detectMimetype(photoBuffer);
          console.log(`📄 Detected mimetype: ${mimetype}`);

          // Extract EXIF data
          const { exifData, coordinates } =
            cloudinaryService.extractExifData(photoBuffer);

          // ✅ FIX: Pass mimetype as second parameter
          const cloudinaryResult = await cloudinaryService.uploadMedia(
            photoBuffer,
            mimetype, // ← Added mimetype parameter
            {
              folder: `${process.env.CLOUDINARY_FOLDER}/users/${userId}/google-photos`,
            }
          );

          // ✅ ADDED: Fetch watermark settings (matching bulkUpload behavior)
          const WatermarkSetting = require("../models/WatermarkSetting");
          const watermarkSettings = await WatermarkSetting.findOne({
            isActive: true,
          });

          let watermarkedUrl = cloudinaryResult.secure_url;

          // Apply watermark if settings exist
          if (watermarkSettings) {
            try {
              watermarkedUrl = cloudinaryService.getWatermarkedUrl(
                cloudinaryResult.public_id,
                watermarkSettings
              );
              console.log("✅ Watermark applied to Google Photo");
            } catch (wmError) {
              console.error("⚠️ Watermark failed:", wmError.message);
              // Fallback to original URL
            }
          }

          // Prepare photo data
          const photoData = {
            userId,
            cloudinaryId: cloudinaryResult.public_id,
            originalUrl: cloudinaryResult.secure_url,
            watermarkedUrl, // ✅ Added watermarked URL
            fileName: `google_photo_${photoHash}.jpg`,
            fileSize: cloudinaryResult.bytes,
            dimensions: {
              width: cloudinaryResult.width,
              height: cloudinaryResult.height,
            },
            mimeType:
              cloudinaryResult.format === "jpg"
                ? "image/jpeg"
                : `image/${cloudinaryResult.format}`,
            mediaType: "image", // ✅ Added mediaType
            exifData,
            source: "google_photos",
            googlePhotoId: photoHash,
            approvalStatus: "pending",
          };

          let finalCoordinates = null;

          // Priority 1: Use manual coordinates from frontend if provided
          if (
            manualCoordinates &&
            manualCoordinates.latitude &&
            manualCoordinates.longitude
          ) {
            finalCoordinates = [
              manualCoordinates.longitude,
              manualCoordinates.latitude,
            ];
            console.log(
              "📍 Using manual coordinates from frontend:",
              finalCoordinates
            );
          }
          // Priority 2: Fall back to EXIF coordinates if available
          else if (coordinates && coordinates[0] && coordinates[1]) {
            finalCoordinates = coordinates;
            console.log("📍 Using EXIF coordinates:", finalCoordinates);
          }

          // If we have coordinates, process location
          if (finalCoordinates) {
            photoData.location = {
              type: "Point",
              coordinates: finalCoordinates,
            };

            try {
              console.log("🔍 Reverse geocoding coordinates...");
              const locationData = await geocodingService.reverseGeocode(
                finalCoordinates[1], // latitude
                finalCoordinates[0] // longitude
              );

              if (locationData) {
                console.log("✅ Location data found:", locationData);

                photoData.placeName = locationData.placeName;
                photoData.city = locationData.city;
                photoData.state = locationData.state;
                photoData.country = locationData.country;

                // Use provided placeId or find/create place
                if (placeId) {
                  console.log("✅ Using provided placeId:", placeId);
                  photoData.placeId = placeId;

                  // Increment photo count
                  await Place.findByIdAndUpdate(placeId, {
                    $inc: { photoCount: 1 },
                  });
                } else {
                  // Find or create place
                  let place = await Place.findOne({
                    location: {
                      $near: {
                        $geometry: {
                          type: "Point",
                          coordinates: finalCoordinates,
                        },
                        $maxDistance: 1000,
                      },
                    },
                  });

                  if (!place) {
                    console.log(
                      "📍 Creating new place:",
                      locationData.placeName
                    );
                    place = await Place.create({
                      name: locationData.placeName,
                      location: {
                        type: "Point",
                        coordinates: finalCoordinates,
                      },
                      city: locationData.city,
                      state: locationData.state,
                      country: locationData.country,
                      photoCount: 0,
                    });
                  } else {
                    console.log("✅ Found existing place:", place.name);
                  }

                  photoData.placeId = place._id;

                  await Place.findByIdAndUpdate(place._id, {
                    $inc: { photoCount: 1 },
                  });
                }
              }
            } catch (geoError) {
              console.error("❌ Geocoding error:", geoError.message);
            }
          } else {
            console.log(
              "⚠️ No coordinates available - photo will not have location data"
            );
          }

          // Save photo
          await Photo.create(photoData);
          results.uploaded++;
          console.log(
            `✅ Successfully uploaded photo ${i + 1}/${photoUrls.length}`
          );

          // IMPORTANT: Add delay between downloads to avoid rate limiting
          if (i < photoUrls.length - 1) {
            console.log("⏳ Waiting 2 seconds before next download...");
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        } catch (photoError) {
          results.failed++;
          results.errors.push({
            photoUrl: photoUrl.substring(0, 80) + "...", // Truncate for readability
            error: photoError.message,
          });
          console.error(`❌ Failed to process photo:`, photoError.message);
        }
      }

      console.log("\n✅ Sync completed:", results);
      return results;
    } catch (error) {
      console.error("❌ Sync from share link error:", error);
      throw error;
    }
  }
}

module.exports = new GooglePhotosService();
