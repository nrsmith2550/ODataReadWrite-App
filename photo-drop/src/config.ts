import "dotenv/config";

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  baseUrl: (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/+$/, ""),
  isProd: process.env.NODE_ENV === "production",
  sessionSecret: req("SESSION_SECRET"),
  // 32 bytes, base64. Used to encrypt Google refresh tokens at rest.
  tokenKey: Buffer.from(req("TOKEN_ENCRYPTION_KEY"), "base64"),
  dbPath: process.env.DB_PATH ?? "photo-drop.db",
  google: {
    clientId: req("GOOGLE_CLIENT_ID"),
    clientSecret: req("GOOGLE_CLIENT_SECRET"),
  },
  stripe: {
    secretKey: req("STRIPE_SECRET_KEY"),
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
    priceCents: Number(process.env.PRICE_CENTS ?? 1000),
    currency: process.env.PRICE_CURRENCY ?? "usd",
  },
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB ?? 25),
};

if (config.tokenKey.length !== 32) {
  throw new Error("TOKEN_ENCRYPTION_KEY must be 32 bytes, base64-encoded");
}
