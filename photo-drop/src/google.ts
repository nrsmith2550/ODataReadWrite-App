import { google } from "googleapis";
import { Readable } from "stream";
import { config } from "./config";
import { decrypt } from "./crypto";
import { User } from "./db";

// drive.file only lets the app see files/folders it created itself — it can never
// browse or read the rest of the customer's Drive.
export const SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  "openid",
  "email",
];

export const oauthClient = () =>
  new google.auth.OAuth2(
    config.google.clientId,
    config.google.clientSecret,
    `${config.baseUrl}/auth/google/callback`
  );

export function authUrl(state: string) {
  return oauthClient().generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // guarantees a refresh token
    scope: SCOPES,
    state,
  });
}

function driveFor(user: User) {
  if (!user.refresh_token_enc) throw new Error("Google account not connected");
  const auth = oauthClient();
  auth.setCredentials({ refresh_token: decrypt(user.refresh_token_enc) });
  return google.drive({ version: "v3", auth });
}

export async function createFolder(user: User, name: string) {
  const r = await driveFor(user).files.create({
    requestBody: { name, mimeType: "application/vnd.google-apps.folder" },
    fields: "id,name",
  });
  return { id: r.data.id!, name: r.data.name! };
}

export async function uploadToFolder(
  user: User,
  file: { originalname: string; mimetype: string; buffer: Buffer }
) {
  const r = await driveFor(user).files.create({
    requestBody: { name: file.originalname, parents: [user.folder_id!] },
    media: { mimeType: file.mimetype, body: Readable.from(file.buffer) },
    fields: "id,name,webViewLink",
  });
  return r.data;
}

export async function listFolder(user: User) {
  const r = await driveFor(user).files.list({
    q: `'${user.folder_id}' in parents and trashed = false`,
    orderBy: "createdTime desc",
    pageSize: 50,
    fields: "files(id,name,mimeType,webViewLink,thumbnailLink,createdTime)",
  });
  return r.data.files ?? [];
}
