import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [checkingFirst, setCheckingFirst] = useState(true);
  const [isFirstAdmin, setIsFirstAdmin] = useState(false);

  const navigate = useNavigate();

  // Check whether this would be the very first admin account.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("is_first_admin");
      if (cancelled) return;
      if (error) {
        console.error("is_first_admin failed:", error.message);
        setIsFirstAdmin(false);
      } else {
        setIsFirstAdmin(!!data);
      }
      setCheckingFirst(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    // 1. Invite code — skipped if this is the first-ever admin.
    if (!isFirstAdmin) {
      const expected = import.meta.env.VITE_SIGNUP_INVITE_CODE;
      if (!expected) {
        setError("Sign-up is not configured. Contact the administrator.");
        return;
      }
      if (inviteCode.trim() !== expected) {
        setError("Invalid invite code.");
        return;
      }
    }

    // 2. Validate password.
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    // 3. Create the account.
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    setBusy(false);

    if (error) {
      setError(error.message);
      return;
    }

    // 4. Go to login.
    navigate("/admin/login");
  }

  if (checkingFirst) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-sm p-8">
          <Skeleton className="h-6 w-1/2 mb-4" />
          <Skeleton className="h-10 w-full mb-3" />
          <Skeleton className="h-10 w-full mb-3" />
          <Skeleton className="h-10 w-full" />
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm p-8">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-[30px] h-[30px] rounded-sm bg-cyan-soft border border-cyan/45 flex items-center justify-center text-cyan text-xs font-bold">
            MM
          </div>
          <span className="font-head font-bold text-lg">Minds Makers</span>
        </div>

        {isFirstAdmin ? (
          <>
            <span className="mono-label text-cyan">First-time setup</span>
            <h1 className="text-2xl mt-2 mb-2">Create the root account</h1>
            <p className="text-faint text-sm mb-6">
              This is the first account on this installation. It will have full admin access —
              no invite code needed.
            </p>
          </>
        ) : (
          <>
            <span className="mono-label text-cyan">Create admin account</span>
            <h1 className="text-2xl mt-2 mb-6">Sign up</h1>
          </>
        )}

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
            placeholder="Password (min 8 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
          <Input
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
          />

          {!isFirstAdmin && (
            <Input
              type="text"
              placeholder="Invite code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              required
            />
          )}

          {error && <p className="text-err text-sm">{error}</p>}

          <Button type="submit" disabled={busy}>
            {busy ? "Creating account…" : isFirstAdmin ? "Create root account" : "Create account"}
          </Button>

          <Link
            to="/admin/login"
            className="text-faint text-sm hover:text-muted text-center"
          >
            Already have an account? Sign in
          </Link>
        </form>
      </Card>
    </div>
  );
}