import Link from "next/link";

type DossierSection =
  "summary" | "records" | "collections" | "visit-pack" | "sharing" | "settings";

/** Shared top-level navigation for every patient dossier workflow. */
export function DossierNav({ active }: { active: DossierSection }) {
  return (
    <nav className="dossier-nav" aria-label="Dossier navigation">
      <Link className={active === "summary" ? "active" : ""} href="/summary">
        Summary
      </Link>
      <Link className={active === "records" ? "active" : ""} href="/records">
        Records
      </Link>
      <Link
        className={active === "collections" ? "active" : ""}
        href="/collections"
      >
        Collections
      </Link>
      <Link
        className={active === "visit-pack" ? "active" : ""}
        href="/visit-pack"
      >
        Visit pack
      </Link>
      <Link className={active === "sharing" ? "active" : ""} href="/sharing">
        Sharing
      </Link>
      <Link className={active === "settings" ? "active" : ""} href="/settings">
        Settings
      </Link>
    </nav>
  );
}
