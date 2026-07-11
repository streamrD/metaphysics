/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowUpRight, BookOpen } from 'lucide-react';
import essaysData from './essays.json';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Essay {
  id: string;
  num: string;
  title: string;
  ground: string;
  folder: string;
  docUrl: string;
  quote?: string;
  date?: string;
  cardTitle?: string[];  // optional [upright, italic] override for the cover-card lockup
  // Legacy deck fields — unused by the app (server.js/scripts still read some)
  slideCount?: number;
  filePrefix?: string;
  indexGray?: string;
  indexRollover?: string;
  rssCard?: string;
}

// ─── Essay data ───────────────────────────────────────────────────────────────

const ESSAYS: Essay[] = essaysData;
const LATEST_NUM = Math.max(...ESSAYS.map(e => Number(e.num)));

// ─── Theme (night = umber, day = cream) ───────────────────────────────────────

type Theme = 'night' | 'day';

function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'day' ? 'day' : 'night';
}

function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(currentTheme);
  const apply = (t: Theme) => {
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem('theme', t); } catch { /* private mode */ }
    setTheme(t);
  };
  const option = (t: Theme, label: string) => (
    <button
      key={t}
      onClick={() => apply(t)}
      aria-pressed={theme === t}
      className="focus:outline-none"
      style={{
        fontFamily: "'Lato', sans-serif", fontWeight: 300, fontSize: '.6rem',
        letterSpacing: '.14em', textTransform: 'uppercase',
        padding: '.34rem .65rem .3rem', cursor: 'pointer', border: 'none',
        color: theme === t ? 'var(--gold)' : 'var(--muted)',
        background: theme === t ? 'color-mix(in srgb, var(--gold) 16%, transparent)' : 'transparent',
        transition: 'color .25s, background .25s',
      }}
    >
      {label}
    </button>
  );
  return (
    <div style={{ display: 'flex', border: '1px solid var(--hairline)', borderRadius: '999px', overflow: 'hidden' }}>
      {option('day', '☼ Day')}
      {option('night', '☾ Night')}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Split a title for the cover-card lockup: upright lead + italic close,
// echoing the deck art ("A Diminished / World", "First Principles / 1: Unity").
// An essay's cardTitle field overrides the heuristic when it breaks badly.
function splitTitle(essay: Essay): { upright: string; italic: string } {
  if (essay.cardTitle?.length === 2) {
    return { upright: essay.cardTitle[0], italic: essay.cardTitle[1] };
  }
  const title = essay.title;
  const fp = title.match(/^First Principles (\d+): ([\s\S]*)$/);
  if (fp) return { upright: 'First Principles', italic: `${fp[1]}: ${fp[2]}` };
  const colon = title.indexOf(':');
  if (colon > -1) return { upright: title.slice(0, colon + 1), italic: title.slice(colon + 1).trim() };
  const words = title.split(' ');
  if (words.length < 2) return { upright: '', italic: title };
  return { upright: words.slice(0, -1).join(' '), italic: words[words.length - 1] };
}

function DiamondRule({ width = 36 }: { width?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '9px' }} aria-hidden="true">
      <span style={{ height: '1px', width, background: 'color-mix(in srgb, var(--gold) 55%, transparent)' }} />
      <span style={{ width: '5px', height: '5px', transform: 'rotate(45deg)', background: 'var(--gold)' }} />
      <span style={{ height: '1px', width, background: 'color-mix(in srgb, var(--gold) 55%, transparent)' }} />
    </div>
  );
}

function formatEssayContent(text: string): React.ReactNode[] {
  if (!text) return [];
  // Split on [right]...[/right] blocks; [em] is handled inline within lines
  const segments = text.split(/(\[right\][\s\S]*?\[\/right\])/g);
  const nodes: React.ReactNode[] = [];
  let key = 0;
  // [em] state carries across lines so a tag pair wrapping whole
  // paragraphs (the original block usage) still italicizes all of them
  let inEm = false;

  const renderInline = (line: string): React.ReactNode[] => {
    const out: React.ReactNode[] = [];
    let k = 0;
    const pushText = (part: string) => {
      if (part === '[em]') { inEm = true; return; }
      if (part === '[/em]') { inEm = false; return; }
      if (!part) return;
      out.push(inEm ? <em key={k++}>{part}</em> : <span key={k++}>{part}</span>);
    };
    // Split out [link:url]text[/link] tokens, then handle [em] within the rest
    line.split(/(\[link:[^\]]*\][\s\S]*?\[\/link\])/g).forEach(chunk => {
      const link = chunk.match(/^\[link:([^\]]*)\]([\s\S]*?)\[\/link\]$/);
      if (link) {
        const href = link[1];
        const external = /^https?:\/\//.test(href) && !href.startsWith('https://metaphysics.up.railway.app');
        out.push(
          <a key={k++} href={href}
            {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
            className="font-medium text-zen-link underline decoration-1 decoration-zen-link/35 underline-offset-[3px] hover:text-zen-link-hover hover:decoration-zen-link-hover transition-colors">
            {inEm ? <em>{link[2]}</em> : link[2]}
            {external && <ArrowUpRight size={15} strokeWidth={2} className="inline-block ml-px -translate-y-[1px]" />}
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
    nodes.push(
      <ul key={key++} className="mb-6 pl-5 space-y-1 list-disc text-[1.15rem] leading-[1.85] text-zen-text/85">
        {items.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    );
    items.length = 0;
  };

  segments.forEach(segment => {
    const rightMatch = segment.match(/^\[right\]([\s\S]*?)\[\/right\]$/);
    if (rightMatch) {
      rightMatch[1].split('\n').filter(p => p.trim()).forEach(para => {
        nodes.push(<p key={key++} className="mb-6 text-[1.15rem] leading-[1.85] text-zen-text/85 text-right">{renderInline(para.trim())}</p>);
      });
    } else {
      const listBuffer: React.ReactNode[][] = [];
      segment.split('\n').filter(p => p.trim()).forEach(para => {
        const heading = para.match(/^\[h([1-6])\](.*)$/);
        if (heading) {
          flushList(listBuffer);
          const level = Number(heading[1]);
          const size = level <= 2 ? 'text-[1.5rem]' : 'text-[1.3rem]';
          nodes.push(
            <h2 key={key++} className={`${size} font-medium leading-snug text-zen-text mt-14 mb-6`}>
              {renderInline(heading[2].trim())}
            </h2>
          );
        } else if (para.startsWith('[li]')) {
          listBuffer.push(renderInline(para.slice(4).trim()));
        } else {
          flushList(listBuffer);
          nodes.push(<p key={key++} className="mb-6 text-[1.15rem] leading-[1.85] text-zen-text/85">{renderInline(para.trim())}</p>);
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
// scripts/fetch-essays.mjs into public/essay-content/<folder>.html
async function fetchEssayText(essay: Essay): Promise<string> {
  try {
    const res = await fetch(`/essay-content/${essay.folder}.html`);
    if (res.ok) {
      const html = await res.text();
      if (html.length > 100) {
        const text = extractTextFromDocHtml(html);
        if (text.length > 100) return text;
      }
    }
  } catch (_) { /* fall through */ }
  throw new Error('Could not load');
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
    setLoading(true); setError(false); setText(null);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    fetchEssayText(essay)
      .then(t => { setText(t); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [essay.id]);

  const n = Number(essay.num);
  const prev = ESSAYS.find(e => Number(e.num) === n - 1);
  const next = ESSAYS.find(e => Number(e.num) === n + 1);

  return (
    <motion.div
      ref={scrollRef}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 bg-zen-bg overflow-y-auto z-50"
    >
      {/* Sticky top bar */}
      <div
        className="sticky top-0 z-10 backdrop-blur-md"
        style={{ background: 'color-mix(in srgb, var(--ground) 88%, transparent)', borderBottom: '1px solid var(--hairline)' }}
      >
        <div className="max-w-3xl mx-auto px-6 py-3.5 flex items-center justify-between gap-4">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-sm tracking-widest uppercase text-zen-accent hover:text-zen-text transition-colors group"
          >
            <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
            Contents
          </button>
          <span className="text-[10px] tracking-[0.2em] uppercase text-zen-accent hidden sm:block">
            Essay {essay.num} · {essay.date}
          </span>
          <ThemeToggle />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-16 pb-24">
        {/* Title */}
        <h1
          className="font-serif font-light leading-tight tracking-tight text-zen-text text-center mb-10"
          style={{ fontSize: 'clamp(2.4rem, 6vw, 3.4rem)' }}
        >
          {essay.title}
        </h1>

        {/* Callout — the essay's key line, standing on its own */}
        {essay.quote && (
          <div className="text-center mb-16">
            <DiamondRule />
            <p
              className="callout-quote italic mx-auto mt-6 text-zen-soft"
              style={{ fontFamily: "'EB Garamond', Georgia, serif", fontSize: '1.3rem', lineHeight: 1.7, maxWidth: '30em' }}
            >
              {essay.quote}
            </p>
          </div>
        )}

        {/* Essay body */}
        {loading && (
          <div className="flex flex-col items-center gap-3 py-20 text-zen-text/25">
            <div className="w-8 h-px bg-current animate-pulse" />
            <p className="text-[10px] tracking-[0.3em] uppercase">Gathering thoughts…</p>
          </div>
        )}
        {error && (
          <div className="p-6 text-sm leading-relaxed text-zen-soft" style={{ border: '1px solid var(--hairline)' }}>
            <p className="mb-3 font-medium">Essay text could not be loaded automatically.</p>
            <a href={essay.docUrl} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 text-xs tracking-widest uppercase text-zen-link hover:underline">
              <BookOpen size={12} /> Open on Google Docs
            </a>
          </div>
        )}
        {text && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} className="essay-content">
            {formatEssayContent(text)}
          </motion.div>
        )}

        {/* Vespers — the turn of the page */}
        {!loading && (
          <div className="mt-24 pt-8 flex items-baseline justify-between gap-6" style={{ borderTop: '1px solid var(--hairline)' }}>
            {prev ? (
              <button
                onClick={() => onOpen(prev)}
                className="italic text-left text-zen-soft hover:text-zen-gold transition-colors"
                style={{ fontFamily: "'EB Garamond', Georgia, serif", fontSize: '.95rem', maxWidth: '38%' }}
              >
                ← {prev.title}
              </button>
            ) : <span style={{ maxWidth: '38%' }} />}
            <span className="text-zen-gold" style={{ fontSize: '.55rem', whiteSpace: 'nowrap' }} aria-hidden="true">
              ◆&nbsp;&nbsp;◆&nbsp;&nbsp;◆
            </span>
            {next ? (
              <button
                onClick={() => onOpen(next)}
                className="italic text-right text-zen-soft hover:text-zen-gold transition-colors"
                style={{ fontFamily: "'EB Garamond', Georgia, serif", fontSize: '.95rem', maxWidth: '38%' }}
              >
                {next.title} →
              </button>
            ) : <span style={{ maxWidth: '38%' }} />}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Index card — live HTML deck cover on the gallery wall ────────────────────

// Title size bucket — shared by grid and featured cards (see index.css)
function titleBucket(title: string): 's' | 'm' | 'l' {
  return title.length > 42 ? 's' : title.length > 24 ? 'm' : 'l';
}

// The card art — an object from the collection's world, not a UI panel: it
// keeps its deck's own ground and fixed deck colors in both themes, and its
// type scales with the square (container units) like an image would.
function CardArt({ essay, featured = false }: { essay: Essay; featured?: boolean }) {
  const { upright, italic } = splitTitle(essay);
  return (
    <div className={`gallery-card-art${featured ? ' gallery-card-art--featured' : ''}`} style={{ background: essay.ground }}>
      <p className="card-eyebrow">
        <span className="card-eyebrow-collection">A Collection of Metaphysical Essays<br /></span>
        Essay {essay.num}
      </p>
      <h3 className={`font-serif card-title card-title--${titleBucket(essay.title)}`}>
        {upright && <>{upright}<br /></>}
        <em>{italic}</em>
      </h3>
      <div>
        <div className="card-rule" aria-hidden="true">
          <span className="ln" /><span className="di" /><span className="ln" />
        </div>
        <p className="card-author">Todd Stabley</p>
      </div>
    </div>
  );
}

function CoverCard({ essay, onClick }: { essay: Essay; onClick: () => void }) {
  return (
    <motion.article
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
      }}
      className="group cursor-pointer w-full"
      onClick={onClick}
    >
      <CardArt essay={essay} />

      {/* Caption — number, date, title; the metadata appears exactly once */}
      <div className="flex items-baseline justify-between mt-4">
        <span style={{
          fontFamily: "'Lato', sans-serif", fontWeight: 300, fontSize: '.68rem',
          letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--gold)',
        }}>
          № {essay.num}
        </span>
        {essay.date && (
          <span className="italic" style={{ fontFamily: "'EB Garamond', Georgia, serif", fontSize: '.85rem', color: 'var(--muted)' }}>
            {essay.date}
          </span>
        )}
      </div>
      <h2
        className="font-serif mt-1.5 text-zen-text group-hover:text-zen-gold transition-colors duration-300"
        style={{ fontSize: '1.15rem', fontWeight: 400, lineHeight: 1.35 }}
      >
        {essay.title}
      </h2>
    </motion.article>
  );
}

// ─── Featured card — the newest essay's cover, presented at the top ───────────
// The featured essay does not repeat in the grid below; it cycles down
// into the wall when a newer essay takes this spot.

function FeaturedCard({ essay, onClick }: { essay: Essay; onClick: () => void }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="group cursor-pointer grid gap-8 md:gap-12 md:grid-cols-2 items-center"
      style={{ maxWidth: '880px', margin: '0 auto 6.5rem' }}
      onClick={onClick}
    >
      <CardArt essay={essay} featured />

      <div className="text-center md:text-left">
        <p style={{
          fontFamily: "'Lato', sans-serif", fontWeight: 300, fontSize: '.68rem',
          letterSpacing: '.22em', textTransform: 'uppercase', color: 'var(--gold)',
          marginBottom: '1rem',
        }}>
          Latest · № {essay.num}
        </p>
        <h2
          className="font-serif text-zen-text group-hover:text-zen-gold transition-colors duration-300"
          style={{ fontSize: '2rem', fontWeight: 400, lineHeight: 1.2 }}
        >
          {essay.title}
        </h2>
        {essay.date && (
          <p className="italic" style={{ fontFamily: "'EB Garamond', Georgia, serif", fontSize: '.95rem', color: 'var(--muted)', margin: '.6rem 0 0' }}>
            {essay.date}
          </p>
        )}
        {essay.quote && (
          <p className="italic text-zen-soft" style={{ fontFamily: "'EB Garamond', Georgia, serif", fontSize: '1.1rem', lineHeight: 1.75, margin: '1.4rem 0 0' }}>
            {essay.quote}
          </p>
        )}
        <p style={{
          fontFamily: "'Lato', sans-serif", fontWeight: 300, fontSize: '.68rem',
          letterSpacing: '.22em', textTransform: 'uppercase', color: 'var(--gold)',
          margin: '1.6rem 0 0',
        }}>
          Read →
        </p>
      </div>
    </motion.article>
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

  return (
    <div className="relative min-h-screen bg-zen-bg text-zen-text">
      {/* Theme toggle — anchored to the cover (scrolls away with it);
          the reading overlay carries its own copy in its top bar */}
      <div className="absolute top-5 right-5 z-40">
        <ThemeToggle />
      </div>

      {/* Cover — flat ground, natural height: the wall follows directly and
          the one vertical line on the page descends from CONTENTS below */}
      <section style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: '4rem 2rem 0', position: 'relative',
      }}>
        {/* Spacer where the top rule stood — keeps the title where it was */}
        <div style={{ height: '80px' }} aria-hidden="true" />

        {/* "A Collection of" */}
        <motion.p
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          style={{ fontSize: '.85rem', color: 'var(--gold)', letterSpacing: '.35em', textTransform: 'uppercase', fontFamily: "'Lato', sans-serif", fontWeight: 300, margin: '2rem 0 1.2rem' }}
        >
          A Collection of
        </motion.p>

        {/* Main title */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4 }}
          style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 'clamp(3rem, 8vw, 5.5rem)', fontWeight: 300, lineHeight: 1.1, color: 'var(--ink)' }}
        >
          Metaphysical<br /><em style={{ fontStyle: 'italic', color: 'var(--ink-soft)' }}>Essays</em>
        </motion.h1>

        {/* Diamond divider */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.55 }}
          style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--gold)', margin: '1.5rem auto 1rem', width: '100%', maxWidth: '320px', justifyContent: 'center' }}
        >
          <div style={{ flex: 1, height: '1px', background: 'color-mix(in srgb, var(--gold) 50%, transparent)' }} />
          <span>✦</span>
          <div style={{ flex: 1, height: '1px', background: 'color-mix(in srgb, var(--gold) 50%, transparent)' }} />
        </motion.div>

        {/* Byline */}
        <motion.p
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.6 }}
          style={{ fontSize: '.85rem', color: 'var(--muted)', letterSpacing: '.2em', textTransform: 'uppercase', fontFamily: "'Lato', sans-serif", fontWeight: 300 }}
        >
          Todd Stabley
        </motion.p>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.8 }}
          style={{ maxWidth: '520px', fontSize: '1.1rem', color: 'var(--ink-soft)', lineHeight: 1.85, fontStyle: 'italic', margin: '2rem auto 2.5rem', fontFamily: "'EB Garamond', Georgia, serif" }}
        >
          No one arrives here with a manual. These essays are an attempt — likely foolish, certainly incomplete — to write the one I wish I&apos;d had. May they help you remember what you already know <span style={{ whiteSpace: 'nowrap' }}>— now, when it matters most.</span>
        </motion.p>

        {/* Contents — a quiet anchor into the wall; the cover's vertical
            line now descends from it toward the paintings */}
        <motion.a
          href="#index"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 1.2 }}
          style={{ fontFamily: "'Lato', sans-serif", fontWeight: 300, fontSize: '.72rem', letterSpacing: '.3em', textTransform: 'uppercase', color: 'var(--gold)', textDecoration: 'none', display: 'inline-block' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--ink)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--gold)')}
        >
          Contents
          <div style={{ display: 'block', margin: '1.1rem auto 0', width: '1px', height: '80px', background: 'linear-gradient(to bottom, transparent, var(--gold), transparent)' }} aria-hidden="true" />
        </motion.a>
      </section>

      {/* Gallery wall — newest essay featured, the rest in order below */}
      <main id="index" style={{ maxWidth: '1100px', width: '100%', margin: '0 auto', paddingTop: '2.5rem', paddingLeft: '2rem', paddingRight: '2rem', paddingBottom: '8rem', boxSizing: 'border-box' }}>
        {latest && <FeaturedCard essay={latest} onClick={() => openEssay(latest)} />}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
          className="grid grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16"
        >
          {[...ESSAYS].filter(e => Number(e.num) !== LATEST_NUM).sort((a, b) => Number(a.num) - Number(b.num)).map(essay => (
            <CoverCard
              key={essay.id}
              essay={essay}
              onClick={() => openEssay(essay)}
            />
          ))}
        </motion.div>
      </main>

      <footer className="py-12 text-center" style={{ borderTop: '1px solid var(--hairline)' }}>
        <p className="text-[10px] uppercase tracking-[0.25em] text-zen-text/30">
          © {new Date().getFullYear()} Essays on Metaphysics&ensp;·&ensp;
          <a href="/rss.xml" className="hover:text-zen-gold transition-colors" style={{ textDecoration: 'none', color: 'inherit' }}>RSS</a>
        </p>
      </footer>

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
