import "dotenv/config";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { prisma } from "./prisma.js";
import session from "express-session";
import passport from "./auth.js";
import rateLimit from "./rateLimit.js";
import redis from "./redis.js";
import { nanoid } from "nanoid";

dotenv.config();
const PORT = process.env.PORT || 4000;

const app = express();

app.use(
  cors({
    origin: "https://your-vercel-app.vercel.app",
    credentials: true,
    exposedHeaders: [
      "X-RateLimit-Limit",
      "X-RateLimit-Remaining",
      "X-RateLimit-Reset",
    ],
  })
);

app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  const user = await prisma.user.findUnique({ where: { id } });
  done(null, user);
});

// Health check
app.get("/", (req, res) => {
  res.send("API is running 🚀");
});

// Shorten URL (protected + rate limited)
app.post("/api/shorten", rateLimit, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Login required" });
  }

  const { original } = req.body;

  if (!original) {
    return res.status(400).json({ message: "URL is required" });
  }

  const short = nanoid(7);

  const url = await prisma.url.create({
    data: {
      original,
      short,
      userId: req.user.id,
    },
  });

  res.json({
    short: `http://localhost:4000/${short}`,
    original: url.original,
    clicks: url.clicks,
    createdAt: url.createdAt,
  });
});

// Get all URLs for logged in user
app.get("/api/urls", async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Login required" });
  }

  const urls = await prisma.url.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: "desc" },
  });

  res.json(urls);
});

// Redirect short URL
app.get("/:code", async (req, res) => {
  const { code } = req.params;

  // Check Redis cache first
  const cached = await redis.get(`url:${code}`);
  if (cached) {
    await prisma.url.update({
      where: { short: code },
      data: { clicks: { increment: 1 } },
    });
    return res.redirect(cached);
  }

  // Fallback to PostgreSQL
  const url = await prisma.url.findUnique({
    where: { short: code },
  });

  if (!url) {
    return res.status(404).json({ message: "URL not found" });
  }

  // Store in Redis cache (24 hour expiry)
  await redis.set(`url:${code}`, url.original, "EX", 86400);

  await prisma.url.update({
    where: { short: code },
    data: { clicks: { increment: 1 } },
  });

  res.redirect(url.original);
});

// Auth routes
app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["email", "profile"],
    session: true,
  })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    res.redirect("http://localhost:5173");
  }
);

app.get("/me", (req, res) => {
  res.json(req.user || null);
});

app.post("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out successfully" });
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
