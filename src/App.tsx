/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ArrowLeft, BookOpen, Layers } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Essay {
  id: string;
  num: string;
  title: string;
  folder: string;
  slideCount: number;
  filePrefix: string;
  docUrl: string;
  indexGray: string;   // shown on index by default
  indexCream: string;  // shown on index on hover
  quote?: string;
  date?: string;
}

type ViewMode = 'index' | 'slides' | 'reading';

// ─── Essay data — folders and slide counts match the repo exactly ─────────────
// indexGray  = shown on index by default
// indexCream = shown on index on hover
// carousel starts at slide 01 (original, full color)

const ESSAYS: Essay[] = [
  {
    id: '0', num: '01', date: 'April 2025',
    title: 'First Principles 1: Unity',
    quote: 'The thing you are standing in front of is sacred.',
    folder: '1-unity', filePrefix: 'essay1_slide_', slideCount: 12,
    indexGray: '/slides/1-unity/essay1_slide_01_gray.png',
    indexCream: '/slides/1-unity/essay1_slide_01.png',
    docUrl: 'https://docs.google.com/document/d/e/2PACX-1vQiMJtRSbNP8ysO9dU08BtATbyvmhcKqZgyVmr3XIH8LBOZ6U4C7Xdze3uPPcIOYGSYiz5xKgbNlH6M/pub',
  },
  {
    id: '1', num: '02', date: 'August 2025',
    title: 'First Principles 2: Free Will',
    quote: 'Once upon a time, there was only the One Thing.',
    folder: '2-free', filePrefix: 'essay2_slide_', slideCount: 11,
    indexGray: '/slides/2-free/essay2_slide_01_gray.png',
    indexCream: '/slides/2-free/essay2_slide_01.png',
    docUrl: 'https://docs.google.com/document/d/e/2PACX-1vREEmvp19Y47YXwhTQYlcRolh1Jjvf5BicROwt8s3enEc7N04YSKY3Z7JM0ALG9uZI7WLpkStU9kDS5/pub',
  },
  {
    id: '2', num: '03', date: 'April 2025',
    title: 'First Principles 3: The Impulse to Create',
    quote: 'In the beginning was the Word. And It is still being spoken. As you.',
    folder: '3-create', filePrefix: 'essay3_slide_', slideCount: 12,
    indexGray: '/slides/3-create/essay3_slide_01_gray.png',
    indexCream: '/slides/3-create/essay3_slide_01.png',
    docUrl: 'https://docs.google.com/document/d/e/2PACX-1vRGVJR2isARAi9HdzfI7vF1qWGFExtFtQnBjkX81246n1nw7UlC9Gjj2eCHEltTLpSqzc8juNoG0KRI/pub',
  },
  {
    id: '3', num: '04', date: 'June 2025',
    title: 'First Principles 4: Service to Others vs. Service to Self',
    quote: 'The sun and the black hole — one radiating energy, the other fully invested in containing it.',
    folder: '4-service', filePrefix: 'essay4_slide_', slideCount: 14,
    indexGray: '/slides/4-service/essay4_slide_01_gray.png',
    indexCream: '/slides/4-service/essay4_slide_01.png',
    docUrl: 'https://docs.google.com/document/d/e/2PACX-1vTeCYqeO50ASL2VL_dGCS1OwHJwO7Kn6KtaeteVA7T2BFg2gCoqk6xiMlrIiXVTU_tjxGanFpaAKvBK/pub',
  },
  {
    id: '4', num: '05', date: 'January 2026',
    title: 'The Lessons of the Supervillain',
    quote: 'The supervillain is not just a villain. He is a curriculum, and class is now in session.',
    folder: '5-supervillain', filePrefix: 'essay5_slide_', slideCount: 9,
    indexGray: '/slides/5-supervillain/essay5_slide_01_gray.png',
    indexCream: '/slides/5-supervillain/essay5_slide_01_cream.png',
    docUrl: 'https://docs.google.com/document/d/e/2PACX-1vSTxKV3FBIwFol0fNiF_taah6LZdKwnasTxUdYvSk_i_tDsApFzeRNbGfHLQtdXHjTgo-FbZmUqOZFk/pub',
  },
  {
    id: '5', num: '06', date: 'August 2025',
    title: 'The Upside-Down World of the Id',
    quote: "The child's tantrum has become a spectacle of adult insurrection playing out across the national stage.",
    folder: '6-id', filePrefix: 'essay6_slide_', slideCount: 9,
    indexGray: '/slides/6-id/essay6_slide_01_gray.png',
    indexCream: '/slides/6-id/essay6_slide_01_cream.png',
    docUrl: 'https://docs.google.com/document/d/e/2PACX-1vRlvNG-eehvpayBkE-nFsLBXkdkRyiGohNmKAZyiejdvEvK1LcaORAOUAP1qWElMcICK429OJq984Yv/pub',
  },
  {
    id: '6', num: '07', date: 'January 2026',
    title: 'The Two Paths',
    quote: 'The further you go, the harder it becomes to leave.',
    folder: '7-paths', filePrefix: 'essay7_slide_', slideCount: 13,
    indexGray: '/slides/7-paths/essay7_slide_01_gray.png',
    indexCream: '/slides/7-paths/essay7_slide_01_cream.png',
    docUrl: 'https://docs.google.com/document/d/e/2PACX-1vTi97lIgFOd3hebtucPg433eolUmICKcIn3ttARGv7qkmZLtZnh4DRaw7W9zkWPv6xIGHjdAC9dmVWN/pub',
  },
  {
    id: '7', num: '08', date: 'January 2025',
    title: 'The First Rock',
    quote: 'When you feel indignation rise, how do you respond?',
    folder: '8-rocks', filePrefix: 'essay8_slide_', slideCount: 11,
    indexGray: '/slides/8-rocks/essay8_slide_01_gray.png',
    indexCream: '/slides/8-rocks/essay8_slide_01_cream.png',
    docUrl: 'https://docs.google.com/document/d/e/2PACX-1vQCf10pOoWOI4byYUaxte7c49wz_Av-ASpT74RHmpEFD-6puSuspNqD4re1VxbVjxPFfTUILtN4dp8J/pub',
  },
  {
    id: '8', num: '09', date: 'September 2025',
    title: 'I Never Knew You: Narcissism and the Evangelical Soul',
    quote: "They beat the drum of tribalism and call that dance 'righteousness.'",
    folder: '9-narcissism', filePrefix: 'essay9_slide_', slideCount: 11,
    indexGray: '/slides/9-narcissism/essay9_slide_01_gray.png',
    indexCream: '/slides/9-narcissism/essay9_slide_01.png',
    docUrl: 'https://docs.google.com/document/d/e/2PACX-1vSPRE5CKmoMgAsQIgZMfpZSEbL8OEalMwM9BbaARsYzvnpKTRw5ttrTcwU_W2cyFm6g1QcDuXW8zPgq/pub',
  },
  {
    id: '9', num: '10', date: 'July 2025',
    title: 'The Curriculum and the Veil',
    quote: 'We pressed the cup of forgetting to our lips and let its strange taste drift us to sleep.',
    folder: '10-curriculum', filePrefix: 'essay10_slide_', slideCount: 11,
    indexGray: '/slides/10-curriculum/essay10_slide_01_gray.png',
    indexCream: '/slides/10-curriculum/essay10_slide_01_cream.png',
    docUrl: 'https://docs.google.com/document/d/e/2PACX-1vQazMi8MI2WvlZWVOaaD0oUsa0JffoyrGWCv7ubGbCKWh-FtkIMf4D5ZknmYqz1uznLw_6NL4GdSy9N/pub',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slideUrl(essay: Essay, n: number): string {
  // Files are named like essay1_slide_01.png
  return `/slides/${essay.folder}/${essay.filePrefix}${String(n).padStart(2, '0')}.png`;
}

function formatEssayContent(text: string): React.ReactNode[] {
  if (!text) return [];
  return text
    .split('\n')
    .filter(p => p.trim().length > 0)
    .map((para, i) => {
      const parts = para.split(/(\[em\].*?\[\/em\])/gs);
      const content = parts.map((part, j) => {
        const match = part.match(/^\[em\](.*?)\[\/em\]$/s);
        if (match) return <em key={j}>{match[1]}</em>;
        return <span key={j}>{part}</span>;
      });
      return (
        <p key={i} className="mb-7 text-lg leading-[1.9] text-zen-text/85 font-serif font-light">
          {content}
        </p>
      );
    });
}

async function fetchEssayText(url: string): Promise<string> {
  const txtUrl = url.includes('?') ? `${url}&output=txt` : `${url}?output=txt`;
  try {
    const res = await fetch(txtUrl, { mode: 'cors' });
    if (res.ok) { const t = await res.text(); if (t.length > 100) return t; }
  } catch (_) { /* fall through */ }
  try {
    const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(txtUrl)}`);
    if (res.ok) { const d = await res.json(); if (d.contents?.length > 100) return d.contents; }
  } catch (_) { /* fall through */ }
  throw new Error('Could not load');
}

// ─── Carousel ─────────────────────────────────────────────────────────────────

function Carousel({ essay }: { essay: Essay }) {
  const [slide, setSlide] = useState(0);
  const [dir, setDir] = useState(0);
  const dragX = useRef(0);

  const go = useCallback((d: number) => {
    const next = slide + d;
    if (next < 0 || next >= essay.slideCount) return;
    setDir(d); setSlide(next);
  }, [slide, essay.slideCount]);

  const variants = {
    enter: (d: number) => ({ opacity: 0, x: d > 0 ? 50 : -50 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => ({ opacity: 0, x: d > 0 ? -50 : 50 }),
  };

  return (
    <div className="w-full">
      {/* Main frame */}
      <div
        className="relative aspect-square bg-neutral-50 border border-neutral-200 overflow-hidden cursor-grab active:cursor-grabbing select-none"
        onMouseDown={e => { dragX.current = e.clientX; }}
        onMouseUp={e => { const d = e.clientX - dragX.current; if (Math.abs(d) > 40) go(d < 0 ? 1 : -1); }}
        onTouchStart={e => { dragX.current = e.touches[0].clientX; }}
        onTouchEnd={e => { const d = e.changedTouches[0].clientX - dragX.current; if (Math.abs(d) > 40) go(d < 0 ? 1 : -1); }}
      >
        <AnimatePresence mode="wait" custom={dir}>
          <motion.img
            key={slide}
            custom={dir}
            variants={variants}
            initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            src={slideUrl(essay, slide + 1)}
            alt={`${essay.title} — slide ${slide + 1}`}
            className="absolute inset-0 w-full h-full object-cover"
            draggable={false}
          />
        </AnimatePresence>

        {/* Arrow controls */}
        <div className="absolute inset-0 flex items-center justify-between px-3 opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
          <button
            className="pointer-events-auto p-2 rounded-full bg-white/80 backdrop-blur-sm border border-neutral-200 text-neutral-600 hover:bg-white transition-colors disabled:opacity-0"
            disabled={slide === 0}
            onClick={e => { e.stopPropagation(); go(-1); }}
          ><ChevronLeft size={18} /></button>
          <button
            className="pointer-events-auto p-2 rounded-full bg-white/80 backdrop-blur-sm border border-neutral-200 text-neutral-600 hover:bg-white transition-colors disabled:opacity-0"
            disabled={slide === essay.slideCount - 1}
            onClick={e => { e.stopPropagation(); go(1); }}
          ><ChevronRight size={18} /></button>
        </div>

        {/* Counter */}
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
            className="rounded-full bg-zen-accent transition-all duration-300"
            style={{ width: i === slide ? '18px' : '5px', height: '5px', opacity: i === slide ? 0.7 : 0.2 }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Slides-only view ─────────────────────────────────────────────────────────

function SlidesView({ essay, onClose, onReadEssay }: { essay: Essay; onClose: () => void; onReadEssay: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 bg-zen-bg overflow-y-auto z-50"
    >
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-zen-bg/90 backdrop-blur-md border-b border-neutral-100">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={onClose} className="flex items-center gap-2 text-sm tracking-widest uppercase text-zen-text/40 hover:text-zen-text transition-colors group">
            <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
            Index
          </button>
          <span className="text-[10px] tracking-[0.2em] uppercase text-zen-text/30">
            Essay {essay.num} · Slides
          </span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-12 pb-32">
        <h1 className="font-serif text-3xl md:text-4xl font-light leading-tight text-zen-text mb-3">
          {essay.title}
        </h1>
        {essay.quote && (
          <p className="font-serif italic text-base text-zen-text/40 border-l-2 border-zen-accent/30 pl-4 mb-10 leading-relaxed">
            "{essay.quote}"
          </p>
        )}

        <Carousel essay={essay} />

        {/* CTA to read essay */}
        <div className="mt-12 pt-10 border-t border-neutral-100 flex flex-col items-center gap-3">
          <p className="text-[11px] tracking-[0.2em] uppercase text-zen-text/30">Ready to go deeper?</p>
          <button
            onClick={onReadEssay}
            className="flex items-center gap-2.5 px-6 py-3 border border-zen-accent/30 text-sm tracking-widest uppercase text-zen-text/60 hover:text-zen-text hover:border-zen-accent/60 transition-all"
          >
            <BookOpen size={14} />
            Read the essay
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Reading view ─────────────────────────────────────────────────────────────

function ReadingView({ essay, onClose }: { essay: Essay; onClose: () => void }) {
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useState(() => {
    fetchEssayText(essay.docUrl)
      .then(t => { setText(t); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  });

  return (
    <motion.div
      ref={scrollRef}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 bg-zen-bg overflow-y-auto z-50"
    >
      <div className="sticky top-0 z-10 bg-zen-bg/90 backdrop-blur-md border-b border-neutral-100">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={onClose} className="flex items-center gap-2 text-sm tracking-widest uppercase text-zen-text/40 hover:text-zen-text transition-colors group">
            <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
            Index
          </button>
          <span className="text-[10px] tracking-[0.2em] uppercase text-zen-text/30">
            Essay {essay.num} · {essay.date}
          </span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-16 pb-32">
        <h1 className="font-serif text-4xl md:text-5xl font-light leading-tight tracking-tight text-zen-text mb-8">
          {essay.title}
        </h1>
        {essay.quote && (
          <blockquote className="font-serif italic text-xl leading-relaxed text-zen-text/45 border-l-2 border-zen-accent/40 pl-6 mb-14">
            "{essay.quote}"
          </blockquote>
        )}

        <div className="flex items-center gap-4 mb-14">
          <div className="flex-1 h-px bg-neutral-100" />
          <span className="text-zen-accent/40 text-sm">◈</span>
          <div className="flex-1 h-px bg-neutral-100" />
        </div>

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

// ─── Index card — with two hover CTAs ────────────────────────────────────────

function EssayCard({ essay, onExploreSlides, onReadEssay }: {
  essay: Essay;
  onExploreSlides: () => void;
  onReadEssay: () => void;
}) {
  return (
    <motion.article
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
      }}
      className="group"
    >
      {/* Thumbnail — gray by default, warms to cream on hover */}
      <div
        className="aspect-square mb-5 overflow-hidden border border-neutral-200 relative cursor-pointer"
        onClick={onExploreSlides}
      >
        {/* Gray default */}
        <img
          src={essay.indexGray}
          alt={essay.title}
          className="absolute inset-0 w-full h-full object-cover opacity-100 group-hover:opacity-0 transition-opacity duration-500"
          draggable={false}
        />
        {/* Cream hover */}
        <img
          src={essay.indexCream}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          draggable={false}
        />
      </div>

      {/* Meta */}
      <div className="flex items-center gap-3 mb-2.5">
        <span className="text-[10px] font-medium tracking-[0.15em] text-zen-accent/90 bg-zen-accent/10 px-2 py-0.5 rounded-full">
          #{essay.num}
        </span>
        {essay.date && (
          <span className="text-[10px] tracking-widest uppercase text-zen-text/30">{essay.date}</span>
        )}
      </div>

      <h2
        className="font-serif text-xl font-light leading-snug mb-3 cursor-pointer group-hover:text-zen-accent transition-colors duration-300"
        onClick={onExploreSlides}
      >
        {essay.title}
      </h2>

      {essay.quote && (
        <p className="font-serif italic text-sm text-zen-text/40 line-clamp-2 border-l-2 border-zen-accent/20 pl-3.5 leading-relaxed mb-4">
          {essay.quote}
        </p>
      )}

      {/* Two CTAs — appear on hover */}
      <div className="flex items-center gap-4 text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <button
          onClick={onExploreSlides}
          className="flex items-center gap-1.5 text-zen-text/50 hover:text-zen-accent transition-colors"
        >
          <Layers size={12} />
          Explore Slides
        </button>
        <span className="text-zen-text/20">·</span>
        <button
          onClick={onReadEssay}
          className="flex items-center gap-1.5 text-zen-text/50 hover:text-zen-accent transition-colors"
        >
          <BookOpen size={12} />
          Read Essay
        </button>
      </div>
    </motion.article>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [selected, setSelected] = useState<Essay | null>(null);
  const [view, setView] = useState<ViewMode>('index');

  const openSlides = (essay: Essay) => { setSelected(essay); setView('slides'); };
  const openReading = (essay: Essay) => { setSelected(essay); setView('reading'); };
  const closeAll = () => { setView('index'); setSelected(null); };

  return (
    <div className="min-h-screen bg-zen-bg text-zen-text selection:bg-zen-accent/15">
      {/* Header */}
      <header className="pt-20 pb-16 px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-[10px] tracking-[0.35em] uppercase text-zen-text/30 mb-5">A Collection</p>
          <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-light tracking-tight leading-none mb-7">
            Essays on Metaphysics
          </h1>
          <div className="flex items-center justify-center gap-4">
            <div className="h-px w-16 bg-zen-accent/20" />
            <span className="text-[10px] tracking-[0.2em] uppercase text-zen-text/30">
              10 essays · All available now
            </span>
            <div className="h-px w-16 bg-zen-accent/20" />
          </div>
          <p className="mt-6 font-serif italic text-zen-text/40 text-lg max-w-md mx-auto leading-relaxed">
            The world stopped making sense. So I went looking for something solid.
          </p>
        </motion.div>
      </header>

      {/* Grid */}
      <main className="max-w-6xl mx-auto px-6 pb-32">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-14"
        >
          {ESSAYS.map(essay => (
            <EssayCard
              key={essay.id}
              essay={essay}
              onExploreSlides={() => openSlides(essay)}
              onReadEssay={() => openReading(essay)}
            />
          ))}
        </motion.div>
      </main>

      <footer className="py-12 border-t border-neutral-100 text-center">
        <p className="text-[10px] uppercase tracking-[0.25em] text-zen-text/20">
          © {new Date().getFullYear()} Essays on Metaphysics
        </p>
      </footer>

      {/* Overlays */}
      <AnimatePresence>
        {selected && view === 'slides' && (
          <SlidesView
            key="slides"
            essay={selected}
            onClose={closeAll}
            onReadEssay={() => setView('reading')}
          />
        )}
        {selected && view === 'reading' && (
          <ReadingView
            key="reading"
            essay={selected}
            onClose={closeAll}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
