import type { AppType } from ".";
import { hc } from "hono/client";

const client = hc<AppType>(process.env.WECHAT_TOKEN_SERVICE_ORIGIN);
export default client;
