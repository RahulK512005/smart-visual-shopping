import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { USE_MOCK } from "../api";
import { ApiError } from "../api/client";
import { friendlyError } from "../utils/format";
import { isEmail } from "../utils/validation";

export default function Login() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={from} replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!isEmail(email)) next.email = "Enter a valid email address.";
    if (!password) next.password = "Enter your password.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      await login(email, password);
      nav(from, { replace: true });
    } catch (err) {
      const a = err as ApiError;
      setErrors({ form: friendlyError(a.code, a.message) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <div className="auth-intro">
        <h1>Find it. Check it fits.</h1>
        <p>Upload a photo to find similar products, or check if something will work with what you already own.</p>
      </div>
      <form className="card form" onSubmit={submit} noValidate>
        <h2>Log in</h2>
        {errors.form && <div className="banner error" role="alert">{errors.form}</div>}
        <label>Email
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errors.email} />
          {errors.email && <span className="field-error">{errors.email}</span>}
        </label>
        <label>Password
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!errors.password} />
          {errors.password && <span className="field-error">{errors.password}</span>}
        </label>
        <button className="btn" disabled={busy}>{busy ? "Logging in…" : "Log in"}</button>
        <p className="muted small-text">New here? <Link to="/register">Create an account</Link></p>
        {USE_MOCK && (
          <p className="hint">Demo accounts: shopper@vyumi.test / shopper123 · admin@vyumi.test / admin123</p>
        )}
      </form>
    </div>
  );
}
