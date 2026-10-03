import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getSession } from "@/server/auth";
import { dataDirectory, readDatabase } from "@/server/store";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const scope = new URL(request.url).searchParams.get("scope");
  const database = await readDatabase();
  const record = database.records.find((item) => item.id === id);
  if (!record)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (scope === "doctor") {
    const session = await getSession("doctor");
    const permitted =
      session &&
      database.shares.some(
        (share) =>
          share.recipientId === session.subjectId &&
          share.recordIds.includes(id) &&
          share.status === "active" &&
          (!share.expiresAt ||
            new Date(share.expiresAt).getTime() > Date.now()),
      );
    if (!permitted)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } else if (!(await getSession("patient")))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return new NextResponse(
    await readFile(path.join(dataDirectory, record.filePath)),
    {
      headers: {
        "Content-Type": record.fileType || "application/octet-stream",
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(record.fileName)}`,
        "Cache-Control": "no-store",
      },
    },
  );
}
