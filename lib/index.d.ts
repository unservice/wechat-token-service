import { Hono } from "hono";
declare const app: Hono<
  {},
  {
    "/token": {
      $get: {
        input: {};
        output: {};
        outputFormat: string;
        status: import("hono/utils/http-status").StatusCode;
      };
    };
  } & {
    "/token/stable": {
      $get: {
        input: {
          query?:
            | {
                forceRefresh: string | string[];
              }
            | undefined;
        };
        output: {};
        outputFormat: string;
        status: import("hono/utils/http-status").StatusCode;
      };
    };
  },
  "/"
>;
export default app;
export type AppType = typeof app;
