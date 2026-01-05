const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_REDIRECT_URI
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        if (!profile?.emails?.length) {
          return done(new Error("Google email not found"), null);
        }

        const email = profile.emails[0].value.toLowerCase();

        let user = await User.findOne({ email });

        // 👇 Agar user pehle se hai
        if (user) {
          if (!user.googleId) {
            user.googleId = profile.id;
            user.provider = "google";
            user.isEmailVerified = true;
            await user.save();
          }
          return done(null, user);
        }

        // 👇 New user → auto signup
        user = await User.create({
          googleId: profile.id,
          name: profile.displayName,
          email,
          profilePhoto: profile.photos?.[0]?.value || "",
          provider: "google",
          isEmailVerified: true
        });

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

module.exports = passport;
