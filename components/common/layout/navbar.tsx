'use client';
import { faBars } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import Logo from "@/components/common/layout/logo";
import dynamic from "next/dynamic";
import { SafeTenant } from "@/modules/tenant/tenant.types";
import { SafeTenantMember } from "@/modules/tenant_member/tenant_member.types";
import { getSystemMenuItems, getTenantMenuItems } from "@/modules/setting/settings.loader";

const AuthButton = dynamic(
    () => import('@/modules/auth/ui/auth.button'),
    { ssr: false }
);

interface SystemNavbarProps {
    variant: 'system';
}

interface TenantNavbarProps {
    variant: 'tenant';
    tenant: SafeTenant;
    tenantMember: SafeTenantMember;
}

type NavbarProps = SystemNavbarProps | TenantNavbarProps;

const Navbar = (props: NavbarProps) => {
    const router = useRouter();
    const params = useParams();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    const isSystem = props.variant === 'system';
    const tenant = isSystem ? null : props.tenant;
    const tenantMember = isSystem ? null : props.tenantMember;
    const tenantId = params.tenantId as string;

    // Determine base path
    const isProxied = !isSystem && typeof window !== 'undefined' && !window.location.pathname.startsWith('/tenant/');
    const basePath = isSystem ? '/system/admin' : (isProxied ? '' : `/tenant/${tenantId}`);
    const logoHref = isSystem ? '/system/admin' : `${basePath}/admin`;

    const menu = useMemo(() => {
        return isSystem ? getSystemMenuItems() : getTenantMenuItems(basePath);
    }, [isSystem, basePath]);

    return (
        <>
            <div className="">
                <nav className="relative mx-auto h-16 flex items-stretch items-center justify-between lg:px-8 from-base-100 to-base-300 bg-gradient-to-b shadow-lg text-primary" aria-label="Global">
                    <div className="py-4 pl-4 lg:pl-0 flex items-center gap-2">
                        <Logo href={logoHref} />
                        {tenant && (
                            <span className="text-sm font-medium text-base-content/60 hidden sm:inline">
                                / {tenant.name}
                            </span>
                        )}
                    </div>
                    <div className="flex lg:hidden">
                        <button type="button" className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 p-6 mr-2" aria-controls="mobile-menu" aria-expanded="false" onClick={toggleMobileMenu}>
                            <span className="sr-only">Open main menu</span>
                            <FontAwesomeIcon
                                icon={faBars}
                                className="h-6 w-6"
                                aria-hidden="true"
                            />
                        </button>
                    </div>
                    <div className="hidden lg:flex lg:flex-1 lg:justify-center">
                        {menu.map((item, index) => (
                            <Link key={index} href={item.href} className="relative group inline-flex items-center justify-center text-base font-medium px-6">
                                <div className="text-sm leading-6">{item.label}</div>
                            </Link>
                        ))}
                    </div>
                    <div className="hidden lg:flex lg:justify-end justify-center items-center gap-2">
                        {tenantMember && (
                            <span className="badge badge-primary badge-outline text-xs">
                                {tenantMember.memberRole}
                            </span>
                        )}
                        <AuthButton />
                    </div>
                </nav>
            </div>
            {/* Mobile menu */}
            <div className={`${isMobileMenuOpen ? "block" : "hidden"} lg:hidden`} id="mobile-menu" style={{ position: "fixed", zIndex: 100 }}>
                <div className="fixed inset-0 z-40 flex">
                    <div className="fixed inset-0" onClick={toggleMobileMenu}>
                        <div className="absolute inset-0 bg-base-200 opacity-75"></div>
                    </div>
                    <div className="relative flex-1 flex flex-col max-w-xs w-full bg-base-100">
                        <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
                            <div className="flex items-center justify-center flex-col gap-2">
                                <Logo href={logoHref} />
                                {tenant && (
                                    <span className="text-sm text-base-content/60">{tenant.name}</span>
                                )}
                            </div>
                            <nav className="mt-5 px-2 space-y-1">
                                {menu.map((item, index) => (
                                    <button key={index} className="block px-3 py-2 rounded-md text-base font-medium w-full text-left"
                                        onClick={() => {
                                            router.push(item.href);
                                            toggleMobileMenu();
                                        }}>
                                        {item.label}
                                    </button>
                                ))}
                            </nav>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
};

export default Navbar;
