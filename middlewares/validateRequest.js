const { body, param, query, validationResult } = require('express-validator');

/**
 * Validate request and return errors if any
 */
exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  }
  
  next();
};

/**
 * Validation rules for registration
 */
exports.registerValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
  
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  
  body('phone')
    .optional()
    .matches(/^[0-9]{10}$/).withMessage('Phone number must be 10 digits'),
  
  body('dateOfBirth')
    .notEmpty().withMessage('Date of birth is required')
    .isISO8601().withMessage('Invalid date format'),
  
  body('pinCode')
    .notEmpty().withMessage('Pin code is required')
    .matches(/^[0-9]{6}$/).withMessage('Pin code must be 6 digits')
];

/**
 * Validation rules for login
 */
exports.loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email'),
  
  body('password')
    .notEmpty().withMessage('Password is required')
];

/**
 * Validation rules for blog creation
 */
exports.createBlogValidation = [
  body('placeId')
    .notEmpty().withMessage('Place ID is required')
    .isMongoId().withMessage('Invalid place ID'),
  
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ min: 5, max: 200 }).withMessage('Title must be 5-200 characters'),
  
  body('content')
    .trim()
    .notEmpty().withMessage('Content is required')
    .isLength({ min: 50 }).withMessage('Content must be at least 50 characters')
];

/**
 * Validation rules for watermark settings
 */
exports.watermarkValidation = [
  body('text')
    .trim()
    .notEmpty().withMessage('Watermark text is required'),
  
  body('fontSize')
    .optional()
    .isInt({ min: 10, max: 100 }).withMessage('Font size must be 10-100'),
  
  body('color')
    .optional()
    .matches(/^#[0-9A-F]{6}$/i).withMessage('Invalid hex color'),
  
  body('opacity')
    .optional()
    .isFloat({ min: 0, max: 1 }).withMessage('Opacity must be 0-1')
];

/**
 * Validation for MongoDB ObjectId params
 */
exports.validateObjectId = [
  param('id')
    .isMongoId().withMessage('Invalid ID format')
];