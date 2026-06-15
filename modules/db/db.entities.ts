import 'reflect-metadata';
import { TenantDatabase } from './entities/tenant_database.entity';
import { User } from '@/modules/user/entities/user.entity';
import { UserConsent } from '@/modules/auth/entities/user_consent.entity';
import { UserProfile } from '@/modules/user_profile/entities/user_profile.entity';
import { UserSecurity } from '@/modules/user_security/entities/user_security.entity';
import { UserPreferences } from '@/modules/user_preferences/entities/user_preferences.entity';
import { UserSession } from '@/modules/user_session/entities/user_session.entity';
import { UserSocialAccount } from '@/modules/user_social_account/entities/user_social_account.entity';
import { SigningCertificate } from '@/modules/auth_e_signature/entities/signing_certificate.entity';
import { TrustListEntry } from '@/modules/e_signature/entities/trust_list_entry.entity';
import { Tenant } from '@/modules/tenant/entities/tenant.entity';
import { TenantDomain } from '@/modules/tenant_domain/entities/tenant_domain.entity';
import { TenantMember } from '@/modules/tenant_member/entities/tenant_member.entity';
import { TenantInvitation } from '@/modules/tenant_invitation/entities/tenant_invitation.entity';
import { TenantSubscription } from '@/modules/tenant_subscription/entities/tenant_subscription.entity';
import { Payment } from '@/modules/payment/entities/payment.entity';
import { PaymentTransaction } from '@/modules/payment/entities/payment_transaction.entity';
import { AuditLog } from '@/modules/audit_log/entities/audit_log.entity';
import { ApiKey } from '@/modules/api_key/entities/api_key.entity';
import { CouponRedemption } from '@/modules/coupon/entities/coupon_redemption.entity';
import { Webhook } from '@/modules/webhook/entities/webhook.entity';
import { WebhookDelivery } from '@/modules/webhook/entities/webhook_delivery.entity';
import { SamlConfig } from '@/modules/auth_saml/entities/saml_config.entity';
import { Setting } from '@/modules/setting/entities/setting.entity';
import { SettingHistory } from '@/modules/setting/entities/setting_history.entity';
import { Coupon } from '@/modules/coupon/entities/coupon.entity';
import { SubscriptionPlan } from '@/modules/payment/entities/subscription_plan.entity';
import { PlanFeature } from '@/modules/payment/entities/plan_feature.entity';
import { PushSubscription } from '@/modules/notification_push/entities/push_subscription.entity';
import { Invoice } from '@/modules/invoice/entities/invoice.entity';
import { InvoiceLine } from '@/modules/invoice/entities/invoice_line.entity';
import { TenantUsage } from '@/modules/tenant_usage/entities/tenant_usage.entity';
import { UploadedFile } from '@/modules/storage/entities/uploaded_file.entity';
import { AiUsageLog } from '@/modules/ai/entities/ai_usage_log.entity';
import { NotificationLog } from '@/modules/notification_log/entities/notification_log.entity';
import { StoreCategory } from '@/modules/store/entities/store_category.entity';
import { StoreCategorySpec } from '@/modules/store/entities/store_category_spec.entity';
import { StoreProduct } from '@/modules/store/entities/store_product.entity';
import { StoreProductImage } from '@/modules/store/entities/store_product_image.entity';
import { StoreProductSpecValue } from '@/modules/store/entities/store_product_spec_value.entity';
import { StoreVariantGroup } from '@/modules/store/entities/store_variant_group.entity';
import { StoreVariantGroupItem } from '@/modules/store/entities/store_variant_group_item.entity';
import { StoreBundle } from '@/modules/store/entities/store_bundle.entity';
import { StoreBundleItem } from '@/modules/store/entities/store_bundle_item.entity';
import { StoreVariationType } from '@/modules/store/entities/store_variation_type.entity';
import { StoreVariationOption } from '@/modules/store/entities/store_variation_option.entity';
import { StoreProductVariant } from '@/modules/store/entities/store_product_variant.entity';
import { SeoMeta } from '@/modules/seo/entities/seo_meta.entity';
import { MediaGallery } from '@/modules/media_gallery/entities/media_gallery.entity';
import { MediaGalleryItem } from '@/modules/media_gallery/entities/media_gallery_item.entity';
import { DynamicPage } from '@/modules/dynamic_page/entities/dynamic_page.entity';
import { DynamicPageTranslation } from '@/modules/dynamic_page/entities/dynamic_page_translation.entity';
import { DynamicPageBlock } from '@/modules/dynamic_page/entities/dynamic_page_block.entity';
import { DynamicCollection } from '@/modules/dynamic_page/entities/dynamic_collection.entity';
import { DynamicCollectionItem } from '@/modules/dynamic_page/entities/dynamic_collection_item.entity';
import { DynamicPageVersion } from '@/modules/dynamic_page/entities/dynamic_page_version.entity';
import { Fulfillment } from '@/modules/order_fulfillment/entities/fulfillment.entity';
import { FulfillmentItem } from '@/modules/order_fulfillment/entities/fulfillment_item.entity';
import { FulfillmentEvent } from '@/modules/order_fulfillment/entities/fulfillment_event.entity';
import { Warehouse } from '@/modules/order_fulfillment/entities/warehouse.entity';
import { Cart } from '@/modules/payment_cart/entities/cart.entity';
import { CartItem } from '@/modules/payment_cart/entities/cart_item.entity';
import { ShippingMethod } from '@/modules/payment_shipping/entities/shipping_method.entity';
import { ShippingRate } from '@/modules/payment_shipping/entities/shipping_rate.entity';
import { TaxClass } from '@/modules/payment_tax/entities/tax_class.entity';
import { TaxRate } from '@/modules/payment_tax/entities/tax_rate.entity';
import { Wishlist } from '@/modules/payment_wishlist/entities/wishlist.entity';
import { WishlistItem } from '@/modules/payment_wishlist/entities/wishlist_item.entity';
import { WishlistPricePoint } from '@/modules/payment_wishlist/entities/wishlist_price_point.entity';
import { ProductReview } from '@/modules/product_review/entities/product_review.entity';
import { ProductReviewVote } from '@/modules/product_review/entities/product_review_vote.entity';
import { ReturnRequest } from '@/modules/payment_return_rma/entities/return_request.entity';
import { ReturnItem } from '@/modules/payment_return_rma/entities/return_item.entity';
import { ReturnEvent } from '@/modules/payment_return_rma/entities/return_event.entity';
import { LoyaltyAccount } from '@/modules/payment_loyalty_points/entities/loyalty_account.entity';
import { LoyaltyTransaction } from '@/modules/payment_loyalty_points/entities/loyalty_transaction.entity';
import { LoyaltyTier } from '@/modules/payment_loyalty_points/entities/loyalty_tier.entity';
import { BlogCategory } from '@/modules/blog/entities/blog_category.entity';
import { BlogPost } from '@/modules/blog/entities/blog_post.entity';
import { BlogComment } from '@/modules/blog/entities/blog_comment.entity';
import { Conversation } from '@/modules/messaging/entities/conversation.entity';
import { ConversationParticipant } from '@/modules/messaging/entities/conversation_participant.entity';
import { Message } from '@/modules/messaging/entities/message.entity';
import { MessageReport } from '@/modules/messaging/entities/message_report.entity';
import { TenantExportJob } from '@/modules/tenant_export/entities/tenant_export_job.entity';
import { ScimGroup } from '@/modules/scim/entities/scim_group.entity';
import { ScimGroupMember } from '@/modules/scim/entities/scim_group_member.entity';
import { WalletAccount } from '@/modules/wallet/entities/wallet_account.entity';
import { WalletTransaction } from '@/modules/wallet/entities/wallet_transaction.entity';
import { WalletPosting } from '@/modules/wallet/entities/wallet_posting.entity';
import { MeterDefinition } from '@/modules/metering/entities/meter_definition.entity';
import { MeteredUsageEvent } from '@/modules/metering/entities/metered_usage_event.entity';
import { MeteredBillingRun } from '@/modules/metering/entities/metered_billing_run.entity';
import { ApprovalQueueItem } from '@/modules/back_office/entities/approval_queue_item.entity';
import { SupportTicket } from '@/modules/back_office/entities/support_ticket.entity';
import { SupportTicketMessage } from '@/modules/back_office/entities/support_ticket_message.entity';
import { FeatureFlag } from '@/modules/feature_flags/entities/feature_flag.entity';
import { FeatureFlagOverride } from '@/modules/feature_flags/entities/feature_flag_override.entity';
import { ConsentRecord } from '@/modules/terms_consent/entities/consent_record.entity';
import { AnalyticsEvent } from '@/modules/analytics/entities/analytics_event.entity';
import { SearchDocument } from '@/modules/search/entities/search_document.entity';

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
];
