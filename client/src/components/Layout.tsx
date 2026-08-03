import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Layout() {
  const { logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">D365 &middot; Entra User Sync</div>
        <nav className="nav">
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          <NavLink to="/sync">Sync</NavLink>
          <NavLink to="/d365-users">D365 Users</NavLink>
          <NavLink to="/entra-users">Entra Users</NavLink>
        </nav>
        <button className="btn btn-ghost" onClick={() => logout()}>
          Sign out
        </button>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
