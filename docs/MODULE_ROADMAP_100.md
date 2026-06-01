# 100 Modül Yol Haritası

Gerçek hayattaki müşteri taleplerini hızlı karşılamak için boilerplate'e eklenmesi önerilen 100 modül.
Mevcut ~60 modülün (auth, tenancy, payment, store, invoice, notifications, AI, CMS, e-signature, SEO vb.) **üzerine** kurgulanmıştır.

Hepsi boilerplate konvansiyonuna uygun tasarlanmalı: tenant-aware, TypeORM entity + service + dto + messages, polymorphic `entityType+entityId`, pluggable provider, BullMQ job, `*.setting.keys.ts`, modül başına `README.md` + `module.json`.

---

## A. E-Ticaret & Sipariş (store modülünü tamamlayan) — 1-14
1. **cart** — Tenant + user/guest sepeti, satır kalemleri, sepet birleştirme (guest→login).
2. **checkout** — Çok adımlı checkout orchestration; adres + kargo + ödeme + kupon birleştirme.
3. **order** — Sipariş yaşam döngüsü (pending/paid/fulfilled/cancelled), durum geçiş makinesi.
4. **order_fulfillment** — Kargo/teslimat takibi, paketleme, kısmi gönderim.
5. **shipping** — Pluggable kargo sağlayıcıları (Aras, Yurtiçi, UPS, FedEx, DHL), oran hesaplama.
6. **inventory** — Stok hareketleri, rezervasyon, çok-depo (multi-warehouse), düşük stok uyarısı.
7. **tax** — Bölgesel vergi/KDV hesaplama motoru (TR KDV, EU VAT, US sales tax).
8. **wishlist** — Favori/istek listesi, polymorphic (ürün/varyant).
9. **product_review** — Ürün puan + yorum + doğrulanmış satın alma rozeti + moderasyon.
10. **price_list** — Müşteri grubu / B2B bazlı fiyat listeleri, toplu fiyat (tiered pricing).
11. **return_rma** — İade/değişim talebi (RMA), iade nedeni, onay akışı.
12. **gift_card** — Ön ödemeli hediye kartı, bakiye, kısmi kullanım.
13. **loyalty_points** — Sadakat puanı kazanma/harcama, seviye (tier) sistemi.
14. **abandoned_cart** — Terk edilen sepet tespiti + hatırlatma e-postası job'ı.

## B. CRM & Satış — 15-24
15. **contact** — CRM kişi/firma kayıtları, polymorphic ilişkiler.
16. **lead** — Lead yakalama, skorlama, dönüşüm hunisi (funnel) aşamaları.
17. **deal_pipeline** — Kanban satış pipeline, fırsat (opportunity) yönetimi.
18. **company_account** — B2B firma hesapları, kişi-firma hiyerarşisi.
19. **activity_timeline** — Polymorphic etkinlik akışı (arama/e-posta/not/toplantı).
20. **segment** — Dinamik kullanıcı/müşteri segmentasyonu (kural tabanlı).
21. **campaign** — Pazarlama kampanyası, hedef segment, performans.
22. **email_marketing** — Bülten/broadcast, liste yönetimi, abone/abonelikten çıkma.
23. **form_builder** — Sürükle-bırak form oluşturucu, gönderim toplama (submissions).
24. **survey** — Anket/NPS, soru tipleri, sonuç analizi.

## C. İçerik & Topluluk — 25-36
25. **blog** — Yazı, kategori, etiket, taslak/yayın, yazar (mevcut SEO ile entegre).
26. **comment** — Polymorphic yorum sistemi, threading, moderasyon.
27. **rating** — Polymorphic genel yıldız puanlama (yorumdan bağımsız).
28. **tag** — Merkezi etiketleme sistemi, polymorphic taggable.
29. **category_tree** — Genel hiyerarşik kategori (nested set/closure table).
30. **faq** — SSS yönetimi, kategori, sıralama, i18n.
31. **knowledge_base** — Yardım merkezi / help-center makaleleri, arama.
32. **glossary** — Terim sözlüğü.
33. **forum** — Topluluk forumu, başlık/yanıt, oylama.
34. **reaction** — Emoji/like reaksiyonları, polymorphic.
35. **bookmark** — Kullanıcı yer imleri/kaydetme, polymorphic.
36. **translation_i18n** — DB-tabanlı çeviri/locale string yönetimi, eksik çeviri raporu.

## D. Rezervasyon & Takvim — 37-44
37. **booking** — Randevu/rezervasyon, kaynak (resource) bazlı, çakışma kontrolü.
38. **availability** — Müsaitlik/çalışma saati tanımı, istisna günler.
39. **calendar** — Takvim/etkinlik, iCal export, tekrarlayan (recurring) olaylar.
40. **appointment_reminder** — Randevu öncesi SMS/e-posta hatırlatma job'ı.
41. **resource_scheduling** — Oda/araç/personel kaynak planlama.
42. **waitlist** — Bekleme listesi, sıraya alma, otomatik yükseltme.
43. **event_ticketing** — Etkinlik bilet satışı, QR bilet, kapı kontrol (check-in).
44. **timesheet** — Zaman kaydı, proje bazlı çalışılan saat.

## E. Proje & Operasyon — 45-54
45. **project** — Proje yönetimi, üye, durum, milestone.
46. **task** — Görev/issue, atama, öncelik, bağımlılık.
47. **board_kanban** — Kanban board, kolon, sürükle-bırak kart sırası.
48. **checklist** — Görev içi yapılacaklar listesi, tamamlanma %.
49. **time_tracking** — Görev/proje zaman takibi, başlat/durdur timer.
50. **gantt** — Gantt zaman çizelgesi, bağımlılıklar.
51. **document_collab** — İşbirlikli doküman (Tiptap), sürüm geçmişi.
52. **note** — Kişisel/paylaşımlı notlar, klasör.
53. **reminder** — Genel hatırlatıcı, snooze, tekrar.
54. **approval_workflow** — Onay akışı motoru (çok aşamalı, koşullu).

## F. İletişim & Destek — 55-64
55. **support_ticket** — Destek/help-desk talep sistemi, öncelik, atama, SLA.
56. **live_chat** — Canlı sohbet (WebSocket), operatör paneli, geçmiş.
57. **chat_messaging** — Kullanıcılar arası DM/grup mesajlaşma.
58. **notification_telegram** — Telegram bot bildirim kanalı (mevcut notification_* deseni).
59. **notification_whatsapp** — WhatsApp Business API bildirim kanalı.
60. **notification_slack** — Slack webhook/bot bildirim kanalı.
61. **notification_discord** — Discord webhook bildirim kanalı.
62. **notification_preferences_center** — Kanal+olay bazlı kullanıcı bildirim tercih merkezi.
63. **announcement** — Sistem/tenant duyuru bandı (banner), zamanlı yayın.
64. **broadcast_realtime** — WebSocket/SSE gerçek zamanlı presence + canlı yayın altyapısı.

## G. Yetkilendirme & Güvenlik (mevcut auth'u tamamlayan) — 65-74
65. **rbac** — Rol-yetki (permission) matrisi, özel rol tanımı, policy enforcement.
66. **abac_policy** — Öznitelik tabanlı erişim (kaynak/koşul bazlı kurallar).
67. **team** — Tenant içi takım/grup, takım bazlı kaynak paylaşımı.
68. **ip_allowlist** — IP beyaz/kara liste, tenant bazlı erişim kısıtı.
69. **two_factor_enforcement** — Tenant bazlı 2FA zorunluluğu politikası.
70. **password_policy** — Şifre karmaşıklık/rotasyon politika motoru.
71. **session_management_ui** — Aktif oturumları görüntüleme/sonlandırma (kullanıcı self-service).
72. **gdpr_consent** — Açık rıza (consent) kaydı, cookie consent, çerez tercihleri.
73. **data_retention** — Veri saklama/silme politikası, otomatik anonimleştirme job'ı.
74. **security_alerts** — Şüpheli giriş/yeni cihaz uyarıları, bildirim entegrasyonu.

## H. Otomasyon & Entegrasyon — 75-84
75. **incoming_webhook** — Gelen webhook alıcısı, imza doğrulama, event yönlendirme.
76. **integration_hub** — 3. parti entegrasyon connector kayıt/yönetim çatısı.
77. **zapier_connector** — Zapier/Make REST trigger + action endpoints.
78. **automation_rules** — "Eğer-ise" otomasyon motoru (trigger→condition→action).
79. **scheduled_jobs** — Tenant bazlı cron/zamanlanmış görev yönetimi (UI'lı).
80. **import_export** — CSV/Excel toplu içe/dışa aktarma, eşleme (mapping), hata raporu.
81. **bulk_actions** — Toplu işlem motoru (kuyruklu, ilerleme takipli).
82. **oauth_provider** — Platformun kendisinin OAuth2/OIDC provider olması (3. parti app'ler).
83. **embed_widget** — Gömülebilir widget/iframe üretici (chat, form, fiyat).
84. **public_api_gateway** — Versiyonlu public API, kota + api_key entegrasyonu.

## I. Analitik & Raporlama — 85-92
85. **analytics** — Olay (event) takibi, funnel, retention, dashboard metrikleri.
86. **reporting** — Özelleştirilebilir rapor oluşturucu, zamanlanmış rapor.
87. **dashboard_widgets** — Sürükle-bırak dashboard, widget kütüphanesi.
88. **export_pdf** — Genel PDF üretim servisi (rapor/belge), template tabanlı.
89. **export_excel** — Genel Excel üretim/streaming servisi.
90. **activity_feed** — Kullanıcıya yönelik aktivite akışı (audit'ten farklı, sosyal).
91. **kpi_metrics** — KPI tanımı, hedef, trend, alarm.
92. **ab_testing** — A/B test / feature experiment, varyant atama, sonuç.

## J. Platform & DevEx — 93-100
93. **feature_flag** — Feature flag / toggle, tenant+kullanıcı bazlı rollout (%).
94. **changelog** — Ürün changelog / "yenilikler" yayını, in-app duyuru.
95. **onboarding_checklist** — Kullanıcı onboarding adımları, ilerleme, product tour.
96. **search_engine** — Tam metin/faceted arama (Postgres FTS veya Meilisearch/Typesense adapter).
97. **cdn_image_optimization** — Görsel resize/format dönüşümü, on-the-fly varyant (storage üstüne).
98. **backup_restore** — Tenant veri yedekleme/geri yükleme, zamanlanmış snapshot.
99. **health_status_page** — Public status sayfası, uptime/incident yönetimi.
100. **localization_currency** — Çoklu para birimi, döviz kuru besleme, locale formatlama.

---

## Öncelik Notları

**En yüksek ROI / en sık talep edilenler (önce eklenmeli):**
`rbac` (65), `support_ticket` (55), `cart` + `order` (1, 3), `feature_flag` (93), `search_engine` (96), `import_export` (80), `analytics` (85), `form_builder` (23), `notification_preferences_center` (62), `gdpr_consent` (72).

**Teknik borç:** `payment_core` modülünün `README.md` ve `module.json` dosyaları eksik (registry'de `hasReadme: false`). Yeni modüllere başlamadan önce tamamlanması önerilir (modül README kuralı gereği).
