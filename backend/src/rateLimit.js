import redis from "./redis.js";

export default async function rateLimit(req, res, next) {
  const isAuth = !!req.user;

  const limit = isAuth ? 10 : 5;
  const key = isAuth
    ? `rate:user:${req.user.id}:shorten`
    : `rate:ip:${req.ip}:shorten`;

  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, 60);
  }

  const ttl = await redis.ttl(key);

  res.setHeader("X-RateLimit-Limit", limit);
  res.setHeader("X-RateLimit-Remaining", Math.max(0, limit - count));
  res.setHeader("X-RateLimit-Reset", ttl);

  if (count > limit) {
    return res.status(429).json({
      message: "Too many requests, try again later",
    });
  }

  next();
}