'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Scan, Users, Trophy, Settings, 
  Package, Scale, MapPin, LogOut, 
  CheckCircle2, TrendingUp, Zap, ShieldCheck
} from 'lucide-react';

export default function TabletPage() {
  const [lastScan, setLastScan] = useState(null);
  const [productivity, setProductivity] = useState(92);
  const [isOnline] = useState(true);

  // Simulação de scan para demonstrar o visual
  useEffect(() => {
    const timer = setTimeout(() => {
      // setLastScan({ barcode: '7891234567890', time: '14:20:05', name: 'MANOEL GONÇALO' });
      // setTimeout(() => setLastScan(null), 3000);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-50 font-['Outfit'] flex flex-col p-4 md:p-6 gap-6">
      
      {/* Header Estação de Trabalho */}
      <nav className="glass-panel p-5 flex justify-between items-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
            <Zap className="text-emerald-400" size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h2 className="font-extrabold text-xl tracking-tight">ESTAÇÃO <span className="text-emerald-400">ST-01</span></h2>
              <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase border border-blue-500/20">Ativa</span>
            </div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Packing House • Linha 04</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
           <div className="hidden md:flex flex-col items-end">
             <div className="flex items-center gap-2">
               <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
               <span className="text-xs font-bold text-slate-400 uppercase tracking-tight">{isOnline ? 'Sincronizado' : 'Modo Offline'}</span>
             </div>
             <p className="text-[10px] font-bold text-slate-600 mt-1 uppercase">V3.0.4 CLOUD-SYNC</p>
           </div>
           <div className="h-10 w-[1px] bg-white/5 mx-2" />
           <button className="p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-all border border-white/5">
             <Settings size={22} className="text-slate-400" />
           </button>
        </div>
      </nav>

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
        
        {/* Lado Esquerdo: Área de Ação (Scanner) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          <div className="glass-panel flex-1 flex flex-col items-center justify-center p-12 relative overflow-hidden group">
            {/* Efeitos de Fundo High-Tech */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.08),transparent_70%)]" />
            <div className="absolute top-0 right-0 p-8">
               <ShieldCheck className="text-emerald-500/20" size={120} />
            </div>

            <motion.div 
              animate={{ 
                scale: [1, 1.05, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
              className="relative w-56 h-56 rounded-3xl border-2 border-dashed border-emerald-500/20 flex items-center justify-center mb-10 group-hover:border-emerald-500/40 transition-colors"
            >
              <div className="absolute inset-4 rounded-2xl bg-emerald-500/5 blur-xl" />
              <Scan className="text-emerald-400 relative z-10" size={80} />
              
              {/* Cantos Decorativos */}
              <div className="absolute -top-2 -left-2 w-6 h-6 border-t-4 border-l-4 border-emerald-500 rounded-tl-lg" />
              <div className="absolute -top-2 -right-2 w-6 h-6 border-t-4 border-r-4 border-emerald-500 rounded-tr-lg" />
              <div className="absolute -bottom-2 -left-2 w-6 h-6 border-b-4 border-l-4 border-emerald-500 rounded-bl-lg" />
              <div className="absolute -bottom-2 -right-2 w-6 h-6 border-b-4 border-r-4 border-emerald-500 rounded-br-lg" />
            </motion.div>
            
            <h3 className="text-3xl font-black mb-3 tracking-tight">AGUARDANDO LEITURA</h3>
            <p className="text-slate-500 text-center font-medium max-w-sm leading-relaxed">
              Posicione o código de barras no scanner. O registro será processado e sincronizado automaticamente.
            </p>

            {/* Overlay de Sucesso (Animado) */}
            <AnimatePresence>
              {lastScan && (
                <motion.div 
                  initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
                  animate={{ opacity: 1, backdropFilter: "blur(20px)" }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-emerald-500/90 flex flex-col items-center justify-center z-50 p-10"
                >
                  <motion.div
                    initial={{ scale: 0.5, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    className="flex flex-col items-center"
                  >
                    <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-8 shadow-2xl shadow-emerald-900/50">
                      <CheckCircle2 size={70} className="text-emerald-600" />
                    </div>
                    <h2 className="text-6xl font-black text-white tracking-tighter mb-2">REGISTRADO</h2>
                    <p className="text-emerald-100 text-2xl font-bold uppercase tracking-widest">{lastScan.name}</p>
                    <div className="mt-8 px-6 py-2 bg-emerald-900/30 rounded-xl border border-white/20">
                      <p className="text-white font-mono text-xl">{lastScan.barcode}</p>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Grid Inferior Contextual */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-panel p-8 flex items-center gap-6 group hover:border-emerald-500/30 transition-all">
              <div className="w-14 h-14 bg-slate-800/50 rounded-2xl flex items-center justify-center border border-white/5 group-hover:bg-emerald-500/10">
                <MapPin className="text-emerald-400" size={24} />
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1 block">Parcela / Origem</span>
                <p className="font-extrabold text-2xl tracking-tight text-white">P-204 <span className="text-slate-500 font-medium">B. Jesus</span></p>
              </div>
            </div>
            <div className="glass-panel p-8 flex items-center gap-6 group hover:border-blue-500/30 transition-all">
              <div className="w-14 h-14 bg-slate-800/50 rounded-2xl flex items-center justify-center border border-white/5 group-hover:bg-blue-500/10">
                <Scale className="text-blue-400" size={24} />
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1 block">Configuração de Peso</span>
                <p className="font-extrabold text-2xl tracking-tight text-white">12.5 KG <span className="text-slate-500 font-medium">CX C10</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* Lado Direito: Rankings e Eficiência */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          <div className="glass-panel flex-1 p-8 flex flex-col">
            <div className="flex justify-between items-center mb-8">
              <h3 className="font-extrabold text-lg flex items-center gap-3">
                <Trophy className="text-amber-400" size={22} /> 
                RANKING <span className="text-slate-500">DA HORA</span>
              </h3>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {[1, 2, 3, 4, 5, 6].map((pos) => (
                <div key={pos} className="flex items-center justify-between p-4 bg-slate-900/40 rounded-2xl border border-white/5 hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${pos <= 3 ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-500'}`}>
                      {pos}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-slate-200">Colaborador {pos * 102}</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Packer • ST-01</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-xl text-white">{52 - pos} <span className="text-xs font-medium text-slate-500">cx</span></p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Efficiency Card High-Tech */}
          <div className="glass-panel p-8 bg-gradient-to-br from-emerald-500/20 to-blue-500/10 border-emerald-500/20">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-1 block">KPI Eficiência</span>
                <h2 className="text-6xl font-black text-white tracking-tighter">{productivity}%</h2>
              </div>
              <div className="p-3 bg-emerald-500/20 rounded-2xl">
                <TrendingUp size={24} className="text-emerald-400" />
              </div>
            </div>
            <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-white/5">
               <motion.div 
                 initial={{ width: 0 }}
                 animate={{ width: `${productivity}%` }}
                 transition={{ duration: 2, ease: "easeOut" }}
                 className="h-full bg-gradient-to-r from-emerald-500 to-blue-400 rounded-full"
               />
            </div>
            <p className="text-xs font-bold text-emerald-400 mt-4 flex items-center gap-1">
               <ArrowUpRight size={14} /> +4.2% em relação à última hora
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
