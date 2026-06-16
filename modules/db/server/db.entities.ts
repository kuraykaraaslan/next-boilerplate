import 'reflect-metadata';
import { TenantDatabase } from './entities/tenant_database.entity';
import { User } from '@nb/user/server/entities/user.entity';
import { UserConsent } from '@nb/auth/server/entities/user_consent.entity';
import { UserProfile } from '@nb/user_profile/server/entities/user_profile.entity';
import { UserSecurity } from '@nb/user_security/server/entities/user_security.entity';
import { UserPreferences } from '@nb/user_preferences/server/entities/user_preferences.entity';
import { UserSession } from '@nb/user_session/server/entities/user_session.entity';
import { UserSocialAccount } from '@nb/user_social_account/server/entities/user_social_account.entity';
import { SigningCertificate } from '@nb/auth_e_signature/server/entities/signing_certificate.entity';
import { TrustListEntry } from '@nb/e_signature/server/entities/trust_list_entry.entity';
import { Tenant } from '@nb/tenant/server/entities/tenant.entity';
import { TenantDomain } from '@nb/tenant_domain/server/entities/tenant_domain.entity';
import { TenantMember } from '@nb/tenant_member/server/entities/tenant_member.entity';
import { TenantInvitation } from '@nb/tenant_invitation/server/entities/tenant_invitation.entity';
import { TenantSubscription } from '@nb/tenant_subscription/server/entities/tenant_subscription.entity';
import { Payment } from '@nb/payment/server/entities/payment.entity';
import { PaymentTransaction } from '@nb/payment/server/entities/payment_transaction.entity';
import { AuditLog } from '@nb/audit_log/server/entities/audit_log.entity';
import { ApiKey } from '@nb/api_key/server/entities/api_key.entity';
import { CouponRedemption } from '@nb/coupon/server/entities/coupon_redemption.entity';
import { Webhook } from '@nb/webhook/server/entities/webhook.entity';
import { WebhookDelivery } from '@nb/webhook/server/entities/webhook_delivery.entity';
import { SamlConfig } from '@nb/auth_saml/server/entities/saml_config.entity';
import { Setting } from '@nb/setting/server/entities/setting.entity';
import { SettingHistory } from '@nb/setting/server/entities/setting_history.entity';
import { Coupon } from '@nb/coupon/server/entities/coupon.entity';
import { SubscriptionPlan } from '@nb/payment/server/entities/subscription_plan.entity';
import { PlanFeature } from '@nb/payment/server/entities/plan_feature.entity';
import { PushSubscription } from '@nb/notification_push/server/entities/push_subscription.entity';
import { Invoice } from '@nb/invoice/server/entities/invoice.entity';
import { InvoiceLine } from '@nb/invoice/server/entities/invoice_line.entity';
import { TenantUsage } from '@nb/tenant_usage/server/entities/tenant_usage.entity';
import { UploadedFile } from '@nb/storage/server/entities/uploaded_file.entity';
import { AiUsageLog } from '@nb/ai/server/entities/ai_usage_log.entity';
import { NotificationLog } from '@nb/notification_log/server/entities/notification_log.entity';
import { StoreCategory } from '@nb/store/server/entities/store_category.entity';
import { StoreCategorySpec } from '@nb/store/server/entities/store_category_spec.entity';
import { StoreProduct } from '@nb/store/server/entities/store_product.entity';
import { StoreProductImage } from '@nb/store/server/entities/store_product_image.entity';
import { StoreProductSpecValue } from '@nb/store/server/entities/store_product_spec_value.entity';
import { StoreVariantGroup } from '@nb/store/server/entities/store_variant_group.entity';
import { StoreVariantGroupItem } from '@nb/store/server/entities/store_variant_group_item.entity';
import { StoreBundle } from '@nb/store/server/entities/store_bundle.entity';
import { StoreBundleItem } from '@nb/store/server/entities/store_bundle_item.entity';
import { StoreVariationType } from '@nb/store/server/entities/store_variation_type.entity';
import { StoreVariationOption } from '@nb/store/server/entities/store_variation_option.entity';
import { StoreProductVariant } from '@nb/store/server/entities/store_product_variant.entity';
import { SeoMeta } from '@nb/seo/server/entities';
import { MediaGallery } from '@nb/media_gallery/server/entities/media_gallery.entity';
import { MediaGalleryItem } from '@nb/media_gallery/server/entities/media_gallery_item.entity';
import { DynamicPage } from '@nb/dynamic_page/server/entities/dynamic_page.entity';
import { DynamicPageTranslation } from '@nb/dynamic_page/server/entities/dynamic_page_translation.entity';
import { DynamicPageBlock } from '@nb/dynamic_page/server/entities/dynamic_page_block.entity';
import { DynamicCollection } from '@nb/dynamic_page/server/entities/dynamic_collection.entity';
import { DynamicCollectionItem } from '@nb/dynamic_page/server/entities/dynamic_collection_item.entity';
import { DynamicPageVersion } from '@nb/dynamic_page/server/entities/dynamic_page_version.entity';
import { Fulfillment } from '@nb/order_fulfillment/server/entities/fulfillment.entity';
import { FulfillmentItem } from '@nb/order_fulfillment/server/entities/fulfillment_item.entity';
import { FulfillmentEvent } from '@nb/order_fulfillment/server/entities/fulfillment_event.entity';
import { Warehouse } from '@nb/order_fulfillment/server/entities/warehouse.entity';
import { Cart } from '@nb/payment_cart/server/entities/cart.entity';
import { CartItem } from '@nb/payment_cart/server/entities/cart_item.entity';
import { ShippingMethod } from '@nb/payment_shipping/server/entities/shipping_method.entity';
import { ShippingRate } from '@nb/payment_shipping/server/entities/shipping_rate.entity';
import { TaxClass } from '@nb/payment_tax/server/entities/tax_class.entity';
import { TaxRate } from '@nb/payment_tax/server/entities/tax_rate.entity';
import { Wishlist } from '@nb/payment_wishlist/server/entities/wishlist.entity';
import { WishlistItem } from '@nb/payment_wishlist/server/entities/wishlist_item.entity';
import { WishlistPricePoint } from '@nb/payment_wishlist/server/entities/wishlist_price_point.entity';
import { ProductReview } from '@nb/product_review/server/entities/product_review.entity';
import { ProductReviewVote } from '@nb/product_review/server/entities/product_review_vote.entity';
import { ReturnRequest } from '@nb/payment_return_rma/server/entities/return_request.entity';
import { ReturnItem } from '@nb/payment_return_rma/server/entities/return_item.entity';
import { ReturnEvent } from '@nb/payment_return_rma/server/entities/return_event.entity';
import { LoyaltyAccount } from '@nb/payment_loyalty_points/server/entities/loyalty_account.entity';
import { LoyaltyTransaction } from '@nb/payment_loyalty_points/server/entities/loyalty_transaction.entity';
import { LoyaltyTier } from '@nb/payment_loyalty_points/server/entities/loyalty_tier.entity';
import { BlogCategory } from '@nb/blog/server/entities/blog_category.entity';
import { BlogPost } from '@nb/blog/server/entities/blog_post.entity';
import { BlogComment } from '@nb/blog/server/entities/blog_comment.entity';
import { Conversation } from '@nb/messaging/server/entities/conversation.entity';
import { ConversationParticipant } from '@nb/messaging/server/entities/conversation_participant.entity';
import { Message } from '@nb/messaging/server/entities/message.entity';
import { MessageReport } from '@nb/messaging/server/entities/message_report.entity';
import { TenantExportJob } from '@nb/tenant_export/server/entities/tenant_export_job.entity';
import { ScimGroup } from '@nb/scim/server/entities/scim_group.entity';
import { ScimGroupMember } from '@nb/scim/server/entities/scim_group_member.entity';
import { WalletAccount } from '@nb/wallet/server/entities/wallet_account.entity';
import { WalletTransaction } from '@nb/wallet/server/entities/wallet_transaction.entity';
import { WalletPosting } from '@nb/wallet/server/entities/wallet_posting.entity';
import { MeterDefinition } from '@nb/metering/server/entities/meter_definition.entity';
import { MeteredUsageEvent } from '@nb/metering/server/entities/metered_usage_event.entity';
import { MeteredBillingRun } from '@nb/metering/server/entities/metered_billing_run.entity';
import { ApprovalQueueItem } from '@nb/approval/server/entities/approval_queue_item.entity';
import { SupportTicket } from '@nb/support/server/entities/support_ticket.entity';
import { SupportTicketMessage } from '@nb/support/server/entities/support_ticket_message.entity';
import { FeatureFlag } from '@nb/feature_flags/server/entities/feature_flag.entity';
import { FeatureFlagOverride } from '@nb/feature_flags/server/entities/feature_flag_override.entity';
import { ConsentRecord } from '@nb/terms_consent/server/entities/consent_record.entity';
import { Agreement } from '@nb/terms_consent/server/entities/agreement.entity';
import { AgreementVersion } from '@nb/terms_consent/server/entities/agreement_version.entity';
import { AgreementAcceptance } from '@nb/terms_consent/server/entities/agreement_acceptance.entity';
import { AnalyticsEvent } from '@nb/analytics/server/entities/analytics_event.entity';
import { SearchDocument } from '@nb/search/server/entities/search_document.entity';
import { GiftCard } from '@nb/gift_card/server/entities/gift_card.entity';
import { GiftCardTransaction } from '@nb/gift_card/server/entities/gift_card_transaction.entity';
import { Connector } from '@nb/integrations_hub/server/entities/connector.entity';
import { ConnectedApp } from '@nb/integrations_hub/server/entities/connected_app.entity';
import { OAuthToken } from '@nb/integrations_hub/server/entities/oauth_token.entity';
import { IntegrationEvent } from '@nb/integrations_hub/server/entities/integration_event.entity';

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
  Fulfillment, FulfillmentItem, FulfillmentEvent, Warehouse, Cart, CartItem,
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
];
