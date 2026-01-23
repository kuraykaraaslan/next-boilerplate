// proxy.ts
import { NextRequest, NextResponse } from "next/server";
import SettingService from "@/modules/setting/setting.service";
import TenantDomainService from "@/modules/tenant_domain/tenant_domain.service";

const DEFAULT_LANG = "en";

const EXCLUDED_PATHS = [
    /^\/api\/?/,
    /^\/auth\/?/,
    /^\/admin\/?/,
    /^\/_next\/?/,
    /^\/favicon\.ico$/,
    /^\/robots\.txt$/,
    /^\/sitemap\.xml$/,
    /^\/maintenance\/?/,
    /\.(png|jpg|jpeg|gif|svg|webp|ico|css|js|map|woff|woff2|ttf|eot)$/i,
];

const isDev = process.env.NODE_ENV !== "production";
const DEFAULT_SUBDOMAIN = process.env.TENANT_DEFAULT_SUBDOMAIN || "system";
const WILDCARD_DOMAIN = process.env.TENANT_WILDCARD_DOMAIN || "example.com";

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

export async function proxy(req: NextRequest) {
    const { pathname } = req.nextUrl;
    let host = req.headers.get("host") || "";
    host = host.replace(/:\d+$/, ""); // Portu kaldır

    //log("request", { host, pathname });

    // ❌ Hariç path
    if (isExcluded(pathname)) {
        return NextResponse.next();
    }

    // ❌ Zaten /tenant/ veya /system/ altındaysa (sonsuz döngüyü önle)
    if (pathname.startsWith("/tenant/") || pathname.startsWith("/system/")) {
        return NextResponse.next();
    }

    // Bakım Modu Kontrolü
    if (pathname !== '/maintenance') {
        try {
            const maintenanceSetting = await SettingService.getByKey('maintenanceMode');
            if (maintenanceSetting?.value === 'true') {
                log("maintenance mode active → redirect to /maintenance");
                return NextResponse.rewrite(new URL('/maintenance', req.url));
            }
        } catch (error) {
            log("Maintenance check failed", error);
        }
    }

    // Tenant veya System Belirleme
    let tenantId = null;
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
        // Tenant bulundu, rewrite yap
        url.pathname = `/tenant/${tenantId}${pathname}`;
        log(`Rewriting to tenant: ${tenantId}`);
    } else if (isSystemDomain) {
        // System domaini, /system altına rewrite yap
        url.pathname = `/system${pathname}`;
        log("Rewriting to system domain");
    } else {
        return NextResponse.next();
    }

    return NextResponse.rewrite(url);
}
