declare const client: {
    token: import("hono/client").ClientRequest<{
        $get: {
            input: {};
            output: {};
            outputFormat: string;
            status: import("hono/utils/http-status").StatusCode;
        };
    }>;
} & {
    token: {
        stable: import("hono/client").ClientRequest<{
            $get: {
                input: {
                    query?: {
                        forceRefresh: string | string[];
                    } | undefined;
                };
                output: {};
                outputFormat: string;
                status: import("hono/utils/http-status").StatusCode;
            };
        }>;
    };
};
export default client;
