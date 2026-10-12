'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import './nexora-auth.css';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, signIn, signUp } = useAuth();
  const rootRef = useRef<HTMLDivElement>(null);

  // If user is already authenticated, redirect to home
  useEffect(() => {
    if (!loading && user) {
      router.replace('/');
    }
  }, [loading, user, router]);

  /* ─────────────────────────────────────────────────────────────
     AUTH SUBMISSION WIRING
     Isolate auth logic in submitAuth(mode, data) as requested in Step 5
  ───────────────────────────────────────────────────────────── */
  async function submitAuth(
    mode: 'signin' | 'signup',
    data: { email: string; password: string; name?: string }
  ) {
    if (mode === 'signin') {
      await signIn(data.email, data.password);
      return { success: true };
    } else {
      await signUp(data.email, data.password, data.name);
      return { success: true };
    }
  }

  /* ─────────────────────────────────────────────────────────────
     ORIGINAL JAVASCRIPT BEHAVIOR (Mount in useEffect with clean-up)
  ───────────────────────────────────────────────────────────── */
  useEffect(() => {
    document.documentElement.classList.add('js');

    const stage   = document.getElementById('stage') as HTMLElement | null;
    const rocket  = document.getElementById('rocket') as HTMLElement | null;
    const quote   = document.getElementById('quote') as HTMLElement | null;
    const starsEl = document.getElementById('stars') as HTMLElement | null;
    const replayBtn = document.getElementById('replay') as HTMLElement | null;

    if (!stage || !rocket || !quote || !starsEl) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Track active timers and animations for unmount cleanup
    const activeTimers: NodeJS.Timeout[] = [];
    let rocketAnim: Animation | null = null;
    const activeShootingStars: HTMLElement[] = [];
    let isDisposed = false;

    const safeTimeout = (fn: () => void, delay: number) => {
      const id = setTimeout(() => {
        if (!isDisposed) fn();
      }, delay);
      activeTimers.push(id);
      return id;
    };

    // Wrap each word so quote lights up word by word
    const words = quote.textContent ? quote.textContent.trim().split(/\s+/) : ['“Stay', 'Online.', 'Stay', 'Ahead.”'];
    quote.setAttribute('aria-label', words.join(' '));
    quote.innerHTML = words.map((w, i) =>
      `<span class="w" aria-hidden="true" style="--i:${i}">${w}</span>`
    ).join(' ');

    // Living starfield: three depth layers that drift, twinkle and follow pointer
    function rnd(a: number, b: number) { return a + Math.random() * (b - a); }
    const tints = ['#F4F2FF', '#F4F2FF', '#F4F2FF', '#CFC6FF', '#FFD9C2'];
    const layers = [
      { n: 190, min: 0.8, max: 1.6, depth: 6,  drift: 38, tw: [3, 7],   lo: [.1, .35] },
      { n: 100, min: 1.4, max: 2.4, depth: 14, drift: 26, tw: [2.5, 6], lo: [.15, .4] },
      { n: 34,  min: 2.2, max: 3.2, depth: 26, drift: 18, tw: [2, 5],   lo: [.2, .45] }
    ];
    const plx: { el: HTMLElement; depth: number }[] = [];

    // Clear any previous stars
    starsEl.innerHTML = '';

    layers.forEach((L, li) => {
      const par = document.createElement('div');
      par.className = 'plx';
      const dr = document.createElement('div');
      dr.className = 'drift';
      dr.style.animationDuration = L.drift + 's';
      dr.style.animationDirection = li % 2 ? 'alternate-reverse' : 'alternate';
      for (let s = 0; s < L.n; s++) {
        const d = document.createElement('span');
        const spark = li === 2 && s % 3 === 0;
        const size = spark ? 4 : rnd(L.min, L.max);
        const hi = rnd(.7, 1);
        d.className = 'star' + (spark ? ' spark' : '');
        d.style.cssText =
          'left:' + rnd(0, 100).toFixed(2) + '%;' +
          'top:' + rnd(0, 100).toFixed(2) + '%;' +
          'width:' + size.toFixed(1) + 'px;height:' + size.toFixed(1) + 'px;' +
          'opacity:' + hi.toFixed(2) + ';' +
          '--c:' + tints[Math.floor(Math.random() * tints.length)] + ';' +
          '--lo:' + rnd(L.lo[0], L.lo[1]).toFixed(2) + ';' +
          '--hi:' + hi.toFixed(2) + ';' +
          '--d:' + rnd(L.tw[0], L.tw[1]).toFixed(2) + 's;' +
          '--dl:-' + rnd(0, 7).toFixed(2) + 's;';
        dr.appendChild(d);
      }
      par.appendChild(dr);
      starsEl.appendChild(par);
      plx.push({ el: par, depth: L.depth });
    });

    // Parallax on pointer
    function tilt(mx: number, my: number) {
      plx.forEach(p => {
        p.el.style.transform = `translate3d(${(-mx * p.depth * 2).toFixed(1)}px,${(-my * p.depth * 2).toFixed(1)}px,0)`;
      });
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!stage) return;
      const r = stage.getBoundingClientRect();
      tilt((e.clientX - r.left) / r.width - .5, (e.clientY - r.top) / r.height - .5);
    };
    const onPointerLeave = () => tilt(0, 0);

    if (!reduce) {
      stage.addEventListener('pointermove', onPointerMove);
      stage.addEventListener('pointerleave', onPointerLeave);
    }

    // Shooting stars
    function shoot() {
      if (reduce || document.hidden || isDisposed || !stage) return;
      const W = stage.clientWidth, H = stage.clientHeight;
      const el = document.createElement('i');
      el.className = 'shoot';
      el.style.width = rnd(110, 240).toFixed(0) + 'px';
      el.style.left = (W * rnd(.35, .95)) + 'px';
      el.style.top = (H * rnd(.03, .42)) + 'px';
      starsEl?.appendChild(el);
      activeShootingStars.push(el);

      const a = rnd(145, 165);
      const rad = a * Math.PI / 180;
      const dist = rnd(260, 520);
      const dx = Math.cos(rad) * dist;
      const dy = Math.sin(rad) * dist;

      const an = el.animate([
        { transform: `translate(0,0) rotate(${a}deg)`, opacity: 0 },
        { transform: `translate(${dx * .15}px,${dy * .15}px) rotate(${a}deg)`, opacity: 1, offset: .15 },
        { transform: `translate(${dx}px,${dy}px) rotate(${a}deg)`, opacity: 0 }
      ], { duration: rnd(900, 1500), easing: 'cubic-bezier(.4,.1,.8,.6)' });

      an.onfinish = () => {
        el.remove();
        const idx = activeShootingStars.indexOf(el);
        if (idx !== -1) activeShootingStars.splice(idx, 1);
      };
    }

    function scheduleShoot() {
      if (isDisposed) return;
      safeTimeout(() => {
        shoot();
        if (Math.random() < .5) {
          safeTimeout(shoot, 250);
        }
        scheduleShoot();
      }, rnd(600, 1900));
    }

    function reveal() {
      stage?.classList.add('in');
    }

    function launch() {
      if (!stage || !rocket) return;
      if (reduce) { reveal(); return; }
      const W = stage.clientWidth, H = stage.clientHeight;
      const rw = rocket.offsetWidth, rh = rocket.offsetHeight;
      const trail = rw * 2.6;
      const angle = -90; // nose points up
      const x = W * 0.5 - rw / 2; // flight path, middle of sky
      const start = { x: x, y: H + rw / 2 + 20 - rh / 2 };
      const end   = { x: x, y: -(rw / 2 + trail) - 20 - rh / 2 };

      if (rocketAnim) rocketAnim.cancel();
      rocketAnim = rocket.animate([
        { transform: `translate(${start.x}px,${start.y}px) rotate(${angle}deg)`, opacity: 1 },
        { transform: `translate(${end.x}px,${end.y}px) rotate(${angle}deg)`, opacity: 1 }
      ], { duration: 3200, easing: 'cubic-bezier(.45,.05,.55,.95)', fill: 'forwards' });

      safeTimeout(reveal, 1550);
    }

    function replay() {
      if (!stage) return;
      stage.classList.add('reset');
      stage.classList.remove('in');
      void stage.offsetWidth;
      stage.classList.remove('reset');
      launch();
    }

    if (replayBtn) replayBtn.addEventListener('click', replay);

    // Initial launch after fonts load or small timeout
    const fontReady = (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve());
    fontReady.then(() => {
      if (isDisposed) return;
      safeTimeout(launch, 250);
      if (!reduce) safeTimeout(scheduleShoot, 2200);
    });

    /* ───────── Right side: tabs + forms ───────── */
    const tabs    = document.getElementById('tabs') as HTMLElement;
    const tabIn   = document.getElementById('tab-signin') as HTMLElement;
    const tabUp   = document.getElementById('tab-signup') as HTMLElement;
    const formIn  = document.getElementById('form-signin') as HTMLFormElement;
    const formUp  = document.getElementById('form-signup') as HTMLFormElement;
    const title   = document.getElementById('title') as HTMLElement;
    const sub     = document.getElementById('sub') as HTMLElement;
    const sw      = document.getElementById('switch') as HTMLElement;

    const copy = {
      signin: {
        t: 'Welcome back',
        s: 'Sign in to pick up where you left off.',
        sw: 'New to Nexora? <button type="button" data-go="signup">Create an account</button>'
      },
      signup: {
        t: 'Create your Nexora account',
        s: 'It takes less than a minute to get started.',
        sw: 'Already have an account? <button type="button" data-go="signin">Sign in</button>'
      }
    };

    function setMode(mode: 'signin' | 'signup', focusTab?: boolean) {
      if (!tabs || !tabIn || !tabUp || !formIn || !formUp || !title || !sub || !sw) return;
      const up = mode === 'signup';
      tabs.dataset.mode = mode;
      tabIn.setAttribute('aria-selected', String(!up)); tabIn.tabIndex = up ? -1 : 0;
      tabUp.setAttribute('aria-selected', String(up));  tabUp.tabIndex = up ? 0 : -1;
      formIn.hidden = up;
      formUp.hidden = !up;
      title.textContent = copy[mode].t;
      sub.textContent = copy[mode].s;
      sw.innerHTML = copy[mode].sw;
      if (focusTab) (up ? tabUp : tabIn).focus();
      history.replaceState(null, '', up ? '#signup' : '#signin');
    }

    const onTabInClick = () => setMode('signin');
    const onTabUpClick = () => setMode('signup');
    const onTabsKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setMode('signup', true);
      if (e.key === 'ArrowLeft')  setMode('signin', true);
    };
    const onSwitchClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const go = target.getAttribute && (target.getAttribute('data-go') as 'signin' | 'signup');
      if (go) setMode(go);
    };

    tabIn.addEventListener('click', onTabInClick);
    tabUp.addEventListener('click', onTabUpClick);
    tabs.addEventListener('keydown', onTabsKeyDown);
    sw.addEventListener('click', onSwitchClick);

    // Initial tab sync with URL hash
    const initialMode = window.location.hash === '#signup' ? 'signup' : 'signin';
    setMode(initialMode);

    // Hashchange listener so external /login#signup navigation works
    const onHashChange = () => {
      setMode(window.location.hash === '#signup' ? 'signup' : 'signin');
    };
    window.addEventListener('hashchange', onHashChange);

    // Show / hide password buttons
    const revealBtns = document.querySelectorAll('.reveal');
    const onRevealClick = (e: Event) => {
      const b = e.currentTarget as HTMLElement;
      const targetId = b.dataset.target;
      if (!targetId) return;
      const input = document.getElementById(targetId) as HTMLInputElement | null;
      if (!input) return;
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      b.textContent = show ? 'Hide' : 'Show';
      b.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    };
    revealBtns.forEach(b => b.addEventListener('click', onRevealClick));

    // Password strength
    const meter = document.getElementById('meter') as HTMLElement | null;
    const suPass = document.getElementById('su-pass') as HTMLInputElement | null;
    const onSuPassInput = () => {
      if (!meter || !suPass) return;
      const v = suPass.value;
      let n = 0;
      if (v.length >= 8) n++;
      if (/[A-Z]/.test(v) && /[a-z]/.test(v)) n++;
      if (/\d/.test(v)) n++;
      if (/[^A-Za-z0-9]/.test(v) || v.length >= 12) n++;
      meter.dataset.level = v ? String(Math.max(1, n)) : '0';
    };
    if (suPass) suPass.addEventListener('input', onSuPassInput);

    // Validation
    function err(id: string, msg: string) {
      const el = document.getElementById(id + '-err');
      const input = document.getElementById(id) as HTMLInputElement | null;
      if (el) el.textContent = msg || '';
      if (input && input.type !== 'checkbox') {
        input.setAttribute('aria-invalid', msg ? 'true' : 'false');
      }
      return !msg;
    }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const clearInputIds = ['si-email', 'si-pass', 'su-name', 'su-email', 'su-pass'];
    const inputClearHandlers: { el: HTMLElement; fn: () => void }[] = [];
    clearInputIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        const fn = () => err(id, '');
        el.addEventListener('input', fn);
        inputClearHandlers.push({ el, fn });
      }
    });

    const suTerms = document.getElementById('su-terms');
    const onTermsChange = () => err('su-terms', '');
    if (suTerms) suTerms.addEventListener('change', onTermsChange);

    // Social button demo notification
    const btnGoogle = document.getElementById('btn-google');
    const onGoogleClick = () => {
      const activeForm = tabs.dataset.mode === 'signup' ? formUp : formIn;
      const statusEl = activeForm.querySelector('.status') as HTMLElement | null;
      if (statusEl) {
        statusEl.textContent = 'Google OAuth is not configured on this workspace. Please use email.';
        statusEl.classList.add('err-status');
        statusEl.hidden = false;
      }
    };
    if (btnGoogle) btnGoogle.addEventListener('click', onGoogleClick);

    // Forgot password demo message
    const forgotLink = document.getElementById('link-forgot');
    const onForgotClick = (e: MouseEvent) => {
      e.preventDefault();
      const statusEl = formIn.querySelector('.status') as HTMLElement | null;
      if (statusEl) {
        statusEl.textContent = 'Password reset instructions have been forwarded to your workspace administrator.';
        statusEl.classList.remove('err-status');
        statusEl.hidden = false;
      }
    };
    if (forgotLink) forgotLink.addEventListener('click', onForgotClick);

    // Form sign in submit
    const onFormInSubmit = async (e: Event) => {
      e.preventDefault();
      const emailEl = document.getElementById('si-email') as HTMLInputElement;
      const passEl  = document.getElementById('si-pass') as HTMLInputElement;
      const email = emailEl?.value.trim() || '';
      const pass  = passEl?.value || '';

      let ok = true;
      ok = err('si-email', !email ? 'Enter your email address.' : !emailRe.test(email) ? 'Enter a valid email, like you@company.com.' : '') && ok;
      ok = err('si-pass', !pass ? 'Enter your password.' : '') && ok;

      if (!ok) {
        const bad = formIn.querySelector('[aria-invalid="true"]') as HTMLElement | null;
        if (bad) bad.focus();
        return;
      }

      const btn = formIn.querySelector('.btn') as HTMLButtonElement;
      const label = btn.querySelector('.label') as HTMLElement;
      const status = formIn.querySelector('.status') as HTMLElement;
      const original = label.textContent;

      btn.disabled = true;
      label.textContent = 'Signing in…';
      status.hidden = true;
      status.classList.remove('err-status');

      try {
        await submitAuth('signin', { email, password: pass });
        btn.disabled = false;
        label.textContent = original;
        status.textContent = 'Signed in. Taking you to your workspace…';
        status.hidden = false;
        safeTimeout(() => {
          router.replace('/');
        }, 1100);
      } catch (authErr: any) {
        btn.disabled = false;
        label.textContent = original;
        status.textContent = authErr?.message || 'Invalid email or password.';
        status.classList.add('err-status');
        status.hidden = false;
      }
    };

    // Form sign up submit
    const onFormUpSubmit = async (e: Event) => {
      e.preventDefault();
      const nameEl  = document.getElementById('su-name') as HTMLInputElement;
      const emailEl = document.getElementById('su-email') as HTMLInputElement;
      const passEl  = document.getElementById('su-pass') as HTMLInputElement;
      const termsEl = document.getElementById('su-terms') as HTMLInputElement;

      const name  = nameEl?.value.trim() || '';
      const email = emailEl?.value.trim() || '';
      const pass  = passEl?.value || '';
      const terms = termsEl?.checked || false;

      let ok = true;
      ok = err('su-name', !name ? 'Enter your full name.' : '') && ok;
      ok = err('su-email', !email ? 'Enter your work email.' : !emailRe.test(email) ? 'Enter a valid email, like you@company.com.' : '') && ok;
      ok = err('su-pass', pass.length < 8 ? 'Use at least 8 characters.' : !/\d/.test(pass) || !/[A-Za-z]/.test(pass) ? 'Add at least one letter and one number.' : '') && ok;
      ok = err('su-terms', !terms ? 'Accept the Terms and Privacy Policy to continue.' : '') && ok;

      if (!ok) {
        const bad = formUp.querySelector('[aria-invalid="true"]') as HTMLElement | null;
        if (bad) bad.focus();
        return;
      }

      const btn = formUp.querySelector('.btn') as HTMLButtonElement;
      const label = btn.querySelector('.label') as HTMLElement;
      const status = formUp.querySelector('.status') as HTMLElement;
      const original = label.textContent;

      btn.disabled = true;
      label.textContent = 'Creating account…';
      status.hidden = true;
      status.classList.remove('err-status');

      try {
        await submitAuth('signup', { name, email, password: pass });
        btn.disabled = false;
        label.textContent = original;
        status.textContent = `Account created. We sent a confirmation link to ${email}.`;
        status.hidden = false;
        safeTimeout(() => {
          router.replace('/?page=settings');
        }, 1300);
      } catch (authErr: any) {
        btn.disabled = false;
        label.textContent = original;
        status.textContent = authErr?.message || 'Could not create account. Please try again.';
        status.classList.add('err-status');
        status.hidden = false;
      }
    };

    formIn.addEventListener('submit', onFormInSubmit);
    formUp.addEventListener('submit', onFormUpSubmit);

    // Cleanup on unmount
    return () => {
      isDisposed = true;
      activeTimers.forEach(id => clearTimeout(id));
      if (rocketAnim) rocketAnim.cancel();
      activeShootingStars.forEach(s => s.remove());

      if (stage && !reduce) {
        stage.removeEventListener('pointermove', onPointerMove);
        stage.removeEventListener('pointerleave', onPointerLeave);
      }
      if (replayBtn) replayBtn.removeEventListener('click', replay);
      tabIn.removeEventListener('click', onTabInClick);
      tabUp.removeEventListener('click', onTabUpClick);
      tabs.removeEventListener('keydown', onTabsKeyDown);
      sw.removeEventListener('click', onSwitchClick);
      window.removeEventListener('hashchange', onHashChange);
      revealBtns.forEach(b => b.removeEventListener('click', onRevealClick));
      if (suPass) suPass.removeEventListener('input', onSuPassInput);
      inputClearHandlers.forEach(({ el, fn }) => el.removeEventListener('input', fn));
      if (suTerms) suTerms.removeEventListener('change', onTermsChange);
      if (btnGoogle) btnGoogle.removeEventListener('click', onGoogleClick);
      if (forgotLink) forgotLink.removeEventListener('click', onForgotClick);
      formIn.removeEventListener('submit', onFormInSubmit);
      formUp.removeEventListener('submit', onFormUpSubmit);
    };
  }, []);

  return (
    <div className="nexora-auth js" data-theme="dark" ref={rootRef}>
      <main className="page">
        {/* LEFT: visual + quote */}
        <section className="stage" id="stage" aria-label="Nexora">
          <div className="nebula n1" aria-hidden="true" />
          <div className="nebula n2" aria-hidden="true" />
          <div className="nebula n3" aria-hidden="true" />
          <div className="milky" aria-hidden="true" />
          <div className="aurora" aria-hidden="true" />
          <div className="curtain" aria-hidden="true" />
          <div className="stars" id="stars" aria-hidden="true" />
          <div className="planet" aria-hidden="true" />

          <div className="rocket" id="rocket" aria-hidden="true">
            <div className="trail" />
            <svg viewBox="0 0 220 80">
              <defs>
                <linearGradient id="fl" x1="1" y1="0" x2="0" y2="0">
                  <stop offset="0" stopColor="#FFE3A3" />
                  <stop offset=".45" stopColor="#FF8A4C" />
                  <stop offset="1" stopColor="#FF6B3D" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="bd" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#FFFFFF" />
                  <stop offset="1" stopColor="#C6BFEF" />
                </linearGradient>
              </defs>
              <g className="flame">
                <path d="M62 29 C42 31 24 36 4 40 C24 44 42 49 62 51 Z" fill="url(#fl)" />
                <path d="M62 34 C50 35 38 38 26 40 C38 42 50 45 62 46 Z" fill="#FFF3CF" opacity=".9" />
              </g>
              <path d="M84 24 L64 4 H104 L118 24 Z" fill="#FF6B3D" />
              <path d="M84 56 L64 76 H104 L118 56 Z" fill="#E5522A" />
              <rect x="58" y="30" width="14" height="20" rx="3" fill="#2A2763" />
              <path d="M68 22 H142 C168 22 188 32 200 40 C188 48 168 58 142 58 H68 Z" fill="url(#bd)" />
              <path d="M168 25.5 C180 29 191 35 200 40 C191 45 180 51 168 54.5 C172 46 172 34 168 25.5 Z" fill="#FF6B3D" />
              <rect x="112" y="22" width="8" height="36" fill="#5232D6" />
              <circle cx="142" cy="40" r="11" fill="#2A2763" />
              <circle cx="142" cy="40" r="8" fill="#6B8CFF" />
              <circle cx="139.5" cy="37.5" r="2.6" fill="#fff" opacity=".85" />
            </svg>
          </div>

          <div className="brand">
            <span className="logo">
              <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
                <rect width="30" height="30" rx="9" fill="#F4F2FF" fillOpacity=".12" />
                <path d="M9 21V9l12 12V9" fill="none" stroke="#F4F2FF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="23" cy="7.5" r="2" fill="#FF6B3D" />
              </svg>
              Nexora
            </span>
            <button className="replay" id="replay" type="button" aria-label="Replay launch animation" title="Replay animation">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F4F2FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 12a9 9 0 1 0 3-6.7" />
                <path d="M3 4v5h5" />
              </svg>
            </button>
          </div>

          <figure className="quote-wrap" style={{ margin: 0 }}>
            <blockquote className="quote" id="quote" style={{ margin: 0 }}>“Stay Online. Stay Ahead.”</blockquote>
            <figcaption className="by">Team Nexora</figcaption>
          </figure>
        </section>

        {/* RIGHT: sign in / sign up */}
        <section className="panel">
          <div className="card">
            <div className="tabs" id="tabs" data-mode="signin" role="tablist" aria-label="Account">
              <span className="pill" aria-hidden="true" />
              <button className="tab" role="tab" id="tab-signin" aria-selected="true" aria-controls="form-signin" type="button">
                Sign in
              </button>
              <button className="tab" role="tab" id="tab-signup" aria-selected="false" aria-controls="form-signup" type="button" tabIndex={-1}>
                Sign up
              </button>
            </div>

            <h1 id="title">Welcome back</h1>
            <p className="sub" id="sub">Sign in to pick up where you left off.</p>

            <div className="social">
              <button className="btn-ghost" type="button" id="btn-google">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1a6.2 6.2 0 1 1 0-12.4c1.97 0 3.3.84 4.05 1.56l2.76-2.66C17.04 3.1 14.76 2 12 2a10 10 0 1 0 0 20c5.77 0 9.6-4.06 9.6-9.77 0-.66-.07-1.16-.16-1.66H12z" />
                </svg>
                Google
              </button>
            </div>

            <div className="or">or use your email</div>

            {/* Sign in */}
            <form id="form-signin" role="tabpanel" aria-labelledby="tab-signin" noValidate>
              <div className="field">
                <label htmlFor="si-email">Email</label>
                <input type="email" id="si-email" name="email" autoComplete="email" placeholder="you@company.com" aria-describedby="si-email-err" />
                <p className="err" id="si-email-err" role="alert" />
              </div>
              <div className="field">
                <div className="row-label">
                  <label htmlFor="si-pass">Password</label>
                  <a href="#" id="link-forgot" style={{ fontSize: '.85rem' }}>Forgot password?</a>
                </div>
                <div className="input-wrap">
                  <input type="password" id="si-pass" name="password" autoComplete="current-password" placeholder="Your password" aria-describedby="si-pass-err" />
                  <button type="button" className="reveal" data-target="si-pass" aria-label="Show password">Show</button>
                </div>
                <p className="err" id="si-pass-err" role="alert" />
              </div>
              <button className="btn" type="submit">
                <span className="spin" />
                <span className="label">Sign in</span>
              </button>
              <p className="status" role="status" hidden />
            </form>

            {/* Sign up */}
            <form id="form-signup" role="tabpanel" aria-labelledby="tab-signup" noValidate hidden>
              <div className="field">
                <label htmlFor="su-name">Full name</label>
                <input type="text" id="su-name" name="name" autoComplete="name" placeholder="Ada Lovelace" aria-describedby="su-name-err" />
                <p className="err" id="su-name-err" role="alert" />
              </div>
              <div className="field">
                <label htmlFor="su-email">Work email</label>
                <input type="email" id="su-email" name="email" autoComplete="email" placeholder="you@company.com" aria-describedby="su-email-err" />
                <p className="err" id="su-email-err" role="alert" />
              </div>
              <div className="field">
                <label htmlFor="su-pass">Password</label>
                <div className="input-wrap">
                  <input type="password" id="su-pass" name="password" autoComplete="new-password" placeholder="At least 8 characters" aria-describedby="su-pass-err su-hint" />
                  <button type="button" className="reveal" data-target="su-pass" aria-label="Show password">Show</button>
                </div>
                <div className="meter" id="meter" data-level="0" aria-hidden="true">
                  <i /><i /><i /><i />
                </div>
                <p className="hint" id="su-hint">Use 8 or more characters with letters and numbers.</p>
                <p className="err" id="su-pass-err" role="alert" />
              </div>
              <div className="field">
                <label className="check">
                  <input type="checkbox" id="su-terms" />
                  <span>I agree to the <a href="#" onClick={e => e.preventDefault()}>Terms of Service</a> and <a href="#" onClick={e => e.preventDefault()}>Privacy Policy</a>.</span>
                </label>
                <p className="err" id="su-terms-err" role="alert" />
              </div>
              <button className="btn" type="submit">
                <span className="spin" />
                <span className="label">Create account</span>
              </button>
              <p className="status" role="status" hidden />
            </form>

            <p className="switch" id="switch" />
          </div>
        </section>
      </main>
    </div>
  );
}