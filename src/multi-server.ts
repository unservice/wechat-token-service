import { CgiBin } from '@unservice/wechat-sdk'
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { AccessToken, Ticket } from './token'

type AppConfig = {
  appId: string
  appSecret: string
  apiDomain: string
}

type AppInstance = {
  cgiBin: CgiBin
  token: AccessToken
  stableToken: AccessToken
  tickets: {
    jsapi: Ticket
  }
}

export function createMultipleServer(configs: AppConfig[]) {
  if (configs.length === 0) {
    throw new Error('至少需要一个应用配置')
  }

  // 创建应用实例映射
  const appInstances = new Map<string, AppInstance>()

  // 初始化每个应用实例
  for (const config of configs) {
    const { appId, appSecret, apiDomain } = config
    const cgiBin = new CgiBin(appId, appSecret, apiDomain)
    const token = new AccessToken({ windowSeconds: 300 })
    const stableToken = new AccessToken({ windowSeconds: 300 })
    const tickets = {
      jsapi: new Ticket({ windowSeconds: 300 }),
    }

    appInstances.set(appId, { cgiBin, token, stableToken, tickets })
  }

  // 创建Hono应用
  const app = new Hono()

  // 通用的应用ID验证
  const appIdValidator = zValidator(
    'query',
    z.object({
      appId: z.string().refine((id) => appInstances.has(id), {
        message: '无效的应用ID',
      }),
    }),
  )

  // 获取普通访问令牌
  app.get('/token', appIdValidator, async (c) => {
    const { appId } = c.req.valid('query')
    const instance = appInstances.get(appId)!

    if (instance.token.expired) {
      const result = await instance.cgiBin.getAccessToken()
      if ('errcode' in result) {
        console.error(result)
        return new Response('调用远程接口错误', { status: 500 })
      } else {
        instance.token.setToken(result.accessToken, result.expiresIn)
      }
    }
    return c.text(instance.token.value ?? '')
  })

  // 获取稳定版访问令牌
  app.get(
    '/token/stable',
    appIdValidator,
    zValidator(
      'query',
      z.object({
        appId: z.string(),
        forceRefresh: z.enum(['true']).optional(),
      }),
    ),
    async (c) => {
      const { appId, forceRefresh } = c.req.valid('query')
      const instance = appInstances.get(appId)!

      if (instance.stableToken.expired) {
        const forceRefreshBool = forceRefresh === 'true'
        const result =
          await instance.cgiBin.getStableAccessToken(forceRefreshBool)

        if ('errcode' in result) {
          console.error(result)
          return new Response('调用远程接口错误', { status: 500 })
        } else {
          instance.stableToken.setToken(result.accessToken, result.expiresIn)
        }
      }
      return c.text(instance.stableToken.value ?? '')
    },
  )

  // 获取票据
  app.get(
    '/ticket',
    appIdValidator,
    zValidator(
      'query',
      z.object({
        appId: z.string(),
        accessToken: z.string(),
        type: z.enum(['jsapi']),
      }),
    ),
    async (c) => {
      const { appId, accessToken, type } = c.req.valid('query')
      const instance = appInstances.get(appId)!
      const ticket = instance.tickets[type]

      if (!ticket) {
        return new Response('无效的票据类型', { status: 400 })
      }

      if (ticket.expired) {
        const result = await instance.cgiBin.ticket.getTicket(accessToken, type)

        if (result.errcode !== 0) {
          console.error(result)
          return new Response('调用远程接口错误', { status: 500 })
        } else {
          ticket.setToken(result.ticket, result.expires_in)
        }
      }

      return c.text(ticket.value ?? '')
    },
  )

  return app
}

export type WechatMultipleTokenServiceType = ReturnType<
  typeof createMultipleServer
>
