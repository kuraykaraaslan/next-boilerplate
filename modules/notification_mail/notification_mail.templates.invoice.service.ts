import Logger from '@/modules/logger';
import MailService from './notification_mail.service';
import { getBaseTemplateVars } from './notification_mail.template-vars';

export default class MailTemplatesInvoiceService {

  static async sendInvoiceIssuedEmail({
    tenantId, email, invoice,
  }: { tenantId: string; email: string; invoice: Record<string, unknown> }): Promise<void> {
    try {
      const subject = `Invoice ${invoice.invoiceNumber} — ${invoice.totalAmount} ${invoice.currency}`;
      const html = await MailService.renderTemplate('invoice_issued.ejs', { ...getBaseTemplateVars(), subject, invoice });
      await MailService.sendMail(tenantId, email, subject, html);
    } catch (error: unknown) {
      Logger.error(`MailTemplatesInvoiceService.sendInvoiceIssuedEmail error: ${error instanceof Error ? error.message : error}`);
    }
  }

  static async sendInvoicePaidEmail({
    tenantId, email, invoice,
  }: { tenantId: string; email: string; invoice: Record<string, unknown> }): Promise<void> {
    try {
      const subject = `Receipt for ${invoice.invoiceNumber} — paid`;
      const html = await MailService.renderTemplate('invoice_paid.ejs', { ...getBaseTemplateVars(), subject, invoice });
      await MailService.sendMail(tenantId, email, subject, html);
    } catch (error: unknown) {
      Logger.error(`MailTemplatesInvoiceService.sendInvoicePaidEmail error: ${error instanceof Error ? error.message : error}`);
    }
  }

  static async sendInvoicePaymentFailedEmail({
    tenantId, email, invoice, reason, retryAt, billingPortalUrl,
  }: {
    tenantId: string; email: string; invoice: Record<string, unknown>;
    reason?: string; retryAt?: Date | string; billingPortalUrl?: string;
  }): Promise<void> {
    try {
      const subject = `Payment failed — invoice ${invoice.invoiceNumber}`;
      const html = await MailService.renderTemplate('invoice_payment_failed.ejs', {
        ...getBaseTemplateVars(), subject, invoice, reason, retryAt, billingPortalUrl: billingPortalUrl ?? '',
      });
      await MailService.sendMail(tenantId, email, subject, html);
    } catch (error: unknown) {
      Logger.error(`MailTemplatesInvoiceService.sendInvoicePaymentFailedEmail error: ${error instanceof Error ? error.message : error}`);
    }
  }
}
