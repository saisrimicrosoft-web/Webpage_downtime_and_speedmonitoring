import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createToken } from "@/lib/tokens";
import { sendPasswordResetEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";

// 1 hour expiry for password reset tokens
const RESET_EXPIRY = 60 * 60 * 1000;

export async function POST(request: Request) {
  try {
    // Rate limit: 3 reset requests per 15 minutes per IP
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const { success: rateLimitOk } = rateLimit(`forgot-pw:${ip}`, 3, 15 * 60 * 1000);
    if (!rateLimitOk) {
      // Still return 200 to prevent user enumeration
      return NextResponse.json({
        message: "If an account with that email exists, we've sent a reset link.",
      });
    }

    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }

    // Always return the same response to prevent user enumeration
    const genericResponse = NextResponse.json({
      message: "If an account with that email exists, we've sent a reset link.",
    });

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    // If no user, return same generic response (no user enumeration)
    if (!user) return genericResponse;

    // ─── Delete any existing reset tokens for this email ──────────────
    await db.verificationToken.deleteMany({
      where: {
        identifier: email.toLowerCase().trim(),
        type: "password-reset",
      },
    });

    // ─── Generate new reset token ────────────────────────────────────
    const { token, expires } = createToken(email, RESET_EXPIRY);

    await db.verificationToken.create({
      data: {
        identifier: email.toLowerCase().trim(),
        token,
        expires,
        type: "password-reset",
      },
    });

    // ─── Send reset email ────────────────────────────────────────────
    await sendPasswordResetEmail(email, token);

    return genericResponse;
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
