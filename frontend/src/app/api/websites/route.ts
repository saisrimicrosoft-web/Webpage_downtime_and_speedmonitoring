import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role key so the API route can bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  const { data, error } = await supabase
    .from('websites')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, url, region, check_interval_sec } = body;

    if (!name || !url) {
      return NextResponse.json({ error: 'name and url are required' }, { status: 400 });
    }

    // Normalize URL
    let normalizedUrl = url.trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) normalizedUrl = `https://${normalizedUrl}`;

    // Reject duplicates
    const existing = await supabase.from('websites').select('id').eq('url', normalizedUrl).single();
    if (existing.data) {
      return NextResponse.json({ error: 'This URL is already being monitored' }, { status: 409 });
    }

    // Insert with status = 'pending'
    const { data: website, error: insertErr } = await supabase
      .from('websites')
      .insert({
        name:               name.trim(),
        url:                normalizedUrl,
        region:             region ?? 'India - Mumbai',
        check_interval_sec: check_interval_sec ?? 60,
        status:             'pending',
      })
      .select()
      .single();

    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

    // Trigger immediate engine check (fire-and-forget)
    const engineUrl = process.env.ENGINE_URL ?? 'http://localhost:8001';
    fetch(`${engineUrl}/check/${website.id}`, { method: 'POST' }).catch(() => {
      // Engine may not be running — website will be checked on next scheduler cycle
    });

    return NextResponse.json(website, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
