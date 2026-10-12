import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://syxibsrmprfuhybkjdpk.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = (body.name || '').trim();
    const email = (body.email || '').trim().toLowerCase();
    const password = body.password || '';
    const phone = (body.phone || '').trim();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const displayName = name || email.split('@')[0];

    // 1. Create auto-confirmed user directly via Supabase Auth Admin HTTP endpoint
    const createRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name: displayName,
          email,
          phone,
          avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=8b5cf6&color=fff`,
          settings: {
            theme: 'Dark',
            fontSize: 'medium',
            language: 'English',
            emailNotif: true,
            pushNotif: false,
            marketingNotif: false,
            publicProfile: false,
            showOnline: true,
            twoFactor: false,
          },
        },
      }),
      signal: AbortSignal.timeout(8000),
    });

    const createData = await createRes.json();

    if (!createRes.ok) {
      const errMsg = createData.msg || createData.error_description || createData.message || 'Sign up failed';
      if (
        errMsg.toLowerCase().includes('already') ||
        errMsg.toLowerCase().includes('registered') ||
        createRes.status === 422
      ) {
        return NextResponse.json(
          { error: 'This email is already registered. Please sign in.' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: errMsg }, { status: createRes.status });
    }

    const user = createData;

    // 2. Best-effort write to profiles / user_settings tables if they exist in Supabase
    if (user && user.id) {
      try {
        await fetch(`${supabaseUrl}/rest/v1/profiles`, {
          method: 'POST',
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates',
          },
          body: JSON.stringify({
            id: user.id,
            name: displayName,
            email,
            phone,
            avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=8b5cf6&color=fff`,
          }),
          signal: AbortSignal.timeout(3000),
        });
      } catch {}

      try {
        await fetch(`${supabaseUrl}/rest/v1/user_settings`, {
          method: 'POST',
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates',
          },
          body: JSON.stringify({
            user_id: user.id,
            theme: 'Dark',
            font_size: 'medium',
            language: 'English',
            email_notif: true,
            push_notif: false,
            marketing_notif: false,
            public_profile: false,
            show_online: true,
            two_factor: false,
          }),
          signal: AbortSignal.timeout(3000),
        });
      } catch {}
    }

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: displayName,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('Signup API error:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}
