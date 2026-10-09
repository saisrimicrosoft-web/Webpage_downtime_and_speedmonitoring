import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyToken } from "@/lib/tokens";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    const email = searchParams.get("email");

    if (!token || !email) {
      return NextResponse.json(
        { error: "Missing token or email." },
        { status: 400 }
      );
    }

    // ─── Look up the token in DB ─────────────────────────────────────
    const storedToken = await db.verificationToken.findFirst({
      where: {
        identifier: email.toLowerCase().trim(),
        token,
        type: "email-verification",
      },
    });

    if (!storedToken) {
      return NextResponse.json(
        { error: "Invalid or already-used verification link." },
        { status: 400 }
      );
    }

    // ─── Check expiry ────────────────────────────────────────────────
    if (new Date() > storedToken.expires) {
      // Clean up the expired token
      await db.verificationToken.delete({ where: { id: storedToken.id } });
      return NextResponse.json(
        { error: "Verification link has expired. Please request a new one." },
        { status: 410 }
      );
    }

    // ─── Verify HMAC signature ───────────────────────────────────────
    const { valid } = verifyToken(token, email.toLowerCase().trim());
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid verification token." },
        { status: 400 }
      );
    }

    // ─── Mark email as verified ──────────────────────────────────────
    await db.user.update({
      where: { email: email.toLowerCase().trim() },
      data: { emailVerified: new Date() },
    });

    // ─── Delete the token (single-use) ───────────────────────────────
    await db.verificationToken.delete({ where: { id: storedToken.id } });

    return NextResponse.json({ message: "Email verified successfully!" });
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
