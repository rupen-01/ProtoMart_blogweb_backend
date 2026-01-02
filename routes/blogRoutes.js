const express = require("express");
const router = express.Router();

const blogController = require("../controllers/blogController");
const {protect} = require("../middlewares/authMiddleware"); 
// ↑ same middleware jo req.user set karta hai

// ============================
// Public Routes
// ============================

/**
 * Get all published blogs
 * GET /api/blogs
 * ?page=&limit=&status=&search=
 */
router.get("/", blogController.getBlogs);

/**
 * Get blogs by place
 * GET /api/blogs/place/:placeId
 */
router.get("/place/:placeId", blogController.getBlogsByPlace);

/**
 * Get blog by ID
 * GET /api/blogs/:id
 */
router.get("/:id", blogController.getBlogById);

// ============================
// Protected Routes (Login Required)
// ============================

/**
 * Create new blog
 * POST /api/blogs
 */
router.post("/", protect, blogController.createBlog);

/**
 * Get logged-in user's blogs
 * GET /api/blogs/my/blogs
 */
router.get("/my/blogs", protect, blogController.getMyBlogs);

/**
 * Update blog
 * PUT /api/blogs/:id
 */
router.put("/:id", protect, blogController.updateBlog);

/**
 * Delete blog
 * DELETE /api/blogs/:id
 */
router.delete("/:id", protect, blogController.deleteBlog);

/**
 * Publish blog
 * POST /api/blogs/:id/publish
 */
router.post("/:id/publish", protect, blogController.publishBlog);

module.exports = router;
