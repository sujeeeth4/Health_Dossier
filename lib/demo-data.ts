import { z } from "zod";

export const reportTypes = ["Prescription", "Laboratory", "Imaging", "Discharge summary", "Vaccination", "Diagnosis", "Allergy", "Procedure", "Clinical document", "Clinical note"] as const;
export const reportSchema = z.object({
  id: z.string(), title: z.string().min(2), type: z.enum(reportTypes), date: z.string(),
  doctor: z.string(), facility: z.string(), specialty: z.string(), condition: z.string(),
  profile: z.string(), source: z.string(), summary: z.string(), sensitive: z.boolean(),
  origin: z.enum(["fixture", "upload", "contribution"]),
});
export type Report = z.infer<typeof reportSchema>;
export type Permission = "view" | "contribute";
export type Share = { id: string; recipient: string; method: string; scope: "all" | "selected" | "single"; reportIds: string[]; permission: Permission; expiry: string; customDate?: string; includeSensitive: boolean; status: "active" | "revoked"; createdAt: string };
export type Event = { id: string; actor: string; action: string; target: string; at: string };
export const patient = { name: "Aanya Rao", birthDate: "1992-06-14", location: "Hyderabad", dossierId: "HD-DEMO-2048" };
export const doctor = { name: "Dr. Meera Sen", specialty: "General Medicine", facility: "Bluebird Medical Centre", registration: "DEMO-TG-0426" };
export const profiles = ["Aanya Rao", "Mira Rao (dependent)"];
export const dependentBirthDate = "2020-02-02";
export const initialReports: Report[] = [
  { id:"r1", title:"Annual wellness blood panel", type:"Laboratory", date:"2026-08-21", doctor:"Dr. Meera Sen", facility:"Bluebird Medical Centre", specialty:"General Medicine", condition:"Wellness", profile:"Aanya Rao", source:"Clinic provided", summary:"Fictional routine blood panel. Values shown in this demo are illustrative only.", sensitive:false, origin:"fixture" },
  { id:"r2", title:"Seasonal allergy assessment", type:"Allergy", date:"2025-03-12", doctor:"Dr. Kavya Nair", facility:"Willow Clinic", specialty:"Allergy & Immunology", condition:"Seasonal allergies", profile:"Aanya Rao", source:"Patient uploaded", summary:"Fictional allergy history recorded for demonstration.", sensitive:true, origin:"fixture" },
  { id:"r3", title:"Knee imaging report", type:"Imaging", date:"2023-11-06", doctor:"Dr. Arjun Malhotra", facility:"Bluebird Medical Centre", specialty:"Orthopaedics", condition:"Knee pain", profile:"Aanya Rao", source:"Imaging centre", summary:"Fictional imaging interpretation for a resolved knee injury.", sensitive:false, origin:"fixture" },
  { id:"r4", title:"Post-procedure review", type:"Procedure", date:"2020-02-17", doctor:"Dr. Arjun Malhotra", facility:"Bluebird Medical Centre", specialty:"Orthopaedics", condition:"Knee pain", profile:"Aanya Rao", source:"Clinic provided", summary:"Fictional follow-up after a minor procedure.", sensitive:false, origin:"fixture" },
  { id:"r5", title:"Day-care discharge summary", type:"Discharge summary", date:"2020-02-10", doctor:"Dr. Arjun Malhotra", facility:"Bluebird Medical Centre", specialty:"Orthopaedics", condition:"Knee pain", profile:"Aanya Rao", source:"Hospital provided", summary:"Fictional discharge information for the demo journey.", sensitive:false, origin:"fixture" },
  { id:"r6", title:"General medicine prescription", type:"Prescription", date:"2016-07-09", doctor:"Dr. Meera Sen", facility:"Willow Clinic", specialty:"General Medicine", condition:"Respiratory infection", profile:"Aanya Rao", source:"Patient uploaded", summary:"Fictional historic prescription. It is not current medical advice.", sensitive:false, origin:"fixture" },
  { id:"r7", title:"Childhood asthma diagnosis", type:"Diagnosis", date:"2002-05-02", doctor:"Dr. Farah Ali", facility:"Little Grove Clinic", specialty:"Paediatrics", condition:"Asthma", profile:"Aanya Rao", source:"Clinic provided", summary:"Fictional childhood diagnosis for timeline demonstration.", sensitive:false, origin:"fixture" },
  { id:"r13", title:"Adolescent wellness visit", type:"Clinical document", date:"2008-08-18", doctor:"Dr. Farah Ali", facility:"Little Grove Clinic", specialty:"Paediatrics", condition:"Wellness", profile:"Aanya Rao", source:"Clinic provided", summary:"Fictional teenage wellness record for the lifelong timeline.", sensitive:false, origin:"fixture" },
  { id:"r8", title:"School-entry immunizations", type:"Vaccination", date:"1997-06-20", doctor:"Dr. Farah Ali", facility:"Little Grove Clinic", specialty:"Paediatrics", condition:"Immunization", profile:"Aanya Rao", source:"Clinic provided", summary:"Fictional immunization record for the demo.", sensitive:false, origin:"fixture" },
  { id:"r9", title:"Early childhood health visit", type:"Clinical document", date:"1995-09-13", doctor:"Dr. Farah Ali", facility:"Little Grove Clinic", specialty:"Paediatrics", condition:"Wellness", profile:"Aanya Rao", source:"Clinic provided", summary:"Fictional preschool health visit.", sensitive:false, origin:"fixture" },
  { id:"r10", title:"Infant growth review", type:"Clinical document", date:"1993-04-14", doctor:"Dr. Farah Ali", facility:"Little Grove Clinic", specialty:"Paediatrics", condition:"Wellness", profile:"Aanya Rao", source:"Clinic provided", summary:"Fictional infant growth review.", sensitive:false, origin:"fixture" },
  { id:"r11", title:"Birth record", type:"Clinical document", date:"1992-06-14", doctor:"Dr. Farah Ali", facility:"Little Grove Clinic", specialty:"Paediatrics", condition:"Birth", profile:"Aanya Rao", source:"Hospital provided", summary:"Fictional birth record beginning the lifelong timeline.", sensitive:false, origin:"fixture" },
  { id:"r12", title:"Paediatric wellness note", type:"Clinical document", date:"2025-12-05", doctor:"Dr. Farah Ali", facility:"Little Grove Clinic", specialty:"Paediatrics", condition:"Wellness", profile:"Mira Rao (dependent)", source:"Clinic provided", summary:"Fictional dependent profile record.", sensitive:false, origin:"fixture" },
];
export const initialEvents: Event[] = [
  { id:"e1", actor:"Aanya Rao", action:"Report uploaded", target:"Annual wellness blood panel", at:"2026-08-21T10:20:00" },
  { id:"e2", actor:"Dr. Meera Sen", action:"Report viewed", target:"Annual wellness blood panel", at:"2026-08-22T14:05:00" },
  { id:"e3", actor:"Aanya Rao", action:"Report downloaded", target:"Knee imaging report", at:"2026-07-18T09:10:00" },
  { id:"e4", actor:"Aanya Rao", action:"Metadata corrected", target:"Seasonal allergy assessment", at:"2025-03-13T16:30:00" },
];
export function ageAt(date: string, birthDate = patient.birthDate) {
  const [year, month, day] = date.slice(0,10).split("-").map(Number);
  const [by, bm, bd] = birthDate.split("-").map(Number);
  const age = year - by - (month < bm || (month === bm && day < bd) ? 1 : 0);
  return Math.max(0, age);
}
export function reportAge(report: Report) { return ageAt(report.date, report.profile===profiles[1]?dependentBirthDate:patient.birthDate); }
export function lifeStage(age: number) { return age <= 2 ? "Infancy" : age <= 5 ? "Early childhood" : age <= 12 ? "Childhood" : age <= 17 ? "Adolescence" : "Adulthood"; }
export function prettyDate(value: string) { return new Date(`${value.slice(0,10)}T12:00:00`).toLocaleDateString("en-IN", {day:"numeric",month:"short",year:"numeric"}); }
export const newId = () => Math.random().toString(36).slice(2,10);
