/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, BookOpen, Layers } from 'lucide-react';
import essaysData from './essays.json';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Essay {
  id: string;
  num: string;
  title: string;
  folder: string;
  slideCount: number;
  filePrefix: string;
  docUrl: string;
  indexGray: string;
  indexRollover: string;
  quote?: string;
  date?: string;
}

// ─── Essay data ───────────────────────────────────────────────────────────────

const ESSAYS: Essay[] = essaysData;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slideUrl(essay: Essay, n: number): string {
  return `/slides/${essay.folder}/${essay.filePrefix}${String(n).padStart(2, '0')}.png`;
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
    line.split(/(\[em\]|\[\/em\])/g).forEach(part => {
      if (part === '[em]') { inEm = true; return; }
      if (part === '[/em]') { inEm = false; return; }
      if (!part) return;
      out.push(inEm ? <em key={k++}>{part}</em> : <span key={k++}>{part}</span>);
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

function extractTextFromDocHtml(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const content = doc.querySelector('#contents') || doc.body;
  if (!content) return '';
  const blocks: string[] = [];
  content.querySelectorAll('p, h1, h2, h3, h4, h5, li').forEach(el => {
    const text = el.textContent?.trim();
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

// ─── Carousel slide animation variants (defined once, outside component) ────────
const SLIDE_VARIANTS = {
  enter: (d: number) => ({ opacity: 0, x: d > 0 ? 50 : -50 }),
  center: { opacity: 1, x: 0 },
  exit: (d: number) => ({ opacity: 0, x: d > 0 ? -50 : 50 }),
};

// ─── Inline Carousel (used inside ReadingView) ────────────────────────────────

function InlineCarousel({ essay, onCollapse, scrollRef }: {
  essay: Essay;
  onCollapse: () => void;
  scrollRef: React.RefObject<HTMLDivElement>;
}) {
  const [slide, setSlide] = useState(0);
  const [dir, setDir] = useState(0);
  const dragX = useRef(0);
  const frameRef = useRef<HTMLDivElement>(null);
  const [frameRect, setFrameRect] = useState<DOMRect | null>(null);

  // Track carousel position for fixed arrow placement
  useEffect(() => {
    const update = () => {
      if (frameRef.current) setFrameRect(frameRef.current.getBoundingClientRect());
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => { window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true); };
  }, []);

  const go = useCallback((d: number) => {
    const next = slide + d;
    if (next < 0 || next >= essay.slideCount) return;
    setDir(d); setSlide(next);
  }, [slide, essay.slideCount]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  const forwardScroll = (e: React.WheelEvent) => {
    if (scrollRef.current) scrollRef.current.scrollTop += e.deltaY;
  };

  return (
    <div className="w-full">

      {/* Fixed left zone — full viewport whitespace left of carousel, scrollable */}
      {frameRect && frameRect.left > 10 && (
        <div
          onClick={() => go(-1)}
          onWheel={forwardScroll}
          style={{
            position: 'fixed', top: frameRect.top, left: 0,
            width: frameRect.left, height: frameRect.height,
            zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: slide === 0 ? 'default' : 'pointer',
            opacity: slide === 0 ? 0 : 1, transition: 'opacity 0.2s',
          }}
          className="group"
        >
          <svg width="60" height="10" viewBox="0 0 60 10" fill="none"
            style={{ opacity: 0.2, transition: 'opacity 0.2s' }}
            className="group-hover:opacity-60">
            <line x1="60" y1="5" x2="1" y2="5" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round"/>
            <line x1="1" y1="5" x2="8" y2="1" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round"/>
            <line x1="1" y1="5" x2="8" y2="9" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round"/>
          </svg>
        </div>
      )}

      {/* Fixed right zone — full viewport whitespace right of carousel, scrollable */}
      {frameRect && (window.innerWidth - frameRect.right) > 10 && (
        <div
          onClick={() => go(1)}
          onWheel={forwardScroll}
          style={{
            position: 'fixed', top: frameRect.top, left: frameRect.right,
            width: window.innerWidth - frameRect.right, height: frameRect.height,
            zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: slide === essay.slideCount - 1 ? 'default' : 'pointer',
            opacity: slide === essay.slideCount - 1 ? 0 : 1, transition: 'opacity 0.2s',
          }}
          className="group"
        >
          <svg width="60" height="10" viewBox="0 0 60 10" fill="none"
            style={{ opacity: 0.2, transition: 'opacity 0.2s' }}
            className="group-hover:opacity-60">
            <line x1="0" y1="5" x2="59" y2="5" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round"/>
            <line x1="59" y1="5" x2="52" y2="1" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round"/>
            <line x1="59" y1="5" x2="52" y2="9" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round"/>
          </svg>
        </div>
      )}

      {/* Carousel frame */}
      <div
        ref={frameRef}
        className="relative aspect-square bg-neutral-50 border border-neutral-200 overflow-hidden select-none cursor-pointer"
        onMouseDown={e => { dragX.current = e.clientX; }}
        onMouseUp={e => {
          const d = e.clientX - dragX.current;
          if (Math.abs(d) > 40) { go(d < 0 ? 1 : -1); return; }
          if (!(e.target as HTMLElement).closest('button')) onCollapse();
        }}
        onTouchStart={e => { dragX.current = e.touches[0].clientX; }}
        onTouchEnd={e => { const d = e.changedTouches[0].clientX - dragX.current; if (Math.abs(d) > 40) go(d < 0 ? 1 : -1); }}
      >
        <AnimatePresence mode="wait" custom={dir}>
          <motion.img
            key={slide}
            custom={dir}
            variants={SLIDE_VARIANTS}
            initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            src={slideUrl(essay, slide + 1)}
            alt={`${essay.title} — slide ${slide + 1}`}
            className="absolute inset-0 w-full h-full object-cover"
            draggable={false}
          />
        </AnimatePresence>
        <div className="absolute bottom-3 right-4 text-[10px] tracking-widest text-white/70 mix-blend-difference">
          {String(slide + 1).padStart(2, '0')} / {String(essay.slideCount).padStart(2, '0')}
        </div>
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-1.5 mt-3">
        {Array.from({ length: essay.slideCount }).map((_, i) => (
          <button
            key={i}
            onClick={() => { setDir(i > slide ? 1 : -1); setSlide(i); }}
            className="rounded-full bg-zen-accent transition-all duration-300 focus:outline-none"
            style={{ width: i === slide ? '18px' : '5px', height: '5px', opacity: i === slide ? 0.7 : 0.2 }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Reading view — primary essay view, with expandable slides ────────────────

function ReadingView({ essay, onClose }: { essay: Essay; onClose: () => void }) {
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [slidesOpen, setSlidesOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true); setError(false); setText(null);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    fetchEssayText(essay)
      .then(t => { setText(t); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [essay.id]);

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
      <div className="sticky top-0 z-10 bg-zen-bg/90 backdrop-blur-md border-b border-neutral-100">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-sm tracking-widest uppercase text-zen-text/40 hover:text-zen-text transition-colors group"
          >
            <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
            Index
          </button>
          <span className="text-[10px] tracking-[0.2em] uppercase text-zen-text/30">
            Essay {essay.num} · {essay.date}
          </span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-16 pb-32">
        {/* Title */}
        <h1 className="font-serif text-4xl md:text-5xl font-light leading-tight tracking-tight text-zen-text mb-8">
          {essay.title}
        </h1>

        {/* Pull quote */}
        {essay.quote && (
          <blockquote className="font-serif italic text-xl leading-relaxed text-zen-text/45 border-l-2 border-zen-accent/40 pl-6 mb-10">
            "{essay.quote}"
          </blockquote>
        )}

        {/* View Slides toggle (hidden for essays without a slide deck) */}
        {essay.slideCount > 0 && <div className="mb-14">
          <button
            onClick={() => setSlidesOpen(v => !v)}
            tabIndex={-1}
            className="flex items-center gap-2.5 text-[11px] tracking-[0.2em] uppercase text-zen-text/35 hover:text-zen-accent/70 transition-colors duration-200 group focus:outline-none"
          >
            <Layers size={13} className="transition-transform duration-300 group-hover:scale-110" />
            {slidesOpen ? 'Hide Slides' : 'View Slides'}
            <motion.span
              animate={{ rotate: slidesOpen ? 180 : 0 }}
              transition={{ duration: 0.3 }}
              className="text-[10px] opacity-50"
            >
              ▾
            </motion.span>
          </button>

          <AnimatePresence>
            {slidesOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="pt-6">
                  <InlineCarousel essay={essay} onCollapse={() => setSlidesOpen(false)} scrollRef={scrollRef} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>}

        {/* Divider */}
        <div className="flex items-center gap-4 mb-14">
          <div className="flex-1 bg-neutral-200" style={{ height: '1.5px' }} />
          <span className="text-zen-accent/50 text-sm">◈</span>
          <div className="flex-1 bg-neutral-200" style={{ height: '1.5px' }} />
        </div>

        {/* Essay body */}
        {loading && (
          <div className="flex flex-col items-center gap-3 py-20 text-zen-text/20">
            <div className="w-8 h-px bg-current animate-pulse" />
            <p className="text-[10px] tracking-[0.3em] uppercase">Gathering thoughts…</p>
          </div>
        )}
        {error && (
          <div className="rounded border border-amber-100 bg-amber-50/50 p-6 text-sm text-amber-800/70 leading-relaxed">
            <p className="mb-3 font-medium">Essay text could not be loaded automatically.</p>
            <a href={essay.docUrl} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 text-xs tracking-widest uppercase hover:underline">
              <BookOpen size={12} /> Open on Google Docs
            </a>
          </div>
        )}
        {text && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} className="essay-content">
            {formatEssayContent(text)}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Index card ───────────────────────────────────────────────────────────────

function EssayCard({ essay, onClick }: { essay: Essay; onClick: () => void }) {
  return (
    <motion.article
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
      }}
      className="group cursor-pointer w-full"
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="aspect-square mb-5 overflow-hidden border border-neutral-200 relative">
        <img
          src={essay.indexGray}
          alt={essay.title}
          className="thumb-gray absolute inset-0 w-full h-full object-cover opacity-100 group-hover:opacity-0 transition-all duration-500"
          draggable={false}
        />
        <img
          src={essay.indexRollover}
          alt=""
          className="thumb-rollover absolute inset-0 w-full h-full object-cover opacity-0 scale-100 group-hover:opacity-100 group-hover:scale-[1.06] transition-all duration-500 ease-out"
          draggable={false}
        />
      </div>

      {/* Meta */}
      <div className="flex items-center gap-3 mb-2.5">
        <span style={{ fontFamily: "'Lato', sans-serif", fontWeight: 300, fontSize: '.65rem', letterSpacing: '.2em', color: '#b08d57', textTransform: 'uppercase' as const, display: 'block', marginBottom: '.25rem' }}>
          #{essay.num}
        </span>
        {essay.date && (
          <span style={{ fontFamily: "'Lato', sans-serif", fontWeight: 300, fontSize: '.75rem', letterSpacing: '.1em', color: '#7a7a72', whiteSpace: 'nowrap' as const }}>{essay.date}</span>
        )}
      </div>

      <h2 className="font-serif leading-snug mb-3 group-hover:text-zen-accent transition-colors duration-300" style={{ fontSize: '1.2rem', fontWeight: 400 }}>
        {essay.title}
      </h2>

      {essay.quote && (
        <p className="font-serif italic text-sm text-zen-text/40 line-clamp-4 border-l-2 border-zen-accent/20 pl-3.5 leading-relaxed mb-4">
          {essay.quote}
        </p>
      )}

      <div className="text-[10px] tracking-[0.2em] uppercase text-transparent group-hover:text-zen-accent/50 transition-colors duration-300">
        Read →
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

  return (
    <div className="min-h-screen bg-zen-bg text-zen-text selection:bg-zen-accent/15">
      {/* Cover — matches v1 site exactly */}
      <section style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: '4rem 2rem', position: 'relative',
        background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(176,141,87,.07) 0%, transparent 70%), radial-gradient(ellipse 60% 40% at 50% 100%, rgba(176,141,87,.05) 0%, transparent 70%)',
      }}>
        {/* Top rule */}
        <div style={{ width: '1px', height: '80px', background: 'linear-gradient(to bottom, transparent, #b08d57, transparent)', margin: '0 auto' }} />

        {/* "A Collection of" */}
        <motion.p
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          style={{ fontSize: '.85rem', color: '#b08d57', letterSpacing: '.35em', textTransform: 'uppercase', fontFamily: "'Lato', sans-serif", fontWeight: 300, margin: '2rem 0 1.2rem' }}
        >
          A Collection of
        </motion.p>

        {/* Main title */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4 }}
          style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 'clamp(3rem, 8vw, 5.5rem)', fontWeight: 300, lineHeight: 1.1, color: '#1a1a18' }}
        >
          Metaphysical<br /><em style={{ fontStyle: 'italic', color: '#3d3d38' }}>Essays</em>
        </motion.h1>

        {/* Diamond divider */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.55 }}
          style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#b08d57', margin: '1.5rem auto 1rem', width: '100%', maxWidth: '320px', justifyContent: 'center' }}
        >
          <div style={{ flex: 1, height: '1px', background: 'rgba(176,141,87,0.5)' }} />
          <span>✦</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(176,141,87,0.5)' }} />
        </motion.div>

        {/* Byline */}
        <motion.p
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.6 }}
          style={{ fontSize: '.85rem', color: '#7a7a72', letterSpacing: '.2em', textTransform: 'uppercase', fontFamily: "'Lato', sans-serif", fontWeight: 300 }}
        >
          Todd Stabley
        </motion.p>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.8 }}
          style={{ maxWidth: '520px', fontSize: '1.1rem', color: '#3d3d38', lineHeight: 1.85, fontStyle: 'italic', margin: '2rem auto 2.5rem', fontFamily: "'EB Garamond', Georgia, serif" }}
        >
          No one arrives here with a manual. These essays are an attempt — likely foolish, certainly incomplete — to write the one I wish I&apos;d had. May they help you remember what you already know <span style={{ whiteSpace: 'nowrap' }}>— now, when it matters most.</span>
        </motion.p>

        {/* Index of Essays cue */}
        <motion.a
          href="#index"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 1.2 }}
          style={{ fontFamily: "'Lato', sans-serif", fontWeight: 300, fontSize: '.8rem', letterSpacing: '.2em', textTransform: 'uppercase', color: '#7a7a72', textDecoration: 'none', display: 'inline-block' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#b08d57')}
          onMouseLeave={e => (e.currentTarget.style.color = '#7a7a72')}
        >
          Index of Essays
          <div style={{ display: 'block', margin: '.5rem auto 0', width: '1px', height: '40px', background: 'linear-gradient(to bottom, #c9a96e, transparent)' }} />
        </motion.a>

        {/* Bottom rule */}
        <div style={{ width: '1px', height: '80px', background: 'linear-gradient(to bottom, transparent, #b08d57, transparent)', margin: '2rem auto 0' }} />
      </section>

      {/* Index section header */}
      <div id="index" style={{ textAlign: 'center', padding: '5rem 2rem 3.5rem' }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }} viewport={{ once: true }}
        >
          <p style={{ fontFamily: "'Lato', sans-serif", fontWeight: 300, fontSize: '.72rem', letterSpacing: '.3em', textTransform: 'uppercase', color: '#b08d57', marginBottom: '.8rem' }}>
            Contents
          </p>
          <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 400, fontSize: '2rem', color: '#1a1a18', fontStyle: 'italic' }}>
            The Essays
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.8rem', marginTop: '1.2rem', color: '#b08d57' }}>
            <div style={{ height: '1px', width: '80px', background: 'linear-gradient(to right, transparent, #d8d4ca)' }} />
            <span>✦</span>
            <div style={{ height: '1px', width: '80px', background: 'linear-gradient(to left, transparent, #d8d4ca)' }} />
          </div>
        </motion.div>
      </div>

      {/* Grid */}
      <main style={{ maxWidth: '1100px', width: '100%', margin: '0 auto', paddingLeft: '2rem', paddingRight: '2rem', paddingBottom: '8rem', boxSizing: 'border-box' }}>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-14"
        >
          {ESSAYS.map(essay => (
            <EssayCard
              key={essay.id}
              essay={essay}
              onClick={() => openEssay(essay)}
            />
          ))}
        </motion.div>
      </main>

      <footer className="py-12 border-t border-neutral-100 text-center">
        <p className="text-[10px] uppercase tracking-[0.25em] text-zen-text/20">
          © {new Date().getFullYear()} Essays on Metaphysics
        </p>
      </footer>

      {/* Reading overlay */}
      <AnimatePresence>
        {selected && (
          <ReadingView
            key={selected.id}
            essay={selected}
            onClose={closeEssay}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
