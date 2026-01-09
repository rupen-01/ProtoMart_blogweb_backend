// const Blog = require('../models/Blog');
// const Place = require('../models/Place');
// const cloudinaryService = require("../services/cloudinaryService");


// /**
//  * Get all blogs
//  * GET /api/blogs
//  */
// exports.getBlogs = async (req, res) => {
//   try {
//     const { page = 1, limit = 20, status = 'published', search } = req.query;
//     const skip = (page - 1) * limit;

//     const query = { status };
//     if (search) {
//       query.$text = { $search: search };
//     }

//     const blogs = await Blog.find(query)
//       .populate('authorId', 'name profilePhoto')
//       .populate('placeId', 'name city state country')
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(parseInt(limit));

//     const total = await Blog.countDocuments(query);

//     res.json({
//       success: true,
//       data: blogs,
//       pagination: {
//         currentPage: parseInt(page),
//         totalPages: Math.ceil(total / limit),
//         totalBlogs: total,
//         limit: parseInt(limit)
//       }
//     });

//   } catch (error) {
//     console.error('Get blogs error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch blogs',
//       error: error.message
//     });
//   }
// };

// /**
//  * Get blog by ID
//  * GET /api/blogs/:id
//  */
// exports.getBlogById = async (req, res) => {
//   try {
//     const blog = await Blog.findById(req.params.id)
//       .populate('authorId', 'name profilePhoto email')
//       .populate('placeId', 'name city state country location');

//     if (!blog) {
//       return res.status(404).json({
//         success: false,
//         message: 'Blog not found'
//       });
//     }

//     // Increment views
//     await Blog.findByIdAndUpdate(blog._id, { $inc: { views: 1 } });

//     res.json({
//       success: true,
//       data: blog
//     });

//   } catch (error) {
//     console.error('Get blog by ID error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch blog',
//       error: error.message
//     });
//   }
// };

// /**
//  * Get blogs by place
//  * GET /api/blogs/place/:placeId
//  */
// exports.getBlogsByPlace = async (req, res) => {
//   try {
//     const { page = 1, limit = 10 } = req.query;
//     const skip = (page - 1) * limit;

//     const blogs = await Blog.find({
//       placeId: req.params.placeId,
//       status: 'published'
//     })
//       .populate('authorId', 'name profilePhoto')
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(parseInt(limit));

//     const total = await Blog.countDocuments({
//       placeId: req.params.placeId,
//       status: 'published'
//     });

//     res.json({
//       success: true,
//       data: blogs,
//       pagination: {
//         currentPage: parseInt(page),
//         totalPages: Math.ceil(total / limit),
//         totalBlogs: total,
//         limit: parseInt(limit)
//       }
//     });

//   } catch (error) {
//     console.error('Get blogs by place error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch blogs',
//       error: error.message
//     });
//   }
// };

// /**
//  * Create new blog
//  * POST /api/blogs
// //  */
// // exports.createBlog = async (req, res) => {
// //   try {
// //     const { placeId, title, content, coverImage, tags } = req.body;

// //     // Verify place exists
// //     const place = await Place.findById(placeId);
// //     if (!place) {
// //       return res.status(404).json({
// //         success: false,
// //         message: 'Place not found'
// //       });
// //     }

// //     const blog = await Blog.create({
// //       authorId: req.user._id,
// //       placeId,
// //       title,
// //       content,
// //       coverImage,
// //       tags: tags || [],
// //       status: 'draft'
// //     });

// //     await blog.populate('authorId', 'name profilePhoto');
// //     await blog.populate('placeId', 'name city state country');

// //     res.status(201).json({
// //       success: true,
// //       message: 'Blog created successfully',
// //       data: blog
// //     });

// //   } catch (error) {
// //     console.error('Create blog error:', error);
// //     res.status(500).json({
// //       success: false,
// //       message: 'Failed to create blog',
// //       error: error.message
// //     });
// //   }
// // };

// // /**
// //  * Update blog
// //  * PUT /api/blogs/:id
// //  */
// // exports.updateBlog = async (req, res) => {
// //   try {
// //     const blog = await Blog.findById(req.params.id);

// //     if (!blog) {
// //       return res.status(404).json({
// //         success: false,
// //         message: 'Blog not found'
// //       });
// //     }

// //     // Check ownership
// //     if (blog.authorId.toString() !== req.user._id.toString()) {
// //       return res.status(403).json({
// //         success: false,
// //         message: 'You are not authorized to update this blog'
// //       });
// //     }

// //     const { title, content, coverImage, tags } = req.body;

// //     const updatedBlog = await Blog.findByIdAndUpdate(
// //       req.params.id,
// //       { title, content, coverImage, tags },
// //       { new: true, runValidators: true }
// //     )
// //       .populate('authorId', 'name profilePhoto')
// //       .populate('placeId', 'name city state country');

// //     res.json({
// //       success: true,
// //       message: 'Blog updated successfully',
// //       data: updatedBlog
// //     });

// //   } catch (error) {
// //     console.error('Update blog error:', error);
// //     res.status(500).json({
// //       success: false,
// //       message: 'Failed to update blog',
// //       error: error.message
// //     });
// //   }
// // };


// exports.createBlog = async (req, res) => {
//   try {
//     const { title, content, placeId, tags } = req.body;

//     const place = await Place.findById(placeId);
//     if (!place) {
//       return res.status(404).json({ message: 'Place not found' });
//     }

//     let coverImages = [];
//     if (req.files?.length) {
//       for (const file of req.files) {
//         const upload = await cloudinaryService.uploadPhoto(
//           file.buffer,
//           file.mimetype,
//           { folder: 'blogs/covers' }
//         );

//         coverImages.push({
//           url: upload.secure_url,
//           publicId: upload.public_id
//         });
//       }
//     }

//     const blog = await Blog.create({
//       authorId: req.user._id,
//       placeId,
//       title,
//       content,
//       coverImages,
//       tags: tags ? JSON.parse(tags) : [],
//       status: 'published',          // ✅ DIRECT PUBLISH
//       publishedAt: new Date()        // ✅ SET TIME
//     });

//     res.status(201).json({
//       success: true,
//       message: 'Blog published successfully',
//       data: blog
//     });

//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: 'Failed to create blog',
//       error: error.message
//     });
//   }
// };

// /**
//  * UPDATE BLOG
//  */
// exports.updateBlog = async (req, res) => {
//   try {
//     const blog = await Blog.findById(req.params.id);
//     if (!blog) return res.status(404).json({ message: 'Blog not found' });

//     if (blog.authorId.toString() !== req.user._id.toString()) {
//       return res.status(403).json({ message: 'Unauthorized' });
//     }

//     let newImages = [];
//     if (req.files?.length) {
//       for (const file of req.files) {
//         const upload = await cloudinaryService.uploadPhoto(
//           file.buffer,
//           file.mimetype,
//           { folder: 'blogs/covers' }
//         );

//         newImages.push({
//           url: upload.secure_url,
//           publicId: upload.public_id
//         });
//       }
//     }

//     blog.title = req.body.title || blog.title;
//     blog.content = req.body.content || blog.content;
//     blog.placeId = req.body.placeId || blog.placeId;
//     blog.tags = req.body.tags ? JSON.parse(req.body.tags) : blog.tags;

//     if (newImages.length) {
//       blog.coverImages.push(...newImages);
//     }

//     await blog.save();

//     res.json({ success: true, data: blog });

//   } catch (error) {
//     res.status(500).json({ success: false, error: error.message });
//   }
// };

// /**
//  * Delete blog
//  * DELETE /api/blogs/:id
//  */
// exports.deleteBlog = async (req, res) => {
//   try {
//     const blog = await Blog.findById(req.params.id);

//     if (!blog) {
//       return res.status(404).json({
//         success: false,
//         message: 'Blog not found'
//       });
//     }

//     // Check ownership
//     if (blog.authorId.toString() !== req.user._id.toString()) {
//       return res.status(403).json({
//         success: false,
//         message: 'You are not authorized to delete this blog'
//       });
//     }

//     await blog.deleteOne();

//     res.json({
//       success: true,
//       message: 'Blog deleted successfully'
//     });

//   } catch (error) {
//     console.error('Delete blog error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to delete blog',
//       error: error.message
//     });
//   }
// };

// /**
//  * Publish blog
//  * POST /api/blogs/:id/publish
//  */
// exports.publishBlog = async (req, res) => {
//   try {
//     const blog = await Blog.findById(req.params.id);

//     if (!blog) {
//       return res.status(404).json({
//         success: false,
//         message: 'Blog not found'
//       });
//     }

//     // Check ownership
//     if (blog.authorId.toString() !== req.user._id.toString()) {
//       return res.status(403).json({
//         success: false,
//         message: 'You are not authorized to publish this blog'
//       });
//     }

//     blog.status = 'published';
//     blog.publishedAt = new Date();
//     await blog.save();

//     res.json({
//       success: true,
//       message: 'Blog published successfully',
//       data: blog
//     });

//   } catch (error) {
//     console.error('Publish blog error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to publish blog',
//       error: error.message
//     });
//   }
// };

// /**
//  * Get user's blogs
//  * GET /api/blogs/my/blogs
//  */
// exports.getMyBlogs = async (req, res) => {
//   try {
//     const { page = 1, limit = 20, status } = req.query;
//     const skip = (page - 1) * limit;

//     const query = { authorId: req.user._id };
//     if (status) query.status = status;

//     const blogs = await Blog.find(query)
//       .populate('placeId', 'name city state country')
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(parseInt(limit));

//     const total = await Blog.countDocuments(query);

//     res.json({
//       success: true,
//       data: blogs,
//       pagination: {
//         currentPage: parseInt(page),
//         totalPages: Math.ceil(total / limit),
//         totalBlogs: total,
//         limit: parseInt(limit)
//       }
//     });

//   } catch (error) {
//     console.error('Get my blogs error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch blogs',
//       error: error.message
//     });
//   }
// };



const Blog = require('../models/Blog');
const Place = require('../models/Place');
const cloudinaryService = require("../services/cloudinaryService");

/**
 * ============================
 * GET ALL BLOGS (PUBLIC)
 * GET /api/blogs
 * ============================
 */
exports.getBlogs = async (req, res) => {
  try {
    const { page = 1, limit = 20, status = 'published', search } = req.query;
    const skip = (page - 1) * limit;

    const query = { status };

    if (search) {
      query.$text = { $search: search };
    }

    const blogs = await Blog.find(query)
      .populate('authorId', 'name profilePhoto')
      .populate('placeId', 'name city state country')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Blog.countDocuments(query);

    res.json({
      success: true,
      data: blogs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalBlogs: total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch blogs',
      error: error.message
    });
  }
};

/**
 * ============================
 * GET BLOG BY ID
 * GET /api/blogs/:id
 * ============================
 */
exports.getBlogById = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id)
      .populate('authorId', 'name profilePhoto email')
      .populate('placeId', 'name city state country location');

    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    // 🔐 BLOCK UNPUBLISHED BLOG FOR OTHERS
    if (
      blog.status !== "published" &&
      (!req.user || blog.authorId.toString() !== req.user._id.toString())
    ) {
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }

    // ✅ Correct views increment
    blog.views += 1;
    await blog.save();

    res.json({ success: true, data: blog });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch blog',
      error: error.message
    });
  }
};

/**
 * ============================
 * GET BLOGS BY PLACE
 * GET /api/blogs/place/:placeId
 * ============================
 */
exports.getBlogsByPlace = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const query = {
      placeId: req.params.placeId,
      status: 'published'
    };

    const blogs = await Blog.find(query)
      .populate('authorId', 'name profilePhoto')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Blog.countDocuments(query);

    res.json({
      success: true,
      data: blogs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalBlogs: total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch blogs',
      error: error.message
    });
  }
};

/**
 * ============================
 * CREATE BLOG (LOGIN REQUIRED)
 * POST /api/blogs
 * ============================
 */
exports.createBlog = async (req, res) => {
  try {
    const { title, content, placeId, tags } = req.body;

    const place = await Place.findById(placeId);
    if (!place) {
      return res.status(404).json({ success: false, message: 'Place not found' });
    }

    let coverImages = [];
    if (req.files?.length) {
      for (const file of req.files) {
        const upload = await cloudinaryService.uploadPhoto(
          file.buffer,
          file.mimetype,
          { folder: 'blogs/covers' }
        );

        coverImages.push({
          url: upload.secure_url,
          publicId: upload.public_id
        });
      }
    }

    const blog = await Blog.create({
      authorId: req.user._id,
      placeId,
      title,
      content,
      coverImages,
      tags: tags ? JSON.parse(tags) : [],
      status: 'published',
      publishedAt: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Blog published successfully',
      data: blog
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create blog',
      error: error.message
    });
  }
};

/**
 * ============================
 * UPDATE BLOG (ONLY OWNER)
 * PUT /api/blogs/:id
 * ============================
 */
exports.updateBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    if (blog.authorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    let newImages = [];
    if (req.files?.length) {
      for (const file of req.files) {
        const upload = await cloudinaryService.uploadPhoto(
          file.buffer,
          file.mimetype,
          { folder: 'blogs/covers' }
        );

        newImages.push({
          url: upload.secure_url,
          publicId: upload.public_id
        });
      }
    }

    blog.title = req.body.title || blog.title;
    blog.content = req.body.content || blog.content;
    blog.placeId = req.body.placeId || blog.placeId;
    blog.tags = req.body.tags ? JSON.parse(req.body.tags) : blog.tags;

    if (newImages.length) {
      blog.coverImages.push(...newImages);
    }

    await blog.save();

    res.json({ success: true, data: blog });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * ============================
 * DELETE BLOG (ONLY OWNER)
 * DELETE /api/blogs/:id
 * ============================
 */
exports.deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    if (blog.authorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    // ✅ Delete images from Cloudinary
    if (Array.isArray(blog.coverImages)) {
      for (const img of blog.coverImages) {
        if (img?.publicId) {
          await cloudinaryService.deletePhoto(img.publicId);
        }
      }
    }

    await blog.deleteOne();

    res.json({
      success: true,
      message: 'Blog deleted successfully'
    });
  } catch (error) {
    console.error('Delete blog error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete blog',
      error: error.message
    });
  }
};

/**
 * ============================
 * GET MY BLOGS
 * GET /api/blogs/my/blogs
 * ============================
 */
exports.getMyBlogs = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (page - 1) * limit;

    const query = { authorId: req.user._id };
    if (status) query.status = status;

    const blogs = await Blog.find(query)
      .populate('placeId', 'name city state country')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Blog.countDocuments(query);

    res.json({
      success: true,
      data: blogs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalBlogs: total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch blogs',
      error: error.message
    });
  }
};



exports.publishBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    if (blog.authorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    blog.status = "published";
    blog.publishedAt = new Date();
    await blog.save();

    res.json({
      success: true,
      message: "Blog published successfully",
      blog
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
