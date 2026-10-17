import type { Request } from "express";
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { env } from "../config/index.js";
import { redis } from "../config/redis.js";

type RedisReply = boolean | number | string | Array<boolean | number | string>;

const redisSendCommand = async (...args: string[]): Promise<RedisReply> => {
  const [command, ...commandArgs] = args;
  if (!command) {
    return "";
  }
  return (await redis.call(command, ...commandArgs)) as RedisReply;
};

export const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: redisSendCommand,
    prefix: "rl:api:"
  }),
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests"
    }
  }
});

export const publicLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: redisSendCommand,
    prefix: "rl:public:"
  }),
  message: {
    success: false,
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many requests. Please try again later."
    }
  }
});

export const authLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: redisSendCommand,
    prefix: "rl:auth:"
  }),
  keyGenerator: (req: Request) => `${req.ip}:${String(req.body?.email ?? "unknown").toLowerCase()}`,
  message: {
    success: false,
    error: {
      code: "TOO_MANY_ATTEMPTS",
      message: "Too many failed attempts. Try again in 15 minutes."
    }
  }
});

// AI summaries cost money and process health data: limited per user, not per IP.
// Mounted after `authenticate`, so req.user is always set here.
const aiUserKey = (req: Request) => `user:${req.user?.id ?? req.ip ?? "unknown"}`;

export const aiSummaryLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: redisSendCommand,
    prefix: "rl:ai:minute:"
  }),
  keyGenerator: aiUserKey,
  message: {
    success: false,
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many summary requests. Please try again in a minute."
    }
  }
});

export const aiSummaryDailyLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: env.AI_SUMMARY_DAILY_LIMIT,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: redisSendCommand,
    prefix: "rl:ai:day:"
  }),
  keyGenerator: aiUserKey,
  message: {
    success: false,
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "You have reached the daily summary limit. Please try again tomorrow."
    }
  }
});
