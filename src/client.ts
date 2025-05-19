import { hc } from 'hono/client'
import { WechatTokenServiceType } from './server'
import { WechatMultipleTokenServiceType } from './multi-server'

export function createClient(...params: Parameters<typeof hc>) {
  return hc<WechatTokenServiceType>(...params)
}
export type WechatTokenService = ReturnType<typeof createClient>

export function createMultipleClient(...params: Parameters<typeof hc>) {
  return hc<WechatMultipleTokenServiceType>(...params)
}
export type WechatMultipleTokenService = ReturnType<typeof createMultipleClient>
