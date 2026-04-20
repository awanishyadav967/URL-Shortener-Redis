import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import {prisma} from "./prisma.js";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (_, __, profile, done) => {
      const email = profile.emails[0].value;

      let user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            email,
            provider: "google",
          },
        });
      }

      return done(null, user);
    }
  )
);

export default passport;
