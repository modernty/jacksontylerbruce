import { CLIENT } from './script';
import { hideKeyboard, press, showKeyboard } from './keyboard';

/**
 * Plays the prototype as a person would: types, taps, waits for the reply, then starts over.
 * Visitors watch; the portfolio blocks input to the frame so the loop never leaves its path.
 * Every step finds its control by a data-demo tag, so the script survives layout changes.
 *
 * The parent page can send { demo: 'pause' } or { demo: 'play' } with postMessage.
 */

type Step =
  | { kind: 'hold'; ms: number }
  | { kind: 'type'; target: string; text: string }
  | { kind: 'tap'; target: string }
  | { kind: 'waitFor'; target?: string; text?: string; timeout?: number };

const WALLET_CODE = '324891';

export const STEPS: Step[] = [
  { kind: 'hold', ms: 1400 },
  // 1. Ask, in plain words.
  { kind: 'type', target: 'composer', text: `Can you invoice ${CLIENT.name} for the website redesign?` },
  { kind: 'tap', target: 'send' },
  { kind: 'waitFor', text: 'Which would you prefer?' },
  { kind: 'hold', ms: 1600 },
  // 2. Choose Intuit. The draft card appears in the conversation.
  { kind: 'type', target: 'composer', text: 'Intuit, please' },
  { kind: 'tap', target: 'send' },
  { kind: 'waitFor', text: 'recreate the layout' },
  { kind: 'hold', ms: 2200 },
  // 3. Fill the gaps in one line.
  { kind: 'type', target: 'composer', text: `${CLIENT.email}. Website redesign, $6,500` },
  { kind: 'tap', target: 'send' },
  { kind: 'waitFor', target: 'send-invoice' },
  { kind: 'hold', ms: 2400 },
  // 4. Send. Benefits arrive at send, not before.
  { kind: 'tap', target: 'send-invoice' },
  { kind: 'waitFor', target: 'finish-wallet', timeout: 12000 },
  { kind: 'hold', ms: 2200 },
  // 5. Set up Intuit Wallet: verify the phone with the code from the banner.
  { kind: 'tap', target: 'finish-wallet' },
  { kind: 'waitFor', target: 'code' },
  { kind: 'hold', ms: 2600 },
  { kind: 'type', target: 'code', text: WALLET_CODE },
  { kind: 'hold', ms: 500 },
  { kind: 'tap', target: 'verify' },
  // 6. The wallet preview, then the phone locks.
  { kind: 'waitFor', target: 'download-app', timeout: 8000 },
  { kind: 'hold', ms: 2600 },
  { kind: 'tap', target: 'download-app' },
  // 7. "You just got paid." Tapping it lands back in the same conversation.
  { kind: 'waitFor', target: 'notification', timeout: 8000 },
  { kind: 'hold', ms: 1800 },
  { kind: 'tap', target: 'notification' },
  { kind: 'waitFor', text: 'just paid you', timeout: 10000 },
  { kind: 'hold', ms: 5000 },
];

let paused = false;

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

/** Waits out any pause, then the given time. Time spent paused never counts. */
async function hold(ms: number) {
  let left = ms;
  while (left > 0) {
    if (!paused && !document.hidden) left -= 100;
    await sleep(100);
  }
}

const find = (target: string) => document.querySelector<HTMLElement>(`[data-demo="${target}"]`);

async function waitFor({ target, text, timeout = 9000 }: { target?: string; text?: string; timeout?: number }): Promise<boolean> {
  let waited = 0;
  while (waited < timeout) {
    const ok = target ? !!find(target) && !(find(target) as HTMLButtonElement).disabled : document.body.innerText.includes(text ?? '')
    if (ok) return true;
    await hold(150);
    waited += 150;
  }
  return false;
}

function ripple(el: HTMLElement) {
  const box = el.getBoundingClientRect();
  const dot = document.createElement('div');
  const size = 44;
  Object.assign(dot.style, {
    position: 'fixed',
    left: `${box.left + box.width / 2 - size / 2}px`,
    top: `${box.top + box.height / 2 - size / 2}px`,
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '50%',
    background: 'rgba(46, 58, 135, 0.28)',
    border: '1.5px solid rgba(46, 58, 135, 0.55)',
    pointerEvents: 'none',
    zIndex: '1000',
    transform: 'scale(0.4)',
    opacity: '1',
    transition: 'transform 420ms cubic-bezier(.22,1,.36,1), opacity 520ms ease-out',
  });
  document.body.appendChild(dot);
  requestAnimationFrame(() => {
    dot.style.transform = 'scale(1)';
    dot.style.opacity = '0';
  });
  window.setTimeout(() => dot.remove(), 700);
}

/** Sets a React-controlled field the way typing would, so its onChange runs. */
function setValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * Scrolls the conversation as a thumb would: a touch dot drags up while the list moves, so a
 * reply that landed below the fold is read before anything else happens.
 */
async function swipeTo(list: HTMLElement, top: number) {
  const from = list.scrollTop;
  const to = Math.max(0, Math.min(top, list.scrollHeight - list.clientHeight));
  const distance = to - from;
  if (Math.abs(distance) < 4) return;
  const box = list.getBoundingClientRect();
  const dot = document.createElement('div');
  const size = 44;
  const startY = box.top + box.height * 0.72;
  const travel = Math.min(box.height * 0.4, Math.abs(distance)) * Math.sign(distance);
  Object.assign(dot.style, {
    position: 'fixed',
    left: `${box.left + box.width / 2 - size / 2}px`,
    top: `${startY - size / 2}px`,
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '50%',
    background: 'rgba(46, 58, 135, 0.22)',
    border: '1.5px solid rgba(46, 58, 135, 0.45)',
    pointerEvents: 'none',
    zIndex: '1000',
    opacity: '0',
    transition: 'opacity 160ms ease-out',
  });
  document.body.appendChild(dot);
  requestAnimationFrame(() => (dot.style.opacity = '1'));
  await hold(180);
  const ms = Math.min(1100, 500 + Math.abs(distance) * 0.9);
  const start = performance.now();
  await new Promise<void>((resolve) => {
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const k = easeInOut(t);
      list.scrollTop = from + distance * k;
      dot.style.transform = `translateY(${-travel * k}px)`;
      if (t < 1) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
  dot.style.opacity = '0';
  window.setTimeout(() => dot.remove(), 200);
  await hold(500);
}

const list = () => document.querySelector<HTMLElement>('[data-demo="messages"]');

/** Waits for the conversation to stop growing (a card still animating in), up to a limit. */
async function settle(el: HTMLElement, quietMs = 700, limitMs = 6000) {
  let last = el.scrollHeight;
  let quiet = 0;
  let waited = 0;
  while (quiet < quietMs && waited < limitMs) {
    await hold(100);
    waited += 100;
    if (el.scrollHeight === last) quiet += 100;
    else {
      last = el.scrollHeight;
      quiet = 0;
    }
  }
}

/** Before typing: once the reply has finished arriving, anything below the fold is scrolled into view. */
async function readToEnd() {
  const el = list();
  if (!el) return;
  await settle(el);
  if (el.scrollHeight - el.clientHeight - el.scrollTop > 4) await swipeTo(el, el.scrollHeight);
}

/** Before tapping something in the conversation: bring it into view first. */
async function reveal(target: HTMLElement) {
  const el = list();
  if (!el || !el.contains(target)) return;
  await settle(el);
  const box = el.getBoundingClientRect();
  const at = target.getBoundingClientRect();
  if (at.bottom > box.bottom - 12) await swipeTo(el, el.scrollTop + (at.bottom - box.bottom) + 24);
  else if (at.top < box.top + 12) await swipeTo(el, el.scrollTop - (box.top - at.top) - 24);
}

async function type(target: string, text: string) {
  const el = find(target) as HTMLInputElement | HTMLTextAreaElement | null;
  if (!el) return;
  if (target === 'composer') await readToEnd();
  // The keyboard comes up as the field takes focus: letters for the composer, a number pad for the code.
  await showKeyboard(target === 'code' ? 'digits' : 'text');
  el.focus({ preventScroll: true });
  for (let i = 1; i <= text.length; i += 1) {
    setValue(el, text.slice(0, i));
    const ch = text[i - 1];
    press(ch);
    // A human rhythm: quick within words, a beat at spaces and punctuation.
    await hold(ch === ' ' ? 70 : /[.,?$@]/.test(ch) ? 140 : 38 + Math.random() * 30);
  }
  // A full code puts the number pad away, so the Verify button under it can be tapped.
  if (target === 'code') {
    await hold(300);
    await hideKeyboard();
  }
}

async function tap(target: string) {
  const el = find(target);
  if (!el) return;
  await reveal(el);
  ripple(el);
  await hold(220);
  el.click();
  // Sending puts the keyboard away, so the reply has the screen.
  if (target === 'send' || target === 'verify') await hideKeyboard();
}

async function run(step: Step): Promise<boolean> {
  switch (step.kind) {
    case 'hold': await hold(step.ms); return true;
    case 'type': await type(step.target, step.text); return true;
    case 'tap': await tap(step.target); return true;
    case 'waitFor': return waitFor(step);
  }
}

export function startAutoplay() {
  window.addEventListener('message', (event) => {
    if (event.origin !== window.location.origin) return;
    if (event.data?.demo === 'pause') paused = true;
    if (event.data?.demo === 'play') paused = false;
  });
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  void (async () => {
    await waitFor({ target: 'composer', timeout: 15000 });
    for (const [index, step] of STEPS.entries()) {
      // A step that never arrives restarts the loop rather than stalling on a frozen screen.
      if (!(await run(step))) {
        console.warn('[autoplay] step did not arrive, restarting', index, step);
        break;
      }
    }
    window.location.reload();
  })();
}
