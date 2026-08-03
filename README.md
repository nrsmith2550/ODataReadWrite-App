# D365 &middot; Entra User Sync

A small internal web app that:

1. Reads the **System Users** table from **Dynamics 365 Finance & Operations** via its OData feed.
2. Reads user accounts from **Microsoft Entra ID** (Azure AD) via Microsoft Graph.
3. Computes which Entra ID users don't yet have a matching D365 System User (matched on email by default).
4. Lets a person review and edit the proposed field values, select which users to create, and creates them in D365 via OData `POST`.

Stack: Node.js/Express/TypeScript backend, React/TypeScript (Vite) frontend.

## How it works / architecture

```
client (React, Vite)  --/api-->  server (Express)  --OData-->  D365 F&O
                                          |
                                          +--Graph API--> Microsoft Entra ID
```

The server holds a single Azure AD **app registration** (client credentials /
app-only flow) and uses it to call both Microsoft Graph and the D365 F&O
OData endpoint — no per-user sign-in to Microsoft is required for the app to
read/write data. The web app itself is protected by a single shared password
(`APP_ACCESS_PASSWORD`) stored in a server-side session cookie. See
[Security notes](#security-notes) below before using this beyond an internal
pilot.

## 1. Azure AD (Entra ID) app registration

You need **one** app registration used for both Graph and D365 F&O:

1. In the [Azure Portal](https://portal.azure.com) &rarr; **Microsoft Entra ID** &rarr; **App registrations** &rarr; **New registration**. Any name, single tenant is fine.
2. Under **Certificates & secrets**, create a new **client secret**. Copy the value immediately (`AZURE_CLIENT_SECRET`).
3. Note the **Application (client) ID** (`AZURE_CLIENT_ID`) and **Directory (tenant) ID** (`AZURE_TENANT_ID`) from the Overview page.
4. Under **API permissions**, add:
   - **Microsoft Graph** &rarr; **Application permissions** &rarr; `User.Read.All` (and `GroupMember.Read.All` if you plan to scope by group via `ENTRA_GROUP_ID`).
   - Click **Grant admin consent** for your tenant.

## 2. Register the app in D365 Finance & Operations

D365 F&O needs to know about this Azure AD application and what it's allowed to do:

1. In D365 F&O, go to **System administration &rarr; Setup &rarr; Microsoft Entra applications** (formerly "Azure Active Directory applications").
2. Click **New**, paste in the **Client ID** (Application ID) from step 1, give it a name, and associate it with a D365 user account that has the security roles/duties needed to read and create System Users (e.g. **System administrator**, or a scoped custom role with read/create on the `SystemUser` entity).
3. Save.
4. Confirm OData is reachable at `https://<your-org>.operations.dynamics.com/data` and that the `SystemUsers` entity set exists (see [Field mapping](#field-mapping-customizing-what-gets-created) below for how to check via `$metadata`).

## 3. Configure environment variables

Copy the example env files and fill them in:

```bash
cp server/.env.example server/.env
```

See `server/.env.example` for the full list with descriptions. Key ones:

| Variable | Purpose |
|---|---|
| `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` | The app registration from step 1 |
| `D365_ORG_URL` | e.g. `https://yourorg.operations.dynamics.com` |
| `D365_SYSTEM_USERS_ENTITY` | OData entity set name, default `SystemUsers` |
| `D365_DEFAULT_COMPANY` | Default `dataAreaId`/company for new users |
| `MATCH_FIELD_D365` / `MATCH_FIELD_ENTRA` | Fields used to detect an existing user (default: `Email` / `mail`) |
| `ENTRA_GROUP_ID` | Optional: only pull Entra members of this group instead of the whole tenant |
| `APP_ACCESS_PASSWORD` | Shared password gating the web UI |
| `D365_FIELD_MAPPING_JSON` | Optional override of the create payload mapping |

## 4. Install & run (development)

Requires Node.js 18+.

```bash
npm install
npm run dev
```

This runs the API on `http://localhost:4000` and the Vite dev server on
`http://localhost:5173` (which proxies `/api` to the server). Open
`http://localhost:5173` and sign in with `APP_ACCESS_PASSWORD`.

## 5. Build & run (production)

```bash
npm run build
NODE_ENV=production npm start
```

In production the Express server also serves the built React app as static
files, so a single process on `PORT` (default 4000) serves everything.

## Field mapping (customizing what gets created)

Every D365 environment customizes the System User entity differently, so the
mapping from an Entra ID user to a D365 `SystemUsers` create payload is
configurable rather than hardcoded.

The default mapping (in `server/src/services/syncService.ts`):

```json
{
  "UserID": "{alias}",
  "NetworkDomain": "{domain}",
  "NetworkAlias": "{alias}",
  "Name": "{displayName}",
  "Email": "{mail}",
  "Company": "{defaultCompany}",
  "Enabled": true
}
```

Placeholders available: `{alias}`, `{domain}` (split from the Entra UPN),
`{displayName}`, `{mail}`, `{upn}`, `{jobTitle}`, `{department}`,
`{defaultCompany}`.

To override without touching code, set `D365_FIELD_MAPPING_JSON` in
`server/.env` to a JSON object using the same shape. Non-string values (e.g.
`true`/`false`/numbers) are passed through as-is.

To find the real field names for your environment, use the in-app metadata
endpoint (`GET /api/d365/metadata`, proxied from D365's `$metadata`) or open
`https://<your-org>.operations.dynamics.com/data/$metadata` directly and
search for the `SystemUsers` entity set / `SystemUser` entity type.

Regardless of the mapping, every proposed record can still be edited per-row
in the **Sync** page before creation.

## Security notes

This is designed as an internal pilot tool. Before wider use, consider:

- **Replace the shared-password gate with real Entra ID SSO** (e.g.
  `@azure/msal-node` + `msal-browser` authorization-code flow) so access is
  tied to individual accounts and can be audited/revoked via Entra ID
  Conditional Access/groups, instead of one shared password.
- Store secrets (`AZURE_CLIENT_SECRET`, `SESSION_SECRET`, `APP_ACCESS_PASSWORD`)
  in a secret manager (e.g. Azure Key Vault) rather than a plain `.env` file
  in production.
- Restrict `CLIENT_ORIGIN`/CORS to your real deployed origin.
- Serve over HTTPS only; `secure` cookies are already enabled automatically
  when `NODE_ENV=production`.
- Scope the D365 security role granted to the app-only user as narrowly as
  possible (read + create on the System User entity only).
- The default in-memory session store is fine for a single-instance pilot;
  swap in a shared store (Redis, etc.) if you run multiple instances.

## Project layout

```
server/   Express + TypeScript API (Graph, D365 OData, sync/diff logic, auth)
client/   React + TypeScript (Vite) frontend
```
