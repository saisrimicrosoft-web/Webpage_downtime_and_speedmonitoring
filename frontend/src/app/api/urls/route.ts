import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/urls -> List all URLs for the logged-in user
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const websites = await db.website.findMany({
      where: { userId: session.user.id },
      include: {
        checks: {
          orderBy: { checkedAt: 'desc' },
          take: 1, // Get the latest check
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Format the response to match what the frontend expects
    const formatted = websites.map(site => ({
      url: site.url,
      latest_check: site.checks.length > 0 ? {
        id: site.checks[0].id,
        url: site.checks[0].url,
        checked_at: site.checks[0].checkedAt.toISOString(),
        status_code: site.checks[0].statusCode,
        response_ms: site.checks[0].responseMs,
        is_up: site.checks[0].isUp,
        ssl_days_left: site.checks[0].sslDaysLeft
      } : null
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("GET /api/urls error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/urls -> Add a new URL for the logged-in user
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
    }

    // Check if the user already added this URL
    const existing = await db.website.findUnique({
      where: {
        userId_url: {
          userId: session.user.id,
          url: url.trim(),
        }
      }
    });

    if (existing) {
      return NextResponse.json({ error: "URL already monitored" }, { status: 409 });
    }

    const newWebsite = await db.website.create({
      data: {
        userId: session.user.id,
        url: url.trim(),
      }
    });

    return NextResponse.json({ message: `Added ${url}`, id: newWebsite.id }, { status: 201 });
  } catch (error) {
    console.error("POST /api/urls error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE /api/urls -> Delete a URL for the logged-in user
export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const website = await db.website.findUnique({
      where: {
        userId_url: {
          userId: session.user.id,
          url: url.trim(),
        }
      }
    });

    if (!website) {
      return NextResponse.json({ error: "URL not found" }, { status: 404 });
    }

    await db.website.delete({
      where: { id: website.id }
    });

    return NextResponse.json({ message: `Removed ${url}` });
  } catch (error) {
    console.error("DELETE /api/urls error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
