import { useEffect, useState } from "react";
import { api } from "../api/client";
import { CreateResult, D365SystemUser, SyncCandidate } from "../types";

const EDITABLE_FIELDS: Array<keyof D365SystemUser> = [
  "UserID",
  "Name",
  "Email",
  "Company",
];

export function SyncPage() {
  const [candidates, setCandidates] = useState<SyncCandidate[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [overrides, setOverrides] = useState<Record<string, Partial<D365SystemUser>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<CreateResult[] | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    setResults(null);
    api
      .get("/sync/candidates")
      .then((res) => {
        setCandidates(res.data.candidates);
        setSelected(new Set());
        setOverrides({});
      })
      .catch((err) => setError(err?.response?.data?.error ?? "Failed to load candidates"))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === candidates.length
        ? new Set()
        : new Set(candidates.map((c) => c.entraUser.id))
    );
  }

  function updateField(id: string, field: keyof D365SystemUser, value: string) {
    setOverrides((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }

  function valueFor(candidate: SyncCandidate, field: keyof D365SystemUser): string {
    const override = overrides[candidate.entraUser.id]?.[field];
    const base = candidate.proposedPayload[field];
    return String(override ?? base ?? "");
  }

  async function handleCreate() {
    if (selected.size === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post("/sync/create", {
        userIds: Array.from(selected),
        overrides,
      });
      setResults(res.data.results);
      load();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Failed to create users");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Sync candidates</h1>
        <p className="muted">
          Entra ID users with no matching D365 System User. Review and edit the
          proposed field values below, then create the selected users in D365.
        </p>
      </div>

      {loading && <p className="muted">Loading candidates...</p>}
      {error && <div className="error-text">{error}</div>}

      {results && (
        <div className="results-panel">
          <h2>Creation results</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>User</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.entraUserId}>
                  <td>
                    <span className={r.success ? "badge badge-success" : "badge badge-error"}>
                      {r.success ? "Created" : "Failed"}
                    </span>
                  </td>
                  <td>{String(r.payload.UserID ?? r.entraUserId)}</td>
                  <td>{r.error ?? "OK"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && candidates.length === 0 && !results && (
        <p className="muted">No pending users to create. Everything is in sync.</p>
      )}

      {candidates.length > 0 && (
        <>
          <div className="toolbar">
            <label>
              <input
                type="checkbox"
                checked={selected.size === candidates.length}
                onChange={toggleAll}
              />
              Select all ({candidates.length})
            </label>
            <button
              className="btn btn-primary"
              disabled={selected.size === 0 || submitting}
              onClick={handleCreate}
            >
              {submitting ? "Creating..." : `Create selected (${selected.size})`}
            </button>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th></th>
                <th>Entra user</th>
                {EDITABLE_FIELDS.map((f) => (
                  <th key={f}>{f}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => (
                <tr key={c.entraUser.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.has(c.entraUser.id)}
                      onChange={() => toggle(c.entraUser.id)}
                    />
                  </td>
                  <td>
                    <div>{c.entraUser.displayName}</div>
                    <div className="muted small">{c.entraUser.userPrincipalName}</div>
                  </td>
                  {EDITABLE_FIELDS.map((f) => (
                    <td key={f}>
                      <input
                        className="cell-input"
                        value={valueFor(c, f)}
                        onChange={(e) => updateField(c.entraUser.id, f, e.target.value)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
