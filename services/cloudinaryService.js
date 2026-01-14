const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");
const ExifParser = require("exif-parser");

class CloudinaryService {
  // ================= CORE UPLOAD =================

  async uploadMedia(fileBuffer, mimetype, options = {}) {
    return new Promise((resolve, reject) => {
      if (!mimetype || typeof mimetype !== "string") {
        return reject(new Error("Invalid mimetype provided"));
      }

      const isVideo = mimetype.startsWith("video");

      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: options.folder || "travel-media",
          resource_type: isVideo ? "video" : "image",
          quality: isVideo ? undefined : "auto:good",
          use_filename: true,
          unique_filename: true,
          overwrite: false,
          ...options,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      streamifier.createReadStream(fileBuffer).pipe(uploadStream);
    });
  }

  async uploadPhoto(fileBuffer, mimetype, options = {}) {
    return this.uploadMedia(fileBuffer, mimetype, {
      resource_type: "image",
      ...options,
    });
  }

  async uploadVideo(fileBuffer, mimetype, options = {}) {
    return this.uploadMedia(fileBuffer, mimetype, {
      resource_type: "video",
      ...options,
    });
  }

  // ================= WATERMARK GENERATION =================

  /**
   * ✅ FIXED: Generate watermarked URL using raw transformation string
   * This bypasses SDK issues with text overlay parameter ordering
   */
  getWatermarkedUrl(cloudinaryId, watermarkSettings = {}) {
    const {
      type = "text",
      text = "© BodyCureHealth Travel",
      fontFamily = "Arial",
      fontSize = 24,
      color = "#FFFFFF",
      opacity = 0.7,
      position = { x: 50, y: 90 },
      watermarkImageUrl = null,
    } = watermarkSettings;

    // Convert opacity (0-1) to Cloudinary format (0-100)
    const cloudinaryOpacity = Math.round(opacity * 100);

    // Resolve gravity from position
    let gravity = "center";
    if (position.x < 33 && position.y < 33) gravity = "north_west";
    else if (position.x > 66 && position.y < 33) gravity = "north_east";
    else if (position.x < 33 && position.y > 66) gravity = "south_west";
    else if (position.x > 66 && position.y > 66) gravity = "south_east";

    try {
      if (type === "image" && watermarkImageUrl) {
        // ================= IMAGE WATERMARK =================
        const publicIdMatch = watermarkImageUrl.match(/upload\/(?:v\d+\/)?(.+)\.\w+$/);
        const watermarkPublicId = publicIdMatch ? publicIdMatch[1] : null;

        if (!watermarkPublicId) {
          return cloudinary.url(cloudinaryId, { secure: true });
        }

        // Build raw transformation string for image watermark
        const transformation = `l_${watermarkPublicId.replace(/\//g, ':')},w_200,c_fit,g_${gravity},o_${cloudinaryOpacity},x_10,y_10/q_auto:good`;

        console.log("🖼️ Image watermark transformation:", transformation);

        return cloudinary.url(cloudinaryId, {
          raw_transformation: transformation,
          secure: true,
        });

      } else {
        // ================= TEXT WATERMARK =================
        // Clean text: remove special chars except safe ones
        const cleanText = text
          .replace(/[^a-zA-Z0-9\s©®™]/g, '') // Remove @, ., etc
          .trim()
          .slice(0, 50); // Limit to 50 chars

        if (!cleanText) {
          console.warn("⚠️ Watermark text is empty after cleaning");
          return cloudinary.url(cloudinaryId, { secure: true });
        }

        // Prepare font name (replace spaces with underscores)
        // ✅ Use Arial as fallback if Times New Roman fails
        let fontName = fontFamily.replace(/\s+/g, "_");
        
        // Map of problematic fonts to safe alternatives
        const fontFallbacks = {
          'Times_New_Roman': 'Arial',
          'Courier_New': 'Courier',
          'Comic_Sans_MS': 'Arial',
        };
        
        // Use fallback if font is known to be problematic
        if (fontFallbacks[fontName]) {
          console.log(`⚠️ Using fallback font: ${fontFallbacks[fontName]} instead of ${fontName}`);
          fontName = fontFallbacks[fontName];
        }
        
        // Remove # from color
        const hexColor = color.replace("#", "");

        // ✅ Build raw transformation string with CORRECT parameter order
        // Format: l_text:font_size_style:text,co_rgb:color/g_gravity,o_opacity,x_offset,y_offset/q_quality
        const transformation = [
          `l_text:${fontName}_${fontSize}_bold:${encodeURIComponent(cleanText)}`,
          `co_rgb:${hexColor}`,
          `g_${gravity}`,
          `o_${cloudinaryOpacity}`,
          `x_10`,
          `y_10`,
          `q_auto:good`
        ].join('/');

        console.log("📝 Text watermark transformation:", transformation);
        console.log("🔗 Generating URL for:", cloudinaryId);

        const url = cloudinary.url(cloudinaryId, {
          raw_transformation: transformation,
          secure: true,
        });

        console.log("✅ Final watermarked URL:", url);

        return url;
      }
    } catch (error) {
      console.error("❌ Error generating watermark URL:", error);
      // Fallback to original URL
      return cloudinary.url(cloudinaryId, { secure: true });
    }
  }

  // ================= PHOTO VARIANTS WITH WATERMARK =================

  getPhotoVariants(cloudinaryId, watermarkSettings) {
    const {
      type = "text",
      opacity = 0.7,
      watermarkImageUrl = null,
    } = watermarkSettings;

    const cloudinaryOpacity = Math.round(opacity * 100);
    const gravity = "south_east";

    // Helper to build watermark overlay
    const buildWatermarkOverlay = (size = null) => {
      if (type === "image" && watermarkImageUrl) {
        const publicIdMatch = watermarkImageUrl.match(/upload\/(?:v\d+\/)?(.+)\.\w+$/);
        const watermarkPublicId = publicIdMatch ? publicIdMatch[1] : null;

        if (!watermarkPublicId) return null;

        return {
          overlay: watermarkPublicId,
          gravity: gravity,
          opacity: cloudinaryOpacity,
          width: size || 150,
          crop: "fit",
          x: 10,
          y: 10,
        };
      } else {
        // Text watermark
        const cleanText = watermarkSettings.text
          ?.replace(/[^a-zA-Z0-9\s©®™]/g, '')
          .trim()
          .slice(0, 50);

        if (!cleanText) return null;

        const fontName = (watermarkSettings.fontFamily || "Arial").replace(/\s+/g, "_");
        const hexColor = (watermarkSettings.color || "#FFFFFF").replace("#", "");

        return {
          overlay: {
            font_family: fontName,
            font_size: watermarkSettings.fontSize || 24,
            font_weight: "bold",
            text: cleanText,
          },
          color: `rgb:${hexColor}`,
          gravity: gravity,
          opacity: cloudinaryOpacity,
          x: 10,
          y: 10,
        };
      }
    };

    const watermarkOverlay = buildWatermarkOverlay();

    return {
      thumbnail: cloudinary.url(cloudinaryId, {
        transformation: [
          { width: 300, height: 300, crop: "fill" },
          watermarkOverlay,
          { quality: "auto:low" },
        ].filter(Boolean),
        secure: true,
      }),

      medium: cloudinary.url(cloudinaryId, {
        transformation: [
          { width: 800, crop: "limit" },
          watermarkOverlay,
          { quality: "auto:good" },
        ].filter(Boolean),
        secure: true,
      }),

      large: cloudinary.url(cloudinaryId, {
        transformation: [
          { width: 1920, crop: "limit" },
          watermarkOverlay,
          { quality: "auto:good" },
        ].filter(Boolean),
        secure: true,
      }),

      original: this.getWatermarkedUrl(cloudinaryId, watermarkSettings),
    };
  }

  // ================= UTILITY METHODS =================

  async deletePhoto(publicId) {
    return cloudinary.uploader.destroy(publicId);
  }

  extractExifData(fileBuffer) {
    try {
      const parser = ExifParser.create(fileBuffer);
      const result = parser.parse();

      return {
        exifData: result.tags || {},
        coordinates:
          result.tags.GPSLatitude && result.tags.GPSLongitude
            ? [result.tags.GPSLongitude, result.tags.GPSLatitude]
            : null,
      };
    } catch {
      return { exifData: {}, coordinates: null };
    }
  }

  async getPhotoDetails(publicId) {
    return cloudinary.api.resource(publicId, {
      image_metadata: true,
    });
  }
}

module.exports = new CloudinaryService();