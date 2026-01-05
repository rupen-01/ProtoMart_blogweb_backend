const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },

    provider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },

    googleId: {
      type: String,
      default: null,
    },

    phone: {
      type: String,
      trim: true,
      match: [/^[0-9]{10}$/, "Please enter a valid 10-digit phone number"],
    },

    password: {
      type: String,
      minlength: 6,
      select: false,
      required: function () {
        return this.provider === "local";
      },
    },

    profilePhoto: {
      type: String,
      default: null,
    },

    dateOfBirth: {
      type: Date,
      required: function () {
        return this.provider === "local";
      },
    },

    pinCode: {
      type: String,
      match: [/^[0-9]{6}$/, "Please enter a valid 6-digit pin code"],
      required: function () {
        return this.provider === "local";
      },
    },

    address: {
      fullAddress: String,
      city: String,
      state: String,
      country: String,
    },

    walletBalance: {
      type: Number,
      default: 0,
      min: 0,
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    emailVerificationToken: String,
    resetPasswordToken: String,
    resetPasswordExpire: Date,

    role: {
      type: String,
      enum: ["user", "admin", "superadmin"],
      default: "user",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

/**
 * Hash password only for local users
 */
userSchema.pre("save", async function () {
  if (this.provider !== "local") return;
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});


/**
 * Password match method
 */
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
