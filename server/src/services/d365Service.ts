import axios from "axios";
import { getD365Token } from "../auth/msal";
import { config } from "../config";
import { D365SystemUser } from "../types";

function entityUrl(): string {
  return `${config.d365.orgUrl()}/data/${config.d365.systemUsersEntity}`;
}

export async function listSystemUsers(): Promise<D365SystemUser[]> {
  const token = await getD365Token();
  const headers = { Authorization: `Bearer ${token}`, Accept: "application/json" };

  let url: string | undefined =
    `${entityUrl()}?$top=${config.d365.pageSize}`;
  const users: D365SystemUser[] = [];

  while (url) {
    const response: { data: { value?: D365SystemUser[]; "@odata.nextLink"?: string } } =
      await axios.get(url, { headers });
    users.push(...(response.data.value ?? []));
    url = response.data["@odata.nextLink"];
  }

  return users;
}

export async function createSystemUser(
  payload: D365SystemUser
): Promise<D365SystemUser> {
  const token = await getD365Token();
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  const response = await axios.post(entityUrl(), payload, { headers });
  return response.data as D365SystemUser;
}

export async function getMetadataXml(): Promise<string> {
  const token = await getD365Token();
  const response = await axios.get(`${config.d365.orgUrl()}/data/$metadata`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/xml" },
    responseType: "text",
  });
  return response.data as string;
}

export function extractD365ErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data;
    const message =
      (data && (data.error?.message?.value || data.error?.message || data.Message)) ||
      err.message;
    return typeof message === "string" ? message : JSON.stringify(message);
  }
  return err instanceof Error ? err.message : String(err);
}
