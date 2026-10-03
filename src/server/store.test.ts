import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

let directory: string;
let store: typeof import("./store");
let backup: typeof import("./backup");

beforeAll(async () => {
  directory = await mkdtemp(path.join(os.tmpdir(), "health-dossier-store-"));
  process.env.HEALTH_DOSSIER_DATA_DIR = directory;
  store = await import("./store");
  backup = await import("./backup");
});

afterAll(async () => {
  await rm(directory, { recursive: true, force: true });
  delete process.env.HEALTH_DOSSIER_DATA_DIR;
});

describe("local JSON store", () => {
  it("sanitizes uploaded filenames", () => {
    expect(store.safeUploadName("record-1", "Report FINAL.PDF")).toBe(
      "record-1.pdf",
    );
    expect(store.safeUploadName("record-2", "unsafe")).toBe("record-2.bin");
  });

  it("derives repeatable salted password hashes", async () => {
    const first = await store.hashPassword("Doctor123!");
    const repeated = await store.hashPassword("Doctor123!", first.passwordSalt);
    expect(repeated.passwordHash).toBe(first.passwordHash);
    expect(
      (await store.hashPassword("Wrong123", first.passwordSalt)).passwordHash,
    ).not.toBe(first.passwordHash);
  });

  it("writes valid JSON atomically and retains a backup", async () => {
    await store.readDatabase();
    await store.updateDatabase((database) => {
      database.birthDate = "1990-01-02";
    });
    await store.updateDatabase((database) => {
      database.birthDate = "1991-03-04";
    });
    expect((await store.readDatabase()).birthDate).toBe("1991-03-04");
    const backup = JSON.parse(
      await readFile(path.join(directory, "database.json.bak"), "utf8"),
    );
    expect(backup.birthDate).toBe("1990-01-02");
  });

  it("migrates version 1 databases without losing existing data", async () => {
    const current = await store.readDatabase();
    const legacy = { ...current, version: 1 } as Record<string, unknown>;
    delete legacy.contributions;
    await writeFile(
      path.join(directory, "database.json"),
      `${JSON.stringify(legacy, null, 2)}\n`,
    );

    const migrated = await store.readDatabase();
    expect(migrated.version).toBe(2);
    expect(migrated.contributions).toEqual([]);
    expect(migrated.birthDate).toBe("1991-03-04");
  });

  it("encrypts, validates, merges, replaces, and rolls back complete backups", async () => {
    const source = Buffer.from("private medical document");
    const relativePath = path.join("uploads", "record-1.pdf");
    await writeFile(path.join(directory, relativePath), source);
    await store.updateDatabase((database) => {
      database.records = [
        {
          id: "record-1",
          title: "Original report",
          type: "Laboratory",
          date: "2026-01-01",
          provider: "Clinic",
          notes: "",
          fileName: "report.pdf",
          fileType: "application/pdf",
          fileSize: source.length,
          filePath: relativePath,
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ];
    });
    await writeFile(
      path.join(directory, "sessions.json"),
      JSON.stringify([{ tokenHash: "SESSION_MARKER_SHOULD_NOT_EXPORT" }]),
    );

    const encrypted = await backup.createEncryptedBackup("CorrectHorse123");
    const bytes = await readFile(encrypted.path);
    expect(bytes.toString()).not.toContain("SESSION_MARKER_SHOULD_NOT_EXPORT");
    await expect(
      backup.inspectEncryptedBackup(encrypted.path, "WrongPassword123"),
    ).rejects.toThrow(/incorrect|modified/i);

    const tamperedPath = path.join(directory, "tampered.hdbak");
    await copyFile(encrypted.path, tamperedPath);
    const tampered = await readFile(tamperedPath);
    tampered[tampered.length - 1] ^= 0xff;
    await writeFile(tamperedPath, tampered);
    await expect(
      backup.inspectEncryptedBackup(tamperedPath, "CorrectHorse123"),
    ).rejects.toThrow(/incorrect|modified/i);

    const inspection = await backup.inspectEncryptedBackup(
      encrypted.path,
      "CorrectHorse123",
    );
    expect(inspection.counts.records).toBe(1);
    expect(inspection.totalBytes).toBe(source.length);

    const currentOnly = Buffer.from("current only");
    await writeFile(path.join(directory, "uploads", "record-2.pdf"), currentOnly);
    await store.updateDatabase((database) => {
      database.records[0].title = "Current report wins";
      database.records.push({
        ...database.records[0],
        id: "record-2",
        title: "Current-only report",
        filePath: path.join("uploads", "record-2.pdf"),
        fileSize: currentOnly.length,
      });
    });

    await backup.restoreEncryptedBackup(encrypted.path, "CorrectHorse123", "merge");
    let restored = await store.readDatabase();
    expect(restored.records.map((item) => item.title)).toEqual([
      "Current report wins",
      "Current-only report",
    ]);

    await backup.restoreEncryptedBackup(encrypted.path, "CorrectHorse123", "replace");
    restored = await store.readDatabase();
    expect(restored.records.map((item) => item.title)).toEqual(["Original report"]);
    expect(await readFile(path.join(directory, restored.records[0].filePath))).toEqual(source);

    const snapshots = (await backup.getBackupStatus()).snapshots;
    expect(snapshots.length).toBeGreaterThanOrEqual(2);
    await backup.rollbackRecoverySnapshot(snapshots[0].id);
    expect((await store.readDatabase()).records).toHaveLength(2);

    await backup.removeTemporaryBackup(encrypted.path);
    await rm(tamperedPath, { force: true });
  });
});
