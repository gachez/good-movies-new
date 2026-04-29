"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function BackButton({
  fallbackHref = "/",
  label = "Back",
  className = "",
  iconClassName = "h-5 w-5",
}: {
  fallbackHref?: string;
  label?: string;
  className?: string;
  iconClassName?: string;
}) {
  const router = useRouter();

  const handleBack = () => {
    const historyState = window.history.state as { idx?: number } | null;
    const hasAppHistory =
      typeof historyState?.idx === "number" && historyState.idx > 0;

    if (hasAppHistory) {
      router.back();
      return;
    }

    router.push(fallbackHref);
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className={className}
      aria-label={label}
    >
      <ArrowLeft className={iconClassName} />
    </button>
  );
}
