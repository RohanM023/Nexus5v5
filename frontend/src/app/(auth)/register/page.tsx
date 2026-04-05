"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { cn } from "@/lib/utils";

function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: "Weak", color: "bg-[var(--color-score-poor-bg)]" };
  if (score <= 2) return { score, label: "Fair", color: "bg-[var(--color-score-low-bg)]" };
  if (score <= 3) return { score, label: "Good", color: "bg-[var(--color-score-mid-bg)]" };
  return { score, label: "Strong", color: "bg-[var(--color-score-high-bg)]" };
}

export default function RegisterPage() {
  const router = useRouter();
  const { signUp, isSigningUp, signUpError } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const passwordStrength = getPasswordStrength(password);
  const passwordsMatch = password === confirmPassword;
  const canSubmit =
    displayName.length >= 2 &&
    email.length > 0 &&
    password.length >= 8 &&
    passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      await signUp({ email, password, display_name: displayName });
      router.push("/dashboard");
    } catch {
      // Error handled via signUpError
    }
  };

  return (
    <div className="animate-fade-in">
      <h2 className="text-center text-lg font-semibold tracking-tight text-[var(--color-text-primary)]">Create Account</h2>
      <p className="mt-1 text-center text-xs text-[var(--color-text-muted)]">
        Join Lynkr to unlock draft intelligence
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <Input
          label="Display Name"
          type="text"
          placeholder="Your summoner alias"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
          minLength={2}
        />
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <div>
          <Input
            label="Password"
            type="password"
            placeholder="Min. 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
          {password.length > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <div className="flex flex-1 gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-0.5 flex-1 rounded-full transition-colors",
                      i <= passwordStrength.score
                        ? passwordStrength.color
                        : "bg-[var(--color-border)]"
                    )}
                  />
                ))}
              </div>
              <span className="font-mono text-[9px] tracking-wider text-[var(--color-text-muted)]">
                {passwordStrength.label}
              </span>
            </div>
          )}
        </div>
        <Input
          label="Confirm Password"
          type="password"
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          error={
            confirmPassword.length > 0 && !passwordsMatch
              ? "Passwords do not match"
              : undefined
          }
        />

        {signUpError && (
          <div className="border-l-2 border-[var(--color-danger)]/60 bg-[var(--color-danger)]/5 px-3 py-2 text-xs text-[var(--color-danger)]">
            {signUpError.message}
          </div>
        )}

        <Button
          type="submit"
          className="w-full"
          size="lg"
          isLoading={isSigningUp}
          disabled={!canSubmit}
        >
          Create Account
        </Button>
      </form>

      <OAuthButtons />

      <p className="mt-8 text-center text-xs text-[var(--color-text-muted)]">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-[var(--color-accent-text)] hover:text-[var(--color-accent-hover)]"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
