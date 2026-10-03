import Link from "next/link";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      className={`brand ${compact ? "brand-compact" : ""}`}
      aria-label="Health Dossier home"
    >
      {!compact && <span className="brand-word brand-health">Health</span>}
      <svg
        className="brand-symbol"
        viewBox="10 0 92 84"
        fill="none"
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M54 14C43 5 26 11 13 12c9 8 17 9 26 9-6 3-12 4-18 4 7 6 16 7 25 2-4 4-9 6-14 7 8 5 17 2 23-4M58 14C69 5 86 11 99 12c-9 8-17 9-26 9 6 3 12 4 18 4-7 6-16 7-25 2 4 4 9 6 14 7-8 5-17 2-23-4"
          fill="currentColor"
        />
        <path
          d="M56 15v60"
          stroke="#28AF77"
          strokeWidth="5.5"
          strokeLinecap="round"
        />
        <circle cx="56" cy="9" r="7" fill="#28AF77" />
        <path
          d="M55 27c15 0 16 17 2 19-13 2-13 12-1 14 10 2 8 9 1 13"
          stroke="currentColor"
          strokeWidth="4.2"
          strokeLinecap="round"
        />
      </svg>
      {!compact && <span className="brand-word brand-dossier">Dossier</span>}
    </Link>
  );
}
