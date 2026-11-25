/**
 * A drawn iPhone keyboard for the autoplay: it slides up while the script types, each key lights as
 * its character lands, and the chat lifts above it the way it would on a phone. Never shown to a
 * person using the prototype by hand; only the autoplay calls it.
 */

const LETTERS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
const DIGITS: [string, string][] = [['1', ''], ['2', 'ABC'], ['3', 'DEF'], ['4', 'GHI'], ['5', 'JKL'], ['6', 'MNO'], ['7', 'PQRS'], ['8', 'TUV'], ['9', 'WXYZ'], ['', ''], ['0', ''], ['⌫', '']];
const EASE = 'cubic-bezier(.32,.72,0,1)';
const SLIDE_MS = 320;

type Mode = 'text' | 'digits';

let board: HTMLDivElement | null = null;
let mode: Mode | null = null;

const css = (el: HTMLElement, style: Partial<CSSStyleDeclaration>) => Object.assign(el.style, style);
const phone = () => document.querySelector<HTMLElement>('[data-demo="phone"]');
const screen = () => document.querySelector<HTMLElement>('[data-demo="chat-screen"]');
const messages = () => document.querySelector<HTMLElement>('[data-demo="messages"]');

function key(label: string, opts: { id?: string; grow?: number; dark?: boolean; sub?: string; size?: number } = {}) {
  const el = document.createElement('div');
  el.dataset.key = opts.id ?? label;
  if (opts.dark) el.dataset.dark = '1';
  css(el, {
    flex: `${opts.grow ?? 1} 1 0`,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    background: opts.dark ? '#ABB1BA' : '#FFFFFF',
    boxShadow: '0 1px 0 rgba(0,0,0,0.28)',
    color: '#000',
    fontFamily: '-apple-system, "SF Pro Text", system-ui, sans-serif',
    fontSize: `${opts.size ?? 22}px`,
    lineHeight: '1',
    transition: 'background-color 80ms ease',
    userSelect: 'none',
  });
  el.textContent = label;
  if (opts.sub) {
    const sub = document.createElement('span');
    sub.textContent = opts.sub;
    css(sub, { fontSize: '10px', fontWeight: '600', letterSpacing: '0.12em', marginTop: '2px' });
    el.appendChild(sub);
  }
  return el;
}

function row(keys: HTMLElement[], { inset = 0, height = 42 } = {}) {
  const el = document.createElement('div');
  css(el, { display: 'flex', gap: '6px', height: `${height}px`, padding: `0 ${inset}px` });
  keys.forEach((k) => el.appendChild(k));
  return el;
}

function build(as: Mode) {
  const el = document.createElement('div');
  el.setAttribute('aria-hidden', 'true');
  css(el, {
    position: 'absolute',
    left: '0',
    right: '0',
    bottom: '0',
    zIndex: '95',
    display: 'flex',
    flexDirection: 'column',
    gap: as === 'text' ? '12px' : '7px',
    padding: '8px 3px 0',
    background: 'rgba(209, 212, 218, 0.96)',
    backdropFilter: 'blur(20px)',
    transform: 'translateY(100%)',
    transition: `transform ${SLIDE_MS}ms ${EASE}`,
    pointerEvents: 'none',
  });
  if (as === 'text') {
    el.appendChild(row([...LETTERS[0]].map((c) => key(c))));
    el.appendChild(row([...LETTERS[1]].map((c) => key(c)), { inset: 19 }));
    el.appendChild(row([key('⇧', { id: 'shift', grow: 1.35, dark: true, size: 20 }), ...[...LETTERS[2]].map((c) => key(c)), key('⌫', { id: 'back', grow: 1.35, dark: true, size: 20 })]));
    el.appendChild(row([key('123', { id: 'num', grow: 1.25, dark: true, size: 16 }), key('☺︎', { id: 'emoji', grow: 1.25, dark: true, size: 20 }), key('space', { id: ' ', grow: 5, size: 16 }), key('return', { id: 'return', grow: 2.5, dark: true, size: 16 })]));
  } else {
    for (let i = 0; i < 4; i += 1) {
      el.appendChild(row(DIGITS.slice(i * 3, i * 3 + 3).map(([d, sub]) => (d === '' ? key('', { id: 'blank', dark: true }) : key(d, { sub, dark: d === '⌫', size: d === '⌫' ? 20 : 25 }))), { height: 46 }));
    }
  }
  // The strip under the keys: the globe and mic sit here on a phone, over the home indicator.
  const strip = document.createElement('div');
  css(strip, { height: as === 'text' ? '64px' : '58px', position: 'relative', flex: 'none' });
  const bar = document.createElement('div');
  css(bar, { position: 'absolute', left: '50%', bottom: '8px', width: '139px', height: '5px', marginLeft: '-69.5px', borderRadius: '9999px', background: '#000' });
  strip.appendChild(bar);
  el.appendChild(strip);
  return el;
}

/** Keeps the newest message in view while the chat changes height under it. */
function pinBottom(ms: number) {
  const list = messages();
  if (!list) return;
  const end = performance.now() + ms;
  const step = () => {
    list.scrollTop = list.scrollHeight;
    if (performance.now() < end) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** Slides the keyboard up (or swaps it to the other kind) and lifts the chat above it. */
export async function showKeyboard(as: Mode) {
  const host = phone();
  if (!host) return;
  if (board && mode === as) return;
  if (board) await hideKeyboard();
  board = build(as);
  mode = as;
  host.appendChild(board);
  const height = board.offsetHeight;
  requestAnimationFrame(() => {
    if (board) board.style.transform = 'translateY(0)';
  });
  const chat = screen();
  if (chat && as === 'text') {
    chat.style.transition = `padding-bottom ${SLIDE_MS}ms ${EASE}`;
    // The home indicator under the composer is covered by the keyboard's own, and the composer's
    // own bottom margin is mostly taken back, so it sits just above the keys.
    chat.style.paddingBottom = `${height - 21 - 10}px`;
    pinBottom(SLIDE_MS + 60);
  }
  await new Promise((resolve) => window.setTimeout(resolve, SLIDE_MS + 40));
}

export async function hideKeyboard() {
  const el = board;
  if (!el) return;
  board = null;
  mode = null;
  el.style.transform = 'translateY(100%)';
  const chat = screen();
  if (chat) chat.style.paddingBottom = '0px';
  await new Promise((resolve) => window.setTimeout(resolve, SLIDE_MS));
  el.remove();
}

/** Lights the key a character comes from, as a finger would press it. */
export function press(ch: string) {
  if (!board) return;
  const lower = ch.toLowerCase();
  const ids = mode === 'digits' ? [ch] : /[a-z]/.test(lower) ? (ch !== lower ? ['shift', lower] : [lower]) : ch === ' ' ? [' '] : ['num'];
  for (const id of ids) {
    const k = board.querySelector<HTMLElement>(`[data-key="${CSS.escape(id)}"]`);
    if (!k) continue;
    const dark = k.dataset.dark === '1';
    k.style.background = dark ? '#8E949E' : '#C3C7CE';
    window.setTimeout(() => (k.style.background = dark ? '#ABB1BA' : '#FFFFFF'), 110);
  }
}
