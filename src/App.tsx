/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { MouseEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowUpRight, BookOpen, Moon, Sun } from 'lucide-react';
import essaysData from './essays.json';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Essay {
  id: string;
  num: string;
  title: string;
  folder: string;
  docUrl: string;
  quote?: string;
  date?: string;
  isoDate?: string;
  rssCard?: string;      // 1200×630 share card — read by server.js, written by scripts/gen-share-cards.mjs
  // Legacy fields — unused
  ground?: string;
  cardTitle?: string[];
  slideCount?: number;
  filePrefix?: string;
  indexGray?: string;
  indexRollover?: string;
}

// ─── Essay data ───────────────────────────────────────────────────────────────

const ESSAYS: Essay[] = essaysData;
const LATEST_NUM = Math.max(...ESSAYS.map(e => Number(e.num)));
const YEARS = ESSAYS.map(e => Number((e.isoDate ?? '').slice(0, 4))).filter(Boolean);
const YEAR_SPAN = Math.min(...YEARS) === Math.max(...YEARS)
  ? `${Math.max(...YEARS)}`
  : `${Math.min(...YEARS)}–${Math.max(...YEARS)}`;

// ─── Theme (day = paper, night = ink) ─────────────────────────────────────────

type Theme = 'day' | 'night';

function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'night' ? 'night' : 'day';
}

// Both the index header and the reading view carry a toggle; a window event
// keeps every mounted toggle's label in step with the current theme.
function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(currentTheme);
  useEffect(() => {
    const sync = () => setTheme(currentTheme());
    window.addEventListener('themechange', sync);
    return () => window.removeEventListener('themechange', sync);
  }, []);
  const next: Theme = theme === 'day' ? 'night' : 'day';
  const toggle = () => {
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('seal-theme', next); } catch { /* private mode */ }
    window.dispatchEvent(new Event('themechange'));
  };
  const Icon = theme === 'day' ? Sun : Moon;
  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${next}`}
      className="flex h-11 cursor-pointer items-center gap-2 rounded-full border border-hairline px-4 text-[14px] text-soft transition-colors hover:text-ink"
    >
      <Icon size={15} strokeWidth={1.7} aria-hidden="true" />
      <span>{theme === 'day' ? 'Day' : 'Night'}</span>
    </button>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Split a title for display: an optional series kicker, the title proper, and
// an optional subtitle after a colon.
//   "First Principles 2: Free Will"  → kicker "First Principles", title "Free Will"
//   "I Never Knew You: Narcissism…"  → title "I Never Knew You", sub "Narcissism…"
function titleParts(essay: Essay): { kicker: string; title: string; sub: string } {
  const fp = essay.title.match(/^First Principles \d+: ([\s\S]*)$/);
  if (fp) return { kicker: 'First Principles', title: fp[1], sub: '' };
  const colon = essay.title.indexOf(': ');
  if (colon > -1) {
    return { kicker: '', title: essay.title.slice(0, colon), sub: essay.title.slice(colon + 2) };
  }
  return { kicker: '', title: essay.title, sub: '' };
}

function readingMinutes(text: string): number {
  const words = text
    .replace(/\[link:[^\]]*\]|\[\/?(em|right|link)\]|\[li\]|\[h\d\]/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 230));
}

// Let modified clicks (new tab, etc.) fall through to the real /essays/ URL
function isPlainClick(e: MouseEvent) {
  return e.button === 0 && !(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey);
}

// House typesetting, applied when text is displayed (the Docs stay as typed):
// straight quotes → curly (’49 and ’s included), and every em dash — spaced
// or closed in the source — set closed with hair spaces; an en dash standing
// in for an em dash between words becomes one. Ranges (2025–2026) keep theirs.
const HAIR = '\u200A';
function typeset(s: string): string {
  return s
    .replace(/([A-Za-z])[ \u00A0]*–[ \u00A0]*(?=[A-Za-z])/g, '$1—')
    .replace(/[ \u00A0]*—[ \u00A0]*/g, `${HAIR}—${HAIR}`)
    .replace(/(^|[\s([{\u200A—–-]|\[em\]|\[right\])"/g, '$1“')
    .replace(/"/g, '”')
    .replace(/'(?=\d)/g, '’')
    .replace(/(^|[\s([{\u200A—–\-“]|\[em\]|\[right\])'/g, '$1‘')
    .replace(/'/g, '’');
}

// Doc text carries [link:url] tokens; typeset everything but the URLs
const typesetDocText = (text: string) =>
  text.split(/(\[link:[^\]]*\])/g).map((part, i) => (i % 2 ? part : typeset(part))).join('');

const INTRO = typeset("No one arrives here with a manual. These essays are an attempt — likely foolish, certainly incomplete — to write the one I wish I'd had. May they help you remember what you already know — now, when it matters most.");

// Run-in heads: a paragraph that opens with an ALL-CAPS term and a period
// ("VOLATILITY. The supervillain…") is set with the term as a Hanken run-in
// head in title case ("Volatility."). Later all-caps mentions of the same terms
// in that essay ("GREED and CORRUPTION") get a matching, lighter treatment;
// other capitals (KGB, AIDS) are left alone.
const RUN_IN = /^([A-Z][A-Z/\- ]{2,}[A-Z])\.\s+/;
const titleCase = (s: string) =>
  s.toLowerCase().replace(/(^|[\s/-])([a-z])/g, (_, sep: string, c: string) => sep + c.toUpperCase());

function formatEssayContent(source: string): React.ReactNode[] {
  if (!source) return [];
  const text = typesetDocText(source);
  // Split on [right]...[/right] blocks; [em] is handled inline within lines
  const segments = text.split(/(\[right\][\s\S]*?\[\/right\])/g);
  const nodes: React.ReactNode[] = [];
  let key = 0;
  // [em] state carries across lines so a tag pair wrapping whole
  // paragraphs (the original block usage) still italicizes all of them
  let inEm = false;

  const runInTerms = [...new Set(text.split('\n').map(l => l.match(RUN_IN)?.[1]).filter((t): t is string => !!t))];
  const termRe = runInTerms.length
    ? new RegExp(`\\b(${runInTerms.map(t => t.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')).join('|')})\\b`)
    : null;

  const renderInline = (line: string): React.ReactNode[] => {
    const out: React.ReactNode[] = [];
    let k = 0;
    const pushText = (part: string) => {
      if (part === '[em]') { inEm = true; return; }
      if (part === '[/em]') { inEm = false; return; }
      if (!part) return;
      const pieces = termRe ? part.split(termRe) : [part];
      pieces.forEach((piece, i) => {
        if (!piece) return;
        // split() with a capture group puts the matched terms at odd indices
        if (i % 2 === 1) { out.push(<span key={k++} className="run-in-ref">{titleCase(piece)}</span>); return; }
        out.push(inEm ? <em key={k++}>{piece}</em> : <span key={k++}>{piece}</span>);
      });
    };
    // Split out [link:url]text[/link] tokens, then handle [em] within the rest
    line.split(/(\[link:[^\]]*\][\s\S]*?\[\/link\])/g).forEach(chunk => {
      const link = chunk.match(/^\[link:([^\]]*)\]([\s\S]*?)\[\/link\]$/);
      if (link) {
        const href = link[1];
        const external = /^https?:\/\//.test(href) && !href.startsWith('https://metaphysics.up.railway.app');
        out.push(
          <a key={k++} href={href} {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}>
            {inEm ? <em>{link[2]}</em> : link[2]}
            {external && <ArrowUpRight size={15} strokeWidth={2} className="ml-px inline-block -translate-y-[1px]" />}
          </a>
        );
        return;
      }
      chunk.split(/(\[em\]|\[\/em\])/g).forEach(pushText);
    });
    return out;
  };

  // Collect consecutive [li] lines into a single <ul>
  const flushList = (items: React.ReactNode[][]) => {
    if (!items.length) return;
    nodes.push(<ul key={key++}>{items.map((item, i) => <li key={i}>{item}</li>)}</ul>);
    items.length = 0;
  };

  segments.forEach(segment => {
    const rightMatch = segment.match(/^\[right\]([\s\S]*?)\[\/right\]$/);
    if (rightMatch) {
      rightMatch[1].split('\n').filter(p => p.trim()).forEach(para => {
        nodes.push(<p key={key++} className="text-right">{renderInline(para.trim())}</p>);
      });
    } else {
      const listBuffer: React.ReactNode[][] = [];
      segment.split('\n').filter(p => p.trim()).forEach(para => {
        const heading = para.match(/^\[h([1-6])\](.*)$/);
        if (heading) {
          flushList(listBuffer);
          const minor = Number(heading[1]) > 2;
          nodes.push(
            <h2 key={key++} className={minor ? 'minor' : undefined}>{renderInline(heading[2].trim().replace(/:$/, ''))}</h2>
          );
        } else if (para.startsWith('[li]')) {
          listBuffer.push(renderInline(para.slice(4).trim()));
        } else {
          flushList(listBuffer);
          const line = para.trim();
          const lead = line.match(RUN_IN);
          nodes.push(
            <p key={key++}>
              {lead && <><span className="run-in">{titleCase(lead[1])}.</span>{' '}</>}
              {renderInline(lead ? line.slice(lead[0].length) : line)}
            </p>
          );
        }
      });
      flushList(listBuffer);
    }
  });
  return nodes;
}

// Google Docs wraps every link in a redirect: google.com/url?q=<real-url>&...
function unwrapDocUrl(href: string): string {
  try {
    const u = new URL(href);
    if (u.hostname.endsWith('google.com') && u.pathname === '/url') {
      return u.searchParams.get('q') || href;
    }
  } catch { /* relative or malformed URL — leave as-is */ }
  return href;
}

// Serialize a block element's inline content to text, converting hyperlinks
// into [link:url]text[/link] tokens that formatEssayContent renders as <a>.
function serializeInline(el: Node): string {
  let out = '';
  el.childNodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      out += node.textContent ?? '';
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const child = node as Element;
      if (child.tagName === 'A') {
        const href = unwrapDocUrl(child.getAttribute('href') || '');
        const txt = child.textContent ?? '';
        out += href && txt.trim() ? `[link:${href}]${txt}[/link]` : txt;
      } else {
        out += serializeInline(child);
      }
    }
  });
  return out;
}

function extractTextFromDocHtml(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const content = doc.querySelector('#contents') || doc.body;
  if (!content) return '';
  const blocks: string[] = [];
  content.querySelectorAll('p, h1, h2, h3, h4, h5, li').forEach(el => {
    const text = serializeInline(el).trim();
    if (!text) return;
    const tag = el.tagName.toLowerCase();
    // Prefix list items and headings so the formatter can render them
    if (tag === 'li') {
      blocks.push('[li]' + text);
    } else if (tag.startsWith('h')) {
      blocks.push(`[${tag}]` + text);
    } else {
      blocks.push(text);
    }
  });
  return blocks.join('\n');
}

// Essay text is snapshotted from Google Docs at build time by
// scripts/fetch-essays.mjs into public/essay-content/<folder>.html.
// Cached per folder: the index reads the latest essay's text for its
// reading time, and the reading view reuses it.
const textCache = new Map<string, Promise<string>>();

function fetchEssayText(essay: Essay): Promise<string> {
  let pending = textCache.get(essay.folder);
  if (!pending) {
    pending = (async () => {
      const res = await fetch(`/essay-content/${essay.folder}.html`);
      if (res.ok) {
        const html = await res.text();
        if (html.length > 100) {
          const text = extractTextFromDocHtml(html);
          if (text.length > 100) return text;
        }
      }
      throw new Error('Could not load');
    })();
    pending.catch(() => textCache.delete(essay.folder));
    textCache.set(essay.folder, pending);
  }
  return pending;
}

function useReadingMinutes(essay: Essay): number | null {
  const [minutes, setMinutes] = useState<number | null>(null);
  useEffect(() => {
    let live = true;
    setMinutes(null);
    fetchEssayText(essay).then(t => { if (live) setMinutes(readingMinutes(t)); }).catch(() => {});
    return () => { live = false; };
  }, [essay.folder]);
  return minutes;
}

// ─── The seal — the collection's one mark ─────────────────────────────────────
// A ring carries each essay's number in the contents; the solid seal marks the
// latest essay and the essay being read. One vermilion, via the --seal token.

function SealRing({ num }: { num: string }) {
  return (
    <span className="seal-ring flex size-12 flex-none items-center justify-center rounded-full border-[1.5px] border-seal text-[15px] font-semibold tabular-nums text-seal-text">
      {num}
    </span>
  );
}

function SealSolid({ num, className }: { num: string; className: string }) {
  return (
    <span className={`flex flex-none items-center justify-center rounded-full bg-seal font-semibold tracking-[-0.03em] tabular-nums text-ground ${className}`}>
      {num}
    </span>
  );
}

function Lockup() {
  return (
    <span className="flex items-center gap-2.5 text-[17px] font-semibold tracking-[-0.01em] text-ink">
      <span className="size-3.5 rounded-full bg-seal" aria-hidden="true" />
      Metaphysical Essays
    </span>
  );
}

// One entry in the contents (and the prev/next links under an essay)
function EssayRow({ essay, label, onOpen }: {
  essay: Essay;
  label?: string;
  onOpen: (essay: Essay) => void;
}) {
  const { kicker, title, sub } = titleParts(essay);
  const eyebrow = [label, kicker].filter(Boolean).join(' · ');
  return (
    <a
      href={`/essays/${essay.folder}`}
      onClick={e => { if (isPlainClick(e)) { e.preventDefault(); onOpen(essay); } }}
      className="seal-row flex items-start gap-6 border-t border-hairline pt-7 pb-8"
    >
      <SealRing num={essay.num} />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {eyebrow && <span className="text-[14px] text-muted">{eyebrow}</span>}
        <span className="seal-title text-[24px] font-semibold leading-[1.12] tracking-[-0.025em] text-balance sm:text-[27px]">{title}</span>
        {sub && <span className="text-[17px] font-medium leading-snug text-soft">{sub}</span>}
        {essay.quote && (
          <span className="font-serif text-[17px] italic leading-[1.45] text-soft text-pretty sm:text-[18px]">{typeset(essay.quote)}</span>
        )}
      </div>
    </a>
  );
}

function Footer() {
  return (
    <footer className="border-t border-hairline">
      <div className="mx-auto flex min-h-[88px] max-w-[1280px] flex-wrap items-center justify-between gap-4 px-5 text-[14px] text-muted sm:px-12">
        <span>© {new Date().getFullYear()} Essays on Metaphysics</span>
        <a href="/rss.xml" className="link-fade">RSS feed</a>
      </div>
    </footer>
  );
}

// ─── Reading view ─────────────────────────────────────────────────────────────

function ReadingView({ essay, onClose, onOpen }: {
  essay: Essay;
  onClose: () => void;
  onOpen: (essay: Essay) => void;
}) {
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    setLoading(true); setError(false); setText(null);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    fetchEssayText(essay)
      .then(t => { if (live) { setText(t); setLoading(false); } })
      .catch(() => { if (live) { setError(true); setLoading(false); } });
    return () => { live = false; };
  }, [essay.id]);

  const n = Number(essay.num);
  const prev = ESSAYS.find(e => Number(e.num) === n - 1);
  const next = ESSAYS.find(e => Number(e.num) === n + 1);
  const { kicker, title, sub } = titleParts(essay);
  const meta = [kicker, essay.date, text && `${readingMinutes(text)} min read`].filter(Boolean).join(' · ');

  return (
    <motion.div
      ref={scrollRef}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-50 overflow-y-auto bg-ground text-ink"
    >
      {/* Sticky top bar */}
      <header
        className="sticky top-0 z-10 border-b border-hairline backdrop-blur-md"
        style={{ background: 'color-mix(in srgb, var(--ground) 88%, transparent)' }}
      >
        <div className="mx-auto flex min-h-[76px] max-w-[1280px] items-center justify-between gap-6 px-5 text-[15px] sm:px-12">
          <button onClick={onClose} className="link-fade flex min-h-11 cursor-pointer items-center gap-2 text-soft">
            <ArrowLeft size={16} strokeWidth={1.7} aria-hidden="true" />
            Contents
          </button>
          <span className="hidden sm:flex"><Lockup /></span>
          <ThemeToggle />
        </div>
      </header>

      <article className="mx-auto max-w-[680px] px-5 pt-14 sm:px-8 sm:pt-[104px]">
        <div className="flex items-center gap-[18px]">
          <SealSolid num={essay.num} className="size-16 text-[22px]" />
          <span className="text-[15px] text-muted">{meta}</span>
        </div>
        <h1 className="mt-9 text-[clamp(40px,6.2vw,80px)] font-semibold leading-[0.98] tracking-[-0.045em] text-balance">
          {title}
        </h1>
        {sub && (
          <p className="mt-4 text-[22px] font-medium leading-snug tracking-[-0.015em] text-soft text-balance sm:text-[26px]">{sub}</p>
        )}

        {/* Callout — the essay's key line, standing on its own */}
        {essay.quote && (
          <p className="callout-quote mt-8 font-serif text-[22px] italic leading-[1.4] text-soft sm:text-[27px]">
            {typeset(essay.quote)}
          </p>
        )}

        <div className="mt-14 sm:mt-16">
          {loading && <p className="py-20 text-[14px] text-muted">Gathering thoughts…</p>}
          {error && (
            <div className="border border-hairline p-6 text-[15px] leading-relaxed text-soft">
              <p className="mb-3 font-medium">Essay text could not be loaded automatically.</p>
              <a href={essay.docUrl} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-2 font-semibold text-seal-text hover:underline">
                <BookOpen size={14} aria-hidden="true" /> Open on Google Docs
              </a>
            </div>
          )}
          {text && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} className="essay-content">
              {formatEssayContent(text)}
            </motion.div>
          )}
        </div>

        {/* The turn of the page — neighbors by number */}
        {!loading && (
          <nav className="mt-24 pb-28 sm:mt-28" aria-label="More essays">
            <div className="flex justify-end pb-1 text-[15px]">
              <button onClick={onClose} className="link-fade flex min-h-11 cursor-pointer items-center font-semibold">
                All essays →
              </button>
            </div>
            {prev && <EssayRow essay={prev} label="Previous" onOpen={onOpen} />}
            {next && <EssayRow essay={next} label="Next" onOpen={onOpen} />}
          </nav>
        )}
      </article>

      <Footer />
    </motion.div>
  );
}

// ─── Latest essay — presented above the contents ──────────────────────────────
// The latest essay does not repeat in the contents below; it moves into the
// list when a newer essay takes this spot.

function Featured({ essay, onOpen }: { essay: Essay; onOpen: (essay: Essay) => void }) {
  const minutes = useReadingMinutes(essay);
  const meta = [essay.date, minutes && `${minutes} min read`].filter(Boolean).join(' · ');
  return (
    <motion.a
      href={`/essays/${essay.folder}`}
      onClick={e => { if (isPlainClick(e)) { e.preventDefault(); onOpen(essay); } }}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="seal-feat flex flex-wrap items-center gap-x-16 gap-y-8 py-20 sm:py-[120px]"
    >
      <SealSolid num={essay.num} className="size-[120px] text-[44px] sm:size-[176px] sm:text-[64px]" />
      <div className="flex min-w-0 flex-[1_1_560px] flex-col gap-[18px]">
        <span className="text-[15px] text-muted">
          <span className="font-semibold text-seal-text">Latest</span>{meta && ` · ${meta}`}
        </span>
        <span className="seal-title text-[clamp(40px,5.4vw,76px)] font-semibold leading-none tracking-[-0.04em] text-balance">
          {essay.title}
        </span>
        {essay.quote && (
          <span className="max-w-[680px] font-serif text-[21px] italic leading-[1.42] text-soft text-pretty sm:text-[25px]">
            {typeset(essay.quote)}
          </span>
        )}
      </div>
    </motion.a>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [selected, setSelected] = useState<Essay | null>(() => {
    const match = window.location.pathname.match(/^\/essays\/(.+)/);
    return match ? (ESSAYS.find(e => e.folder === match[1]) ?? null) : null;
  });

  useEffect(() => {
    const onPop = () => {
      const match = window.location.pathname.match(/^\/essays\/(.+)/);
      setSelected(match ? (ESSAYS.find(e => e.folder === match[1]) ?? null) : null);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    document.title = selected ? `${selected.title} — Metaphysical Essays` : 'Metaphysical Essays';
  }, [selected]);

  const openEssay = useCallback((essay: Essay) => {
    window.history.pushState({}, '', `/essays/${essay.folder}`);
    setSelected(essay);
  }, []);

  const closeEssay = useCallback(() => {
    window.history.pushState({}, '', '/');
    setSelected(null);
  }, []);

  const latest = ESSAYS.find(e => Number(e.num) === LATEST_NUM);
  const contents = [...ESSAYS]
    .filter(e => Number(e.num) !== LATEST_NUM)
    .sort((a, b) => Number(a.num) - Number(b.num));

  return (
    <div id="top" className="min-h-screen bg-ground text-ink">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-12">
        {/* Header — in flow, scrolls away with the page */}
        <header className="flex min-h-[76px] flex-wrap items-center justify-between gap-x-6 gap-y-1">
          <a href="#top"><Lockup /></a>
          <nav className="flex items-center gap-7 text-[15px] text-soft">
            <a href="#contents" className="link-fade hidden sm:inline">Contents</a>
            <a href="/rss.xml" className="link-fade hidden sm:inline">RSS</a>
            <ThemeToggle />
          </nav>
        </header>

        {/* Title + introduction */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="pt-20 sm:pt-[136px]"
        >
          <h1 className="text-[clamp(44px,6.6vw,96px)] font-semibold leading-[0.96] tracking-[-0.045em]">
            Metaphysical Essays
          </h1>
          <div className="mt-10 flex flex-wrap items-start justify-between gap-8 border-t border-hairline pt-7">
            <p className="max-w-[600px] font-serif text-[19px] leading-[1.6] text-soft text-pretty sm:text-[21px]">
              {INTRO}
            </p>
            <span className="text-[15px] text-muted">
              <span className="font-semibold text-ink">Todd Stabley</span> · {ESSAYS.length} essays, {YEAR_SPAN}
            </span>
          </div>
        </motion.section>

        {latest && <Featured essay={latest} onOpen={openEssay} />}

        {/* Contents — numbered 01→N, the latest excluded */}
        <section id="contents" className="pb-32">
          <div className="flex items-baseline justify-between gap-4 pb-5 text-[15px]">
            <h2 className="font-semibold">Contents</h2>
            {contents.length > 0 && (
              <span className="text-muted">In order, {contents[0].num}–{contents[contents.length - 1].num}</span>
            )}
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(520px,100%),1fr))] gap-x-16">
            {contents.map(essay => (
              <EssayRow key={essay.id} essay={essay} onOpen={openEssay} />
            ))}
          </div>
        </section>
      </div>

      <Footer />

      {/* Reading overlay */}
      <AnimatePresence>
        {selected && (
          // Constant key: essay-to-essay navigation updates the mounted view in
          // place instead of cross-fading two overlays (which flashed the index)
          <ReadingView
            key="reading"
            essay={selected}
            onClose={closeEssay}
            onOpen={openEssay}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
