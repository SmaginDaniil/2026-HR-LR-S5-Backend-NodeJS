import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { execFileSync } from "child_process";

const LOG_FILE = path.resolve("backup_log.txt");

function log(message: string): void {
  fs.appendFileSync(LOG_FILE, `${new Date().toISOString()}: ${message}\n`);
}

function computeHash(sourceDir: string): string {
  const names = fs
    .readdirSync(sourceDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort();
  return crypto.createHash("sha256").update(names.join("\n")).digest("hex");
}

function readPreviousHash(): string | null {
  if (!fs.existsSync(LOG_FILE)) return null;
  const lines = fs.readFileSync(LOG_FILE, "utf-8").split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const match = lines[i].match(/HASH: ([0-9a-f]{64})\s*$/);
    if (match) return match[1];
  }
  return null;
}

function main(): void {
  const [sourceDir, backupDir] = process.argv.slice(2);

  if (!sourceDir || !backupDir) {
    console.error("Usage: ts-node ./src/index.ts <sourceDir> <backupDir>");
    process.exit(1);
  }

  if (!fs.existsSync(sourceDir) || !fs.statSync(sourceDir).isDirectory()) {
    log("FAILED: source directory not found");
    console.error("Source directory not found");
    process.exit(1);
  }

  const currentHash = computeHash(sourceDir);
  const previousHash = readPreviousHash();

  if (currentHash === previousHash) {
    log("SKIPPED: No changes detected");
    return;
  }

  try {
    fs.mkdirSync(backupDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFilePath = path.join(backupDir, `backup-${timestamp}.tar.gz`);

    execFileSync("tar", ["-czf", backupFilePath, "-C", sourceDir, "."]);

    log("SUCCESS: Backup created");
    log(`HASH: ${currentHash}`);
  } catch {
    log("FAILED: tar command failed");
  }
}

main();
