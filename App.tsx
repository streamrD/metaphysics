/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ArrowLeft, BookOpen } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Essay {
  id: string;
  num: string;
  title: string;
  imageFolder: string;
  docUrl: string;
  slideCount: number;
  quote?: string;
  date?: string;
}

// ─── Essay data — sourced directly from essays.html ───────────────────────────
const ESSAY_DATA: Essay[] = [
  {
    id: '0', num: '01', date: 'April 2025',
    title: 'First Principles 1: Unity',
    quote: 'The thing you are standing in front of is sacred.',
    docUrl: 'https://docs.google.com/document/d/e/2PACX-1vQiMJtRSbNP8ysO9dU08BtATbyvmhcKqZgyVmr3XIH8LBOZ6U4C7Xdze3uPPcIOYGSYiz5xKgbNlH6M/pub',
    imageFolder: 'essay-01-unity', slideCount: 10,
  },
  {
    id: '1', num: '02', date: 'August 2025',
    title: 'First Principles 2: Free Will',
    quote: 'Once upon a time, there was only the One Thing.',
    docUrl: 'https://docs.google.com/document/d/e/2PACX-1vREEmvp19Y47YXwhTQYlcRolh1Jjvf5BicROwt8s3enEc7N04YSKY3Z7JM0ALG9uZI7WLpkStU9kDS5/pub',
    imageFolder: 'essay-02-freewill', slideCount: 10,
  },
  {
    id: '2', num: '03', date: 'April 2025',
    title: 'First Principles 3: The Impulse to Create',
    quote: 'In the beginning was the Word. And It is still being spoken. As you.',
    docUrl: 'https://docs.google.com/document/d/e/2PACX-1vRGVJR2isARAi9HdzfI7vF1qWGFExtFtQnBjkX81246n1nw7UlC9Gjj2eCHEltTLpSqzc8juNoG0KRI/pub',
    imageFolder: 'essay-03-impulse', slideCount: 10,
  },
  {
    id: '3', num: '04', date: 'June 2025',
    title: 'First Principles 4: Service to Others vs. Service to Self',
    quote: 'The sun and the black hole — one radiating energy, the other fully invested in containing it.',
    docUrl: 'https://docs.google.com/document/d/e/2PACX-1vTeCYqeO50ASL2VL_dGCS1OwHJwO7Kn6KtaeteVA7T2BFg2gCoqk6xiMlrIiXVTU_tjxGanFpaAKvBK/pub',
    imageFolder: 'essay-04-service', slideCount: 10,
  },
  {
    id: '4', num: '05', date: 'January 2026',
    title: 'The Lessons of the Supervillain',
    quote: 'The supervillain is not just a villain. He is a curriculum, and class is now in session.',
    docUrl: 'https://docs.google.com/document/d/e/2PACX-1vSTxKV3FBIwFol0fNiF_taah6LZdKwnasTxUdYvSk_i_tDsApFzeRNbGfHLQtdXHjTgo-FbZmUqOZFk/pub',
    imageFolder: 'essay-05-supervillain', slideCount: 10,
  },
  {
    id: '5', num: '06', date: 'August 2025',
    title: 'The Upside-Down World of the Id',
    quote: "The child's tantrum has become a spectacle of adult insurrection playing out across the national stage.",
    docUrl: 'https://docs.google.com/document/d/e/2PACX-1vRlvNG-eehvpayBkE-nFsLBXkdkRyiGohNmKAZyiejdvEvK1LcaORAOUAP1qWElMcICK429OJq984Yv/pub',
    imageFolder: 'essay-06-id', slideCount: 10,
  },
  {
    id: '6', num: '07', date: 'January 2026',
    title: 'The Two Paths',
    quote: 'The further you go, the harder it becomes to leave.',
    docUrl: 'https://docs.google.com/document/d/e/2PACX-1vTi97lIgFOd3hebtucPg433eolUmICKcIn3ttARGv7qkmZLtZnh4DRaw7W9zkWPv6xIGHjdAC9dmVWN/pub',
    imageFolder: 'essay-07-twopaths', slideCount: 10,
  },
  {
    id: '7', num: '08', date: 'January 2025',
    title: 'The First Rock',
    quote: 'When you feel indignation rise, how do you respond?',
    docUrl: 'https://docs.google.com/document/d/e/2PACX-1vQCf10pOoWOI4byYUaxte7c49wz_Av-ASpT74RHmpEFD-6puSuspNqD4re1VxbVjxPFfTUILtN4dp8J/pub',
    imageFolder: 'essay-08-firstrock', slideCount: 10,
  },
  {
    id: '8', num: '09', date: 'September 2025',
    title: 'I Never Knew You: Narcissism and the Evangelical Soul',
    quote: "They beat the drum of tribalism and call that dance 'righteousness.'",
    docUrl: 'https://docs.google.com/document/d/e/2PACX-1vSPRE5CKmoMgAsQIgZMfpZSEbL8OEalMwM9BbaARsYzvnpKTRw5ttrTcwU_W2cyFm6g1QcDuXW8zPgq/pub',
    imageFolder: 'essay-09-narcissism', slideCount: 10,
  },
  {
    id: '9', num: '10', date: 'July 2025',
    title: 'The Curriculum and the Veil',
    quote: 'We pressed the cup of forgetting to our lips and let its strange taste drift us to sleep.',
    docUrl: 'https://docs.google.com/document/d/e/2PACX-1vQazMi8MI2WvlZWVOaaD0oUsa0JffoyrGWCv7ubGbCKWh-FtkIMf4D5ZknmYqz1uznLw_6NL4GdSy9N/pub',
    imageFolder: 'essay-10-curriculum', slideCount: 10,
  },
];

// ─── Text formatting — converts [em] tags to <em> ─────────────────────────────
function formatEssayContent(text: string): React.ReactNode[] {
  if (!text) return [];
  const paragraphs = text.split('\n').filter(p => p.trim().length > 0);
  return paragraphs.map((para, i) => {
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

// ─── Fetch essay text via Google Doc pub URL ──────────────────────────────────
async function fetchEssayText(url: string): Promise<string> {
  const txtUrl = url.includes('?') ? `${url}&output=txt` : `${url}?output=txt`;

  // Attempt 1: direct CORS fetch
  try {
    const res = await fetch(txtUrl, { mode: 'cors' });
    if (res.ok) {
      const text = await res.text();
      if (text && text.length > 100) return text;
    }
  } catch (_) { /* fall through */ }

  // Attempt 2: allorigins.win proxy
  try {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(txtUrl)}`;
    const res = await fetch(proxyUrl);
    if (res.ok) {
      const data = await res.json();
      if (data.contents && data.contents.length > 100) return data.contents;
    }
  } catch (_) { /* fall through */ }

  throw new Error('Could not load essay text');
}

// ─── Carousel ─────────────────────────────────────────────────────────────────
function Carousel({ essay }: { essay: Essay }) {
  const [slide, setSlide] = useState(0);
  const [direction, setDirection] = useState(0);
  const dragStartX = useRef(0);

  const go = useCallback((dir: number) => {
    const next = slide + dir;
    if (next < 0 || next >= essay.slideCount) return;
    setDirection(dir);
    setSlide(next);
  }, [slide, essay.slideCount]);

  const variants = {
    enter: (d: number) => ({ opacity: 0, x: d > 0 ? 60 : -60 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => ({ opacity: 0, x: d > 0 ? -60 : 60 }),
  };

  return (
    <div className="w-full max-w-2xl mx-auto mb-20">
      <div
        className="relative aspect-square bg-neutral-50 border border-neutral-200 overflow-hidden cursor-grab active:cursor-grabbing select-none"
        onMouseDown={e => { dragStartX.current = e.clientX; }}
        onMouseUp={e => {
          const diff = e.clientX - dragStartX.current;
          if (Math.abs(diff) > 40) go(diff < 0 ? 1 : -1);
        }}
        onTouchStart={e => { dragStartX.current = e.touches[0].clientX; }}
        onTouchEnd={e => {
          const diff = e.changedTouches[0].clientX - dragStartX.current;
          if (Math.abs(diff) > 40) go(diff < 0 ? 1 : -1);
        }}
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.img
            key={slide}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            src={`/slides/${essay.imageFolder}/${slide + 1}.jpg`}
            alt={`${essay.title} — slide ${slide + 1}`}
            className="absolute inset-0 w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).style.opacity = '0'; }}
            draggable={false}
          />
        </AnimatePresence>

        {/* Placeholder backdrop */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-300 pointer-events-none">
          <div className="text-5xl mb-3 opacity-20">◈</div>
          <div className="text-[10px] tracking-[0.2em] uppercase opacity-30">
            /slides/{essay.imageFolder}/{slide + 1}.jpg
          </div>
        </div>

        {/* Arrow controls */}
        <div className="absolute inset-0 flex items-center justify-between px-3 opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
          <button
            className="pointer-events-auto p-2 rounded-full bg-white/80 backdrop-blur-sm border border-neutral-200 text-neutral-600 hover:bg-white transition-colors disabled:opacity-0"
            disabled={slide === 0}
            onClick={e => { e.stopPropagation(); go(-1); }}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            className="pointer-events-auto p-2 rounded-full bg-white/80 backdrop-blur-sm border border-neutral-200 text-neutral-600 hover:bg-white transition-colors disabled:opacity-0"
            disabled={slide === essay.slideCount - 1}
            onClick={e => { e.stopPropagation(); go(1); }}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Slide counter */}
        <div className="absolute bottom-3 right-4 text-[10px] tracking-widest text-white/60 mix-blend-difference font-light">
          {String(slide + 1).padStart(2, '0')} / {String(essay.slideCount).padStart(2, '0')}
        </div>
      </div>

      {/* Dot strip */}
      <div className="flex justify-center gap-1.5 mt-4">
        {Array.from({ length: essay.slideCount }).map((_, i) => (
          <button
            key={i}
            onClick={() => { setDirection(i > slide ? 1 : -1); setSlide(i); }}
            className="rounded-full bg-zen-accent transition-all duration-300"
            style={{
              width: i === slide ? '18px' : '5px',
              height: '5px',
              opacity: i === slide ? 0.7 : 0.2,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Essay reading view ───────────────────────────────────────────────────────
function EssayView({ essay, onClose }: { essay: Essay; onClose: () => void }) {
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    setError(false);
    setText(null);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;

    fetchEssayText(essay.docUrl)
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

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-16 pb-32">
        <h1 className="font-serif text-4xl md:text-5xl font-light leading-tight tracking-tight text-zen-text mb-8">
          {essay.title}
        </h1>

        {essay.quote && (
          <blockquote className="font-serif italic text-xl leading-relaxed text-zen-text/45 border-l-2 border-zen-accent/40 pl-6 mb-14">
            "{essay.quote}"
          </blockquote>
        )}

        <Carousel essay={essay} />

        {/* Divider */}
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
            <p className="mb-4 text-xs opacity-70">This may be a CORS restriction or network issue.</p>
            <a
              href={essay.docUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-xs tracking-widest uppercase hover:underline"
            >
              <BookOpen size={12} />
              Open on Google Docs
            </a>
          </div>
        )}

        {text && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="essay-content"
          >
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
      className="group cursor-pointer"
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="aspect-square bg-neutral-50 mb-5 overflow-hidden border border-neutral-100 relative">
        <img
          src={`/slides/${essay.imageFolder}/1.jpg`}
          alt={essay.title}
          className="w-full h-full object-cover grayscale transition-all duration-700 group-hover:grayscale-0 group-hover:scale-[1.03]"
          onError={e => { (e.target as HTMLImageElement).style.opacity = '0'; }}
        />
        <div className="absolute inset-0 flex items-center justify-center opacity-10 group-hover:opacity-5 transition-opacity">
          <span className="text-4xl text-zen-text">◈</span>
        </div>
        <div className="absolute inset-0 bg-zen-text/0 group-hover:bg-zen-text/5 transition-colors duration-500" />
      </div>

      {/* Meta */}
      <div className="flex items-center gap-3 mb-2.5">
        <span className="text-[10px] font-medium tracking-[0.15em] text-zen-accent/90 bg-zen-accent/10 px-2 py-0.5 rounded-full">
          #{essay.num}
        </span>
        {essay.date && (
          <span className="text-[10px] tracking-widest uppercase text-zen-text/30">
            {essay.date}
          </span>
        )}
      </div>

      <h2 className="font-serif text-xl font-light leading-snug mb-3 group-hover:text-zen-accent transition-colors duration-300">
        {essay.title}
      </h2>

      {essay.quote && (
        <p className="font-serif italic text-sm text-zen-text/40 line-clamp-2 border-l-2 border-zen-accent/20 pl-3.5 leading-relaxed">
          {essay.quote}
        </p>
      )}

      <div className="mt-4 text-[10px] tracking-[0.2em] uppercase text-transparent group-hover:text-zen-accent/50 transition-colors duration-300">
        Read →
      </div>
    </motion.article>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [selected, setSelected] = useState<Essay | null>(null);

  return (
    <div className="min-h-screen bg-zen-bg text-zen-text selection:bg-zen-accent/15">
      {/* Header */}
      <header className="pt-20 pb-16 px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-[10px] tracking-[0.35em] uppercase text-zen-text/30 mb-5">
            A Collection
          </p>
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

      {/* Essay grid */}
      <main className="max-w-6xl mx-auto px-6 pb-32">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-14"
        >
          {ESSAY_DATA.map(essay => (
            <EssayCard key={essay.id} essay={essay} onClick={() => setSelected(essay)} />
          ))}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-neutral-100 text-center">
        <p className="text-[10px] uppercase tracking-[0.25em] text-zen-text/20">
          © {new Date().getFullYear()} Essays on Metaphysics
        </p>
      </footer>

      {/* Essay overlay */}
      <AnimatePresence>
        {selected && (
          <EssayView essay={selected} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
