# Bu Boilerplate Ne Kadar Zaman Kazandırır?

> Bu doküman, projenin ölçülen büyüklüğüne dayanarak "sıfırdan yazmak ne kadar
> sürerdi" ve "bunu kullanmak geliştirmede ne kazandırır" sorularını yanıtlar.
> Teknik kurulum için [README.md](README.md), mimari için [AGENTS.md](AGENTS.md).

## Projenin Ölçülen Büyüklüğü

| Metrik | Değer |
|---|---|
| Modül sayısı | **73** |
| TypeScript satırı (node_modules hariç) | **~156.000** |
| Dosya sayısı (.ts/.tsx) | **1.755** |
| Entity (DB tablosu) | **101** |
| API route | **236** |
| Servis | **307** |
| Test dosyası | **118** |
| Geliştirme süresi (gerçekleşen) | 5 ay / 345 commit |

Bu bir demo değil; **kurumsal, çok kiracılı (multi-tenant) SaaS iskeleti**:
Next.js 16, React 19, TypeORM, Redis/BullMQ, Stripe, SAML + OIDC + SCIM + sosyal
+ devlet (ACS) auth, S3 storage, Sentry, Socket.io, i18n.

## Sıfırdan Yazma Maliyeti (AI olmadan)

Üretim kalitesinde sürdürülen kodda, tasarım + test + debug + refactor dahil
geliştirici başına günlük *kalıcı* üretkenlik ~20-40 satırdır. 156K satır için:

| Ekip | Süre |
|---|---|
| 1 kıdemli geliştirici | **18-24 ay** |
| 3 kişilik takım | **8-12 ay** |
| 5 kişilik takım | **6-8 ay** (koordinasyon maliyeti) |

Mesele satır yazmak değil; SAML imza doğrulama, OIDC/PKCE akışı, Stripe webhook
idempotency, multi-tenant izolasyon, vergi/kargo/iade hesabı gibi alanlarda
*domain bilgisi* edinmektir.

## AI ile Maliyet (bu projenin gerçek hızı)

| Ekip | Süre |
|---|---|
| 1 geliştirici + AI | **4-6 ay** (gerçekleşen) |
| 2 kişi + AI | **2.5-3.5 ay** |

Net çarpan **3-5x**. Kod yazımında 10x'e çıkar; mimari karar, entegrasyon testi
ve domain doğrulaması insan hızında kaldığı için toplam çarpan 3-5x'te oturur.

---

## Modül Bazında Değer / Karmaşıklık Haritası

"Değer" = satır hacmi **+** sıfırdan yaparken çekilecek acı (protokol/domain
zorluğu). Düşük satırlı bir OIDC modülü, büyük bir CRUD modülünden pahalıdır.

### Katman 1 — En Yüksek Değer (her biri haftalar–aylar kazandırır)

Hatası pahalı, domain'i zor, spec okuması gerektiren alanlar.

| Modül | ~Satır | Neden pahalı |
|---|---|---|
| payment (+core/cart/sell/tax/shipping/rma/subscription/loyalty) | 15.000 | Webhook idempotency, vergi/kargo/iade; yanlışı *gerçek para* kaybettirir |
| invoice | 4.316 | Fatura numaralama, vergi, PDF, yasal alanlar |
| e_signature | 3.523 | Hukuki geçerlilik + kriptografik imza zinciri |
| auth_sso / auth_acs | 3.800 | Sosyal + devlet kimlik entegrasyonu |
| auth_saml | 1.533 | SAML imza doğrulama + XML canonicalization |
| scim | 1.128 | SCIM 2.0 provisioning spec'i (kurumsal müşteri şartı) |
| auth_oidc | 520 | Küçük ama OIDC/OAuth2/PKCE doğru kurmak günler alır |

> AI'sız bir takıma tek başına **6-9 ay** ekler.

### Katman 2 — Yüksek Değer (yatay altyapı, "çözülmüş olması" şart)

| Modül | ~Satır | Değer |
|---|---|---|
| tenant + tenant_* (12 modül) | 9.000 | Multi-tenant izolasyon; yanlışı *veri sızıntısı* |
| messaging | 2.621 | Socket.io + Redis realtime altyapısı |
| storage | 2.105 | S3/local soyutlama, provider factory, validation |
| webhook | 2.063 | İmzalı, retry'lı giden webhook |
| notification_* (mail/sms/push/inapp/log) | 3.900 | Çok kanallı bildirim |
| metering / wallet | 2.700 | Kullanım ölçüm + bakiye (usage-based billing) |
| api_key | 1.320 | Anahtar üretimi, scope, rotation |
| audit_log | 1.235 | Uyumluluk (SOC2/KVKK) için zorunlu |

> AI'sız **4-6 ay**.

### Katman 3 — Orta Değer (CRUD ağırlıklı, AI'ın en hızlı ürettiği desenler)

`store`, `dynamic_page`, `coupon`, `back_office`, `order_fulfillment`, `blog`,
`product_review`, `media_gallery`, `seo`, `user_*` — toplam ~15.000 satır.

> AI'sız ~2-3 ay; **AI ile günler** (tutarlı kalıp sayesinde).

### Katman 4 — Düşük Satır, Yüksek "Tutkal" Değeri

`db`, `redis`, `redis_idempotency`, `logger`, `observability`, `limiter`,
`env`, `common`, `network`, `seed`, `exchange_rate`, `api_doc` — ~3.500 satır.
Yazması kısa, ama doğru kurulmuş olması tüm projeyi ayakta tutar.

---

## Özet: AI'sız vs. Boilerplate ile

| Katman | AI'sız maliyet | Boilerplate'le | Net kazanç |
|---|---|---|---|
| 1 — Auth/Payment/Spec | 6-9 ay | hazır | çok yüksek |
| 2 — Altyapı | 4-6 ay | hazır | yüksek |
| 3 — CRUD modüller | 2-3 ay | hazır + AI ile genişletilebilir | orta |
| 4 — Tutkal | 1-2 ay | hazır | yüksek (gizli) |

## Geliştirmede Sana Ne Kazandırır?

1. **Sıfır gün avantajı** — Auth, billing, multi-tenant, storage, audit log
   *çözülmüş* başlar. Bunlar normalde bir ürünün ilk 6 ayını yer.
2. **Tutarlı desen = AI çarpanı** — 73 modül aynı kalıpta (facade + crud/query/
   bulk + `module.json` + registry). AI'a "blog gibi bir X modülü yaz" demen
   yeter; üretken AI desen kopyalamada en güçlüdür. Bu iskelet AI ile
   geliştirmeyi *kendisi* hızlandırır.
3. **Riskli alanlar test edilmiş** — Ödeme idempotency, tenant izolasyonu, SAML
   imza doğrulama; hatası pahalı olan yerleri yeniden keşfetmezsin.
4. **Düşük bakım maliyeti** — MCP registry + `public/modules/*.md` dokümantasyonu
   ile 6 ay sonra "bu modül ne yapıyordu" sorusu hızlı yanıtlanır.

**Pratik çıkarım:** Boilerplate, projenin en riskli ~9-12 ayını (Katman 1+2)
atlatır. Geliştirme eforun neredeyse tümüyle AI'ın 3-5x hızlandırdığı Katman 3'e
kayar. Asıl çarpan budur: **en zor işler hazır, kalan işler AI dostu.**

---

## Yol Haritası — Eklenebilecek Modüller

Mevcut 73 modüle göre çıkarılan boşluklar. Her modül, mevcut facade + crud/query/
bulk deseninin üstüne oturacak şekilde tasarlandığından AI ile hızlı üretilir.
Sıralama önceliğe (talep × geri dönüş) göredir.

### Öncelik 1 — En çok talep edilen, en hızlı geri dönüş

| Modül | Ne yapar | Üstüne kurulur | Efor | Neden öncelikli |
|---|---|---|---|---|
| **search** | Full-text / faceted arama (Meilisearch, Elasticsearch veya Postgres FTS); indeksleme, otomatik tamamlama, filtreleme | store, blog, dynamic_page | Orta | İçerik/ürün arttıkça aranabilirlik şart olur; her SaaS'ın erken ihtiyacı |
| **feature_flags** | Özellik bayrağı, kademeli yayın (gradual rollout), A/B test, tenant bazlı toggle | tenant, setting | Düşük | Riski azaltır: yeni özelliği önce %5'e açarsın; deney altyapısının temeli |
| **support / helpdesk** | Destek talebi (ticket), SLA takibi, atama, durum akışı, müşteri yazışması | messaging, notification_* | Orta | Müşteri büyüdükçe e-posta yetmez; ürünün içinde destek kanalı gerekir |
| **analytics** | Ürün analitiği, event tracking, funnel/retention, pano | metering, observability | Orta | metering "faturalama", observability "operasyon" içindir; ürün davranışı ölçümü ayrı bir boşluk |
| **gdpr_consent** | Çerez/izin yönetimi, onay kaydı, "verimi indir/sil" (KVKK/GDPR) akışı | audit_log, tenant_export | Düşük | Yasal zorunluluk; tenant_export ve audit_log zaten yarısını sağlıyor |
| **email_campaign** | Newsletter, segmentasyon, kampanya, drip/otomasyon, açılma-tıklama metriği | notification_mail | Orta | notification_mail "işlemsel" e-posta yollar; pazarlama e-postası ayrı bir domain |

### Öncelik 2 — SaaS'ı "ürün" yapan katman

| Modül | Ne yapar | Üstüne kurulur | Efor | Neden değerli |
|---|---|---|---|---|
| **referral / affiliate** | Davet kodu, komisyon takibi, ödeme/ödül dağıtımı | wallet, payment, coupon | Orta | Büyüme motoru; wallet + coupon zemini hazır |
| **gift_card** | Hediye kartı üretimi, bakiye yükleme, kullanım | wallet, payment | Düşük | E-ticaret/abonelik için klasik talep; wallet üstüne oturur |
| **inventory** | Stok takibi, depo, rezervasyon, düşük stok uyarısı | store, order_fulfillment | Orta | store ürünü tanımlar ama stok yönetimi eksik; sipariş akışını tamamlar |
| **booking / appointments** | Randevu, takvim, müsaitlik, hatırlatma | tenant, notification_* | Orta | Hizmet tabanlı SaaS'ların çekirdek ihtiyacı |
| **billing_portal** | Self-servis abonelik/fatura yönetimi, plan değişimi, ödeme yöntemi | payment_subscription, invoice | Düşük | Destek yükünü azaltır; mevcut billing parçalarını kullanıcıya açar |
| **integrations_hub** | Üçüncü parti bağlayıcılar (Zapier-vari), OAuth uygulama bağlama | webhook, api_key | Yüksek | Kurumsal müşteri "bizim araçlarla entegre olsun" ister; webhook + api_key altyapısı hazır |

### Öncelik 3 — Auth & güvenlik derinliği

| Modül | Ne yapar | Efor | Neden değerli |
|---|---|---|---|
| **auth_passkey** | WebAuthn / passkey ile parolasız modern giriş | Orta | Güvenlik + UX; auth ailesinin doğal eksiği |
| **fraud_risk** | Risk skoru, anomali ve şüpheli işlem tespiti, kural motoru | Yüksek | Ödeme/işlem hacmi arttıkça dolandırıcılık kaçınılmaz; payment'ı korur |
| **moderation** | İçerik/spam moderasyonu, kuyruk, otomatik+manuel onay | Orta | Kullanıcı içerikli alanlar (review, blog, mesaj) için zorunlu |
| **data_residency** | Bölgesel veri saklama / yerleşim kontrolü | Yüksek | Kurumsal ve uyumluluk şartı (AB/ABD ayrımı) |

### Öncelik 4 — Operasyon & büyüme

| Modül | Ne yapar | Efor | Neden değerli |
|---|---|---|---|
| **status_page** | Kesinti/olay bildirimi, uptime durumu, abonelik | Düşük | Güven verir; B2B müşteri bekler |
| **changelog** | Sürüm notları / "yenilikler" feed'i | Düşük | Ürün gelişimini görünür kılar, retention'a katkı |
| **onboarding** | Kullanıcı turu, ilerleme adımları, checklist | Orta | İlk deneyim aktivasyon oranını belirler |
| **knowledge_base** | Yardım merkezi / dokümantasyon | Düşük | dynamic_page üstüne oturur; destek yükünü azaltır |
| **report_builder** | Özelleştirilebilir tablo/grafik rapor, zamanlanmış e-posta gönderimi | Orta | Yöneticiler "kendi raporumu kurayım" ister |
| **crm** | Kişi/lead/pipeline, etkileşim geçmişi | Yüksek | Satış odaklı SaaS'lar için; standalone bir ürüne yakın |

### Hızlı Kazanım Önerisi

`search`, `feature_flags` ve `gdpr_consent` — üçü de **düşük-orta efor**, **yüksek
talep** ve mevcut modüllerin üstüne temiz oturuyor. Facade + crud/query desenin
sayesinde her biri AI ile birkaç günde çıkarılabilir; ilk genişleme dalgası için
en mantıklı başlangıç bu üçü.
