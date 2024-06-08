import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

export const authentication = createMiddleware<{ Variables: {} }>(
  async (c, next) => {
    const secret = c.req.header("X-Authentication");
    if (secret !== process.env.SERVICE_SECRET) {
      throw new HTTPException(403);
    }
    await next();
  },
);
