import Link from "next/link";

export function Brand({ compact = false }: { compact?: boolean }) {
  return <Link href="/" className="brand" aria-label="Health Dossier home">
    <span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="9" r="3.2" fill="white"/>
      <path d="M29 17C22 10 14 12 5 15C12 16 17 22 26 22M35 17C42 10 50 12 59 15C52 16 47 22 38 22" stroke="white" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7 16C10 25 18 26 26 22M57 16C54 25 46 26 38 22" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <path d="M32 14V53M37 23C27 20 27 28 34 30C41 33 38 39 31 39" stroke="white" strokeWidth="2.8" strokeLinecap="round"/>
      <path d="M10 36V50M22 36V50M10 43H22M43 36V50H48C56 50 56 36 48 36H43Z" stroke="white" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg></span>
    {!compact && <span className="brand-name">Health <strong>Dossier</strong></span>}
  </Link>;
}
