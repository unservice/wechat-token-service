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

## Run multiple server

```ts
import { createMultipleServer } from './multi-server'

const app = createMultipleServer([
  {
    appId: 'wx123456',
    appSecret: 'your-secret-1',
    apiDomain: 'api.weixin.qq.com',
  },
  {
    appId: 'wx654321',
    appSecret: 'your-secret-2',
    apiDomain: 'api.weixin.qq.com',
  },
])

// 访问时需要指定appId参数：
// GET /token?appId=wx123456
// GET /token/stable?appId=wx123456&forceRefresh=true
// GET /ticket?appId=wx123456&accessToken=xxx&type=jsapi
```

## Authentication

As you like!
