import { config } from "../config";
import { D365SystemUser, EntraUser, SyncCandidate } from "../types";
import { listEntraUsers } from "./graphService";
import { listSystemUsers } from "./d365Service";

// Default mapping from D365 System User field -> template string.
// Placeholders are substituted from the Entra user (see buildPlaceholders).
// Override entirely via the D365_FIELD_MAPPING_JSON env var if your
// SystemUsers entity has different/custom field names.
const DEFAULT_FIELD_MAPPING: Record<string, string | boolean> = {
  UserID: "{alias}",
  NetworkDomain: "{domain}",
  NetworkAlias: "{alias}",
  Name: "{displayName}",
  Email: "{mail}",
  Company: "{defaultCompany}",
  Enabled: true,
};

function loadFieldMapping(): Record<string, string | boolean> {
  if (!config.fieldMappingOverride) return DEFAULT_FIELD_MAPPING;
  try {
    return JSON.parse(config.fieldMappingOverride);
  } catch (err) {
    throw new Error(
      `D365_FIELD_MAPPING_JSON is not valid JSON: ${(err as Error).message}`
    );
  }
}

function splitUpn(upn: string): { alias: string; domain: string } {
  const at = upn.indexOf("@");
  if (at === -1) return { alias: upn, domain: "" };
  return { alias: upn.slice(0, at), domain: upn.slice(at + 1) };
}

function buildPlaceholders(user: EntraUser): Record<string, string> {
  const { alias, domain } = splitUpn(user.userPrincipalName || "");
  return {
    alias,
    domain,
    displayName: user.displayName || alias,
    mail: user.mail || user.userPrincipalName || "",
    upn: user.userPrincipalName || "",
    jobTitle: user.jobTitle || "",
    department: user.department || "",
    defaultCompany: config.d365.defaultCompany,
  };
}

function renderTemplate(template: string, placeholders: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    key in placeholders ? placeholders[key] : match
  );
}

export function buildPayload(user: EntraUser): D365SystemUser {
  const mapping = loadFieldMapping();
  const placeholders = buildPlaceholders(user);
  const payload: D365SystemUser = {};

  for (const [field, value] of Object.entries(mapping)) {
    payload[field] = typeof value === "string" ? renderTemplate(value, placeholders) : value;
  }

  return payload;
}

function normalize(value: string | null | undefined): string {
  return (value || "").trim().toLowerCase();
}

export interface DiffResult {
  entraTotal: number;
  d365Total: number;
  matchedCount: number;
  candidates: SyncCandidate[];
}

export async function computeCandidates(): Promise<DiffResult> {
  const [entraUsers, d365Users] = await Promise.all([
    listEntraUsers(),
    listSystemUsers(),
  ]);

  const d365MatchField = config.d365.matchFieldD365;
  const existing = new Set(
    d365Users
      .map((u) => normalize(u[d365MatchField] as string | undefined))
      .filter((v) => v.length > 0)
  );

  const entraMatchField = config.entra.matchFieldEntra as keyof EntraUser;

  const candidates: SyncCandidate[] = [];
  let matchedCount = 0;

  for (const user of entraUsers) {
    const matchValue = normalize(
      (user[entraMatchField] as string | undefined) || user.userPrincipalName
    );
    if (matchValue && existing.has(matchValue)) {
      matchedCount += 1;
      continue;
    }
    candidates.push({ entraUser: user, proposedPayload: buildPayload(user) });
  }

  return {
    entraTotal: entraUsers.length,
    d365Total: d365Users.length,
    matchedCount,
    candidates,
  };
}
