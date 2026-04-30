import Image from "next/image";
import Link from "next/link";

export const FLICKBUDDY_LOGO_SRC = "/icons/flickbuddy.png";

export function BrandLogo({
  size = 28,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src={FLICKBUDDY_LOGO_SRC}
      alt="FlickBuddy"
      width={size}
      height={size}
      className={`shrink-0 rounded-sm ${className}`}
      priority={size >= 40}
    />
  );
}

export function BrandLink({
  href = "/",
  label = "FlickBuddy",
  size = 28,
  className = "",
}: {
  href?: string;
  label?: string;
  size?: number;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 font-bold tracking-tight ${className}`}
    >
      <BrandLogo size={size} />
      <span>{label}</span>
    </Link>
  );
}
