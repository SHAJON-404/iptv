"use client";

import React, { useEffect, useRef } from "react";

interface TurnstileProps {
  siteKey: string;
  onSuccess: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          [key: string]: unknown;
        }
      ) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId: string) => void;
    };
  }
}

export default function Turnstile({
  siteKey,
  onSuccess,
  onError,
  onExpire,
}: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    const scriptId = "cloudflare-turnstile-script";
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    const renderWidget = () => {
      if (containerRef.current && window.turnstile) {
        try {
          if (widgetIdRef.current) {
            window.turnstile.remove(widgetIdRef.current);
          }
          widgetIdRef.current = window.turnstile.render(containerRef.current, {
            sitekey: siteKey,
            callback: onSuccess,
            "error-callback": onError,
            "expired-callback": onExpire,
            theme: "dark",
          });
        } catch (err) {
          console.error("Turnstile render error:", err);
        }
      }
    };

    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.onload = renderWidget;
      document.head.appendChild(script);
    } else {
      if (window.turnstile) {
        renderWidget();
      } else {
        script.addEventListener("load", renderWidget);
      }
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // Ignore cleanup error if already removed
        }
      }
    };
  }, [siteKey, onSuccess, onError, onExpire]);

  return <div ref={containerRef} className="flex justify-start min-h-[65px]" />;
}
