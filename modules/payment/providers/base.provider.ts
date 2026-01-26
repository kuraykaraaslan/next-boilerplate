import { AxiosInstance } from 'axios'

export default abstract class BasePaymentProvider {
  abstract readonly name: string
  abstract getAxiosInstance(): AxiosInstance
  abstract getPaymentStatus(token: string): Promise<any>
}
