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
      message: "Çok fazla istek gönderdiniz"
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
      message: "Çok fazla talep gönderdiniz. Daha sonra tekrar deneyin."
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
      message: "Çok fazla başarısız deneme. 15 dakika sonra tekrar deneyin."
    }
  }
});
