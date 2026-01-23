const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Protect routes - JWT verification
 */
exports.protect = async (req, res, next) => {
  try {
    let token;
    
    // Debug: Check what we received
    console.log('🔍 [AUTH DEBUG] Request to:', req.method, req.path);
    console.log('🔍 [AUTH DEBUG] Headers:', req.headers);
    console.log('🔍 [AUTH DEBUG] Authorization header:', req.headers.authorization);
    
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
      console.log('✅ [AUTH DEBUG] Token extracted:', token ? 'YES' : 'NO');
      console.log('🔑 [AUTH DEBUG] Token preview:', token?.substring(0, 30) + '...');
    } else {
      console.log('❌ [AUTH DEBUG] No valid Authorization header');
    }
    
    if (!token) {
      console.log('❌ [AUTH DEBUG] Token missing!');
      return res.status(401).json({
        success: false,
        message: "Not authorized to access this route. Please login."
      });
    }
    
    // Verify token
    console.log('🔍 [AUTH DEBUG] Verifying token with JWT_SECRET...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ [AUTH DEBUG] Token decoded:', decoded);
    
    if (!decoded || !decoded.id) {
      console.log('❌ [AUTH DEBUG] Invalid token payload');
      return res.status(401).json({
        success: false,
        message: "Invalid token payload"
      });
    }
    
    // Get user
    console.log('🔍 [AUTH DEBUG] Looking for user with ID:', decoded.id);
    const user = await User.findById(decoded.id).select("-password");
    
    if (!user) {
      console.log('❌ [AUTH DEBUG] User not found in database');
      return res.status(401).json({
        success: false,
        message: "User not found"
      });
    }
    
    console.log('✅ [AUTH DEBUG] User found:', user.email);
    
    if (user.isActive === false) {
      console.log('❌ [AUTH DEBUG] User account is deactivated');
      return res.status(401).json({
        success: false,
        message: "Account has been deactivated"
      });
    }
    
    req.user = user;
    console.log('✅ [AUTH DEBUG] Authentication successful!');
    next();
  } catch (error) {
    console.error("❌ [JWT Auth Error]:", error.message);
    console.error("❌ [JWT Auth Error Stack]:", error.stack);
    return res.status(401).json({
      success: false,
      message: "Invalid token or token expired"
    });
  }
};

/**
 * Optional authentication
 */
exports.optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select("-password");
      } catch (err) {
        req.user = null;
      }
    }

    next();
  } catch (error) {
    next();
  }
};

/**
 * Role based access
 */
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authorized"
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not allowed`
      });
    }

    next();
  };
};

/**
 * Admin only
 */
exports.admin = (req, res, next) => {
  if (req.user?.role === "admin") {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: "Admin access only"
    });
  }
};
