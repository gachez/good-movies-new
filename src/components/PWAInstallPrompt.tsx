"use client";

import { useEffect, useState } from "react";
import { Share, X } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator &&
      Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

function isIOS() {
  if (typeof window === "undefined") return false;
  const userAgent = window.navigator.userAgent.toLowerCase();
  const platform = window.navigator.platform?.toLowerCase() || "";

  return (
    /iphone|ipad|ipod/.test(userAgent) ||
    (platform === "macintel" && window.navigator.maxTouchPoints > 1)
  );
}

function isSafari() {
  if (typeof window === "undefined") return false;
  const userAgent = window.navigator.userAgent.toLowerCase();
  return userAgent.includes("safari") && !userAgent.includes("crios") && !userAgent.includes("fxios");
}

export function PWAInstallPrompt() {
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(true);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;

    const dismissedUntil = Number(
      window.localStorage.getItem("flickbuddyInstallDismissedUntil") || 0
    );
    const isDismissed = Date.now() < dismissedUntil;
    setDismissed(isDismissed);
    setShowIOSInstructions(!isDismissed && isIOS() && isSafari());

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const canInstall = Boolean(installEvent);

  if ((!canInstall && !showIOSInstructions) || dismissed || isStandalone()) {
    return null;
  }

  const dismiss = () => {
    window.localStorage.setItem(
      "flickbuddyInstallDismissedUntil",
      String(Date.now() + 1000 * 60 * 60 * 24 * 14)
    );
    setDismissed(true);
    setShowIOSInstructions(false);
  };

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    setInstallEvent(null);
    if (choice.outcome === "dismissed") dismiss();
  };

  return (
    <div className="fixed inset-x-3 bottom-24 z-50 mx-auto max-w-md rounded-md border border-cyan-300/25 bg-[#071118]/95 p-3 text-white shadow-2xl shadow-black/50 backdrop-blur-xl">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-cyan-300 text-black">
          <BrandLogo size={28} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black">Install FlickBuddy</p>
          <p className="mt-1 text-xs leading-5 text-white/58">
            Add it to your home screen for a faster app-like experience.
          </p>
          {showIOSInstructions ? (
            <div className="mt-3 space-y-2 text-xs leading-5 text-white/70">
              <div className="flex gap-2 rounded-sm bg-black/20 p-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-300 text-[11px] font-black text-black">
                  1
                </span>
                <span className="flex items-center gap-1">
                  Tap <Share className="h-3.5 w-3.5 text-cyan-200" /> Share in Safari.
                </span>
              </div>
              <div className="flex gap-2 rounded-sm bg-black/20 p-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-300 text-[11px] font-black text-black">
                  2
                </span>
                <span>Choose Add to Home Screen.</span>
              </div>
              <div className="flex gap-2 rounded-sm bg-black/20 p-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-300 text-[11px] font-black text-black">
                  3
                </span>
                <span>Tap Add to open FlickBuddy like an app.</span>
              </div>
              <button
                type="button"
                onClick={dismiss}
                className="mt-1 rounded-md border border-white/10 px-3 py-2 text-xs font-bold text-white/65"
              >
                Got it
              </button>
            </div>
          ) : (
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={install}
                className="rounded-md bg-cyan-300 px-3 py-2 text-xs font-black text-black"
              >
                Install
              </button>
              <button
                type="button"
                onClick={dismiss}
                className="rounded-md border border-white/10 px-3 py-2 text-xs font-bold text-white/65"
              >
                Later
              </button>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss install prompt"
          className="rounded-full p-1 text-white/45 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
