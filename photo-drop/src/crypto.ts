import crypto from "crypto";
import { config } from "./config";

export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", config.tokenKey, iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), enc]).toString("base64");
}

export function decrypt(blob: string): string {
  const buf = Buffer.from(blob, "base64");
  const d = crypto.createDecipheriv("aes-256-gcm", config.tokenKey, buf.subarray(0, 12));
  d.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString("utf8");
}

export const randomToken = () => crypto.randomBytes(18).toString("base64url");
