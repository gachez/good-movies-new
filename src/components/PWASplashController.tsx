"use client";

import { useEffect } from "react";

const MIN_SPLASH_MS = 900;

function isStandalonePWA() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    ("standalone" in window.navigator &&
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

export function PWASplashController() {
  useEffect(() => {
    const body = document.body;

    if (!isStandalonePWA()) {
      body.dataset.pwaSplashDismissed = "true";
      return;
    }

    body.dataset.pwaSplashActive = "true";
    const startedAt = performance.now();
    let loadSettled = document.readyState === "complete";
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const dismiss = () => {
      const elapsed = performance.now() - startedAt;
      const delay = Math.max(0, MIN_SPLASH_MS - elapsed);

      timeoutId = setTimeout(() => {
        requestAnimationFrame(() => {
          body.dataset.pwaSplashDismissed = "true";
          delete body.dataset.pwaSplashActive;
        });
      }, delay);
    };

    const handleLoad = () => {
      loadSettled = true;
      dismiss();
    };

    if (loadSettled) {
      dismiss();
    } else {
      window.addEventListener("load", handleLoad, { once: true });
    }

    return () => {
      window.removeEventListener("load", handleLoad);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  return null;
}
