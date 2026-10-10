import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../api/client";
import { friendlyError } from "../utils/format";
import { isEmail, validatePassword } from "../utils/validation";

export default function Register() {
  const { user, register } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ name: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  if (user) return <Navigate to="/" replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (f.name.trim().length < 2) next.name = "Enter your name.";
    if (!isEmail(f.email)) next.email = "Enter a valid email address.";
    const pw = validatePassword(f.password);
    if (pw) next.password = pw;
    if (f.confirm !== f.password) next.confirm = "Passwords do not match.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      await register(f.name.trim(), f.email.trim(), f.password);
      nav("/", { replace: true });
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
        <h1>Create your account</h1>
        <p>It takes under a minute. New accounts are shoppers; admins are set up by the team.</p>
      </div>
      <form className="card form" onSubmit={submit} noValidate>
        <h2>Register</h2>
        {errors.form && <div className="banner error" role="alert">{errors.form}</div>}
        <label>Name
          <input autoComplete="name" value={f.name} onChange={set("name")} aria-invalid={!!errors.name} />
          {errors.name && <span className="field-error">{errors.name}</span>}
        </label>
        <label>Email
          <input type="email" autoComplete="email" value={f.email} onChange={set("email")} aria-invalid={!!errors.email} />
          {errors.email && <span className="field-error">{errors.email}</span>}
        </label>
        <label>Password
          <input type="password" autoComplete="new-password" value={f.password} onChange={set("password")} aria-invalid={!!errors.password} />
          {errors.password && <span className="field-error">{errors.password}</span>}
        </label>
        <label>Confirm password
          <input type="password" autoComplete="new-password" value={f.confirm} onChange={set("confirm")} aria-invalid={!!errors.confirm} />
          {errors.confirm && <span className="field-error">{errors.confirm}</span>}
        </label>
        <button className="btn" disabled={busy}>{busy ? "Creating account…" : "Create account"}</button>
        <p className="muted small-text">Already have an account? <Link to="/login">Log in</Link></p>
      </form>
    </div>
  );
}
