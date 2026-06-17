"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Turnstile from "./Turnstile";

interface TurnstileGuardProps {
  children: React.ReactNode;
}

export default function TurnstileGuard({ children }: TurnstileGuardProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hostname, setHostname] = useState("tv.shajon.dev");

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const isDisableTurnstile = process.env.NEXT_PUBLIC_DISABLE_TURNSTILE?.toLowerCase() === "true";

  useEffect(() => {
    // Defer state update to avoid synchronous cascading render warning in ESLint
    setTimeout(() => {
      setIsMounted(true);

      // Set hostname on client side
      if (typeof window !== "undefined") {
        setHostname(window.location.hostname);
      }

      // Skip verification if Turnstile site key is not configured or Turnstile is disabled
      if (isDisableTurnstile || !siteKey) {
        setIsVerified(true);
        return;
      }

      // Check cookie or localStorage for previous verification
      const hasCookie = document.cookie.split(";").some((item) => item.trim().startsWith("cf_turnstile_verified="));
      const hasLocalStorage = localStorage.getItem("cf_turnstile_verified") === "true";

      if (hasCookie || hasLocalStorage) {
        setIsVerified(true);
      }
    }, 0);
  }, [siteKey, isDisableTurnstile]);

  const handleVerify = async (token: string) => {
    setIsVerifying(true);
    setError(null);

    try {
      const { verifyTurnstileToken } = await import("../actions/turnstile");
      const data = await verifyTurnstileToken(token);

      if (data.success) {
        // Save state on client side
        localStorage.setItem("cf_turnstile_verified", "true");
        // Give a short delay for smooth fade out transition
        setTimeout(() => {
          setIsVerified(true);
          setIsVerifying(false);
        }, 500);
      } else {
        setError(data.error || "Verification failed. Please try again.");
        setIsVerifying(false);
      }
    } catch (err) {
      console.error("Verification error:", err);
      setError("Network error. Please check your connection and try again.");
      setIsVerifying(false);
    }
  };

  const handleReset = () => {
    setError(null);
    setIsVerifying(false);
  };

  // Prevent server-side render content hydration mismatch by returning a placeholder layout during mount
  if (!isMounted) {
    return (
      <div className="fixed inset-0 z-[9999] bg-[#070414]" />
    );
  }

  // If verified or not enabled, let them pass
  if (isVerified) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-[#070414] text-left overflow-y-auto font-sans">
      <div className="max-w-3xl mx-auto px-6 py-20 sm:py-32 flex flex-col items-start">
        {/* Brand / Hostname section */}
        <div className="flex items-center gap-3">
          <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-lg overflow-hidden border border-white/10 flex-shrink-0 bg-white/5">
            <Image
              src="/logo.png"
              alt="Logo"
              fill
              sizes="40px"
              className="object-cover"
              priority
            />
          </div>
          <span className="text-xl sm:text-3xl font-bold text-white tracking-tight">
            {hostname}
          </span>
        </div>

        {/* Heading */}
        <h1 className="mt-8 text-2xl sm:text-4xl font-semibold text-zinc-100 tracking-tight leading-tight">
          Performing security verification
        </h1>

        {/* Description */}
        <p className="mt-4 text-sm sm:text-base text-zinc-400 max-w-2xl leading-relaxed">
          This website uses a security service to protect against malicious bots. This page is displayed while the website verifies you are not a bot.
        </p>

        {/* Turnstile / Action / Error area */}
        <div className="mt-10 min-h-[80px] w-full flex flex-col items-start justify-start">
          {isVerifying ? (
            <div className="flex items-center gap-3 py-2 text-zinc-400 text-sm">
              <div className="w-5 h-5 rounded-full border-2 border-zinc-600 border-t-zinc-200 animate-spin" />
              <span>Verifying request...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-start gap-3 w-full max-w-md">
              <div className="text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20 rounded-lg px-4 py-3 w-full">
                {error}
              </div>
              <button
                onClick={handleReset}
                className="text-sm font-bold text-violet-400 hover:text-violet-300 transition-colors underline cursor-pointer"
              >
                Try verification again
              </button>
            </div>
          ) : (
            siteKey && (
              <div className="w-full">
                <Turnstile
                  siteKey={siteKey}
                  onSuccess={handleVerify}
                  onError={() => setError("Turnstile failed to load or verify. Please refresh.")}
                  onExpire={() => setError("Verification expired. Please try again.")}
                />
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
