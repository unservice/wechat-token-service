import { hc } from "hono/client";
import type { WechatTokenServiceType } from ".";

export function createWechatTokenService(origin: string) {
  return hc<WechatTokenServiceType>(origin);
}
