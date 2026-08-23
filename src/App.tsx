import { useState } from 'react';
import { Calculator, Library as LibraryIcon, Wrench, Heart } from 'lucide-react';
import type { TabState } from './types';
import { useOnlineStatus } from './shared/useOnlineStatus';
import ServiceWorkerNotice from './shared/ui/ServiceWorkerNotice';
import CalculatorScreen from './features/calculator/CalculatorScreen';
import LibraryScreen from './features/library/LibraryScreen';
import TroubleshootingScreen from './features/troubleshooting/TroubleshootingScreen';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabState>('calculator');
  const online = useOnlineStatus();

  return (
    <div className="min-h-screen h-screen bg-[#0F0F0F] text-[#E0E0E0] font-sans flex flex-col w-full overflow-hidden">
      {/* Top Navigation Bar */}
      <nav className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-[#333] bg-[#161616] shrink-0">
        <div className="flex items-center space-x-3 sm:space-x-4">
          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-[#CCFF00] flex items-center justify-center rounded-sm shrink-0">
            <div className="w-3 h-3 sm:w-5 sm:h-5 border-2 border-black"></div>
          </div>
          <h1 className="text-sm sm:text-lg font-bold tracking-tighter uppercase whitespace-nowrap">
            Calculator Led Pro{' '}
            <span className="text-[#CCFF00] opacity-80 text-xs">by MateCode</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${online ? 'bg-green-500' : 'bg-amber-400'}`}
            aria-hidden="true"
          />
          <span className="text-[11px] uppercase tracking-widest text-neutral-300">
            {online ? 'En línea' : 'Sin conexión'}
          </span>
        </div>
      </nav>

      <div className="flex-1 flex flex-col sm:flex-row overflow-hidden relative">
        {/* Sidebar Controls (Desktop) */}
        <aside className="hidden sm:flex w-56 border-r border-[#333] bg-[#121212] flex-col shrink-0 overflow-y-auto">
          <div className="p-4 space-y-4">
            <div className="text-[10px] uppercase tracking-widest text-[#CCFF00] font-bold">
              Módulos
            </div>
            <button
              onClick={() => setActiveTab('calculator')}
              className={`w-full flex items-center space-x-3 p-3 rounded-sm font-bold text-sm transition-colors border ${
                activeTab === 'calculator'
                  ? 'bg-[#CCFF00] text-black border-transparent'
                  : 'bg-transparent border-transparent hover:border-[#444] text-[#E0E0E0]'
              }`}
            >
              <Calculator className="w-4 h-4" />
              <span>CALCULADORA</span>
            </button>
            <button
              onClick={() => setActiveTab('library')}
              className={`w-full flex items-center space-x-3 p-3 rounded-sm font-bold text-sm transition-colors border ${
                activeTab === 'library'
                  ? 'bg-[#CCFF00] text-black border-transparent'
                  : 'bg-transparent border-transparent hover:border-[#444] text-[#E0E0E0]'
              }`}
            >
              <LibraryIcon className="w-4 h-4" />
              <span>GABINETES</span>
            </button>
            <button
              onClick={() => setActiveTab('guides')}
              className={`w-full flex items-center space-x-3 p-3 rounded-sm font-bold text-sm transition-colors border ${
                activeTab === 'guides'
                  ? 'bg-[#CCFF00] text-black border-transparent'
                  : 'bg-transparent border-transparent hover:border-[#444] text-[#E0E0E0]'
              }`}
            >
              <Wrench className="w-4 h-4" />
              <span>FALLAS</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-[#0F0F0F] relative">
          {activeTab === 'calculator' && <CalculatorScreen />}
          {activeTab === 'library' && <LibraryScreen />}
          {activeTab === 'guides' && <TroubleshootingScreen />}
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
              activeTab === 'calculator'
                ? 'border-[#CCFF00] text-[#CCFF00] bg-[#161616]'
                : 'border-transparent text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <Calculator className="w-5 h-5" />
            <span className="text-[9px] font-bold tracking-widest uppercase">Calc</span>
          </button>
          <button
            onClick={() => setActiveTab('library')}
            className={`flex-1 flex flex-col items-center gap-1.5 p-3 rounded-none transition-colors border-t-2 border-l border-r border-l-[#222] border-r-[#222] ${
              activeTab === 'library'
                ? 'border-t-[#CCFF00] text-[#CCFF00] bg-[#161616]'
                : 'border-t-transparent text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <LibraryIcon className="w-5 h-5" />
            <span className="text-[9px] font-bold tracking-widest uppercase">Gabinetes</span>
          </button>
          <button
            onClick={() => setActiveTab('guides')}
            className={`flex-1 flex flex-col items-center gap-1.5 p-3 rounded-none transition-colors border-t-2 ${
              activeTab === 'guides'
                ? 'border-[#CCFF00] text-[#CCFF00] bg-[#161616]'
                : 'border-transparent text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <Wrench className="w-5 h-5" />
            <span className="text-[9px] font-bold tracking-widest uppercase">Fallas</span>
          </button>
        </div>
      </nav>

      <ServiceWorkerNotice />

      {/* Footer Status Bar (Desktop) */}
      <footer className="hidden sm:flex h-10 border-t border-[#333] bg-[#000] px-6 items-center justify-between text-[10px] font-mono shrink-0">
        <div className="text-neutral-500">Calculator Led Pro</div>
        <div className="flex items-center space-x-2 text-neutral-300 transition-opacity hover:opacity-100">
          <span className="uppercase tracking-widest text-[#E0E0E0] font-sans text-xs">
            Hecho con
          </span>
          <Heart className="w-3.5 h-3.5 text-[#CCFF00] fill-[#CCFF00]" aria-hidden="true" />
          <span className="uppercase tracking-widest text-[#E0E0E0] font-sans font-bold text-xs">
            por MateCode
          </span>
        </div>
      </footer>
    </div>
  );
}
