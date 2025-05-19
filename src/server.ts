import { CgiBin } from '@unservice/wechat-sdk'
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { AccessToken, Ticket } from './token'

export function createServer({
  appId,
  appSecret,
  apiDomain,
}: {
  appId: string
  appSecret: string
  apiDomain: string
}) {
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
    // 我们需要临时获取一个有效的accessToken来获取jsapi票据
    const accessToken = await token.getToken()
    return await cgiBin.ticket.getTicket(accessToken, 'jsapi')
  })

  const app = new Hono()
    .get('/token', async (c) => {
      try {
        const tokenValue = await token.getToken()
        return c.text(tokenValue)
      } catch (error) {
        console.error('获取token失败:', error)
        return new Response('获取token失败', { status: 500 })
      }
    })
    .get(
      '/token/stable',
      zValidator(
        'query',
        z.optional(z.object({ forceRefresh: z.enum(['true']) })),
      ),
      async (c) => {
        try {
          const url = new URL(c.req.url)
          const forceRefresh = url.searchParams.get('forceRefresh') === 'true'

          // 如果需要强制刷新，我们需要重新设置刷新函数
          if (forceRefresh) {
            stableToken.setRefreshFunction(async () => {
              return await cgiBin.getStableAccessToken(true)
            })
          }

          const tokenValue = await stableToken.getToken(forceRefresh)
          return c.text(tokenValue)
        } catch (error) {
          console.error('获取稳定token失败:', error)
          return new Response('获取稳定token失败', { status: 500 })
        }
      },
    )
    .get(
      '/ticket',
      zValidator(
        'query',
        z.object({ accessToken: z.string(), type: z.enum(['jsapi']) }),
      ),
      async (c) => {
        try {
          const { accessToken, type } = c.req.valid('query')
          const ticket = tickets[type]

          if (!ticket) {
            return new Response('无效的票据类型', { status: 400 })
          }

          // 为了使用传入的accessToken，我们临时更新刷新函数
          ticket.setRefreshFunction(async () => {
            return await cgiBin.ticket.getTicket(accessToken, type)
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

export type WechatTokenServiceType = ReturnType<typeof createServer>
