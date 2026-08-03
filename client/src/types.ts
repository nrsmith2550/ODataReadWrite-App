export interface EntraUser {
  id: string;
  displayName: string | null;
  userPrincipalName: string;
  mail: string | null;
  accountEnabled: boolean;
  jobTitle: string | null;
  department: string | null;
}

export interface D365SystemUser {
  UserID?: string;
  Email?: string;
  Name?: string;
  NetworkAlias?: string;
  NetworkDomain?: string;
  Enabled?: boolean;
  Company?: string;
  [key: string]: unknown;
}

export interface SyncCandidate {
  entraUser: EntraUser;
  proposedPayload: D365SystemUser;
}

export interface DiffResult {
  entraTotal: number;
  d365Total: number;
  matchedCount: number;
  candidates: SyncCandidate[];
}

export interface CreateResult {
  entraUserId: string;
  success: boolean;
  status?: number;
  error?: string;
  payload: D365SystemUser;
}
