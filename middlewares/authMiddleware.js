const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Protect routes - JWT verification
 */
exports.protect = async (req, res, next) => {
  try {
    let token;

    // 1️⃣ Get token from header
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized to access this route. Please login."
      });
    }

    // 2️⃣ Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded || !decoded.id) {
      return res.status(401).json({
        success: false,
        message: "Invalid token payload"
      });
    }

    // 3️⃣ Get user
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found"
      });
    }

    if (user.isActive === false) {
      return res.status(401).json({
        success: false,
        message: "Account has been deactivated"
      });
    }

    req.user = user;
    next();

  } catch (error) {
    console.error("JWT Auth Error:", error.message);

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
