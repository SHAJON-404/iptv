"use server";

import { cookies, headers } from "next/headers";

export async function verifyTurnstileToken(token: string) {
  try {
    const isDisable = process.env.NEXT_PUBLIC_DISABLE_TURNSTILE?.toLowerCase() === "true";
    const cookieStore = await cookies();
    
    if (isDisable) {
      cookieStore.set("cf_turnstile_verified", "true", {
        path: "/",
        maxAge: 30 * 24 * 60 * 60, // 30 days
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
      return { success: true };
    }

    if (!token) {
      return { success: false, error: "Token is required" };
    }

    const secretKey = process.env.TURNSTILE_SECRET_KEY;
    if (!secretKey) {
      console.error("TURNSTILE_SECRET_KEY is not configured in env variables.");
      return { success: false, error: "Server configuration error" };
    }

    // Get client IP
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || undefined;

    // Validate with Cloudflare Turnstile API
    const verifyUrl = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
    
    // Create form data as required by Cloudflare Turnstile API
    const formData = new URLSearchParams();
    formData.append("secret", secretKey);
    formData.append("response", token);
    if (ip) {
      formData.append("remoteip", ip);
    }

    const result = await fetch(verifyUrl, {
      method: "POST",
      body: formData,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const outcome = await result.json();

    if (outcome.success) {
      // Set verification cookie for 30 days
      cookieStore.set("cf_turnstile_verified", "true", {
        path: "/",
        maxAge: 30 * 24 * 60 * 60, // 30 days
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });

      return { success: true };
    } else {
      return { 
        success: false, 
        error: "Verification failed", 
        details: outcome["error-codes"] 
      };
    }
  } catch (error) {
    console.error("Turnstile verification error:", error);
    return { success: false, error: "Internal server error" };
  }
}
