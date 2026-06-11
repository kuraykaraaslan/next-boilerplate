# Good to Have — AI Module

> Features not yet implemented that would make this module production-ready for a multi-tenant, multi-purpose, multi-country SaaS platform.

---

## Budget & Quota Enforcement

### Enforce the Reserved `aiDailyLimit` Setting
**Why:** The setting key `aiDailyLimit` is declared in `ai.setting.keys.ts` and seeded as a UI field, but `assertAiFeatureAccess` never reads it — daily spend can exceed the declared limit silently.
**Complexity:** Low
**Multi-tenant relevance:** Each tenant needs its own daily hard-stop to prevent a single runaway tenant from exhausting the platform's provider budget.
**Multi-country relevance:** Regions with data-residency pricing or slower payment clearing (e.g. LATAM, SEA) benefit from tight daily caps to control unexpected overage.

### Enforce the Reserved `aiMonthlyBudget` Setting (USD)
**Why:** `aiMonthlyBudget` is declared but never read; cost-based enforcement (USD, not tokens) is more intuitive for billing and needed when tenants use different model tiers with wildly different per-token costs.
**Complexity:** Medium
**Multi-tenant relevance:** Per-tenant USD budget prevents a tenant on a cheap plan from running expensive models and eroding platform margin.
**Multi-country relevance:** Enables per-tenant budgets denominated in local currency equivalents (convert at write time to USD) for markets with volatile FX.

### Per-User Token Quotas Within a Tenant
**Why:** Today quota is per-tenant; a single heavy user within a tenant can consume the entire tenant allotment, degrading experience for other members.
**Complexity:** Medium
**Multi-tenant relevance:** Protects fair access within a tenant's own member pool — important for B2B tenants with many users.
**Multi-country relevance:** Markets where team sizes vary greatly (e.g. enterprise Asia-Pacific vs. SMB Europe) need user-level fairness controls.

---

## Cost Tracking & Reporting

### Populate `costUsd` on Every `AiUsageLog` Row
**Why:** The `costUsd` column exists in the entity but is never populated by `recordUsage` or `recordEmbedUsage`; cost reporting is therefore always empty.
**Complexity:** Low
**Multi-tenant relevance:** Enables per-tenant invoice-level cost breakdowns, a prerequisite for usage-based billing models.
**Multi-country relevance:** USD-denominated cost records allow platform operators to apply per-region markup or display costs in local currency.

### Per-Model Price Table
**Why:** Different models carry radically different costs (e.g. `claude-opus-4` vs. `gpt-4o-mini`); without a price table, cost computation and model-routing decisions are impossible.
**Complexity:** Low
**Multi-tenant relevance:** Platform admins need per-model pricing to enforce USD budgets per tenant and route cheaper models to lower-tier plans.
**Multi-country relevance:** Model availability and cost differ by region (Azure deployments in specific regions); a price table can be region-keyed.

### Aggregate Cost Dashboard (Root Admin)
**Why:** There is a usage endpoint returning token counts but no endpoint or UI aggregating spend across all tenants by provider/model/date range.
**Complexity:** Medium
**Multi-tenant relevance:** Platform operators need cross-tenant cost visibility to detect anomalous tenants and reconcile their own provider bills.
**Multi-country relevance:** Multi-region deployments need cost roll-ups per region to allocate provider spend to the correct billing entity.

---

## Content Safety & Compliance

### Per-Tenant Content Filtering / Moderation Policy
**Why:** There is no content-safety layer; prompts and completions are forwarded and returned verbatim regardless of tenant industry (healthcare, education, finance).
**Complexity:** Medium
**Multi-tenant relevance:** A healthcare tenant may require PHI scrubbing; an education tenant may require age-appropriate filtering — policies must differ per tenant.
**Multi-country relevance:** GDPR (EU), PIPEDA (Canada), and local moderation laws (e.g. German NetzDG, Australia eSafety) impose distinct content obligations per region.

### System Prompt Override / Injection Protection
**Why:** Callers can pass arbitrary `systemPrompt` strings; there is no sanitization or cap to prevent prompt-injection attacks from end users via constructed inputs.
**Complexity:** Medium
**Multi-tenant relevance:** Each tenant may define a base system prompt that must not be overridden by untrusted user content — a layered prompt architecture is needed.
**Multi-country relevance:** Some jurisdictions require traceable, auditable system-prompt versions for regulated AI use cases (e.g. EU AI Act high-risk categories).

### PII Detection Before Logging
**Why:** `AiUsageLog` stores model/kind/token counts but calling code could inadvertently forward user messages containing PII to usage metadata; no scrubbing guard exists.
**Complexity:** High
**Multi-tenant relevance:** A HIPAA-aligned tenant needs assurance that no PHI reaches audit tables or log lines.
**Multi-country relevance:** GDPR Article 5 requires data minimization; storing raw prompt content (even in logs) can violate it without explicit consent and purpose limitation.

---

## Provider Routing & Resilience

### Fallback Provider Chain
**Why:** When the tenant's configured default provider returns a 5xx or rate-limit error, the request fails hard; there is no retry-on-alternate-provider logic.
**Complexity:** Medium
**Multi-tenant relevance:** High-availability tenants need continuity guarantees — automatically routing to a secondary provider on failure avoids complete outage.
**Multi-country relevance:** Provider regional outages (e.g. OpenAI EU disruption) can be masked by falling back to an alternative provider with data-residency compliance.

### Data-Residency-Aware Provider Selection
**Why:** There is no mechanism to restrict which provider/region a tenant's requests are routed to; a EU-only tenant could inadvertently send data to a US-hosted provider endpoint.
**Complexity:** High
**Multi-tenant relevance:** Enterprise tenants in regulated industries contractually require data to stay within a region; provider selection must be enforceable per tenant.
**Multi-country relevance:** GDPR Chapter V restricts transfers outside the EEA; PDPA (Thailand), PIPL (China), and similar laws impose equivalent regional restrictions.

### Configurable Request Timeout per Tenant
**Why:** Provider HTTP calls have no timeout; a slow provider stalls the entire request indefinitely, affecting all tenants sharing the process.
**Complexity:** Low
**Multi-tenant relevance:** Tenants with SLA requirements need predictable latency bounds, not open-ended waits.
**Multi-country relevance:** High-latency regions (e.g. Sub-Saharan Africa, parts of Southeast Asia) need shorter timeouts combined with faster fallback providers.

---

## Observability & Audit

### Emit Audit-Log Events for AI Calls
**Why:** `AiUsageLog` tracks token counts for billing but there is no fire-and-forget `AuditLogService.log(...)` call for AI interactions, so the security audit trail has a blind spot for all AI activity.
**Complexity:** Low
**Multi-tenant relevance:** Tenant admins need to see who called AI, with which model, at what time — just as they can audit login or settings changes.
**Multi-country relevance:** EU AI Act transparency requirements and sector-specific regulations (e.g. financial advisory AI in MiFID scope) mandate logging of AI-assisted decisions.

### Per-Provider Error Rate Metrics
**Why:** Failed provider calls (rate limits, auth failures, network errors) are only `Logger.warn`-ed; there is no structured counter that could trigger alerts or auto-disable a misconfigured provider.
**Complexity:** Medium
**Multi-tenant relevance:** A tenant with an invalid API key will generate silent noise; structured error counters allow auto-detecting and surfacing misconfigurations per tenant.
**Multi-country relevance:** Provider reliability varies by region; per-region error metrics guide capacity planning and provider selection policy.

---

## Plan & Feature Management

### Per-Plan Model Allowlist
**Why:** Any tenant with `FEATURE_AI_CHAT` can request any model including the most expensive ones; there is no per-plan restriction on which models are accessible.
**Complexity:** Low
**Multi-tenant relevance:** Starter plans should be limited to cheaper models (`gpt-4o-mini`, `gemini-flash`); premium plans unlock flagship models — this is a standard SaaS tier gate.
**Multi-country relevance:** Some models are not available in certain regions (e.g. Gemini availability in certain countries); an allowlist can encode both plan and regional eligibility.

### Bring-Your-Own-Key (BYOK) Tenant Mode
**Why:** Currently tenants can supply their own API keys via Settings but the billing quota still applies, and there is no explicit "BYOK mode" that bypasses the platform's per-token billing while still tracking usage for rate-limiting purposes.
**Complexity:** Medium
**Multi-tenant relevance:** Large enterprise tenants (or resellers) commonly require BYOK arrangements to control their own provider costs independently of platform billing.
**Multi-country relevance:** Regions with data sovereignty requirements often mandate that tenants use provider accounts registered in the same jurisdiction.

---

## Streaming

### Streaming Token Count Tracking
**Why:** `chatStream` calls `trackUsage` / `recordUsage` with `response.usage?.totalTokens || 0` after the stream completes, but SSE streams may not return usage metadata from all providers; the actual tokens consumed are silently recorded as zero.
**Complexity:** Medium
**Multi-tenant relevance:** Inaccurate token counts invalidate the quota enforcement that protects the platform's financial model.
**Multi-country relevance:** No direct country dimension, but accurate billing data is a prerequisite for VAT/tax compliance in many jurisdictions.

### Streaming Back-Pressure / Cancellation
**Why:** There is no mechanism to abort a running stream when the client disconnects or the tenant quota is exhausted mid-stream; provider API calls continue consuming tokens even after the client is gone.
**Complexity:** High
**Multi-tenant relevance:** Runaway streams on behalf of disconnected clients drain the tenant's quota and cost the platform real money.
**Multi-country relevance:** No direct country dimension, but minimizing unnecessary spend is critical in cost-sensitive markets.
