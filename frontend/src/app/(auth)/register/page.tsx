"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  if (score <= 1) return { score, label: "Weak", color: "bg-red-500" };
  if (score <= 2) return { score, label: "Fair", color: "bg-yellow-500" };
  if (score <= 3) return { score, label: "Good", color: "bg-blue-500" };
  return { score, label: "Strong", color: "bg-green-500" };
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
    <Card>
      <CardHeader>
        <CardTitle className="text-center text-2xl">Create Account</CardTitle>
        <p className="text-center text-sm text-slate-400">
          Join Nexus to unlock draft intelligence
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
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
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  <div className="flex flex-1 gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={cn(
                          "h-1 flex-1 rounded-full transition-colors",
                          i <= passwordStrength.score
                            ? passwordStrength.color
                            : "bg-slate-700"
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-slate-400">
                    {passwordStrength.label}
                  </span>
                </div>
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
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
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

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-blue-400 hover:text-blue-300"
          >
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
