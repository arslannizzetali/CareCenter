import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const envPath = path.join(rootDir, ".env");
const apiEnvPath = path.join(rootDir, "apps", "api", ".env");
const examplePath = path.join(rootDir, ".env.example");

const secretNames = ["JWT_SECRET", "JWT_REFRESH_SECRET", "MASTER_ENCRYPTION_KEY"] as const;

function makeSecret(): string {
  return crypto.randomBytes(32).toString("hex");
}

function loadBaseEnv(): string {
  if (fs.existsSync(envPath)) {
    return fs.readFileSync(envPath, "utf8");
  }

  if (fs.existsSync(examplePath)) {
    return fs.readFileSync(examplePath, "utf8");
  }

  return "";
}

function upsertEnvValue(contents: string, key: (typeof secretNames)[number], value: string): string {
  const pattern = new RegExp(`^${key}=.*$`, "m");
  if (pattern.test(contents)) {
    return contents.replace(pattern, `${key}=${value}`);
  }

  const separator = contents.endsWith("\n") || contents.length === 0 ? "" : "\n";
  return `${contents}${separator}${key}=${value}\n`;
}

let envContents = loadBaseEnv();
for (const secretName of secretNames) {
  envContents = upsertEnvValue(envContents, secretName, makeSecret());
}

fs.writeFileSync(envPath, envContents, { encoding: "utf8", mode: 0o600 });
if (fs.existsSync(path.dirname(apiEnvPath))) {
  fs.writeFileSync(apiEnvPath, envContents, { encoding: "utf8", mode: 0o600 });
}
console.log(".env dosyalarına JWT_SECRET, JWT_REFRESH_SECRET ve MASTER_ENCRYPTION_KEY yazıldı.");
