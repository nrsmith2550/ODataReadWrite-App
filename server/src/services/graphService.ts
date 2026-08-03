import axios from "axios";
import { getGraphToken } from "../auth/msal";
import { config } from "../config";
import { EntraUser } from "../types";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";
const USER_SELECT =
  "id,displayName,userPrincipalName,mail,accountEnabled,jobTitle,department";

export async function listEntraUsers(): Promise<EntraUser[]> {
  const token = await getGraphToken();
  const headers = { Authorization: `Bearer ${token}` };

  const groupId = config.entra.groupId;
  let url: string;

  if (groupId) {
    url =
      `${GRAPH_BASE}/groups/${encodeURIComponent(groupId)}/members` +
      `/microsoft.graph.user?$select=${USER_SELECT}&$top=${config.entra.pageSize}`;
  } else {
    url = `${GRAPH_BASE}/users?$select=${USER_SELECT}&$top=${config.entra.pageSize}`;
  }

  const users: EntraUser[] = [];

  while (url) {
    const response = await axios.get(url, { headers });
    const page = (response.data.value ?? []) as EntraUser[];
    users.push(...page);
    url = response.data["@odata.nextLink"];
  }

  return users;
}
