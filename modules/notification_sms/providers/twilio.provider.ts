import { env } from '@/modules/env';
import BaseProvider from "./base.provider";
import axios, { AxiosInstance } from "axios";
import qs from "qs";
import Logger from "@/modules/logger";

export default class TwilioProvider extends BaseProvider {
  private static readonly TWILIO_ACCOUNT_SID = env.TWILIO_ACCOUNT_SID!;
  private static readonly TWILIO_AUTH_TOKEN = env.TWILIO_AUTH_TOKEN!;
  private static readonly TWILIO_PHONE_NUMBER = env.TWILIO_PHONE_NUMBER!;
  private static readonly TWILIO_BASE_URL = `https://api.twilio.com/2010-04-01/Accounts/${TwilioProvider.TWILIO_ACCOUNT_SID}`;

  private static readonly axiosInstance: AxiosInstance = axios.create({
    baseURL: TwilioProvider.TWILIO_BASE_URL,
    auth: {
      username: TwilioProvider.TWILIO_ACCOUNT_SID,
      password: TwilioProvider.TWILIO_AUTH_TOKEN,
    },
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  async sendShortMessage(to: string, body: string): Promise<void> {
    if (
      !TwilioProvider.TWILIO_ACCOUNT_SID ||
      !TwilioProvider.TWILIO_AUTH_TOKEN ||
      !TwilioProvider.TWILIO_PHONE_NUMBER
    ) {
      Logger.error("Twilio credentials are not set.");
      return;
    }

    if (!to || !body) {
      Logger.info("Missing phone number or message body.");
      return;
    }

    const payload = qs.stringify({
      From: TwilioProvider.TWILIO_PHONE_NUMBER,
      To: to,
      Body: body,
    });

    try {
      const response = await TwilioProvider.axiosInstance.post("/Messages.json", payload);
      if (response.status === 201) {
        Logger.info(`Twilio: Message sent successfully to ${to}`);
      } else {
        Logger.error(`Twilio: Unexpected response status: ${response.status} for ${to}`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      Logger.error(`Twilio SMS error to ${to}: ${message}`);
    }
  }
}
