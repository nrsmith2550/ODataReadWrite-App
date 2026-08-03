import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { Layout } from "./components/Layout";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { SyncPage } from "./pages/SyncPage";
import { D365UsersPage } from "./pages/D365UsersPage";
import { EntraUsersPage } from "./pages/EntraUsersPage";

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { authenticated, loading } = useAuth();
  if (loading) return <div className="page-loading">Loading...</div>;
  if (!authenticated) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="sync" element={<SyncPage />} />
        <Route path="d365-users" element={<D365UsersPage />} />
        <Route path="entra-users" element={<EntraUsersPage />} />
      </Route>
    </Routes>
  );
}
