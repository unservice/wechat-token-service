import { CgiBin } from "@unservice/wechat-sdk/lib/cgi-bin";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

class AccessToken {
  #value!: string;
  #expiresAt: number = 0;
  readonly #windowSeconds!: number;

  constructor(options: { windowSeconds: number }) {
    this.#windowSeconds = options.windowSeconds;
  }

  setToken(value: string, expiresIn: number) {
    this.#value = value;
    this.#expiresIn = expiresIn;
  }
  get value() {
    if (this.expired) {
      return null;
    }
    return this.#value;
  }
  get expired() {
    return this.#expiresAt < Date.now();
  }
  set #expiresIn(expiresIn: number) {
    this.#expiresAt = Date.now() + (expiresIn - this.#windowSeconds) * 1000;
  }
}

export function createServer({
  appId,
  appSecret,
  apiDomain,
}: {
  appId: string;
  appSecret: string;
  apiDomain: string;
}) {
  const cgiBin = new CgiBin(appId, appSecret, apiDomain);
  const token = new AccessToken({ windowSeconds: 300 });
  const stableToken = new AccessToken({ windowSeconds: 300 });

  const app = new Hono()
    .get("/token", async (c) => {
      if (token.expired) {
        const result = await cgiBin.getAccessToken();
        if ("errcode" in result) {
          console.error(result);
          return new Response("Call remote error", { status: 500 });
        } else {
          token.setToken(result.accessToken, result.expiresIn);
        }
      }
      return c.text(token.value ?? "");
    })
    .get(
      "/token/stable",
      zValidator(
        "query",
        z.optional(z.object({ forceRefresh: z.enum(["true"]) }))
      ),
      async (c) => {
        if (stableToken.expired) {
          const url = new URL(c.req.url);
          const forceRefresh = !!url.searchParams.get("forceRefresh");
          const result = await cgiBin.getStableAccessToken(forceRefresh);
          if ("errcode" in result) {
            console.error(result);
            return new Response("Call remote error", { status: 500 });
          } else {
            stableToken.setToken(result.accessToken, result.expiresIn);
          }
        }
        return c.text(stableToken.value ?? "");
      }
    );

  return app;
}

export type WechatTokenServiceType = ReturnType<typeof createServer>;
