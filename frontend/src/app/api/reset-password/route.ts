import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { verifyToken } from "@/lib/tokens";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, email, password } = body;

    if (!token || !email || !password) {
      return NextResponse.json(
        { error: "Token, email, and new password are required." },
        { status: 400 }
      );
    }

    // ─── Password strength validation ────────────────────────────────
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }
    if (!/[A-Z]/.test(password)) {
      return NextResponse.json(
        { error: "Password must contain at least one uppercase letter." },
        { status: 400 }
      );
    }
    if (!/[0-9]/.test(password)) {
      return NextResponse.json(
        { error: "Password must contain at least one number." },
        { status: 400 }
      );
    }

    // ─── Look up the token in DB ─────────────────────────────────────
    const storedToken = await db.verificationToken.findFirst({
      where: {
        identifier: email.toLowerCase().trim(),
        token,
        type: "password-reset",
      },
    });

    if (!storedToken) {
      return NextResponse.json(
        { error: "Invalid or already-used reset link." },
        { status: 400 }
      );
    }

    // ─── Check expiry (1h) ───────────────────────────────────────────
    if (new Date() > storedToken.expires) {
      await db.verificationToken.delete({ where: { id: storedToken.id } });
      return NextResponse.json(
        { error: "Reset link has expired. Please request a new one." },
        { status: 410 }
      );
    }

    // ─── Verify HMAC signature ───────────────────────────────────────
    const { valid } = verifyToken(token, email.toLowerCase().trim());
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid reset token." },
        { status: 400 }
      );
    }

    // ─── Hash new password and update ────────────────────────────────
    const hashedPassword = await bcrypt.hash(password, 12);

    await db.user.update({
      where: { email: email.toLowerCase().trim() },
      data: { hashedPassword },
    });

    // ─── Revoke ALL sessions (force re-login on all devices) ─────────
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (user) {
      await db.session.deleteMany({ where: { userId: user.id } });
    }

    // ─── Delete the token (single-use) ───────────────────────────────
    await db.verificationToken.delete({ where: { id: storedToken.id } });

    return NextResponse.json({
      message: "Password reset successfully. Please sign in with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
