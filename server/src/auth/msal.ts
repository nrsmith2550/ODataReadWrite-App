import { ConfidentialClientApplication } from "@azure/msal-node";
import { config } from "../config";

let cca: ConfidentialClientApplication | null = null;

function getClientApp(): ConfidentialClientApplication {
  if (!cca) {
    cca = new ConfidentialClientApplication({
      auth: {
        clientId: config.azure.clientId(),
        authority: `https://login.microsoftonline.com/${config.azure.tenantId()}`,
        clientSecret: config.azure.clientSecret(),
      },
    });
  }
  return cca;
}

async function acquireToken(scope: string): Promise<string> {
  const app = getClientApp();
  const result = await app.acquireTokenByClientCredential({
    scopes: [scope],
  });
  if (!result?.accessToken) {
    throw new Error(`Failed to acquire token for scope: ${scope}`);
  }
  return result.accessToken;
}

// msal-node's ConfidentialClientApplication caches client-credential tokens
// internally and returns a cached token until it is close to expiry, so it's
// safe to call this on every request.
export function getGraphToken(): Promise<string> {
  return acquireToken("https://graph.microsoft.com/.default");
}

export function getD365Token(): Promise<string> {
  return acquireToken(`${config.d365.orgUrl()}/.default`);
}
