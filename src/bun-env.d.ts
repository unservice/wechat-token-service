declare module "bun" {
  interface Env {
    WECHAT_APP_ID: string;
    WECHAT_APP_SECRET: string;
    WECHAT_API_DOMAIN: string;
  }
}
