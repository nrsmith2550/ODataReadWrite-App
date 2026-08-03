import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { DiffResult } from "../types";

export function Dashboard() {
  const [diff, setDiff] = useState<DiffResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<DiffResult>("/sync/candidates")
      .then((res) => setDiff(res.data))
      .catch((err) => setError(err?.response?.data?.error ?? "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1>Dashboard</h1>
      {loading && <p className="muted">Loading summary...</p>}
      {error && <div className="error-text">{error}</div>}
      {diff && (
        <div className="card-grid">
          <div className="card">
            <div className="card-value">{diff.d365Total}</div>
            <div className="card-label">D365 System Users</div>
            <Link to="/d365-users">View list &rarr;</Link>
          </div>
          <div className="card">
            <div className="card-value">{diff.entraTotal}</div>
            <div className="card-label">Entra ID Users</div>
            <Link to="/entra-users">View list &rarr;</Link>
          </div>
          <div className="card">
            <div className="card-value">{diff.matchedCount}</div>
            <div className="card-label">Already synced</div>
          </div>
          <div className="card card-highlight">
            <div className="card-value">{diff.candidates.length}</div>
            <div className="card-label">Pending creation candidates</div>
            <Link to="/sync">Review &amp; create &rarr;</Link>
          </div>
        </div>
      )}
    </div>
  );
}
