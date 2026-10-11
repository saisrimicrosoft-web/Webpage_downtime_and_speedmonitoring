import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const engineUrl = process.env.ENGINE_URL ?? 'http://localhost:8001';

    if (body.all) {
      // Trigger check on all websites
      fetch(`${engineUrl}/run-checks`, { method: 'POST' }).catch(() => {});
    } else if (body.website_id) {
      fetch(`${engineUrl}/check/${body.website_id}`, { method: 'POST' }).catch(() => {});
    }

    return NextResponse.json({ status: 'triggered' });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
