import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/checks?url=...
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Verify the user owns this URL
    const website = await db.website.findUnique({
      where: {
        userId_url: {
          userId: session.user.id,
          url: url.trim(),
        }
      }
    });

    if (!website) {
      return NextResponse.json({ error: "Website not found or not owned by user" }, { status: 404 });
    }

    // Fetch checks
    const checks = await db.check.findMany({
      where: { websiteId: website.id },
      orderBy: { checkedAt: 'desc' },
      take: 50,
    });

    const formatted = checks.map(c => ({
      id: c.id,
      url: website.url,
      checked_at: c.checkedAt.toISOString(),
      status_code: c.statusCode,
      response_ms: c.responseMs,
      is_up: c.isUp,
      ssl_days_left: c.sslDaysLeft
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("GET /api/checks error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
