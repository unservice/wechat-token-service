import { hc } from "hono/client";
import { WechatTokenServiceType } from "./server";

export function createClient(...params: Parameters<typeof hc>) {
  return hc<WechatTokenServiceType>(...params);
}
export type WechatTokenService = ReturnType<typeof createClient>;
