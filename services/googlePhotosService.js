const axios = require("axios");
const crypto = require("crypto");
const Photo = require("../models/Photo");
const Place = require("../models/Place");
const WatermarkSetting = require("../models/WatermarkSetting");
const cloudinaryService = require("./cloudinaryService");
const geocodingService = require("./geocodingService");
const googlePhotosJobStore = require("./googlePhotosJobStore");

const ALBUM_FETCH_TIMEOUT_MS = 60000;
const IMAGE_DOWNLOAD_TIMEOUT_MS = 60000;
const IMAGE_PROCESS_TIMEOUT_MS = 120000;
const IMAGE_RETRY_COUNT = 2;
const IMAGE_RETRY_DELAY_MS = 1500;
const IMAGE_CONCURRENCY = 3;

class GooglePhotosService {
  extractAlbumId(shareLink) {
    try {
      const trimmedLink = shareLink.trim();

      let match = trimmedLink.match(/photos\.app\.goo\.gl\/([a-zA-Z0-9-_]+)/);
      if (match) return match[1];

      match = trimmedLink.match(/photos\.google\.com\/share\/([a-zA-Z0-9-_]+)/);
      if (match) return match[1];

      match = trimmedLink.match(
        /photos\.google\.com\/.*\/album\/([a-zA-Z0-9-_]+)/
      );
      if (match) return match[1];

      return null;
    } catch (error) {
      console.error("Error extracting album ID:", error);
      return null;
    }
  }

  async validateShareLink(shareLink) {
    try {
      const response = await axios.get(shareLink, {
        headers: this.getGooglePhotosPageHeaders(),
        timeout: ALBUM_FETCH_TIMEOUT_MS,
        maxRedirects: 5,
      });

      const title = this.extractTitleFromHtml(response.data);

      return {
        valid: response.status === 200,
        title,
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
    let title = null;

    const ogTitleMatch = html.match(
      /<meta property="og:title" content="([^"]+)"/
    );
    if (ogTitleMatch) {
      title = ogTitleMatch[1];
    }

    if (!title) {
      const titleMatch = html.match(/<title>(.*?)<\/title>/);
      if (titleMatch) {
        title = titleMatch[1];
      }
    }

    if (title) {
      title = title.replace(" - Google Photos", "").trim();
    }

    return title || "Shared Album";
  }

  async scrapeSharedAlbum(shareLink) {
    try {
      console.log("🔍 Fetching album page...");

      const response = await axios.get(shareLink, {
        headers: this.getGooglePhotosPageHeaders(),
        timeout: ALBUM_FETCH_TIMEOUT_MS,
      });

      const html = response.data;
      console.log(`📄 HTML received, length: ${html.length} characters`);

      const photoUrls = new Set();

      const pattern1 =
        /https:\/\/lh3\.googleusercontent\.com\/[a-zA-Z0-9_-]{20,}/g;
      const matches1 = html.match(pattern1);

      if (matches1) {
        console.log(`✅ Pattern 1 found ${matches1.length} matches`);
        matches1.forEach((url) => {
          if (url.length > 50) {
            photoUrls.add(url);
          }
        });
      }

      const pattern2 =
        /https:\/\/lh3\.googleusercontent\.com\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*/g;
      const matches2 = html.match(pattern2);

      if (matches2) {
        console.log(`✅ Pattern 2 found ${matches2.length} matches`);
        matches2.forEach((url) => {
          const baseUrl = url.split("=")[0];
          if (baseUrl.length > 50) {
            photoUrls.add(baseUrl);
          }
        });
      }

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

  async downloadPhotoFromUrl(photoUrl) {
    try {
      let downloadUrl = photoUrl.split("=")[0];
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
        maxContentLength: 50 * 1024 * 1024,
        timeout: IMAGE_DOWNLOAD_TIMEOUT_MS,
        validateStatus(status) {
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

      if (error.code === "ECONNABORTED") {
        throw new Error("Download timeout - file may be too large");
      }

      if (error.response?.status === 403) {
        throw new Error("Access forbidden - photo may be private");
      }

      if (error.response?.status === 404) {
        throw new Error("Photo not found");
      }

      throw new Error(`Failed to download photo: ${error.message}`);
    }
  }

  detectMimetype(buffer) {
    const signatures = {
      ffd8ff: "image/jpeg",
      "89504e47": "image/png",
      47494638: "image/gif",
      52494646: "image/webp",
      "424d": "image/bmp",
    };

    const hex = buffer.toString("hex", 0, 4);

    for (const [signature, mimetype] of Object.entries(signatures)) {
      if (hex.startsWith(signature)) {
        return mimetype;
      }
    }

    console.log("⚠️ Unknown file signature, defaulting to image/jpeg");
    return "image/jpeg";
  }

  startSyncJob(jobId, syncOptions) {
    setImmediate(() => {
      this.runSyncJob(jobId, syncOptions).catch((error) => {
        console.error(`❌ [GooglePhotosJob:${jobId}] Unhandled job error:`, error);
        googlePhotosJobStore.markFailed(
          jobId,
          error.message || "Google Photos sync failed"
        );
      });
    });
  }

  async runSyncJob(jobId, syncOptions) {
    const {
      userId,
      shareLink,
      manualCoordinates = null,
      placeId = null,
      metadata = {},
    } = syncOptions;

    console.log(`🚀 [GooglePhotosJob:${jobId}] Starting background sync`);

    googlePhotosJobStore.updateJob(jobId, {
      status: "processing",
      progress: 0,
      processedImages: 0,
      totalImages: 0,
      error: null,
    });

    try {
      const validation = await this.validateShareLink(shareLink);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      console.log(`📁 [GooglePhotosJob:${jobId}] Album: ${validation.title}`);

      const photoUrls = await this.scrapeSharedAlbum(shareLink);
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

      googlePhotosJobStore.updateJob(jobId, {
        status: "processing",
        totalImages: photoUrls.length,
        processedImages: 0,
        progress: 0,
        results,
        albumTitle: validation.title,
      });

      await this.processPhotosWithConcurrency({
        jobId,
        photoUrls,
        userId,
        shareLink,
        manualCoordinates,
        placeId,
        metadata,
        results,
      });

      console.log(`✅ [GooglePhotosJob:${jobId}] Sync completed`, results);
      googlePhotosJobStore.markCompleted(jobId, results);
    } catch (error) {
      console.error(`❌ [GooglePhotosJob:${jobId}] Sync failed:`, error.message);
      googlePhotosJobStore.markFailed(
        jobId,
        error.message || "Failed to sync photos"
      );
    }
  }

  async processPhotosWithConcurrency({
    jobId,
    photoUrls,
    userId,
    shareLink,
    manualCoordinates,
    placeId,
    metadata,
    results,
  }) {
    let currentIndex = 0;
    const workerCount = Math.min(IMAGE_CONCURRENCY, photoUrls.length);

    const runWorker = async (workerId) => {
      while (currentIndex < photoUrls.length) {
        const photoIndex = currentIndex++;
        const photoUrl = photoUrls[photoIndex];

        try {
          console.log(
            `📸 [GooglePhotosJob:${jobId}] Worker ${workerId} processing photo ${photoIndex + 1}/${photoUrls.length}`
          );

          const outcome = await this.withRetry(
            () =>
              this.withTimeout(
                () =>
                  this.processSinglePhoto({
                    userId,
                    shareLink,
                    photoUrl,
                    manualCoordinates,
                    placeId,
                    metadata,
                  }),
                IMAGE_PROCESS_TIMEOUT_MS,
                "Image processing timeout"
              ),
            {
              retries: IMAGE_RETRY_COUNT,
              delayMs: IMAGE_RETRY_DELAY_MS,
              label: `photo ${photoIndex + 1}`,
            }
          );

          results[outcome.status] += 1;
        } catch (photoError) {
          results.failed += 1;
          results.errors.push({
            photoUrl: `${photoUrl.substring(0, 80)}...`,
            error: photoError.message,
          });
          console.error(
            `❌ [GooglePhotosJob:${jobId}] Photo ${photoIndex + 1} failed:`,
            photoError.message
          );
        } finally {
          const processedImages =
            results.uploaded + results.skipped + results.failed;
          const progress = Math.min(
            100,
            Math.round((processedImages / photoUrls.length) * 100)
          );

          googlePhotosJobStore.updateJob(jobId, {
            status: "processing",
            processedImages,
            totalImages: photoUrls.length,
            progress,
            results: {
              ...results,
              errors: [...results.errors],
            },
          });
        }
      }
    };

    await Promise.all(
      Array.from({ length: workerCount }, (_, index) => runWorker(index + 1))
    );
  }

  async processSinglePhoto({
    userId,
    shareLink,
    photoUrl,
    manualCoordinates,
    placeId,
    metadata,
  }) {
    const photoHash = crypto.createHash("md5").update(photoUrl).digest("hex");

    const existingPhoto = await Photo.findOne({
      userId,
      googlePhotoId: photoHash,
    });

    if (existingPhoto) {
      console.log(`⏭️ Photo already synced: ${photoHash}`);
      return { status: "skipped" };
    }

    const photoBuffer = await this.downloadPhotoFromUrl(photoUrl);
    const mimetype = this.detectMimetype(photoBuffer);
    const { exifData, coordinates } =
      cloudinaryService.extractExifData(photoBuffer);

    const cloudinaryResult = await cloudinaryService.uploadMedia(
      photoBuffer,
      mimetype,
      {
        folder: `${process.env.CLOUDINARY_FOLDER}/users/${userId}/google-photos`,
      }
    );

    const watermarkSettings = await WatermarkSetting.findOne({ isActive: true });
    let watermarkedUrl = cloudinaryResult.secure_url;

    if (watermarkSettings) {
      try {
        watermarkedUrl = cloudinaryService.getWatermarkedUrl(
          cloudinaryResult.public_id,
          watermarkSettings
        );
      } catch (wmError) {
        console.error("⚠️ Watermark failed:", wmError.message);
      }
    }

    const photoData = {
      userId,
      cloudinaryId: cloudinaryResult.public_id,
      originalUrl: cloudinaryResult.secure_url,
      watermarkedUrl,
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
      mediaType: "image",
      exifData,
      source: "google_photos",
      googlePhotoId: photoHash,
      approvalStatus: "pending",
      googleAlbumId: this.extractAlbumId(shareLink),
      ...this.buildMetadataFields(metadata),
    };

    const finalCoordinates = this.resolveCoordinates({
      manualCoordinates,
      coordinates,
    });

    if (finalCoordinates) {
      photoData.location = {
        type: "Point",
        coordinates: finalCoordinates,
      };

      try {
        const locationData = await geocodingService.reverseGeocode(
          finalCoordinates[1],
          finalCoordinates[0]
        );

        if (locationData) {
          photoData.placeName = locationData.placeName;
          photoData.city = locationData.city;
          photoData.state = locationData.state;
          photoData.country = locationData.country;

          if (placeId) {
            photoData.placeId = placeId;
            await Place.findByIdAndUpdate(placeId, {
              $inc: { photoCount: 1 },
            });
          } else {
            const resolvedPlace = await this.findOrCreatePlace(
              finalCoordinates,
              locationData
            );

            photoData.placeId = resolvedPlace._id;
            await Place.findByIdAndUpdate(resolvedPlace._id, {
              $inc: { photoCount: 1 },
            });
          }
        }
      } catch (geoError) {
        console.error("❌ Geocoding error:", geoError.message);
      }
    }

    await Photo.create(photoData);
    console.log(`✅ Successfully uploaded Google Photo ${photoHash}`);

    return { status: "uploaded" };
  }

  buildMetadataFields(metadata) {
    const cleanedMetadata = {};

    if (metadata.experienceDate) {
      cleanedMetadata.experienceDate = metadata.experienceDate;
    }
    if (metadata.experiencePerson) {
      cleanedMetadata.experiencePerson = metadata.experiencePerson;
    }
    if (metadata.uploadedByPerson) {
      cleanedMetadata.uploadedByPerson = metadata.uploadedByPerson;
    }
    if (metadata.experienceDescription) {
      cleanedMetadata.experienceDescription = metadata.experienceDescription;
    }
    if (metadata.zipCode) {
      cleanedMetadata.zipCode = metadata.zipCode;
    }

    return cleanedMetadata;
  }

  resolveCoordinates({ manualCoordinates, coordinates }) {
    if (
      manualCoordinates &&
      Number.isFinite(manualCoordinates.latitude) &&
      Number.isFinite(manualCoordinates.longitude)
    ) {
      return [manualCoordinates.longitude, manualCoordinates.latitude];
    }

    if (
      coordinates &&
      Number.isFinite(coordinates[0]) &&
      Number.isFinite(coordinates[1])
    ) {
      return coordinates;
    }

    return null;
  }

  async findOrCreatePlace(finalCoordinates, locationData) {
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
    }

    return place;
  }

  async withRetry(operation, { retries, delayMs, label }) {
    let lastError;

    for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        console.error(
          `⚠️ ${label} attempt ${attempt} failed: ${error.message}`
        );

        if (attempt <= retries) {
          await this.sleep(delayMs * attempt);
        }
      }
    }

    throw lastError;
  }

  async withTimeout(operation, timeoutMs, timeoutMessage) {
    let timer;

    try {
      return await Promise.race([
        operation(),
        new Promise((_, reject) => {
          timer = setTimeout(() => {
            reject(new Error(timeoutMessage));
          }, timeoutMs);

          timer.unref?.();
        }),
      ]);
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }

  sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  getGooglePhotosPageHeaders() {
    return {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      Referer: "https://photos.google.com/",
      Connection: "keep-alive",
    };
  }
}

module.exports = {
  googlePhotosService: new GooglePhotosService(),
  googlePhotosJobStore,
};
