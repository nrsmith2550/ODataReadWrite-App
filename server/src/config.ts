import "dotenv/config";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export const config = {
  port: Number(optionalEnv("PORT", "4000")),
  nodeEnv: optionalEnv("NODE_ENV", "development"),
  sessionSecret: optionalEnv("SESSION_SECRET", "dev-only-secret-change-me"),
  appAccessPassword: process.env.APP_ACCESS_PASSWORD ?? "",
  clientOrigin: optionalEnv("CLIENT_ORIGIN", "http://localhost:5173"),

  azure: {
    tenantId: () => requireEnv("AZURE_TENANT_ID"),
    clientId: () => requireEnv("AZURE_CLIENT_ID"),
    clientSecret: () => requireEnv("AZURE_CLIENT_SECRET"),
  },

  d365: {
    orgUrl: () => requireEnv("D365_ORG_URL").replace(/\/+$/, ""),
    systemUsersEntity: optionalEnv("D365_SYSTEM_USERS_ENTITY", "SystemUsers"),
    defaultCompany: optionalEnv("D365_DEFAULT_COMPANY", "USMF"),
    matchFieldD365: optionalEnv("MATCH_FIELD_D365", "Email"),
    pageSize: Number(optionalEnv("D365_PAGE_SIZE", "500")),
  },

  entra: {
    groupId: process.env.ENTRA_GROUP_ID || "",
    matchFieldEntra: optionalEnv("MATCH_FIELD_ENTRA", "mail"),
    pageSize: Number(optionalEnv("ENTRA_PAGE_SIZE", "999")),
  },

  fieldMappingOverride: process.env.D365_FIELD_MAPPING_JSON || "",
};
