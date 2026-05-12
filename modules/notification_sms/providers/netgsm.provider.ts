import { env } from '@/modules/env';
import BaseProvider from "./base.provider";
import axios, { AxiosInstance } from "axios";
import FormData from "form-data";
import Logger from "@/modules/logger";

export default class NetGSMProvider extends BaseProvider {
  private static readonly NETGSM_USER_CODE = env.NETGSM_USER_CODE!;
  private static readonly NETGSM_PASSWORD = env.NETGSM_PASSWORD!;
  private static readonly NETGSM_PHONE_NUMBER = env.NETGSM_PHONE_NUMBER!;
  private static readonly NETGSM_BASE_URL = "https://api.netgsm.com.tr/sms/send/get";

  private static readonly axiosInstance: AxiosInstance = axios.create({
    baseURL: NetGSMProvider.NETGSM_BASE_URL,
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  async sendShortMessage(to: string, body: string): Promise<void> {
    if (
      !NetGSMProvider.NETGSM_USER_CODE ||
      !NetGSMProvider.NETGSM_PASSWORD ||
      !NetGSMProvider.NETGSM_PHONE_NUMBER
    ) {
      Logger.error("NetGSM credentials are not set.");
      return;
    }

    if (!to?.trim() || !body?.trim()) {
      Logger.info("Missing phone number or message body.");
      return;
    }

    const formData = new FormData();
    formData.append("usercode", NetGSMProvider.NETGSM_USER_CODE);
    formData.append("password", NetGSMProvider.NETGSM_PASSWORD);
    formData.append("gsmno", to);
    formData.append("message", body);
    formData.append("msgheader", NetGSMProvider.NETGSM_PHONE_NUMBER);
    formData.append("filter", "0");

    try {
      const response = await NetGSMProvider.axiosInstance.post("", formData, {
        headers: formData.getHeaders?.() || {},
      });
      const data = response.data;

      if (typeof data === "string" && (data.startsWith("00") || /^\d{9,}$/.test(data))) {
        Logger.info(`NetGSM: Message sent successfully to ${to}. Response: ${data}`);
      } else {
        Logger.error(`NetGSM: Failed to send message to ${to}. Response: ${data}`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      Logger.error(`NetGSM error sending to ${to}: ${message}`);
    }
  }
}
