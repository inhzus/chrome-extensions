// Feature 3: claim the daily login reward once per day, on the first V2EX page visited.
const InnCheckin = (() => {
  const DONE = '每日登录奖励已领取';
  const PENDING_MS = 60 * 1000; // another tab is checking in right now
  const RETRY_MS = 60 * 60 * 1000; // back off after a failure

  // V2EX resets the reward at 00:00 Beijing time.
  function today() {
    return new Date().toLocaleDateString('sv', { timeZone: 'Asia/Shanghai' });
  }

  function onceFrom(html) {
    return html.match(/\/mission\/daily\/redeem\?once=(\d+)/)?.[1];
  }

  async function fetchHtml(url) {
    const res = await fetch(url, { credentials: 'same-origin' });
    if (res.redirected && res.url.includes('/signin')) throw new Error('not signed in');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
  }

  function toast(text) {
    const el = document.createElement('div');
    el.className = 'inn-toast';
    if (document.querySelector('.Night')) el.classList.add('inn-night');
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add('inn-toast-out'), 3000);
    setTimeout(() => el.remove(), 3500);
  }

  async function run(settings) {
    if (!settings.checkinEnabled) return;
    if (!document.querySelector('#Top a[href^="/member/"]')) return; // signed out
    const date = today();
    const state = await InnStore.getCheckin();
    const now = Date.now();
    if (state.date === date) return;
    if (state.pending && now - state.pending < PENDING_MS) return;
    if (state.failedAt && now - state.failedAt < RETRY_MS) return;

    await InnStore.setCheckin({ ...state, pending: now });
    try {
      const html = location.pathname === '/mission/daily'
        ? document.documentElement.outerHTML
        : await fetchHtml('/mission/daily');
      if (!html.includes(DONE)) {
        const once = onceFrom(html);
        if (!once) throw new Error('redeem button not found');
        const result = await fetchHtml(`/mission/daily/redeem?once=${once}`);
        if (!result.includes(DONE) && !result.includes('已成功领取')) throw new Error('redeem did not confirm');
        toast('✅ 已自动领取每日登录奖励');
      }
      await InnStore.setCheckin({ date });
    } catch (err) {
      console.debug('[V2EX Inn] check-in failed:', err);
      await InnStore.setCheckin({ date: state.date, failedAt: Date.now() });
    }
  }

  return { run };
})();
