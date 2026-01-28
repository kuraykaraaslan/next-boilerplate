"use client";
import Image from "next/image";
import Link from "next/link";
import useTenantBrandingStore from "@/libs/zustand/tenant-branding";

interface BrandingLogoProps {
  href?: string;
  className?: string;
  height?: number;
  width?: number;
}

const BrandingLogo = ({ href = "/", className = "", height = 40, width = 120 }: BrandingLogoProps) => {
  const branding = useTenantBrandingStore((state) => state.branding);
  const alt = branding?.brandName || "Logo";
  const hasLight = !!branding?.brandLogoLight;
  const hasDark = !!branding?.brandLogoDark;

  let logoImg = null;
  if (hasLight && hasDark) {
    logoImg = (
      <>
        <Image src={branding.brandLogoLight as string} alt={alt} height={height} width={width} className={className + " dark:hidden"} style={{objectFit:'contain'}} priority />
        <Image src={branding.brandLogoDark as string} alt={alt} height={height} width={width} className={className + " hidden dark:inline"} style={{objectFit:'contain'}} priority />
      </>
    );
  } else if (hasLight) {
    logoImg = <Image src={branding.brandLogoLight as string} alt={alt} height={height} width={width} className={className} style={{objectFit:'contain'}} priority />;
  } else if (hasDark) {
    logoImg = <Image src={branding.brandLogoDark as string} alt={alt} height={height} width={width} className={className} style={{objectFit:'contain'}} priority />;
  } else {
    logoImg = <span className={"font-bold text-lg " + className}>{alt}</span>;
  }

  return href ? <Link href={href}>{logoImg}</Link> : logoImg;
};

export default BrandingLogo;
