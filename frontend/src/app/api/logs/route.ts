import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/logs
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 50;

    // Find all checks for websites owned by the user
    const checks = await db.check.findMany({
      where: {
        website: { userId: session.user.id }
      },
      include: {
        website: true
      },
      orderBy: { checkedAt: 'desc' },
      take: isNaN(limit) ? 50 : limit,
    });

    const formatted = checks.map(c => ({
      id: c.id,
      url: c.website.url,
      checked_at: c.checkedAt.toISOString(),
      status_code: c.statusCode,
      response_ms: c.responseMs,
      is_up: c.isUp,
      ssl_days_left: c.sslDaysLeft
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("GET /api/logs error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
