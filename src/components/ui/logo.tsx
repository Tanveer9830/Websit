import type { Brand } from "@/lib/brand";

export function BrandMark({
  brand,
  size = 38,
  className = "",
}: {
  brand: Brand;
  size?: number;
  className?: string;
}) {
  if (brand.logoUrl) {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[13px] border border-white/10 bg-white/5 ${className}`}
        style={{ width: size, height: size }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={brand.logoUrl}
          alt=""
          width={size}
          height={size}
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[13px] text-white shadow-[0_10px_30px_-10px_rgba(139,92,246,0.8)] ${className}`}
      style={{
        width: size,
        height: size,
        backgroundImage: `linear-gradient(135deg, ${brand.accentFrom}, ${brand.accentTo})`,
      }}
    >
      <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_15%,rgba(255,255,255,0.4),transparent_45%)]" />
      <svg
        viewBox="0 0 40 40"
        width={size * 0.68}
        height={size * 0.68}
        fill="none"
        className="relative"
      >
        <path
          d="M12.4 27.4h15.2a4.9 4.9 0 0 0 .6-9.8 7.3 7.3 0 0 0-13.9-1.8 5.1 5.1 0 0 0-1.9 11.6Z"
          fill="white"
          fillOpacity="0.96"
        />
        <circle cx="30.6" cy="11.6" r="2" fill="white" fillOpacity="0.9" />
      </svg>
    </span>
  );
}

export function BrandLockup({
  brand,
  size = 38,
  subtitle,
  className = "",
}: {
  brand: Brand;
  size?: number;
  subtitle?: string;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <BrandMark brand={brand} size={size} />
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-display text-[17px] font-semibold leading-tight tracking-tight text-snow">
          {brand.name}
        </span>
        {subtitle ? (
          <span className="truncate text-[10.5px] font-medium uppercase tracking-[0.16em] text-muted">
            {subtitle}
          </span>
        ) : null}
      </span>
    </span>
  );
}
