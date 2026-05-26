# Modül Kapsama Karşılaştırma Raporu

**Tarih:** 2026-05-26
**Konu:** Mevcut 52 modül vs. önerilen 100 yeni modül
**Kaynak roadmap:** `~/.claude/plans/bu-boilerplate-de-ger-ek-stateless-koala.md`

---

## Karşılaştırma Tablosu

| Kategori | Mevcut (52) | Eklenecek (100) | Durum |
|---|---|---|---|
| **Altyapı** | common, env, logger, redis, db, observability, redis_idempotency (7) | — | ✅ Tam |
| **Kimlik & Auth** | user, user_preferences, user_profile, user_security, user_session, user_social_account, user_agent, auth, auth_sso, auth_saml, auth_impersonation, scim, e_signature (13) | — | ✅ Tam |
| **Multi-Tenant** | tenant, tenant_member, tenant_invitation, tenant_session, tenant_branding, tenant_domain, tenant_subscription, tenant_usage, tenant_export (9) | — | ✅ Tam |
| **Ödeme & Fatura** | payment, payment_core, payment_sell, payment_subscription, coupon, invoice (6) | wallet, refund, payout, installment, accounting, gift_card | ⚠️ Çekirdek var, ileri finansal eksik |
| **Bildirim** | notification_mail, notification_sms, notification_push, notification_inapp, notification_log (5) | broadcast, newsletter, campaign | ✅ Kanal var, kampanya/segment eksik |
| **Platform / Admin** | setting, api_key, audit_log, webhook, ai, api_doc, limiter (7) | webhook_incoming, feature_flag, workflow, rule_engine, scheduler, translation, integration_zapier, integration_slack, integration_calendar_sync | ⚠️ Çıkış var, otomasyon/giriş webhook yok |
| **Dosya & Medya** | storage, media_gallery (2) | attachment | ✅ Çekirdek tam |
| **E-Ticaret** | store, coupon (1.5) | cart, wishlist, order, shipping, shipping_tracking, inventory, tax, vendor, marketplace, abandoned_cart, cross_sell, product_recommendation, price_history | ❌ Ürün modeli var, sepet→sipariş→kargo akışı yok |
| **İçerik & CMS** | dynamic_page, seo (2) | blog, comment, tag, category, faq, testimonial, team_member, menu, site_search, legal_document, page_builder, landing_page, portfolio | ❌ Çok eksik — CMS hemen hemen yok |
| **Destek & İletişim** | — (0) | helpdesk_ticket, knowledge_base, announcement, chat, chat_bot, live_chat, forum, contact_form | ❌ Hiç yok |
| **Etkinlik & Rezervasyon** | — (0) | event, ticket, attendee, booking, availability, calendar | ❌ Hiç yok |
| **Proje & Görev** | — (0) | task, project, kanban, timesheet, timer | ❌ Hiç yok |
| **CRM & Pazarlama** | — (0) | crm_contact, crm_deal, crm_company, lead, survey, quiz, loyalty, referral, affiliate | ❌ Hiç yok |
| **Etkileşim & Sosyal** | — (0) | rating, review, reaction, follow, activity_feed, share, bookmark, recently_viewed | ❌ Hiç yok |
| **Analitik & Rapor** | observability (sadece ops) | analytics_event, dashboard, report, export, analytics_funnel, analytics_cohort, heatmap, session_replay | ❌ Ops gözlemi var, kullanıcı analitiği yok |
| **Adres & Lokasyon** | — (0) | address, region, location, map, geofencing | ❌ Hiç yok |
| **Mobil** | — (0) | mobile_push_token, deep_link | ❌ Hiç yok (web push var) |
| **Compliance & Legal** | audit_log (1) | cookie_consent, data_request, age_verification, kyc | ⚠️ Audit var, kullanıcı tarafı yok |

---

## Sayısal Özet

| Bölge | Mevcut | Eklenecek | Toplam |
|---|---:|---:|---:|
| ✅ Tam kapsanan (altyapı/auth/tenant) | 29 | 0 | 29 |
| ⚠️ Yarı kapsanan (ödeme, bildirim, platform, medya, compliance) | 21 | ~22 | ~43 |
| ❌ Hiç yok (CMS, e-ticaret akışı, destek, CRM, etkinlik, proje, sosyal, mobil, lokasyon) | 2 | ~78 | ~80 |
| **TOPLAM** | **52** | **100** | **152** |

---

## Ana Bulgular

1. **Backbone tamamen hazır** — auth, multi-tenant, ödeme altyapısı, bildirim kanalları, AI, SCIM/SAML enterprise işleri sağlam (29 modül).
2. **Asıl boşluk uygulama katmanında** — müşteriye satılan ürünler (CMS, sepet/sipariş, randevu, destek, CRM) hemen hemen yok. P0'ın 30 modülü bu boşluğu kapatıyor.
3. **E-ticaret yarım kalmış** — `store` ürün/varyant modeli var ama `cart → order → shipping → inventory` zinciri eksik. Sektörel olarak ilk öncelik bu olmalı.
4. **Otomasyon eksik** — `webhook` sadece giden; `workflow`, `rule_engine`, `webhook_incoming`, `feature_flag` yok (P1/P2'de).

---

## Önerilen Yol

1. **Faz 1 — E-Ticaret Akışı Tamamlama (öncelik):** cart, order, shipping, inventory, tax, address, region → mevcut `store`'u satılabilir hale getir.
2. **Faz 2 — Kurumsal Site CMS:** blog, faq, testimonial, team_member, menu, contact_form, comment, tag → "kurumsal site" müşteri taleplerini hemen karşıla.
3. **Faz 3 — Destek & CRM:** helpdesk_ticket, knowledge_base, crm_contact, crm_deal, lead → B2B SaaS satışlarında temel.
4. **Faz 4 — Etkinlik/Rezervasyon:** event, ticket, booking, availability, calendar → randevulu hizmet sektörleri (klinik, kuaför, danışmanlık).
5. **Faz 5 — Otomasyon & Analitik:** workflow, feature_flag, analytics_event, dashboard → ürünleştirme.
