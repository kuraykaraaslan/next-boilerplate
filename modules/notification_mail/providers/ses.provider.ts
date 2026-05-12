import { env } from '@/modules/env';
import axios from "axios";
import crypto from "crypto";
import Logger from "@/modules/logger";
import BaseMailProvider, { MailOptions, MailResult } from "./base.provider";

export default class SESProvider extends BaseMailProvider {
  readonly name = "AWS SES";

  private static readonly AWS_ACCESS_KEY_ID = env.AWS_SES_ACCESS_KEY_ID || env.AWS_ACCESS_KEY_ID;
  private static readonly AWS_SECRET_ACCESS_KEY = env.AWS_SES_SECRET_ACCESS_KEY || env.AWS_SECRET_ACCESS_KEY;
  private static readonly AWS_REGION = env.AWS_SES_REGION || env.AWS_REGION || "us-east-1";

  isConfigured(): boolean {
    return !!(SESProvider.AWS_ACCESS_KEY_ID && SESProvider.AWS_SECRET_ACCESS_KEY);
  }

  private sign(key: Buffer, msg: string): Buffer {
    return crypto.createHmac("sha256", key).update(msg).digest();
  }

  private getSignatureKey(dateStamp: string): Buffer {
    const kDate = this.sign(Buffer.from("AWS4" + SESProvider.AWS_SECRET_ACCESS_KEY), dateStamp);
    const kRegion = this.sign(kDate, SESProvider.AWS_REGION);
    const kService = this.sign(kRegion, "ses");
    const kSigning = this.sign(kService, "aws4_request");
    return kSigning;
  }

  async sendMail(options: MailOptions): Promise<MailResult> {
    if (!this.isConfigured()) {
      Logger.error("AWS SES: Provider is not configured");
      return { success: false, error: "AWS SES provider is not configured" };
    }

    const endpoint = `https://email.${SESProvider.AWS_REGION}.amazonaws.com`;
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.slice(0, 8);

    const params = new URLSearchParams();
    params.append("Action", "SendEmail");
    params.append("Source", options.from!);
    params.append("Destination.ToAddresses.member.1", options.to);
    params.append("Message.Subject.Data", options.subject);
    params.append("Message.Body.Html.Data", options.html);
    params.append("Version", "2010-12-01");

    if (options.replyTo) {
      params.append("ReplyToAddresses.member.1", options.replyTo);
    }

    if (options.cc?.length) {
      options.cc.forEach((email, idx) => {
        params.append(`Destination.CcAddresses.member.${idx + 1}`, email);
      });
    }

    if (options.bcc?.length) {
      options.bcc.forEach((email, idx) => {
        params.append(`Destination.BccAddresses.member.${idx + 1}`, email);
      });
    }

    const body = params.toString();
    const payloadHash = crypto.createHash("sha256").update(body).digest("hex");

    const canonicalRequest = [
      "POST",
      "/",
      "",
      `content-type:application/x-www-form-urlencoded`,
      `host:email.${SESProvider.AWS_REGION}.amazonaws.com`,
      `x-amz-date:${amzDate}`,
      "",
      "content-type;host;x-amz-date",
      payloadHash,
    ].join("\n");

    const credentialScope = `${dateStamp}/${SESProvider.AWS_REGION}/ses/aws4_request`;
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      credentialScope,
      crypto.createHash("sha256").update(canonicalRequest).digest("hex"),
    ].join("\n");

    const signingKey = this.getSignatureKey(dateStamp);
    const signature = crypto.createHmac("sha256", signingKey).update(stringToSign).digest("hex");

    const authHeader = `AWS4-HMAC-SHA256 Credential=${SESProvider.AWS_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=content-type;host;x-amz-date, Signature=${signature}`;

    try {
      const response = await axios.post(endpoint, body, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "X-Amz-Date": amzDate,
          Authorization: authHeader,
        },
      });

      if (response.status === 200) {
        const messageIdMatch = response.data.match(/<MessageId>(.+?)<\/MessageId>/);
        const messageId = messageIdMatch ? messageIdMatch[1] : undefined;
        Logger.info(`AWS SES: Email sent successfully to ${options.to}`);
        return { success: true, messageId };
      }

      return { success: false, error: `Unexpected status: ${response.status}` };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      Logger.error(`AWS SES: Failed to send email to ${options.to}: ${message}`);
      return { success: false, error: message };
    }
  }
}
