import fs from 'node:fs';
import path from 'node:path';

const rootDir = path.resolve(import.meta.dirname, '..');
const rootEnvPath = path.join(rootDir, '.env');
const functionsEnvPath = path.join(rootDir, 'functions', '.env');

function parseEnvFile(content) {
  const vars = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIndex = line.indexOf('=');
    if (eqIndex <= 0) continue;
    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    vars[key] = value;
  }
  return vars;
}

if (fs.existsSync(rootEnvPath)) {
  const envVars = parseEnvFile(fs.readFileSync(rootEnvPath, 'utf8'));
  const geminiKey = (envVars.GEMINI_API_KEY || '').trim();
  if (geminiKey) {
    fs.writeFileSync(functionsEnvPath, `GEMINI_API_KEY=${geminiKey}\n`, 'utf8');
  }
}
