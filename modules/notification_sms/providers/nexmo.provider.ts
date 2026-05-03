import { env } from '@/libs/env';
import BaseProvider from "./base.provider";
import axios, { AxiosInstance } from "axios";
import qs from "qs";
import Logger from "@/libs/logger";

export default class NexmoProvider extends BaseProvider {
  private static readonly NEXMO_API_KEY = env.NEXMO_API_KEY!;
  private static readonly NEXMO_API_SECRET = env.NEXMO_API_SECRET!;
  private static readonly NEXMO_PHONE_NUMBER = env.NEXMO_PHONE_NUMBER!;
  private static readonly NEXMO_BASE_URL = "https://rest.nexmo.com/sms/json";

  private static readonly axiosInstance: AxiosInstance = axios.create({
    baseURL: NexmoProvider.NEXMO_BASE_URL,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  async sendShortMessage(to: string, body: string): Promise<void> {
    if (
      !NexmoProvider.NEXMO_API_KEY ||
      !NexmoProvider.NEXMO_API_SECRET ||
      !NexmoProvider.NEXMO_PHONE_NUMBER
    ) {
      Logger.error("Nexmo credentials are not set.");
      return;
    }

    if (!to || !body) {
      Logger.info("Missing phone number or message body.");
      return;
    }

    const payload = qs.stringify({
      api_key: NexmoProvider.NEXMO_API_KEY,
      api_secret: NexmoProvider.NEXMO_API_SECRET,
      to,
      from: NexmoProvider.NEXMO_PHONE_NUMBER,
      text: body,
    });

    try {
      const response = await NexmoProvider.axiosInstance.post("", payload);
      const messages = response.data?.messages;
      const message = messages?.[0];

      if (message && message.status === "0") {
        Logger.info(`Nexmo: Message sent successfully to ${to}`);
      } else {
        Logger.error(`Nexmo error to ${to}: ${message?.["error-text"] || "Unknown error"}`);
      }
    } catch (error: unknown) {
      const errMessage = error instanceof Error ? error.message : "Unknown error";
      Logger.error(`Nexmo SMS error to ${to}: ${errMessage}`);
    }
  }
}
