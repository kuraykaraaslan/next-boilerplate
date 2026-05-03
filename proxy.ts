// proxy.ts
import { NextRequest, NextResponse } from "next/server";
import SettingService from "@/modules/setting/setting.service";
import TenantDomainService from "@/modules/tenant_domain/tenant_domain.service";

const EXCLUDED_PATHS = [
    /^\/_next\/?/,
    /^\/assets\/?/,
    /^\/favicon\.ico$/,
    /^\/robots\.txt$/,
    /^\/maintenance\/?/,
    /\.(png|jpg|jpeg|gif|svg|webp|ico|css|js|map|woff|woff2|ttf|eot)$/i,
];

const isDev = process.env.NODE_ENV !== "production";
const DEFAULT_SUBDOMAIN = process.env.TENANT_DEFAULT_SUBDOMAIN || "system";
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
        const setting = await SettingService.getByKey('maintenanceMode');
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
    let isSystemDomain = false;

    if (isLocalhost(host) || host === `${DEFAULT_SUBDOMAIN}.${WILDCARD_DOMAIN}`) {
        isSystemDomain = true;
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

    const url = req.nextUrl.clone();

    if (tenantId) {
        url.pathname = `/tenant/${tenantId}${pathname}`;
        log(`[domain] Rewriting to tenant: ${tenantId}`);
        return NextResponse.rewrite(url);
    }

    if (isSystemDomain) {
        url.pathname = `/system${pathname}`;
        log("[domain] Rewriting to system");
        return NextResponse.rewrite(url);
    }

    return NextResponse.next();
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
            // /{prefix}/ ile biten istek → system
            const url = req.nextUrl.clone();
            url.pathname = `/system${pathname}`;
            log("[path] No tenantId in path → rewriting to system");
            return NextResponse.rewrite(url);
        }

        const url = req.nextUrl.clone();
        url.pathname = `/tenant/${tenantId}${rest || "/"}`;
        log(`[path] Rewriting to tenant: ${tenantId}`);
        return NextResponse.rewrite(url);
    }

    // Tenant prefix yoksa → system
    const url = req.nextUrl.clone();
    url.pathname = `/system${pathname}`;
    log("[path] Rewriting to system");
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

    // ✅ /api/v1/system/[...] → /system/api/[...]
    // External API standard. Internal Next.js file stays at app/system/api/...
    if (pathname.startsWith("/api/v1/system/")) {
        const rest = pathname.slice("/api/v1/system".length); // /auth/login
        const url = req.nextUrl.clone();
        url.pathname = `/system/api${rest}`;
        log(`[api-v1] system: ${pathname} → ${url.pathname}`);
        return NextResponse.rewrite(url);
    }

    // ✅ /api/v1/tenant/[tenantId]/[...] → /tenant/[tenantId]/api/[...]
    if (pathname.startsWith("/api/v1/tenant/")) {
        const withoutPrefix = pathname.slice("/api/v1/tenant/".length); // {tenantId}/auth/login
        const slashIndex = withoutPrefix.indexOf("/");
        const tenantId = slashIndex === -1 ? withoutPrefix : withoutPrefix.slice(0, slashIndex);
        const rest = slashIndex === -1 ? "" : withoutPrefix.slice(slashIndex); // /auth/login
        const url = req.nextUrl.clone();
        url.pathname = `/tenant/${tenantId}/api${rest}`;
        log(`[api-v1] tenant(${tenantId}): ${pathname} → ${url.pathname}`);
        return NextResponse.rewrite(url);
    }

    // ❌ Zaten /tenant/ veya /system/ altındaysa (sonsuz döngüyü önle)
    if (pathname.startsWith("/tenant/") || pathname.startsWith("/system/")) {
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
