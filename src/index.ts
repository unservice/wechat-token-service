import { Hono } from "hono";
import { CgiBin } from "@unservice/wechat-sdk/lib/cgi-bin";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { authentication } from "./middleware/authentication";

const cgiBin = new CgiBin(
  import.meta.env.WECHAT_APP_ID as string,
  import.meta.env.WECHAT_APP_SECRET as string,
  import.meta.env.WECHAT_API_DOMAIN as string,
);

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

const token = new AccessToken({ windowSeconds: 300 });
const stableToken = new AccessToken({ windowSeconds: 300 });

const app = new Hono()
  .use(authentication)
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
      z.optional(z.object({ forceRefresh: z.enum(["true"]) })),
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
    },
  );

export default app;
export type WechatTokenServiceType = typeof app;
