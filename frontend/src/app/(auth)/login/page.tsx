"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    <Card>
      <CardHeader>
        <CardTitle className="text-center text-2xl">Welcome Back</CardTitle>
        <p className="text-center text-sm text-slate-400">
          Sign in to your Nexus account
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
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

        <p className="mt-6 text-center text-sm text-slate-500">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-medium text-blue-400 hover:text-blue-300"
          >
            Create one
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
