"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const { signIn, isSigningIn, signInError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signIn({ email, password });
      router.push("/dashboard");
    } catch {
      // Error handled via signInError
    }
  };

  return (
    <div className="animate-fade-in">
      <h2 className="text-center text-lg font-semibold tracking-tight text-white">Welcome back</h2>
      <p className="mt-1 text-center text-xs text-[var(--color-text-muted)]">
        Sign in to your Nexus account
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          label="Password"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {signInError && (
          <div className="border-l-2 border-red-500/60 bg-red-500/5 px-3 py-2 text-xs text-red-400">
            {signInError.message}
          </div>
        )}

        <Button
          type="submit"
          className="w-full"
          size="lg"
          isLoading={isSigningIn}
        >
          Sign In
        </Button>
      </form>

      <p className="mt-8 text-center text-xs text-[var(--color-text-muted)]">
        No account?{" "}
        <Link
          href="/register"
          className="text-amber-500 hover:text-amber-400"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}
