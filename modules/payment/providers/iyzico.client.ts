import CryptoJS from 'crypto-js'
import axios, { AxiosInstance } from 'axios'
import { PAYMENT_MESSAGES } from '../payment.messages'
import SettingService from '@/modules/setting/setting.service'

export async function getConfig(tenantId: string) {
  const [apiKey, secretKey, sandbox] = await Promise.all([
    SettingService.getValue(tenantId, 'iyzicoApiKey'),
    SettingService.getValue(tenantId, 'iyzicoSecretKey'),
    SettingService.getValue(tenantId, 'iyzicoSandboxMode'),
  ])
  if (!apiKey || !secretKey) throw new Error(PAYMENT_MESSAGES.PROVIDER_NOT_CONFIGURED)

  const baseUrl = sandbox === 'true'
    ? 'https://sandbox-api.iyzipay.com'
    : 'https://api.iyzipay.com'

  return { apiKey, secretKey, baseUrl }
}

export function generateAuthorizationString(
  apiKey: string,
  secretKey: string,
  payload: string,
  uriPath: string,
): { authorization: string; 'x-iyzi-rnd': string } {
  const randomKey = `${Date.now()}123456789`
  const fullPayload = randomKey + uriPath + payload
  const signature = CryptoJS.HmacSHA256(fullPayload, secretKey).toString()
  const authStr = `apiKey:${apiKey}&randomKey:${randomKey}&signature:${signature}`
  const encoded = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(authStr))

  return {
    authorization: `IYZWSv2 ${encoded}`,
    'x-iyzi-rnd': randomKey,
  }
}

export async function getAuthenticatedAxios(tenantId: string): Promise<AxiosInstance> {
  const config = await getConfig(tenantId)
  const client = axios.create({
    baseURL: config.baseUrl,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  })

  client.interceptors.request.use((reqConfig) => {
    const uriPath = reqConfig.url!
    const payload = reqConfig.data ? JSON.stringify(reqConfig.data) : ''
    const auth = generateAuthorizationString(config.apiKey, config.secretKey, payload, uriPath)
    reqConfig.headers['authorization'] = auth.authorization
    reqConfig.headers['x-iyzi-rnd'] = auth['x-iyzi-rnd']
    return reqConfig
  })

  return client
}
