"use client";

import Lottie from "lottie-react";
import { useReducedMotion } from "framer-motion";
import FlickBuddyAnimation from "../../public/assets/MeditatingRabbitFilmRabbit.json";
import { cn } from "@/lib/utils";

type FlickBuddyLoaderSize = "sm" | "md" | "lg";

const animationSizes: Record<FlickBuddyLoaderSize, string> = {
  sm: "h-24 w-24",
  md: "h-36 w-36",
  lg: "h-48 w-48 sm:h-56 sm:w-56",
};

interface FlickBuddyLoaderProps {
  title?: string;
  message?: string;
  size?: FlickBuddyLoaderSize;
  className?: string;
  animationClassName?: string;
}

export function FlickBuddyLoader({
  title = "FlickBuddy is thinking...",
  message,
  size = "md",
  className,
  animationClassName,
}: FlickBuddyLoaderProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex flex-col items-center text-center", className)}
    >
      <div
        aria-hidden="true"
        className={cn(
          "relative flex items-center justify-center rounded-full bg-cyan-300/10 shadow-[0_0_60px_rgba(103,232,249,0.22)]",
          animationSizes[size],
          animationClassName
        )}
      >
        <Lottie
          animationData={FlickBuddyAnimation}
          loop={!reduceMotion}
          autoplay={!reduceMotion}
          className="h-full w-full"
        />
      </div>

      {title && (
        <p className="mt-4 text-lg font-black leading-tight text-white sm:text-xl">
          {title}
        </p>
      )}
      {message && (
        <p className="mt-2 max-w-md text-sm leading-6 text-cyan-100/70">
          {message}
        </p>
      )}
    </div>
  );
}
