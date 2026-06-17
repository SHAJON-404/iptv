import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const isDisable = process.env.NEXT_PUBLIC_DISABLE_TURNSTILE?.toLowerCase() === "true";
    if (isDisable) {
      const response = NextResponse.json({ success: true });
      response.cookies.set("cf_turnstile_verified", "true", {
        path: "/",
        maxAge: 30 * 24 * 60 * 60, // 30 days
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
      return response;
    }

    const { token } = await req.json();

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Token is required" },
        { status: 400 }
      );
    }

    const secretKey = process.env.TURNSTILE_SECRET_KEY;
    if (!secretKey) {
      console.error("TURNSTILE_SECRET_KEY is not configured in env variables.");
      return NextResponse.json(
        { success: false, error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Get client IP
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined;

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
      const response = NextResponse.json({ success: true });
      
      // Set verification cookie for 30 days
      response.cookies.set("cf_turnstile_verified", "true", {
        path: "/",
        maxAge: 30 * 24 * 60 * 60, // 30 days
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });

      return response;
    } else {
      return NextResponse.json(
        { success: false, error: "Verification failed", details: outcome["error-codes"] },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Turnstile verification error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
