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

    // 设置刷新函数
    token.setRefreshFunction(async () => {
      return await cgiBin.getAccessToken()
    })

    stableToken.setRefreshFunction(async () => {
      return await cgiBin.getStableAccessToken(false)
    })

    tickets.jsapi.setRefreshFunction(async () => {
      // 依赖于token的获取函数
      const accessToken = await token.getToken()
      return await cgiBin.ticket.getTicket(accessToken, 'jsapi')
    })

    appInstances.set(appId, { cgiBin, token, stableToken, tickets })
  }

  // 通用的应用ID验证
  const appIdValidator = zValidator(
    'query',
    z.object({
      appId: z.string().refine((id) => appInstances.has(id), {
        message: '无效的应用ID',
      }),
    }),
  )

  // 创建Hono应用
  const app = new Hono()

    // 获取普通访问令牌
    .get('/token', appIdValidator, async (c) => {
      try {
        const { appId } = c.req.valid('query')
        const instance = appInstances.get(appId)!

        const tokenValue = await instance.token.getToken()
        return c.text(tokenValue)
      } catch (error) {
        console.error('获取token失败:', error)
        return new Response('获取token失败', { status: 500 })
      }
    })

    // 获取稳定版访问令牌
    .get(
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
        try {
          const { appId, forceRefresh } = c.req.valid('query')
          const instance = appInstances.get(appId)!
          const forceRefreshBool = forceRefresh === 'true'

          // 如果需要强制刷新，临时更新刷新函数
          if (forceRefreshBool) {
            instance.stableToken.setRefreshFunction(async () => {
              return await instance.cgiBin.getStableAccessToken(true)
            })
          }

          const tokenValue =
            await instance.stableToken.getToken(forceRefreshBool)
          return c.text(tokenValue)
        } catch (error) {
          console.error('获取稳定token失败:', error)
          return new Response('获取稳定token失败', { status: 500 })
        }
      },
    )

    // 获取票据
    .get(
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
        try {
          const { appId, accessToken, type } = c.req.valid('query')
          const instance = appInstances.get(appId)!
          const ticket = instance.tickets[type]

          if (!ticket) {
            return new Response('无效的票据类型', { status: 400 })
          }

          // 为了使用传入的accessToken，临时更新刷新函数
          ticket.setRefreshFunction(async () => {
            return await instance.cgiBin.ticket.getTicket(accessToken, type)
          })

          const ticketValue = await ticket.getToken()
          return c.text(ticketValue)
        } catch (error) {
          console.error('获取票据失败:', error)
          return new Response('获取票据失败', { status: 500 })
        }
      },
    )

  return app
}

export type WechatMultipleTokenServiceType = ReturnType<
  typeof createMultipleServer
>
