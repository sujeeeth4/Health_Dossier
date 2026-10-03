import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { dataDirectory } from "./store";

type Role = "patient" | "doctor";
type Session = {
  tokenHash: string;
  role: Role;
  subjectId: string;
  expiresAt: string;
};
const sessionsSchema = z.array(
  z.object({
    tokenHash: z.string(),
    role: z.enum(["patient", "doctor"]),
    subjectId: z.string(),
    expiresAt: z.string(),
  }),
);
const sessionsPath = path.join(dataDirectory, "sessions.json");
const cookieNames = {
  patient: "hd_patient_session",
  doctor: "hd_doctor_session",
} as const;
let sessionQueue: Promise<unknown> = Promise.resolve();

const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

async function readSessions(): Promise<Session[]> {
  await mkdir(dataDirectory, { recursive: true, mode: 0o700 });
  try {
    return sessionsSchema
      .parse(JSON.parse(await readFile(sessionsPath, "utf8")))
      .filter((session) => new Date(session.expiresAt).getTime() > Date.now());
  } catch {
    return [];
  }
}

async function writeSessions(sessions: Session[]) {
  const temporary = `${sessionsPath}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(sessions, null, 2)}\n`, {
    mode: 0o600,
  });
  await rename(temporary, sessionsPath);
}

export async function createSession(role: Role, subjectId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const operation = sessionQueue.then(async () => {
    const sessions = await readSessions();
    sessions.push({
      tokenHash: hashToken(token),
      role,
      subjectId,
      expiresAt: expiresAt.toISOString(),
    });
    await writeSessions(sessions);
  });
  sessionQueue = operation.catch(() => undefined);
  await operation;
  (await cookies()).set(cookieNames[role], token, {
    httpOnly: true,
    sameSite: "strict",
    secure: false,
    path: "/",
    expires: expiresAt,
  });
}

export async function getSession(role: Role) {
  const token = (await cookies()).get(cookieNames[role])?.value;
  if (!token) return undefined;
  return (await readSessions()).find(
    (session) =>
      session.role === role && session.tokenHash === hashToken(token),
  );
}

export async function requireSession(role: Role) {
  const session = await getSession(role);
  if (!session) throw new Error("UNAUTHORIZED");
  return session;
}

export async function clearSession(role: Role) {
  const token = (await cookies()).get(cookieNames[role])?.value;
  if (token) {
    const operation = sessionQueue.then(async () =>
      writeSessions(
        (await readSessions()).filter(
          (session) => session.tokenHash !== hashToken(token),
        ),
      ),
    );
    sessionQueue = operation.catch(() => undefined);
    await operation;
  }
  (await cookies()).delete(cookieNames[role]);
}

export async function invalidateRoleSessions(role: Role) {
  const operation = sessionQueue.then(async () =>
    writeSessions((await readSessions()).filter((session) => session.role !== role)),
  );
  sessionQueue = operation.catch(() => undefined);
  await operation;
}

export function rejectForeignRequest(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const url = new URL(request.url);
  const originUrl = new URL(origin);
  const loopback = new Set(["localhost", "127.0.0.1", "::1"]);
  if (
    loopback.has(originUrl.hostname) &&
    loopback.has(url.hostname) &&
    originUrl.port === url.port
  )
    return false;
  return originUrl.host !== url.host;
}
