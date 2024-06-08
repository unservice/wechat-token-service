import { hc } from "hono/client";
import type { WechatTokenServiceType } from ".";

export function createWechatTokenService(...params: Parameters<typeof hc>) {
  return hc<WechatTokenServiceType>(...params);
}
export type WechatTokenService = ReturnType<typeof createWechatTokenService>;
