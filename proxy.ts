// proxy.ts
import { NextRequest, NextResponse } from "next/server";
import SettingService from "@kuraykaraaslan/setting/server/setting.service";
import TenantDomainService from "@kuraykaraaslan/tenant_domain/server/tenant_domain.service";
import UserSessionNextService from "@kuraykaraaslan/user_session/server/user_session.service.next";
import { ROOT_TENANT_ID } from "@kuraykaraaslan/tenant/server/tenant.constants";

// Admin *pages* (not /admin/api — that's served by route handlers with inline
// auth). Matches the app-relative path, i.e. the part after /tenant/{id}.
const ADMIN_PAGE_PATH = /^\/admin(?:\/|$)/;

// Gate admin *page* navigations at the middleware layer so an unauthenticated
// visitor is redirected to login *before* any admin HTML/RSC is streamed — no
// flash of the (empty) admin shell, on initial load or soft navigation. The
// check validates the real session (not just the JWT): an access-token JWT can
// be unexpired while its session is idle- or absolutely-expired, which is
// exactly the SESSION_EXPIRED case where the shell used to leak through.
// Returns a redirect response when blocked, or null to let the request continue.
// `appPath` is the path relative to the tenant (e.g. "/admin/users").
async function gateAdminPage(req: NextRequest, tenantId: string, appPath: string): Promise<NextResponse | null> {
    if (!ADMIN_PAGE_PATH.test(appPath)) return null;
    if (await UserSessionNextService.hasUsableSession(req)) return null;
    const url = req.nextUrl.clone();
    url.pathname = `/tenant/${tenantId}/auth/login`;
    url.search = "";
    url.searchParams.set("redirect", `/tenant/${tenantId}${appPath}`);
    log(`[auth] unauthenticated admin access → login redirect (tenant ${tenantId})`);
    return NextResponse.redirect(url);
}

const EXCLUDED_PATHS = [
    /^\/_next\/?/,
    /^\/assets\/?/,
    /^\/favicon\.ico$/,
    /^\/robots\.txt$/,
    /^\/maintenance\/?/,
    /\.(png|jpg|jpeg|gif|svg|webp|ico|css|js|map|woff|woff2|ttf|eot)$/i,
];

const isDev = process.env.NODE_ENV !== "production";
// Root tenant is exposed on either localhost (dev) or `{ROOT_SUBDOMAIN}.{WILDCARD_DOMAIN}`
// (prod). Both resolve to ROOT_TENANT_ID — there is no separate "system" surface.
const ROOT_SUBDOMAIN = process.env.TENANT_DEFAULT_SUBDOMAIN || "system";
const WILDCARD_DOMAIN = process.env.TENANT_WILDCARD_DOMAIN || "example.com";

// "domain" (default) | "path"
const TENANCY_MODE = (process.env.TENANCY_MODE || "domain") as "domain" | "path";
// Path-based modda tenant prefix: /{prefix}/{tenantId}/...
const TENANT_PATH_PREFIX = process.env.TENANT_PATH_PREFIX || "t";

function log(...args: any[]) {
    if (isDev) {
        console.log("[PROXY]", ...args);
    }
}

function isExcluded(pathname: string) {
    return EXCLUDED_PATHS.some((regex) => regex.test(pathname));
}

function isLocalhost(host: string) {
    return (
        host === "localhost" ||
        host.startsWith("localhost:") ||
        host === "127.0.0.1" ||
        host.startsWith("127.0.0.1:")
    );
}

async function checkMaintenance(req: NextRequest, pathname: string): Promise<NextResponse | null> {
    if (pathname === '/maintenance') return null;
    try {
        const setting = await SettingService.getByKey(ROOT_TENANT_ID, 'maintenanceMode');
        if (setting?.value === 'true') {
            log("maintenance mode active → redirect to /maintenance");
            return NextResponse.rewrite(new URL('/maintenance', req.url));
        }
    } catch (error) {
        log("Maintenance check failed", error);
    }
    return null;
}

async function handleDomainMode(req: NextRequest, host: string, pathname: string): Promise<NextResponse> {
    let tenantId: string | null = null;

    // Root surface: localhost (dev), the bare apex {wildcard}, or
    // {root subdomain}.{wildcard} (prod) — all resolve to the root tenant.
    if (isLocalhost(host) || host === WILDCARD_DOMAIN || host === `${ROOT_SUBDOMAIN}.${WILDCARD_DOMAIN}`) {
        tenantId = ROOT_TENANT_ID;
    } else {
        try {
            const domainInfo = await TenantDomainService.getByDomain(host);
            if (domainInfo) {
                tenantId = domainInfo.tenantId;
            }
        } catch (error) {
            log("Tenant lookup failed", error);
        }
    }

    if (!tenantId) {
        return NextResponse.next();
    }

    // In domain mode the incoming pathname IS the app-relative path.
    const blocked = await gateAdminPage(req, tenantId, pathname);
    if (blocked) return blocked;

    const url = req.nextUrl.clone();
    url.pathname = `/tenant/${tenantId}${pathname}`;
    log(`[domain] Rewriting to tenant: ${tenantId}`);
    return NextResponse.rewrite(url);
}

async function handlePathMode(req: NextRequest, pathname: string): Promise<NextResponse> {
    const tenantPrefix = `/${TENANT_PATH_PREFIX}/`;

    if (pathname.startsWith(tenantPrefix)) {
        // /{prefix}/{tenantId}/rest  →  /tenant/{tenantId}/rest
        const withoutPrefix = pathname.slice(tenantPrefix.length); // "{tenantId}/rest"
        const slashIndex = withoutPrefix.indexOf("/");
        const tenantId = slashIndex === -1 ? withoutPrefix : withoutPrefix.slice(0, slashIndex);
        const rest = slashIndex === -1 ? "" : withoutPrefix.slice(slashIndex);

        if (!tenantId) {
            // /{prefix}/ ile biten istek → root tenant
            const url = req.nextUrl.clone();
            url.pathname = `/tenant/${ROOT_TENANT_ID}${pathname}`;
            log("[path] No tenantId in path → rewriting to root tenant");
            return NextResponse.rewrite(url);
        }

        const appPath = rest || "/";
        const blocked = await gateAdminPage(req, tenantId, appPath);
        if (blocked) return blocked;

        const url = req.nextUrl.clone();
        url.pathname = `/tenant/${tenantId}${appPath}`;
        log(`[path] Rewriting to tenant: ${tenantId}`);
        return NextResponse.rewrite(url);
    }

    // Tenant prefix yoksa → root tenant
    const rootBlocked = await gateAdminPage(req, ROOT_TENANT_ID, pathname);
    if (rootBlocked) return rootBlocked;

    const url = req.nextUrl.clone();
    url.pathname = `/tenant/${ROOT_TENANT_ID}${pathname}`;
    log("[path] Rewriting to root tenant");
    return NextResponse.rewrite(url);
}

export async function proxy(req: NextRequest) {
    const { pathname } = req.nextUrl;
    // Behind Vercel (and most reverse proxies) the externally-requested host
    // arrives in `x-forwarded-host`; the `host` header can be the internal /
    // deployment host. Prefer the forwarded value, take the first if a proxy
    // chained several, then strip the port.
    let host = (req.headers.get("x-forwarded-host") || req.headers.get("host") || "")
        .split(",")[0]
        .trim()
        .replace(/:\d+$/, "");

    // ❌ Hariç path (static assets, _next)
    if (isExcluded(pathname)) {
        return NextResponse.next();
    }

    // ✅ /internal/api/* — platform-internal endpoints reachable WITHOUT
    // a tenant prefix (Caddy `on_demand_tls.ask`, health probes, etc.).
    // These routes live at app/internal/api/ and must not be rewritten
    // under /tenant/.
    if (pathname.startsWith("/internal/api/")) {
        return NextResponse.next();
    }

    // ✅ /api/tenant/[tenantId]/[...] → /tenant/[tenantId]/api/[...]
    if (pathname.startsWith("/api/tenant/")) {
        const withoutPrefix = pathname.slice("/api/tenant/".length); // {tenantId}/auth/login
        const slashIndex = withoutPrefix.indexOf("/");
        const tenantId = slashIndex === -1 ? withoutPrefix : withoutPrefix.slice(0, slashIndex);
        const rest = slashIndex === -1 ? "" : withoutPrefix.slice(slashIndex); // /auth/login
        const url = req.nextUrl.clone();
        url.pathname = `/tenant/${tenantId}/api${rest}`;
        log(`[api] tenant(${tenantId}): ${pathname} → ${url.pathname}`);
        return NextResponse.rewrite(url);
    }

    // ❌ Zaten /tenant/ altındaysa (sonsuz döngüyü önle) — ama admin sayfaları
    // burada da auth ile korunmalı (uygulama linkleri doğrudan bu biçimi kullanır).
    if (pathname.startsWith("/tenant/")) {
        const m = pathname.match(/^\/tenant\/([^/]+)(\/.*)?$/);
        if (m) {
            const blocked = await gateAdminPage(req, m[1], m[2] || "/");
            if (blocked) return blocked;
        }
        return NextResponse.next();
    }

    // Bakım Modu Kontrolü
    const maintenanceResponse = await checkMaintenance(req, pathname);
    if (maintenanceResponse) return maintenanceResponse;

    if (TENANCY_MODE === "path") {
        return await handlePathMode(req, pathname);
    }

    return handleDomainMode(req, host, pathname);
}
