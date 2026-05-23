// proxy.ts
import { NextRequest, NextResponse } from "next/server";
import SettingService from "@/modules/setting/setting.service";
import TenantDomainService from "@/modules/tenant_domain/tenant_domain.service";
import { ROOT_TENANT_ID } from "@/modules/tenant/tenant.constants";

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

    // Root surface: localhost (dev) or {root subdomain}.{wildcard} (prod)
    if (isLocalhost(host) || host === `${ROOT_SUBDOMAIN}.${WILDCARD_DOMAIN}`) {
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

    const url = req.nextUrl.clone();
    url.pathname = `/tenant/${tenantId}${pathname}`;
    log(`[domain] Rewriting to tenant: ${tenantId}`);
    return NextResponse.rewrite(url);
}

function handlePathMode(req: NextRequest, pathname: string): NextResponse {
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

        const url = req.nextUrl.clone();
        url.pathname = `/tenant/${tenantId}${rest || "/"}`;
        log(`[path] Rewriting to tenant: ${tenantId}`);
        return NextResponse.rewrite(url);
    }

    // Tenant prefix yoksa → root tenant
    const url = req.nextUrl.clone();
    url.pathname = `/tenant/${ROOT_TENANT_ID}${pathname}`;
    log("[path] Rewriting to root tenant");
    return NextResponse.rewrite(url);
}

export async function proxy(req: NextRequest) {
    const { pathname } = req.nextUrl;
    let host = req.headers.get("host") || "";
    host = host.replace(/:\d+$/, ""); // Portu kaldır

    // ❌ Hariç path (static assets, _next)
    if (isExcluded(pathname)) {
        return NextResponse.next();
    }

    // ✅ /api/internal/* — platform-internal endpoints reachable WITHOUT
    // a tenant prefix (Caddy `on_demand_tls.ask`, health probes, etc.).
    // These routes live at app/api/internal/ and must not be rewritten
    // under /tenant/.
    if (pathname.startsWith("/api/internal/")) {
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

    // ❌ Zaten /tenant/ altındaysa (sonsuz döngüyü önle)
    if (pathname.startsWith("/tenant/")) {
        return NextResponse.next();
    }

    // Bakım Modu Kontrolü
    const maintenanceResponse = await checkMaintenance(req, pathname);
    if (maintenanceResponse) return maintenanceResponse;

    if (TENANCY_MODE === "path") {
        return handlePathMode(req, pathname);
    }

    return handleDomainMode(req, host, pathname);
}
