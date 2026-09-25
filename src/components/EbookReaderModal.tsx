import React, { useState } from 'react';
import { BOOK_METADATA, BOOK_SAMPLE_CHAPTERS } from '../data/bookData';

interface EbookReaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBuyClick: () => void;
}

export const EbookReaderModal: React.FC<EbookReaderModalProps> = ({
  isOpen,
  onClose,
  onBuyClick,
}) => {
  const [currentChapterIdx, setCurrentChapterIdx] = useState(0);
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg' | 'xl'>('md');
  const [theme, setTheme] = useState<'sepia' | 'light' | 'dark'>('sepia');

  if (!isOpen) return null;

  const currentChapter = BOOK_SAMPLE_CHAPTERS[currentChapterIdx];

  const fontSizeClasses = {
    sm: 'text-sm sm:text-base leading-relaxed',
    md: 'text-base sm:text-lg leading-loose',
    lg: 'text-lg sm:text-xl leading-loose',
    xl: 'text-xl sm:text-2xl leading-loose',
  }[fontSize];

  const themeClasses = {
    sepia: 'bg-[#FBF8EF] text-[#2C2416] border-[#E8DFC8]',
    light: 'bg-white text-slate-900 border-slate-200',
    dark: 'bg-[#111726] text-[#E2E6F5] border-slate-800',
  }[theme];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div 
        className={`w-full max-w-4xl h-[92vh] max-h-[850px] rounded-2xl shadow-2xl flex flex-col border overflow-hidden transition-colors ${themeClasses}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Bar */}
        <div className="px-6 py-3.5 border-b border-inherit flex items-center justify-between gap-4 shrink-0 bg-inherit/90 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <span className="font-title-editorial font-bold text-base truncate hidden sm:inline">
              {BOOK_METADATA.title}
            </span>
            <span className="text-xs opacity-60">
              {currentChapter.number} ({currentChapterIdx + 1} de {BOOK_SAMPLE_CHAPTERS.length})
            </span>
          </div>

          {/* Reader controls */}
          <div className="flex items-center gap-2">
            {/* Font Size controls */}
            <div className="flex items-center bg-black/5 dark:bg-white/10 rounded-lg p-0.5 text-xs">
              <button 
                onClick={() => setFontSize(prev => prev === 'xl' ? 'lg' : prev === 'lg' ? 'md' : 'sm')}
                className="px-2 py-1 hover:opacity-75 font-semibold"
                title="Diminuir texto"
              >
                A-
              </button>
              <button 
                onClick={() => setFontSize(prev => prev === 'sm' ? 'md' : prev === 'md' ? 'lg' : 'xl')}
                className="px-2 py-1 hover:opacity-75 font-bold"
                title="Aumentar texto"
              >
                A+
              </button>
            </div>

            {/* Theme selector */}
            <div className="flex items-center gap-1 bg-black/5 dark:bg-white/10 rounded-lg p-1 text-xs">
              <button
                onClick={() => setTheme('sepia')}
                className={`w-5 h-5 rounded-full bg-[#FBF8EF] border border-[#D5C7A5] ${theme === 'sepia' ? 'ring-2 ring-amber-600' : ''}`}
                title="Modo Sépia / Livro Físico"
              />
              <button
                onClick={() => setTheme('light')}
                className={`w-5 h-5 rounded-full bg-white border border-slate-300 ${theme === 'light' ? 'ring-2 ring-slate-900' : ''}`}
                title="Modo Claro"
              />
              <button
                onClick={() => setTheme('dark')}
                className={`w-5 h-5 rounded-full bg-[#111726] border border-slate-600 ${theme === 'dark' ? 'ring-2 ring-amber-400' : ''}`}
                title="Modo Noite"
              />
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center transition-colors ml-2"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        </div>

        {/* Reader Book Content */}
        <div className="flex-1 overflow-y-auto px-6 sm:px-16 py-8 sm:py-12 max-w-2xl mx-auto w-full">
          <div className="space-y-6">
            <div className="text-center pb-6 border-b border-inherit/40 space-y-2">
              <span className="text-xs uppercase tracking-widest font-semibold opacity-70 block">
                {currentChapter.number}
              </span>
              <h2 className="font-headline-lg text-2xl sm:text-3xl font-bold tracking-tight">
                {currentChapter.title}
              </h2>
              <p className="text-sm italic opacity-80">
                {currentChapter.subtitle}
              </p>
            </div>

            {/* Chapter Body with refined editorial typography */}
            <div className={`font-serif-editorial ${fontSizeClasses} space-y-6 text-justify tracking-normal whitespace-pre-line`}>
              {currentChapter.content}
            </div>

            {/* End of chapter box */}
            <div className="pt-8 border-t border-inherit/40 text-center space-y-4">
              <div className="flex items-center justify-center gap-2">
                <span className="w-12 h-px bg-current opacity-30"></span>
                <span className="material-symbols-outlined text-sm opacity-50">auto_stories</span>
                <span className="w-12 h-px bg-current opacity-30"></span>
              </div>
              
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 max-w-lg mx-auto">
                <h4 className="font-bold text-sm">Gostou desta introdução?</h4>
                <p className="text-xs opacity-80 mt-1">
                  Adquira o e-book completo com todos os capítulos, reflexões exclusivas e acesso direto do Eng. Dénis Zombo por apenas <strong>{BOOK_METADATA.prices.ebookFormatted}</strong>.
                </p>
                <button
                  onClick={() => {
                    onClose();
                    onBuyClick();
                  }}
                  className="mt-3 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors shadow-md cursor-pointer"
                >
                  Adquirir E-book Completo ({BOOK_METADATA.prices.ebookFormatted})
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Pagination Bar */}
        <div className="px-6 py-3 border-t border-inherit flex items-center justify-between shrink-0 bg-inherit/90">
          <button
            disabled={currentChapterIdx === 0}
            onClick={() => setCurrentChapterIdx(prev => Math.max(0, prev - 1))}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Página Anterior
          </button>

          <div className="flex items-center gap-1.5">
            {BOOK_SAMPLE_CHAPTERS.map((chap, idx) => (
              <button
                key={chap.id}
                onClick={() => setCurrentChapterIdx(idx)}
                className={`h-2.5 rounded-full transition-all cursor-pointer ${
                  idx === currentChapterIdx ? 'bg-amber-600 w-6' : 'bg-current opacity-25 hover:opacity-50 w-2.5'
                }`}
                title={chap.title}
              />
            ))}
          </div>

          <button
            disabled={currentChapterIdx === BOOK_SAMPLE_CHAPTERS.length - 1}
            onClick={() => setCurrentChapterIdx(prev => Math.min(BOOK_SAMPLE_CHAPTERS.length - 1, prev + 1))}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center gap-1 cursor-pointer"
          >
            Próxima Página
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
};
