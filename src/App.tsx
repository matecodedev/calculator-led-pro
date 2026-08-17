import { useState } from 'react';
import { Calculator, Library as LibraryIcon, Wrench, Heart } from 'lucide-react';
import type { TabState } from './types';
import CalculatorView from './components/Calculator';
import LibraryView from './components/Library';
import GuidesView from './components/Guides';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabState>('calculator');

  return (
    <div className="min-h-screen h-screen bg-[#0F0F0F] text-[#E0E0E0] font-sans flex flex-col w-full overflow-hidden">
      {/* Top Navigation Bar */}
      <nav className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-[#333] bg-[#161616] shrink-0">
        <div className="flex items-center space-x-3 sm:space-x-4">
          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-[#CCFF00] flex items-center justify-center rounded-sm shrink-0">
            <div className="w-3 h-3 sm:w-5 sm:h-5 border-2 border-black"></div>
          </div>
          <h1 className="text-sm sm:text-lg font-bold tracking-tighter uppercase whitespace-nowrap">Calculator Led Pro <span className="text-[#CCFF00] opacity-80 text-xs">by MateCode</span></h1>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-6">
          <div className="hidden sm:flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-[10px] uppercase tracking-widest opacity-60">System Ready / Offline Active</span>
          </div>
          <div className="text-[9px] sm:text-[11px] font-mono opacity-80 bg-[#222] px-2 py-1 border border-[#444]">SYS: ONLINE</div>
        </div>
      </nav>

      <div className="flex-1 flex flex-col sm:flex-row overflow-hidden relative">
        {/* Sidebar Controls (Desktop) */}
        <aside className="hidden sm:flex w-56 border-r border-[#333] bg-[#121212] flex-col shrink-0 overflow-y-auto">
          <div className="p-4 space-y-4">
            <div className="text-[10px] uppercase tracking-widest text-[#CCFF00] font-bold">Main Modules</div>
            <button
              onClick={() => setActiveTab('calculator')}
              className={`w-full flex items-center space-x-3 p-3 rounded-sm font-bold text-sm transition-colors border ${
                activeTab === 'calculator' ? 'bg-[#CCFF00] text-black border-transparent' : 'bg-transparent border-transparent hover:border-[#444] text-[#E0E0E0]'
              }`}
            >
              <Calculator className="w-4 h-4" />
              <span>CALCULATORS</span>
            </button>
            <button
              onClick={() => setActiveTab('library')}
              className={`w-full flex items-center space-x-3 p-3 rounded-sm font-bold text-sm transition-colors border ${
                activeTab === 'library' ? 'bg-[#CCFF00] text-black border-transparent' : 'bg-transparent border-transparent hover:border-[#444] text-[#E0E0E0]'
              }`}
            >
              <LibraryIcon className="w-4 h-4" />
              <span>CABINET LIB</span>
            </button>
            <button
              onClick={() => setActiveTab('guides')}
              className={`w-full flex items-center space-x-3 p-3 rounded-sm font-bold text-sm transition-colors border ${
                activeTab === 'guides' ? 'bg-[#CCFF00] text-black border-transparent' : 'bg-transparent border-transparent hover:border-[#444] text-[#E0E0E0]'
              }`}
            >
              <Wrench className="w-4 h-4" />
              <span>TROUBLESHOOT</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-[#0F0F0F] relative">
          {activeTab === 'calculator' && <CalculatorView />}
          {activeTab === 'library' && <LibraryView />}
          {activeTab === 'guides' && <GuidesView />}
          {/* Spacer to handle the safe area bottom spacing for mobile nav */}
          <div className="h-20 sm:h-0" />
        </main>
      </div>

      {/* Bottom Navigation for Mobile */}
      <nav className="sm:hidden fixed bottom-0 w-full bg-[#121212] border-t border-[#333] pb-safe z-50">
        <div className="flex justify-between">
          <button
            onClick={() => setActiveTab('calculator')}
            className={`flex-1 flex flex-col items-center gap-1.5 p-3 rounded-none transition-colors border-t-2 ${
              activeTab === 'calculator' ? 'border-[#CCFF00] text-[#CCFF00] bg-[#161616]' : 'border-transparent text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <Calculator className="w-5 h-5" />
            <span className="text-[9px] font-bold tracking-widest uppercase">Calc</span>
          </button>
          <button
            onClick={() => setActiveTab('library')}
            className={`flex-1 flex flex-col items-center gap-1.5 p-3 rounded-none transition-colors border-t-2 border-l border-r border-l-[#222] border-r-[#222] ${
              activeTab === 'library' ? 'border-t-[#CCFF00] text-[#CCFF00] bg-[#161616]' : 'border-t-transparent text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <LibraryIcon className="w-5 h-5" />
            <span className="text-[9px] font-bold tracking-widest uppercase">Lib</span>
          </button>
          <button
            onClick={() => setActiveTab('guides')}
            className={`flex-1 flex flex-col items-center gap-1.5 p-3 rounded-none transition-colors border-t-2 ${
              activeTab === 'guides' ? 'border-[#CCFF00] text-[#CCFF00] bg-[#161616]' : 'border-transparent text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <Wrench className="w-5 h-5" />
            <span className="text-[9px] font-bold tracking-widest uppercase">Guides</span>
          </button>
        </div>
      </nav>

      {/* Footer Status Bar (Desktop) */}
      <footer className="hidden sm:flex h-10 border-t border-[#333] bg-[#000] px-6 items-center justify-between text-[10px] font-mono shrink-0">
        <div className="opacity-50">GEO: EVENT-SITE-04 | RACK-ID: B-02</div>
        <div className="flex items-center space-x-2 opacity-80 transition-opacity hover:opacity-100">
          <span className="uppercase tracking-widest text-[#E0E0E0] font-sans text-xs">Hecho con</span>
          <Heart className="w-3.5 h-3.5 text-[#CCFF00] fill-[#CCFF00] animate-pulse" />
          <span className="uppercase tracking-widest text-[#E0E0E0] font-sans font-bold text-xs">por MateCode</span>
        </div>
      </footer>
    </div>
  );
}
