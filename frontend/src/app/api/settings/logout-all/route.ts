import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete all sessions except the current one
    // Auth.js stores the session token in a cookie — we delete all DB sessions for the user
    await db.session.deleteMany({
      where: { userId: session.user.id },
    });

    return NextResponse.json({
      message: "Logged out of all devices. Please sign in again.",
    });
  } catch (error) {
    console.error("Logout all error:", error);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}
