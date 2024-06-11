# Wechat token service

![NPM Version](https://img.shields.io/npm/v/@unservice/wechat-token-service)

The simplest and most lightweight WeChat access token maintenance library

- A server for maintaining WeChat access token
- A RPC client to get WeChat access token from the server

## Run server

```ts
// app.ts

import { createServer } from '@unservice/wechat-token-service'

const app = createServer({
  appId: '',
  appSecret: '',
  apiDomain: '',
})

export default app
```

### Use bun

```bash
bun run app.ts
```

## Use client

```ts
const client = createClient('server origin')

const token = await client.token.$get().then((res) => res.text())
```

## Authentication

As you like!
