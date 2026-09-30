import Link from "next/link";

type DossierSection = "summary" | "records" | "collections";

export function DossierNav({ active }: { active: DossierSection }) {
  return <nav className="dossier-nav" aria-label="Dossier navigation">
    <Link className={active === "summary" ? "active" : ""} href="/summary">Summary</Link>
    <Link className={active === "records" ? "active" : ""} href="/records">Records</Link>
    <Link className={active === "collections" ? "active" : ""} href="/collections">Collections</Link>
  </nav>;
}
