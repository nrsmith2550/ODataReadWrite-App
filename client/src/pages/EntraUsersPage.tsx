import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { EntraUser } from "../types";

export function EntraUsersPage() {
  const [users, setUsers] = useState<EntraUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    api
      .get("/entra/users")
      .then((res) => setUsers(res.data.users))
      .catch((err) => setError(err?.response?.data?.error ?? "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => JSON.stringify(u).toLowerCase().includes(q));
  }, [users, query]);

  return (
    <div>
      <div className="page-header">
        <h1>Entra ID Users</h1>
        <p className="muted">Live data pulled via Microsoft Graph.</p>
      </div>

      {loading && <p className="muted">Loading...</p>}
      {error && <div className="error-text">{error}</div>}

      {!loading && !error && (
        <>
          <input
            className="search-input"
            placeholder="Search users..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <table className="data-table">
            <thead>
              <tr>
                <th>Display name</th>
                <th>UPN</th>
                <th>Email</th>
                <th>Department</th>
                <th>Enabled</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td>{u.displayName}</td>
                  <td>{u.userPrincipalName}</td>
                  <td>{u.mail}</td>
                  <td>{u.department}</td>
                  <td>{String(u.accountEnabled)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted small">{filtered.length} of {users.length} users</p>
        </>
      )}
    </div>
  );
}
