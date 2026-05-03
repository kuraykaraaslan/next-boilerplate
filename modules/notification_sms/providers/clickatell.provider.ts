import { env } from '@/libs/env';
import BaseProvider from "./base.provider";
import axios, { AxiosInstance } from "axios";
import Logger from "@/libs/logger";

export default class ClickatellProvider extends BaseProvider {
  private static readonly CLICKATELL_API_KEY = env.CLICKATELL_API_KEY!;
  private static readonly CLICKATELL_BASE_URL = "https://platform.clickatell.com/messages";

  private static readonly axiosInstance: AxiosInstance = axios.create({
    baseURL: ClickatellProvider.CLICKATELL_BASE_URL,
    headers: {
      Authorization: `Bearer ${ClickatellProvider.CLICKATELL_API_KEY}`,
      "Content-Type": "application/json",
    },
  });

  async sendShortMessage(to: string, body: string): Promise<void> {
    if (!ClickatellProvider.CLICKATELL_API_KEY) {
      Logger.error("Clickatell credentials are not set.");
      return;
    }

    if (!to || !body) {
      Logger.info("Missing phone number or message body.");
      return;
    }

    const payload = {
      content: body,
      to: [to],
    };

    try {
      const response = await ClickatellProvider.axiosInstance.post("/chat", payload);
      if (response.status === 202) {
        Logger.info(`Clickatell: Message accepted for delivery to ${to}`);
      } else {
        Logger.error(`Clickatell: Unexpected response status ${response.status} for ${to}`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      Logger.error(`Clickatell SMS error to ${to}: ${message}`);
    }
  }
}
