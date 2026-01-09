const express = require("express");
const router = express.Router();

const blogController = require("../controllers/blogController");
const { protect } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadMiddleware");

// ============================
// PUBLIC ROUTES (NO LOGIN)
// ============================

/**
 * Get all published blogs
 * GET /api/blogs
 */
router.get("/", blogController.getBlogs);

/**
 * Get blogs by place
 * GET /api/blogs/place/:placeId
 */
router.get("/place/:placeId", blogController.getBlogsByPlace);

// ============================
// PROTECTED ROUTES (LOGIN REQUIRED)
// ============================

/**
 * Get logged-in user's blogs
 * GET /api/blogs/my/blogs
 */
router.get("/my/blogs", protect, blogController.getMyBlogs);

/**
 * Create new blog (Direct Publish supported)
 * POST /api/blogs
 */
router.post(
  "/",
  protect,
  upload.array("coverImages", 5),
  blogController.createBlog
);

/**
 * Update blog (ONLY OWNER)
 * PUT /api/blogs/:id
 */
router.put(
  "/:id",
  protect,
  upload.array("coverImages", 5),
  blogController.updateBlog
);

/**
 * Delete blog (ONLY OWNER)
 * DELETE /api/blogs/:id
 */
router.delete("/:id", protect, blogController.deleteBlog);

/**
 * Publish blog (ONLY OWNER)
 * POST /api/blogs/:id/publish
 */
router.post("/:id/publish", protect, blogController.publishBlog);

/**
 * Get blog by ID (LAST ME RAKHNA HAI)
 * GET /api/blogs/:id
 */
router.get("/:id", blogController.getBlogById);

module.exports = router;
