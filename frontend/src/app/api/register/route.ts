import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createToken } from "@/lib/tokens";
import { sendVerificationEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";

// 24 hours in milliseconds
const VERIFICATION_EXPIRY = 24 * 60 * 60 * 1000;

export async function POST(request: Request) {
  try {
    // Rate limit: 5 registrations per 15 minutes per IP
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const { success: rateLimitOk } = rateLimit(`register:${ip}`, 5, 15 * 60 * 1000);
    if (!rateLimitOk) {
      return NextResponse.json(
        { error: "Too many registration attempts. Try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { name, email, password } = body;

    // ─── Validation ──────────────────────────────────────────────────
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    if (!name || name.trim().length < 2) {
      return NextResponse.json(
        { error: "Name must be at least 2 characters." },
        { status: 400 }
      );
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    // Password strength: at least 8 chars, 1 uppercase, 1 number
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

    // ─── Check Existing User ─────────────────────────────────────────
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    // ─── Hash Password ───────────────────────────────────────────────
    const hashedPassword = await bcrypt.hash(password, 12);

    // ─── Create User (unverified) ────────────────────────────────────
    const user = await db.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        hashedPassword,
        // emailVerified remains null until they verify
      },
    });

    // ─── Generate Verification Token ─────────────────────────────────
    const { token, expires } = createToken(email, VERIFICATION_EXPIRY);

    await db.verificationToken.create({
      data: {
        identifier: email.toLowerCase().trim(),
        token,
        expires,
        type: "email-verification",
      },
    });

    // ─── Send Verification Email ─────────────────────────────────────
    await sendVerificationEmail(email, token);

    return NextResponse.json(
      {
        message: "Account created! Please check your email to verify your account.",
        userId: user.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
