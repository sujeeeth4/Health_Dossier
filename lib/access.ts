import { patient, type Report, type Share } from "./demo-data";

export function scopeIds(share: Share, reports: Report[]) {
  return share.scope === "all"
    ? reports.filter(report => report.profile === patient.name && (share.includeSensitive || !report.sensitive)).map(report => report.id)
    : share.reportIds;
}

export function isExpired(share: Share, now = Date.now()) {
  if (share.expiry === "Custom date" && share.customDate) return new Date(`${share.customDate}T23:59:59`).getTime() < now;
  if (share.expiry === "24 hours") return now - new Date(share.createdAt).getTime() > 86_400_000;
  if (share.expiry === "7 days") return now - new Date(share.createdAt).getTime() > 604_800_000;
  return false;
}
