import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/dashboard/summary
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get all websites for the user
    const websites = await db.website.findMany({
      where: { userId },
      include: {
        checks: {
          orderBy: { checkedAt: 'desc' },
          take: 1, // Only need the latest check
        }
      }
    });

    const total = websites.length;
    let up = 0;
    let down = 0;
    let sslWarning = 0;
    let uptimePct = 100.0;

    if (total > 0) {
      for (const site of websites) {
        if (site.checks.length > 0) {
          const latest = site.checks[0];
          if (latest.isUp) up++;
          else down++;

          if (latest.sslDaysLeft !== null && latest.sslDaysLeft < 30 && latest.sslDaysLeft >= 0) {
            sslWarning++;
          }
        }
      }
      uptimePct = (up / total) * 100;
    }

    return NextResponse.json({
      total,
      up,
      down,
      ssl_warning: sslWarning,
      avg_uptime_pct: Math.round(uptimePct * 10) / 10
    });
  } catch (error) {
    console.error("GET /api/dashboard/summary error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
