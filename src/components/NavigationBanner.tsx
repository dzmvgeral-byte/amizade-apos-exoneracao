import React from 'react';

interface NavigationBannerProps {
  currentView: 'landing' | 'login' | 'dashboard' | 'reader';
  onNavigate: (view: 'landing' | 'login' | 'dashboard' | 'reader') => void;
  transactionsCount: number;
}

export const NavigationBanner: React.FC<NavigationBannerProps> = ({
  currentView,
  onNavigate,
  transactionsCount,
}) => {
  return (
    <aside aria-label="Navegação da Aplicação" className="w-full bg-[#0B0F19] text-white border-b border-white/10 sticky top-0 z-50 text-xs shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Branding & Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-semibold tracking-wider text-[11px] text-amber-300 uppercase">
              Sábhia & Veritas Press
            </span>
          </div>
          <span className="text-white/30 hidden sm:inline">|</span>
          <span className="text-white/80 hidden md:inline text-[11px]">
            Obra: <strong className="text-white font-semibold">Amizade após Exoneração</strong> • Eng. Dénis Zombo
          </span>
        </div>

        {/* Center: View Switcher Tabs */}
        <div className="flex items-center p-1 bg-white/10 rounded-lg gap-1 overflow-x-auto max-w-full whitespace-nowrap scrollbar-none">
          <button
            onClick={() => onNavigate('landing')}
            className={`px-2.5 sm:px-3 py-1 rounded text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
              currentView === 'landing'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">menu_book</span>
            <span>Loja & Livro</span>
          </button>

          <button
            onClick={() => onNavigate('reader')}
            className={`px-2.5 sm:px-3 py-1 rounded text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
              currentView === 'reader'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">auto_stories</span>
            <span>Leitor Interativo</span>
          </button>

          <button
            onClick={() => onNavigate('login')}
            className={`px-2.5 sm:px-3 py-1 rounded text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
              currentView === 'login'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">lock</span>
            <span>Portal</span>
          </button>

          <button
            onClick={() => onNavigate('dashboard')}
            className={`px-2.5 sm:px-3 py-1 rounded text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
              currentView === 'dashboard'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">dashboard</span>
            <span>Console</span>
            <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono">
              {transactionsCount}
            </span>
          </button>
        </div>

        {/* Right: Info pill */}
        <div className="hidden lg:flex items-center gap-3 text-[11px] text-white/70">
          <span className="flex items-center gap-1 font-medium">
            <span className="material-symbols-outlined text-[14px] text-amber-400">verified</span>
            <span>Edição Oficial 2025</span>
          </span>
          <span className="text-white/30">•</span>
          <span className="font-mono text-amber-300">1 USD ≈ 920 Kz</span>
        </div>
      </div>
    </aside>
  );
};
