import 'reflect-metadata';
import { TenantDatabase } from './entities/tenant_database.entity';
import { User } from '@kuraykaraaslan/user/server/entities/user.entity';
import { UserConsent } from '@kuraykaraaslan/auth/server/entities/user_consent.entity';
import { UserProfile } from '@kuraykaraaslan/user_profile/server/entities/user_profile.entity';
import { UserSecurity } from '@kuraykaraaslan/user_security/server/entities/user_security.entity';
import { UserPreferences } from '@kuraykaraaslan/user_preferences/server/entities/user_preferences.entity';
import { UserSession } from '@kuraykaraaslan/user_session/server/entities/user_session.entity';
import { UserSocialAccount } from '@kuraykaraaslan/user_social_account/server/entities/user_social_account.entity';
import { SigningCertificate } from '@kuraykaraaslan/auth_e_signature/server/entities/signing_certificate.entity';
import { TrustListEntry } from '@kuraykaraaslan/e_signature/server/entities/trust_list_entry.entity';
import { Tenant } from '@kuraykaraaslan/tenant/server/entities/tenant.entity';
import { TenantDomain } from '@kuraykaraaslan/tenant_domain/server/entities/tenant_domain.entity';
import { TenantMember } from '@kuraykaraaslan/tenant_member/server/entities/tenant_member.entity';
import { TenantInvitation } from '@kuraykaraaslan/tenant_invitation/server/entities/tenant_invitation.entity';
import { TenantSubscription } from '@kuraykaraaslan/tenant_subscription/server/entities/tenant_subscription.entity';
import { Payment } from '@kuraykaraaslan/payment/server/entities/payment.entity';
import { PaymentTransaction } from '@kuraykaraaslan/payment/server/entities/payment_transaction.entity';
import { AuditLog } from '@kuraykaraaslan/audit_log/server/entities/audit_log.entity';
import { ApiKey } from '@kuraykaraaslan/api_key/server/entities/api_key.entity';
import { CouponRedemption } from '@kuraykaraaslan/coupon/server/entities/coupon_redemption.entity';
import { Webhook } from '@kuraykaraaslan/webhook/server/entities/webhook.entity';
import { WebhookDelivery } from '@kuraykaraaslan/webhook/server/entities/webhook_delivery.entity';
import { SamlConfig } from '@kuraykaraaslan/auth_saml/server/entities/saml_config.entity';
import { Setting } from '@kuraykaraaslan/setting/server/entities/setting.entity';
import { SettingHistory } from '@kuraykaraaslan/setting/server/entities/setting_history.entity';
import { Coupon } from '@kuraykaraaslan/coupon/server/entities/coupon.entity';
import { SubscriptionPlan } from '@kuraykaraaslan/payment/server/entities/subscription_plan.entity';
import { PlanFeature } from '@kuraykaraaslan/payment/server/entities/plan_feature.entity';
import { PushSubscription } from '@kuraykaraaslan/notification_push/server/entities/push_subscription.entity';
import { Invoice } from '@kuraykaraaslan/invoice/server/entities/invoice.entity';
import { InvoiceLine } from '@kuraykaraaslan/invoice/server/entities/invoice_line.entity';
import { TenantUsage } from '@kuraykaraaslan/tenant_usage/server/entities/tenant_usage.entity';
import { UploadedFile } from '@kuraykaraaslan/storage/server/entities/uploaded_file.entity';
import { AiUsageLog } from '@kuraykaraaslan/ai/server/entities/ai_usage_log.entity';
import { NotificationLog } from '@kuraykaraaslan/notification_log/server/entities/notification_log.entity';
import { StoreCategory } from '@kuraykaraaslan/store/server/entities/store_category.entity';
import { StoreCategorySpec } from '@kuraykaraaslan/store/server/entities/store_category_spec.entity';
import { StoreProduct } from '@kuraykaraaslan/store/server/entities/store_product.entity';
import { StoreProductImage } from '@kuraykaraaslan/store/server/entities/store_product_image.entity';
import { StoreProductSpecValue } from '@kuraykaraaslan/store/server/entities/store_product_spec_value.entity';
import { StoreVariantGroup } from '@kuraykaraaslan/store/server/entities/store_variant_group.entity';
import { StoreVariantGroupItem } from '@kuraykaraaslan/store/server/entities/store_variant_group_item.entity';
import { StoreBundle } from '@kuraykaraaslan/store/server/entities/store_bundle.entity';
import { StoreBundleItem } from '@kuraykaraaslan/store/server/entities/store_bundle_item.entity';
import { StoreVariationType } from '@kuraykaraaslan/store/server/entities/store_variation_type.entity';
import { StoreVariationOption } from '@kuraykaraaslan/store/server/entities/store_variation_option.entity';
import { StoreProductVariant } from '@kuraykaraaslan/store/server/entities/store_product_variant.entity';
import { SeoMeta } from '@kuraykaraaslan/seo/server/entities';
import { MediaGallery } from '@kuraykaraaslan/media_gallery/server/entities/media_gallery.entity';
import { MediaGalleryItem } from '@kuraykaraaslan/media_gallery/server/entities/media_gallery_item.entity';
import { DynamicPage } from '@kuraykaraaslan/dynamic_page/server/entities/dynamic_page.entity';
import { DynamicPageTranslation } from '@kuraykaraaslan/dynamic_page/server/entities/dynamic_page_translation.entity';
import { DynamicPageBlock } from '@kuraykaraaslan/dynamic_page/server/entities/dynamic_page_block.entity';
import { DynamicCollection } from '@kuraykaraaslan/dynamic_page/server/entities/dynamic_collection.entity';
import { DynamicCollectionItem } from '@kuraykaraaslan/dynamic_page/server/entities/dynamic_collection_item.entity';
import { DynamicPageVersion } from '@kuraykaraaslan/dynamic_page/server/entities/dynamic_page_version.entity';
import { Fulfillment } from '@kuraykaraaslan/order_fulfillment/server/entities/fulfillment.entity';
import { FulfillmentItem } from '@kuraykaraaslan/order_fulfillment/server/entities/fulfillment_item.entity';
import { FulfillmentEvent } from '@kuraykaraaslan/order_fulfillment/server/entities/fulfillment_event.entity';
import { Warehouse } from '@kuraykaraaslan/order_fulfillment/server/entities/warehouse.entity';
import { Carrier } from '@kuraykaraaslan/order_fulfillment/server/entities/carrier.entity';
import { Cart } from '@kuraykaraaslan/payment_cart/server/entities/cart.entity';
import { CartItem } from '@kuraykaraaslan/payment_cart/server/entities/cart_item.entity';
import { ShippingMethod } from '@kuraykaraaslan/payment_shipping/server/entities/shipping_method.entity';
import { ShippingRate } from '@kuraykaraaslan/payment_shipping/server/entities/shipping_rate.entity';
import { TaxClass } from '@kuraykaraaslan/payment_tax/server/entities/tax_class.entity';
import { TaxRate } from '@kuraykaraaslan/payment_tax/server/entities/tax_rate.entity';
import { Wishlist } from '@kuraykaraaslan/payment_wishlist/server/entities/wishlist.entity';
import { WishlistItem } from '@kuraykaraaslan/payment_wishlist/server/entities/wishlist_item.entity';
import { WishlistPricePoint } from '@kuraykaraaslan/payment_wishlist/server/entities/wishlist_price_point.entity';
import { ProductReview } from '@kuraykaraaslan/product_review/server/entities/product_review.entity';
import { ProductReviewVote } from '@kuraykaraaslan/product_review/server/entities/product_review_vote.entity';
import { ReturnRequest } from '@kuraykaraaslan/payment_return_rma/server/entities/return_request.entity';
import { ReturnItem } from '@kuraykaraaslan/payment_return_rma/server/entities/return_item.entity';
import { ReturnEvent } from '@kuraykaraaslan/payment_return_rma/server/entities/return_event.entity';
import { LoyaltyAccount } from '@kuraykaraaslan/payment_loyalty_points/server/entities/loyalty_account.entity';
import { LoyaltyTransaction } from '@kuraykaraaslan/payment_loyalty_points/server/entities/loyalty_transaction.entity';
import { LoyaltyTier } from '@kuraykaraaslan/payment_loyalty_points/server/entities/loyalty_tier.entity';
import { BlogCategory } from '@kuraykaraaslan/blog/server/entities/blog_category.entity';
import { BlogPost } from '@kuraykaraaslan/blog/server/entities/blog_post.entity';
import { BlogComment } from '@kuraykaraaslan/blog/server/entities/blog_comment.entity';
import { Conversation } from '@kuraykaraaslan/messaging/server/entities/conversation.entity';
import { ConversationParticipant } from '@kuraykaraaslan/messaging/server/entities/conversation_participant.entity';
import { Message } from '@kuraykaraaslan/messaging/server/entities/message.entity';
import { MessageReport } from '@kuraykaraaslan/messaging/server/entities/message_report.entity';
import { TenantExportJob } from '@kuraykaraaslan/tenant_export/server/entities/tenant_export_job.entity';
import { ScimGroup } from '@kuraykaraaslan/scim/server/entities/scim_group.entity';
import { ScimGroupMember } from '@kuraykaraaslan/scim/server/entities/scim_group_member.entity';
import { WalletAccount } from '@kuraykaraaslan/wallet/server/entities/wallet_account.entity';
import { WalletTransaction } from '@kuraykaraaslan/wallet/server/entities/wallet_transaction.entity';
import { WalletPosting } from '@kuraykaraaslan/wallet/server/entities/wallet_posting.entity';
import { MeterDefinition } from '@kuraykaraaslan/metering/server/entities/meter_definition.entity';
import { MeteredUsageEvent } from '@kuraykaraaslan/metering/server/entities/metered_usage_event.entity';
import { MeteredBillingRun } from '@kuraykaraaslan/metering/server/entities/metered_billing_run.entity';
import { ApprovalQueueItem } from '@kuraykaraaslan/approval/server/entities/approval_queue_item.entity';
import { SupportTicket } from '@kuraykaraaslan/support/server/entities/support_ticket.entity';
import { SupportTicketMessage } from '@kuraykaraaslan/support/server/entities/support_ticket_message.entity';
import { FeatureFlag } from '@kuraykaraaslan/feature_flags/server/entities/feature_flag.entity';
import { FeatureFlagOverride } from '@kuraykaraaslan/feature_flags/server/entities/feature_flag_override.entity';
import { ConsentRecord } from '@kuraykaraaslan/terms_consent/server/entities/consent_record.entity';
import { Agreement } from '@kuraykaraaslan/terms_consent/server/entities/agreement.entity';
import { AgreementVersion } from '@kuraykaraaslan/terms_consent/server/entities/agreement_version.entity';
import { AgreementAcceptance } from '@kuraykaraaslan/terms_consent/server/entities/agreement_acceptance.entity';
import { AnalyticsEvent } from '@kuraykaraaslan/analytics/server/entities/analytics_event.entity';
import { SearchDocument } from '@kuraykaraaslan/search/server/entities/search_document.entity';
import { GiftCard } from '@kuraykaraaslan/gift_card/server/entities/gift_card.entity';
import { GiftCardTransaction } from '@kuraykaraaslan/gift_card/server/entities/gift_card_transaction.entity';
import { Connector } from '@kuraykaraaslan/integrations_hub/server/entities/connector.entity';
import { ConnectedApp } from '@kuraykaraaslan/integrations_hub/server/entities/connected_app.entity';
import { OAuthToken } from '@kuraykaraaslan/integrations_hub/server/entities/oauth_token.entity';
import { IntegrationEvent } from '@kuraykaraaslan/integrations_hub/server/entities/integration_event.entity';
import { ModuleInstall } from '@kuraykaraaslan/marketplace/server/entities/module_install.entity';
import { Publisher } from '@kuraykaraaslan/marketplace/server/entities/publisher.entity';
import { PublishedModule } from '@kuraykaraaslan/marketplace/server/entities/published_module.entity';
import { PublishedModuleVersion } from '@kuraykaraaslan/marketplace/server/entities/published_module_version.entity';
import { CommunityInstall } from '@kuraykaraaslan/marketplace/server/entities/community_install.entity';
import { PluginKv } from '@kuraykaraaslan/plugin_runtime/server/entities/plugin_kv.entity';
import { DriveFile } from '@kuraykaraaslan/drive/server/entities/drive_file.entity';
import { DriveShare } from '@kuraykaraaslan/drive/server/entities/drive_share.entity';
import { DrivePublicLink } from '@kuraykaraaslan/drive/server/entities/drive_public_link.entity';
// CMS (content workspace) — scaffolded modules
import { NavigationMenu } from '@kuraykaraaslan/navigation/server/entities/navigation_menus.entity';
import { NavigationItem } from '@kuraykaraaslan/navigation/server/entities/navigation_items.entity';
import { Form } from '@kuraykaraaslan/form_builder/server/entities/forms.entity';
import { FormField } from '@kuraykaraaslan/form_builder/server/entities/form_fields.entity';
import { FormSubmission } from '@kuraykaraaslan/form_builder/server/entities/form_submissions.entity';
import { RedirectRule } from '@kuraykaraaslan/redirect/server/entities/redirect_rules.entity';
// ERP workspace — scaffolded modules
import { InventoryWarehouse } from '@kuraykaraaslan/inventory/server/entities/inventory_warehouses.entity';
import { InventoryLocation } from '@kuraykaraaslan/inventory/server/entities/inventory_locations.entity';
import { InventoryStockItem } from '@kuraykaraaslan/inventory/server/entities/inventory_stock_items.entity';
import { InventoryMovement } from '@kuraykaraaslan/inventory/server/entities/inventory_movements.entity';
import { InventoryCount } from '@kuraykaraaslan/inventory/server/entities/inventory_counts.entity';
import { InventoryCountLine } from '@kuraykaraaslan/inventory/server/entities/inventory_count_lines.entity';
import { UnitOfMeasure } from '@kuraykaraaslan/inventory/server/entities/uoms.entity';
import { MovementReason } from '@kuraykaraaslan/inventory/server/entities/inventory_movement_reasons.entity';
import { Supplier } from '@kuraykaraaslan/supplier/server/entities/suppliers.entity';
import { SupplierContact } from '@kuraykaraaslan/supplier/server/entities/supplier_contacts.entity';
import { PurchaseOrder } from '@kuraykaraaslan/procurement/server/entities/purchase_orders.entity';
import { PurchaseOrderLine } from '@kuraykaraaslan/procurement/server/entities/purchase_order_lines.entity';
import { GoodsReceipt } from '@kuraykaraaslan/procurement/server/entities/goods_receipts.entity';
import { GoodsReceiptLine } from '@kuraykaraaslan/procurement/server/entities/goods_receipt_lines.entity';
import { LedgerAccount } from '@kuraykaraaslan/accounting/server/entities/ledger_accounts.entity';
import { JournalEntry } from '@kuraykaraaslan/accounting/server/entities/journal_entries.entity';
import { JournalLine } from '@kuraykaraaslan/accounting/server/entities/journal_lines.entity';
import { FiscalPeriod } from '@kuraykaraaslan/accounting/server/entities/fiscal_periods.entity';
import { Order } from '@kuraykaraaslan/order/server/entities/orders.entity';
import { OrderLine } from '@kuraykaraaslan/order/server/entities/order_lines.entity';
import { OrderStatusEvent } from '@kuraykaraaslan/order/server/entities/order_status_events.entity';
// HR workspace — scaffolded modules
import { Department } from '@kuraykaraaslan/hr/server/entities/departments.entity';
import { Employee } from '@kuraykaraaslan/hr/server/entities/employees.entity';
import { LeaveRequest } from '@kuraykaraaslan/hr/server/entities/leave_requests.entity';
import { PayrollRun } from '@kuraykaraaslan/payroll/server/entities/payroll_runs.entity';
import { Payslip } from '@kuraykaraaslan/payroll/server/entities/payslips.entity';
import { SalaryComponent } from '@kuraykaraaslan/payroll/server/entities/salary_components.entity';
// Odoo-depth configurable / line entities
import { Journal } from '@kuraykaraaslan/accounting/server/entities/journals.entity';
import { PayslipLine } from '@kuraykaraaslan/payroll/server/entities/payslip_lines.entity';
import { LeaveType } from '@kuraykaraaslan/hr/server/entities/leave_types.entity';
import { SupplierCategory } from '@kuraykaraaslan/supplier/server/entities/supplier_categories.entity';
// Wave A — Odoo-depth config/line entities
import { PaymentMethodConfig } from '@kuraykaraaslan/payment/server/entities/payment_method.entity';
import { SubscriptionEvent } from '@kuraykaraaslan/payment_subscription/server/entities/subscription_event.entity';
import { ReturnReason } from '@kuraykaraaslan/payment_return_rma/server/entities/return_reason.entity';
import { StoreProductTag } from '@kuraykaraaslan/store/server/entities/store_product_tag.entity';

export const ENTITIES = [
  User, UserConsent, UserProfile, UserSecurity, UserPreferences, UserSession,
  UserSocialAccount, SigningCertificate, TrustListEntry, TenantDatabase, Tenant,
  TenantDomain, TenantMember, TenantInvitation, TenantSubscription, Payment,
  PaymentTransaction, AuditLog, ApiKey, CouponRedemption, Webhook, WebhookDelivery,
  SamlConfig, Setting, SettingHistory, Coupon, SubscriptionPlan, PlanFeature,
  PushSubscription, Invoice, InvoiceLine, TenantUsage, UploadedFile, AiUsageLog,
  NotificationLog, StoreCategory, StoreCategorySpec, StoreProduct, StoreProductImage,
  StoreProductSpecValue, StoreVariantGroup, StoreVariantGroupItem, StoreBundle,
  StoreBundleItem, StoreVariationType, StoreVariationOption, StoreProductVariant,
  SeoMeta, MediaGallery, MediaGalleryItem, DynamicPage, DynamicPageTranslation,
  DynamicPageBlock, DynamicCollection, DynamicCollectionItem, DynamicPageVersion,
  Fulfillment, FulfillmentItem, FulfillmentEvent, Warehouse, Carrier, Cart, CartItem,
  ShippingMethod, ShippingRate, TaxClass, TaxRate, Wishlist, WishlistItem,
  WishlistPricePoint, ProductReview, ProductReviewVote, ReturnRequest, ReturnItem,
  ReturnEvent, LoyaltyAccount, LoyaltyTransaction, LoyaltyTier, BlogCategory,
  BlogPost, BlogComment, Conversation, ConversationParticipant, Message,
  MessageReport, TenantExportJob, ScimGroup, ScimGroupMember, WalletAccount,
  WalletTransaction, WalletPosting, MeterDefinition, MeteredUsageEvent,
  MeteredBillingRun, ApprovalQueueItem, SupportTicket, SupportTicketMessage,
  FeatureFlag, FeatureFlagOverride, ConsentRecord, AnalyticsEvent, SearchDocument,
  Agreement, AgreementVersion, AgreementAcceptance, GiftCard, GiftCardTransaction,
  Connector, ConnectedApp, OAuthToken, IntegrationEvent,
  ModuleInstall, Publisher, PublishedModule, PublishedModuleVersion, CommunityInstall,
  PluginKv, DriveFile, DriveShare, DrivePublicLink,
  // CMS (content workspace)
  NavigationMenu, NavigationItem, Form, FormField, FormSubmission, RedirectRule,
  // ERP workspace
  InventoryWarehouse, InventoryLocation, InventoryStockItem, InventoryMovement, InventoryCount,
  InventoryCountLine, UnitOfMeasure, MovementReason,
  Supplier, SupplierContact, SupplierCategory, PurchaseOrder, PurchaseOrderLine, GoodsReceipt, GoodsReceiptLine,
  LedgerAccount, JournalEntry, JournalLine, FiscalPeriod, Journal, Order, OrderLine, OrderStatusEvent,
  // HR workspace
  Department, Employee, LeaveRequest, LeaveType, PayrollRun, Payslip, PayslipLine, SalaryComponent,
  // Wave A (finance/commerce core)
  PaymentMethodConfig, SubscriptionEvent, ReturnReason, StoreProductTag,
];
