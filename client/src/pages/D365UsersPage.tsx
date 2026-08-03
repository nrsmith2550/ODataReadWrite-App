import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { D365SystemUser } from "../types";

export function D365UsersPage() {
  const [users, setUsers] = useState<D365SystemUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    api
      .get("/d365/system-users")
      .then((res) => setUsers(res.data.users))
      .catch((err) => setError(err?.response?.data?.error ?? "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      JSON.stringify(u).toLowerCase().includes(q)
    );
  }, [users, query]);

  return (
    <div>
      <div className="page-header">
        <h1>D365 System Users</h1>
        <p className="muted">Live data pulled via OData from your D365 Finance &amp; Operations environment.</p>
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
                <th>UserID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Company</th>
                <th>Enabled</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <tr key={String(u.UserID ?? i)}>
                  <td>{String(u.UserID ?? "")}</td>
                  <td>{String(u.Name ?? "")}</td>
                  <td>{String(u.Email ?? "")}</td>
                  <td>{String(u.Company ?? "")}</td>
                  <td>{String(u.Enabled ?? "")}</td>
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
