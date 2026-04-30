"use client";

import { useEffect, useState } from "react";
import { Mail, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import posthog from "posthog-js";
import { authClient } from "@/lib/auth-client";

function getAuthError(result: unknown) {
  if (!result || typeof result !== "object") return null;
  const error = (result as Record<string, unknown>).error;
  if (!error || typeof error !== "object") return null;
  const message = (error as Record<string, unknown>).message;
  return typeof message === "string" ? message : "Authentication failed";
}

export function AuthNudge({
  open,
  onOpenChange,
  onAuthed,
  initialMode = "signin",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthed?: () => void;
  initialMode?: "signin" | "signup";
}) {
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) setMode(initialMode);
  }, [initialMode, open]);

  const handleGoogle = async () => {
    const result = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/",
    });
    const error = getAuthError(result);
    if (error) {
      toast.error("Google login is not configured yet.");
    }
  };

  const handleEmail = async () => {
    setIsSubmitting(true);
    try {
      const result =
        mode === "signin"
          ? await authClient.signIn.email({
              email,
              password,
            })
          : await authClient.signUp.email({
              name,
              email,
              password,
            });

      const error = getAuthError(result);
      if (error) {
        toast.error(error);
        return;
      }

      const userId = (result as { data?: { user?: { id?: string; name?: string; email?: string } } })?.data?.user?.id;
      if (userId) {
        posthog.identify(userId, { email, name: name || undefined });
      }

      if (mode === "signup") {
        posthog.capture("user_signed_up", { method: "email" });
      } else {
        posthog.capture("user_signed_in", { method: "email" });
      }

      toast.success("You are signed in.");
      onOpenChange(false);
      onAuthed?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-[#0b1116] text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-cyan-300" />
            Save your movie taste
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm leading-6 text-white/65">
          Create an account to keep your liked movies, saved picks, shares, and
          recommendation profile across devices.
        </p>

        <div className="mt-2 grid grid-cols-2 rounded-md border border-white/10 bg-white/[0.03] p-1">
          <button
            onClick={() => setMode("signin")}
            className={`rounded-sm px-3 py-2 text-sm font-semibold ${
              mode === "signin" ? "bg-white text-black" : "text-white/60"
            }`}
          >
            Log in
          </button>
          <button
            onClick={() => setMode("signup")}
            className={`rounded-sm px-3 py-2 text-sm font-semibold ${
              mode === "signup" ? "bg-white text-black" : "text-white/60"
            }`}
          >
            Sign up
          </button>
        </div>

        <Button
          onClick={handleGoogle}
          className="mt-2 w-full bg-cyan-300 font-bold text-black hover:bg-cyan-200"
        >
          Continue with Google
        </Button>

        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-white/35">
          <span className="h-px flex-1 bg-white/10" />
          or
          <span className="h-px flex-1 bg-white/10" />
        </div>

        <div className="space-y-3">
          {mode === "signup" && (
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Display name"
              className="border-white/10 bg-white/[0.04] text-white"
            />
          )}
          <Input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            type="email"
            className="border-white/10 bg-white/[0.04] text-white"
          />
          <Input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            type="password"
            className="border-white/10 bg-white/[0.04] text-white"
          />
        </div>

        <Button
          onClick={handleEmail}
          disabled={isSubmitting || !email || !password || (mode === "signup" && !name)}
          className="w-full gap-2 bg-white font-bold text-black hover:bg-white/90"
        >
          <Mail className="h-4 w-4" />
          {mode === "signin" ? "Log in" : "Create account"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
