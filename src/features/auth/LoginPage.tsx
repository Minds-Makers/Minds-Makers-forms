import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setError(error.message);
    else navigate("/admin");
  }

  async function onForgotPassword() {
    if (!email) {
      setError("Enter your email above first, then click 'Forgot password'.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    setBusy(false);
    if (error) setError(error.message);
    else setResetSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-sm p-8">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-[30px] h-[30px] rounded-sm bg-cyan-soft border border-cyan/45 flex items-center justify-center text-cyan text-xs font-bold">
            MM
          </div>
          <span className="font-head font-bold text-lg">Minds Makers</span>
        </div>
        <span className="mono-label text-cyan">Admin sign in</span>
        <h1 className="text-2xl mt-2 mb-6">Welcome back</h1>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Input
            type="email"
            placeholder="you@mindsmakers.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          {error && <p className="text-err text-sm">{error}</p>}
          {resetSent && <p className="text-cyan text-sm">Password reset email sent.</p>}
          <Button type="submit" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </Button>
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-faint text-sm hover:text-muted text-left"
          >
            Forgot password?
          </button>
          <Link to="/admin/signup" className="text-faint text-sm hover:text-muted text-left">
            Need an account? Sign up
          </Link>
        </form>
      </Card>
    </div>
  );
}
