import Link from "next/link";
import Image from "next/image";

/** Square GH emblem (from the official GS Hub logo). */
export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return <Image src="/gshub-emblem.png" alt="GS Hub" width={128} height={128} className={`object-contain ${className}`} />;
}

/** Full GS Hub logo ("GS GH HUB — Trust the Process"). */
export function LogoFull({ className = "h-11 w-auto" }: { className?: string }) {
  return <Image src="/gshub-logo.png" alt="GS Hub — Trust the Process" width={435} height={151} priority className={className} />;
}

export function Logo({ light: _light = false, className = "h-10 w-auto sm:h-12" }: { light?: boolean; className?: string }) {
  return (
    <Link href="/" className="flex shrink-0 items-center" aria-label="GS Hub home">
      <LogoFull className={className} />
    </Link>
  );
}
