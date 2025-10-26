import { config, parse } from "dotenv";
import fs from "fs";
import path from "path";

const envPath = path.resolve(process.cwd(), ".env");
const envResult = config({ path: envPath });

if (envResult.error) {
  console.warn(`Warning: failed to load environment variables from ${envPath}`, envResult.error);
} else if (envResult.parsed && Object.keys(envResult.parsed).length > 0) {
  console.log(`Loaded environment variables from ${envPath}: ${Object.keys(envResult.parsed).join(", ")}`);
} else {
  try {
    const rawEnv = fs.readFileSync(envPath, "utf8");
    console.log(`Raw .env contents (debug): ${JSON.stringify(rawEnv)}`);
    const parsedEnv = parse(rawEnv);
    console.log(`Parsed env keys (debug): ${Object.keys(parsedEnv).join(", ")}`);
    const normalizedEntries: Record<string, string> = {};
    for (const [rawKey, rawValue] of Object.entries(parsedEnv)) {
      const key = rawKey.replace(/^\uFEFF/, "").trim();
      if (!key) {
        continue;
      }
      const value = typeof rawValue === "string" ? rawValue.trim() : "";
      normalizedEntries[key] = value;
      process.env[key] = value;
    }
    console.log(
      `Loaded environment variables from ${envPath} via manual parse: ${Object.keys(normalizedEntries)
        .map((key) => JSON.stringify(key))
        .join(", " )}`
    );
    console.log(`process.env keys with DATABASE/POSTGRES/NEON after manual parse: ${Object.keys(process.env)
      .filter((key) => key.toUpperCase().includes("DATABASE") || key.toUpperCase().includes("POSTGRES") || key.toUpperCase().includes("NEON"))
      .map((key) => `${key}=${process.env[key]}`)
      .join(" | ")}`);
  } catch (manualParseError) {
    console.warn(`Warning: manual parse of ${envPath} failed`, manualParseError);
  }
}

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Support multiple common env var names for DB URL
const readEnv = (key: string) => {
  const direct = process.env[key];
  if (typeof direct === "string") {
    return direct.trim();
  }

  const target = key.trim();
  for (const [envKey, envValue] of Object.entries(process.env)) {
    if (envKey.replace(/^\uFEFF/, "").trim() === target && typeof envValue === "string") {
      return envValue.trim();
    }
  }

  return undefined;
};

const envCandidates = [
  { key: "DATABASE_URL", value: readEnv("DATABASE_URL") },
  { key: "POSTGRES_URL", value: readEnv("POSTGRES_URL") },
  { key: "NEON_DATABASE_URL", value: readEnv("NEON_DATABASE_URL") },
  { key: "DATABASE_URL_POOLER", value: readEnv("DATABASE_URL_POOLER") },
];

const firstMatch = envCandidates.find(({ value }) => typeof value === "string" && value.length > 0);

if (!firstMatch) {
  console.warn(
    "Database URL environment variable not detected. Available keys:",
    Object.keys(process.env)
      .filter((key) => key.toUpperCase().includes("DATABASE") || key.toUpperCase().includes("POSTGRES") || key.toUpperCase().includes("NEON"))
      .map((key) => `${key}=${typeof process.env[key] === "string" && process.env[key] !== "" ? "<set>" : "<unset>"}`)
  );
}

const DATABASE_URL = firstMatch?.value ?? "";
const resolvedKey = firstMatch?.key;

console.log(
  `Database URL detection: key=${resolvedKey ?? "<none>"}, valuePreview=${DATABASE_URL ? `${DATABASE_URL.slice(0, 12)}... (len=${DATABASE_URL.length})` : "<empty>"}`
);

console.log(`process.env.DATABASE_URL (debug) = ${process.env.DATABASE_URL}`);

if (!resolvedKey) {
  console.warn(
    "Database URL environment variable not detected. Available keys:",
    Object.keys(process.env)
      .filter((key) => key.toUpperCase().includes("DATABASE") || key.toUpperCase().includes("POSTGRES") || key.toUpperCase().includes("NEON"))
      .map((key) => `${key}=${typeof process.env[key] === "string" ? "<set>" : "<unset>"}`)
  );
}

if (!DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set (or POSTGRES_URL/NEON_DATABASE_URL/DATABASE_URL_POOLER).",
  );
}

// Validate DATABASE_URL format
try {
  const url = new URL(DATABASE_URL);
  const usedVar = resolvedKey || 'DATABASE_URL';
  console.log(`Attempting to connect to database using ${usedVar} at: ${url.hostname}:${url.port || 5432}`);
} catch (e) {
  console.error("Invalid DATABASE_URL format:", DATABASE_URL);
  throw new Error("Invalid DATABASE_URL format");
}

// Configure pool with robust retry and error handling settings
export const pool = new Pool({ 
  connectionString: DATABASE_URL,
  max: 5, // Further reduced maximum number of clients in the pool
  idleTimeoutMillis: 15000, // Time a client can be idle before being closed
  connectionTimeoutMillis: 8000, // Time to wait for a connection
  maxUses: 750, // Maximum number of times a client can be used before being recycled
  allowExitOnIdle: true, // Allow process to exit when pool is idle
  query_timeout: 10000, // Query timeout in milliseconds
  statement_timeout: 10000, // Statement timeout in milliseconds
  keepAlive: true,
  keepAliveInitialDelayMillis: 5000
});

// Add error handling for the pool
pool.on('error', (err) => {
  console.error('Unexpected error on idle database connection:', err.message);
  // Don't exit the process, just log the error
});

pool.on('connect', () => {
  console.log('✅ Database connection established successfully');
});

pool.on('acquire', () => {
  console.log('🔄 Database connection acquired from pool');
});

pool.on('remove', () => {
  console.log('🗑️ Database connection removed from pool');
});

pool.on('connect', () => {
  console.log('Database connection established');
});

pool.on('acquire', () => {
  console.log('Database connection acquired from pool');
});

// Create database instance with better error handling
export const db = drizzle({ 
  client: pool, 
  schema,
  logger: process.env.NODE_ENV === 'development' // Enable logging in development
});

