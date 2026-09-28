"use client";
import { useState } from "react";
import Link from "next/link";
import { browserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
export function AuthForm({
  mode,
  enabled,
}: {
  mode: "login" | "signup" | "forgot-password" | "reset-password";
  enabled: boolean;
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!enabled) {
          setMessage(
            "Configure Supabase to enable accounts. You can explore the organizer demo now.",
          );
          return;
        }
        setBusy(true);
        setMessage("");
        const data = new FormData(e.currentTarget);
        const email = String(data.get("email"));
        const password = String(data.get("password"));
        try {
          const db = browserClient();
          if (mode === "forgot-password") {
            const { error } = await db.auth.resetPasswordForEmail(email, {
              redirectTo: `${location.origin}/callback?next=/reset-password`,
            });
            if (error) throw error;
            setMessage(
              "If an account exists, check your email for a reset link.",
            );
          } else if (mode === "reset-password") {
            const { error } = await db.auth.updateUser({ password });
            if (error) throw error;
            location.assign("/dashboard");
          } else if (mode === "signup") {
            const { error } = await db.auth.signUp({
              email,
              password,
              options: { emailRedirectTo: `${location.origin}/callback` },
            });
            if (error) throw error;
            setMessage(
              "Check your email to confirm your account, then sign in.",
            );
          } else {
            const { error } = await db.auth.signInWithPassword({
              email,
              password,
            });
            if (error) throw error;
            location.assign("/dashboard");
          }
        } catch (error) {
          setMessage(
            error instanceof Error ? error.message : "Unable to sign in",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      {mode !== "reset-password" && (
        <label>
          Email
          <input type="email" name="email" autoComplete="email" required />
        </label>
      )}
      {mode !== "forgot-password" && (
        <label>
          Password
          <input
            type="password"
            name="password"
            minLength={12}
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            required
          />
        </label>
      )}
      <Button disabled={busy} className="w-full">
        {busy
          ? "Please wait…"
          : mode === "login"
            ? "Sign in"
            : mode === "signup"
              ? "Create account"
              : mode === "forgot-password"
                ? "Send reset link"
                : "Save new password"}
      </Button>
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      <div className="flex justify-between text-xs text-primary">
        <Link href={mode === "signup" ? "/login" : "/signup"}>
          {mode === "signup"
            ? "Already a member? Sign in"
            : "Create an account"}
        </Link>
        <Link href="/forgot-password">Forgot password?</Link>
      </div>
    </form>
  );
}
