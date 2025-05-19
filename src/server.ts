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

  const app = new Hono()
    .get('/token', async (c) => {
      if (token.expired) {
        const result = await cgiBin.getAccessToken()
        if ('errcode' in result) {
          console.error(result)
          return new Response('Call remote error', { status: 500 })
        } else {
          token.setToken(result.accessToken, result.expiresIn)
        }
      }
      return c.text(token.value ?? '')
    })
    .get(
      '/token/stable',
      zValidator(
        'query',
        z.optional(z.object({ forceRefresh: z.enum(['true']) })),
      ),
      async (c) => {
        if (stableToken.expired) {
          const url = new URL(c.req.url)
          const forceRefresh = !!url.searchParams.get('forceRefresh')
          const result = await cgiBin.getStableAccessToken(forceRefresh)
          if ('errcode' in result) {
            console.error(result)
            return new Response('Call remote error', { status: 500 })
          } else {
            stableToken.setToken(result.accessToken, result.expiresIn)
          }
        }
        return c.text(stableToken.value ?? '')
      },
    )
    .get(
      '/ticket',
      zValidator(
        'query',
        z.object({ accessToken: z.string(), type: z.enum(['jsapi']) }),
      ),
      async (c) => {
        const { accessToken, type } = c.req.valid('query')
        const ticket = tickets[type]
        if (!ticket) {
          return new Response('Invalid ticket type', { status: 400 })
        }
        if (ticket.expired) {
          const result = await cgiBin.ticket.getTicket(accessToken, type)
          if (result.errcode !== 0) {
            console.error(result)
            return new Response('Call remote error', { status: 500 })
          } else {
            ticket.setToken(result.ticket, result.expires_in)
          }
        }
        return c.text(ticket.value ?? '')
      },
    )

  return app
}

export type WechatTokenServiceType = ReturnType<typeof createServer>
