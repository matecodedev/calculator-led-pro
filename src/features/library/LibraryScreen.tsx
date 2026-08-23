import { useState } from 'react';
import { cabinets } from '../../domain/catalog';
import { Box, Search } from 'lucide-react';

export default function LibraryScreen() {
  const [search, setSearch] = useState('');

  const filtered = cabinets.filter(
    (c) =>
      c.brand.toLowerCase().includes(search.toLowerCase()) ||
      c.model.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="p-6 animate-in fade-in duration-300">
      <div className="mb-6 relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-neutral-500" />
        </div>
        <input
          type="text"
          placeholder="BUSCAR GABINETE..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[#1A1A1A] border border-[#444] rounded-sm pl-12 pr-4 py-3 text-white font-mono text-xs focus:border-[#CCFF00] focus:ring-1 focus:ring-[#CCFF00] outline-none block uppercase"
        />
      </div>

      <h2 className="text-xs font-bold tracking-widest uppercase mb-4 text-white">
        Biblioteca de gabinetes
      </h2>

      <div className="overflow-x-auto border border-[#333]">
        <table className="w-full text-left text-xs font-mono min-w-[600px]">
          <thead className="bg-[#222] text-[#CCFF00] uppercase text-[10px]">
            <tr>
              <th className="p-3 border-r border-[#333]">Modelo</th>
              <th className="p-3 border-r border-[#333]">Marca</th>
              <th className="p-3 border-r border-[#333]">Res (px)</th>
              <th className="p-3 border-r border-[#333]">Medidas (mm)</th>
              <th className="p-3 border-r border-[#333]">Pot. máx</th>
              <th className="p-3">Peso</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#222] text-[#E0E0E0] bg-[#0A0A0A]">
            {filtered.map((cab, idx) => (
              <tr key={cab.id} className={idx % 2 === 0 ? 'bg-[#161616]' : 'bg-[#0A0A0A]'}>
                <td className="p-3 border-r border-[#333] font-bold text-white">
                  {cab.model}
                  <div className="bg-[#CCFF00] text-black text-[9px] font-bold px-1 py-0.5 inline-block ml-2 rounded-[2px] leading-none">
                    P{cab.pitch}
                  </div>
                </td>
                <td className="p-3 border-r border-[#333] opacity-80">{cab.brand}</td>
                <td className="p-3 border-r border-[#333]">
                  {cab.resX}x{cab.resY}
                </td>
                <td className="p-3 border-r border-[#333]">
                  {cab.width}x{cab.height}
                </td>
                <td className="p-3 border-r border-[#333]">{cab.maxPower}W</td>
                <td className="p-3">{cab.weight}kg</td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="p-12 text-center text-neutral-500 bg-[#0A0A0A]">
            <Box className="w-8 h-8 mx-auto mb-3 opacity-20" />
            <p className="text-xs uppercase tracking-widest">Ningún gabinete coincide.</p>
          </div>
        )}
      </div>
    </div>
  );
}
