import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { USE_MOCK } from "../api";

export default function Layout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <header className="topbar">
        <div className="topbar-inner">
          <NavLink to="/" className="brand" aria-label="VYUMI home">VYUMI</NavLink>
          <nav aria-label="Main" className="nav">
            <NavLink to="/" end>Smart Visual Shopping</NavLink>
            {user?.role === "admin" && <NavLink to="/admin">Catalog</NavLink>}
          </nav>
          <div className="who">
            {user && (
              <>
                <span className="who-name">{user.name}</span>
                <span className={`badge ${user.role}`}>{user.role}</span>
                <button className="btn ghost small" onClick={() => { logout(); nav("/login"); }}>Log out</button>
              </>
            )}
          </div>
        </div>
        {USE_MOCK && <div className="mockbar">Demo mode: using sample data, no backend connected.</div>}
      </header>
      <main id="main"><Outlet /></main>
    </>
  );
}
