/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, BookOpen, Layers } from 'lucide-react';

interface Essay {
  id: string;
  title: string;
  imageFolder: string;
  docUrl: string;
  slideCount: number;
  quote?: string;
  date?: string;
}

// Helper to convert [em] tags and handle markdown-like spacing
const formatEssayText = (text: string) => {
  if (!text) return '';
  return text
    .replace(/\[em\]/g, '<em class="italic">')
    .replace(/\[\/em\]/g, '</em>')
    .split('\n')
    .filter(p => p.trim())
    .map((para, i) => `<p key="${i}" class="mb-8 leading-relaxed text-lg font-light text-zen-text/90">${para}</p>`)
    .join('');
};

// Helper to get raw text from Google Doc link (handles both standard and published links)
const getGoogleDocContentUrl = (url: string) => {
  if (!url) return '';
  
  // Handle published links (.../pub)
  if (url.includes('/pub')) {
    return url.includes('?') ? `${url}&output=txt` : `${url}?output=txt`;
  }

  // Handle standard shared links (.../d/ID/edit)
  const docIdMatch = url.match(/\/d\/([a-zA-Z0-9-_]{10,})/);
  if (docIdMatch) {
    return `https://docs.google.com/document/d/${docIdMatch[1]}/export?format=txt`;
  }
  
  return url;
};

export default function App() {
  const [essays, setEssays] = useState<Essay[]>([]);
  const [selectedEssay, setSelectedEssay] = useState<Essay | null>(null);
  const [viewMode, setViewMode] = useState<'index' | 'reading'>('index');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [essayText, setEssayText] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Effect to handle "parsing" the index data
  // In a real scenario, this would fetch an external HTML file and parse it
  useEffect(() => {
    const fetchAndParseIndex = async () => {
      try {
        // We'll prioritize fetching the dedicated essays.html file
        let response = await fetch('/essays.html');
        
        // If not found, fallback to index.html
        if (!response.ok) {
          response = await fetch('/index.html');
        }
        
        if (!response.ok) throw new Error('Index file not found');
        
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // If it's the root Vite index, we use the fallback sample data
        if (html.includes('id="root"') && !html.includes('essay-card')) {
          console.log("Standard Vite index detected, using sample data...");
          setEssays([
            {
              id: '1',
              title: 'The Nature of Reality',
              imageFolder: 'nature',
              docUrl: 'https://docs.google.com/document/d/1example1',
              slideCount: 8
            },
            {
              id: '2',
              title: 'Consciousness and Matter',
              imageFolder: 'consciousness',
              docUrl: 'https://docs.google.com/document/d/1example2',
              slideCount: 12
            },
            {
              id: '3',
              title: 'The Ethics of Being',
              imageFolder: 'ethics',
              docUrl: 'https://docs.google.com/document/d/1example3',
              slideCount: 10
            }
          ]);
          return;
        }

        const cards = Array.from(doc.querySelectorAll('.essay-card, .card, .essay-entry'));
        const parsedEssays: Essay[] = cards.map((card, index) => {
          const titleEl = card.querySelector('.essay-title, h2, h3, .title');
          const title = titleEl?.textContent?.trim() || `Essay ${index + 1}`;
          const link = (titleEl as HTMLAnchorElement)?.href || card.querySelector('a')?.href || '';
          
          // Try to derive folder name from title or use sequential
          const folder = card.getAttribute('data-folder') || title.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 20);
          const count = parseInt(card.getAttribute('data-slides') || '10');
          const quote = card.querySelector('.essay-quote')?.textContent?.trim() || '';
          const date = card.querySelector('.essay-date')?.textContent?.trim() || '';
          
          return {
            id: index.toString(),
            title,
            imageFolder: folder,
            docUrl: link,
            slideCount: count,
            quote,
            date
          };
        });

        if (parsedEssays.length > 0) {
          setEssays(parsedEssays);
        }
      } catch (err) {
        console.warn("Could not parse index, using sample data:", err);
        // Fallback sample data
        setEssays([
          {
            id: '1',
            title: 'The Nature of Time',
            imageFolder: 'time',
            docUrl: 'https://docs.google.com/document/d/1-u-R8q3v5pG8M-8_Hn8mY-r4q1Z9w8Qy', // Placeholder
            slideCount: 8
          }
        ]);
      }
    };

    fetchAndParseIndex();
  }, []);

  const openEssay = async (essay: Essay) => {
    setSelectedEssay(essay);
    setCurrentSlide(0);
    setViewMode('reading');
    setIsLoading(true);
    
    try {
      const contentUrl = getGoogleDocContentUrl(essay.docUrl);
      const response = await fetch(contentUrl);
      if (!response.ok) throw new Error('Failed to fetch essay');
      const text = await response.text();
      setEssayText(text);
    } catch (err) {
      console.error(err);
      setEssayText("Could not load essay content. Please check the Google Doc link.");
    } finally {
      setIsLoading(false);
    }
  };

  const closeEssay = () => {
    setViewMode('index');
    setSelectedEssay(null);
    setEssayText('');
  };

  return (
    <div className="min-h-screen bg-zen-bg text-zen-text selection:bg-zen-accent/20">
      {/* Header */}
      <header className="py-16 px-8 text-center">
        <h1 className="font-serif text-5xl md:text-6xl font-light tracking-tight mb-4">
          Essays on Metaphysics
        </h1>
        <div className="h-px w-24 bg-zen-accent mx-auto opacity-30"></div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pb-24">
        {viewMode === 'index' ? (
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.1 } }
            }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12"
          >
            {essays.length === 0 ? (
              <div className="col-span-full py-20 text-center opacity-50 space-y-4">
                <p className="text-xl">Waiting for index.html data...</p>
                <p className="text-sm italic">Please upload your index.html to populate the library.</p>
              </div>
            ) : (
              essays.map((essay) => (
                <motion.div
                  key={essay.id}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0 }
                  }}
                  whileHover={{ y: -5 }}
                  className="group cursor-pointer"
                  onClick={() => openEssay(essay)}
                >
                  <div className="aspect-square bg-neutral-100 mb-6 overflow-hidden flex items-center justify-center border border-neutral-200">
                    <img 
                      src={`/slides/${essay.imageFolder}/1.jpg`} 
                      alt={essay.title}
                      className="w-full h-full object-cover grayscale transition-all duration-700 group-hover:grayscale-0 group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://via.placeholder.com/1080?text=${encodeURIComponent(essay.title)}`;
                      }}
                    />
                  </div>
                  <div className="mb-4">
                    <div className="flex items-center gap-3 mb-2">
                       <span className="text-[10px] bg-zen-accent/10 text-zen-accent px-2 py-0.5 rounded-full font-medium">#{String(Number(essay.id) + 1).padStart(2, '0')}</span>
                       {essay.date && <span className="text-[10px] uppercase tracking-widest opacity-40">{essay.date}</span>}
                    </div>
                    <h2 className="font-serif text-2xl font-light mb-3 group-hover:text-zen-accent transition-colors leading-tight">
                      {essay.title}
                    </h2>
                    {essay.quote && (
                      <p className="font-serif italic text-sm text-zen-text/60 line-clamp-2 border-l-2 border-zen-accent/20 pl-4 py-1">
                        {essay.quote}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs uppercase tracking-widest opacity-0 group-hover:opacity-40 transition-opacity mt-4">
                    <div className="flex items-center gap-1.5">
                      <Layers size={14} />
                      <span>Explore Slides</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <BookOpen size={14} />
                      <span>Read Essay</span>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Navigation */}
            <button 
              onClick={closeEssay}
              className="flex items-center gap-2 mb-12 opacity-40 hover:opacity-100 transition-opacity cursor-pointer group"
            >
              <X size={20} className="group-hover:rotate-90 transition-transform" />
              <span className="text-sm tracking-widest uppercase">Back to Index</span>
            </button>

            {/* Carousel */}
            <div className="mb-24 flex flex-col items-center">
              <div className="relative w-full max-w-[800px] aspect-square bg-black shadow-2xl border border-white/10 group">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={currentSlide}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.5 }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    onDragEnd={(_, info) => {
                      if (info.offset.x > 100 && currentSlide > 0) {
                        setCurrentSlide(prev => prev - 1);
                      } else if (info.offset.x < -100 && currentSlide < (selectedEssay?.slideCount || 10) - 1) {
                        setCurrentSlide(prev => prev + 1);
                      }
                    }}
                    src={`/slides/${selectedEssay?.imageFolder}/${currentSlide + 1}.jpg`}
                    alt={`Slide ${currentSlide + 1}`}
                    className="w-full h-full object-contain cursor-grab active:cursor-grabbing"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/1080?text=Slide+Not+Found';
                    }}
                  />
                </AnimatePresence>

                {/* Controls */}
                <div className="absolute inset-y-0 left-0 w-1/4 flex items-center justify-start pl-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    disabled={currentSlide === 0}
                    onClick={() => setCurrentSlide(prev => prev - 1)}
                    className="p-2 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 disabled:opacity-0 transition-all cursor-pointer"
                  >
                    <ChevronLeft size={32} />
                  </button>
                </div>
                <div className="absolute inset-y-0 right-0 w-1/4 flex items-center justify-end pr-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    disabled={currentSlide === (selectedEssay?.slideCount || 10) - 1}
                    onClick={() => setCurrentSlide(prev => prev + 1)}
                    className="p-2 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 disabled:opacity-0 transition-all cursor-pointer"
                  >
                    <ChevronRight size={32} />
                  </button>
                </div>

                {/* Slide Number */}
                <div className="absolute bottom-4 right-4 text-white/50 text-[10px] tracking-widest uppercase">
                  {(currentSlide + 1).toString().padStart(2, '0')} / {(selectedEssay?.slideCount || 10).toString().padStart(2, '0')}
                </div>
              </div>
              <p className="mt-6 text-[10px] uppercase tracking-[0.3em] opacity-30">Slide Carousel • 1080x1080</p>
            </div>

            {/* Reading Content */}
            <article className="max-w-2xl mx-auto mb-32">
              <h2 className="font-serif text-4xl md:text-5xl mb-12 text-center">
                {selectedEssay?.title}
              </h2>
              
              {isLoading ? (
                <div className="flex flex-col items-center gap-4 py-20 opacity-20">
                  <div className="w-12 h-px bg-current animate-pulse"></div>
                  <p className="text-xs uppercase tracking-widest">Gathering thoughts...</p>
                </div>
              ) : (
                <div 
                  className="essay-content"
                  dangerouslySetInnerHTML={{ __html: formatEssayText(essayText) }}
                />
              )}
            </article>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-neutral-100 text-center opacity-30 text-[10px] uppercase tracking-[0.2em]">
        &copy; {new Date().getFullYear()} Essays on Metaphysics
      </footer>
    </div>
  );
}
