import { useState } from 'react';
import { guides } from '../../domain/catalog';
import { ChevronDown } from 'lucide-react';

export default function TroubleshootingScreen() {
  const [openId, setOpenId] = useState<string | null>(guides[0].id);

  return (
    <div className="p-6 animate-in fade-in duration-300">
      <h2 className="text-xs font-bold tracking-widest uppercase mb-6 text-blue-400">
        Guía rápida de campo y fallas
      </h2>

      <div className="p-3 bg-[#111] border-l-2 border-[#FF4444] mb-6 flex items-start space-x-3">
        <span className="text-[#FF4444] font-bold mt-0.5">!</span>
        <div className="text-[11px]">
          <div className="font-bold uppercase text-[#FF4444]">Advertencia de campo</div>
          <div className="opacity-80 text-[#E0E0E0] mt-1 pr-2">
            Si el problema no se resuelve cortando y reponiendo la alimentación del panel o
            reenviando el archivo de calibración RCFG, verificar siempre los puertos de salida del
            procesador y las conexiones CAT físicas antes de abrir el gabinete.
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {guides.map((guide) => {
          const isOpen = openId === guide.id;
          return (
            <div
              key={guide.id}
              className={`bg-[#161616] border transition-colors ${isOpen ? 'border-[#444]' : 'border-[#333]'}`}
            >
              <button
                onClick={() => setOpenId(isOpen ? null : guide.id)}
                className="w-full text-left p-4 flex items-center justify-between focus:outline-none hover:bg-[#1A1A1A]"
              >
                <div className="flex items-center gap-3 pr-4">
                  <span className="text-blue-500 font-bold shrink-0">?</span>
                  <h3
                    className={`text-xs font-bold uppercase transition-colors ${isOpen ? 'text-white' : 'text-[#E0E0E0]'}`}
                  >
                    {guide.issue}
                  </h3>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-neutral-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {isOpen && (
                <div className="px-4 pb-4 pt-1 animate-in slide-in-from-top-1 duration-200">
                  <div className="pl-6 space-y-4 border-l border-[#333] ml-1.5 pt-2">
                    <div>
                      <h4 className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5">
                        Causa probable
                      </h4>
                      <p className="text-[11px] text-[#E0E0E0] font-mono leading-relaxed">
                        {guide.cause}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5">
                        Plan de acción
                      </h4>
                      <p className="text-[11px] text-[#CCFF00] font-mono leading-relaxed whitespace-pre-line">
                        {guide.solution}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
