'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, Users, Box, TrendingUp, 
  AlertCircle, CheckCircle2, Clock, Map, 
  Building2, ChevronDown, Calendar, Search,
  ArrowUpRight, ArrowDownRight, MoreHorizontal
} from 'lucide-react';

export default function AdminDashboard() {
  const [selectedTenant, setSelectedTenant] = useState('Todas as Unidades');
  const [isMatriz] = useState(true);

  const tenants = [
    'Todas as Unidades',
    'Fazenda Bom Jesus',
    'Fazenda Santa Júlia',
    'Fazenda Macacos',
    'Fazenda Flamengo'
  ];

  const stats = [
    { label: 'Produção Total', value: '12,450', change: '+12%', trend: 'up', icon: Box, color: '#10b981' },
    { label: 'Eficiência Média', value: '94.2%', change: '+2.4%', trend: 'up', icon: TrendingUp, color: '#3b82f6' },
    { label: 'Equipe Ativa', value: '48', change: '-3', trend: 'down', icon: Users, color: '#fbbf24' },
    { label: 'Qualidade Auditada', value: '99.8%', change: '+0.1%', trend: 'up', icon: CheckCircle2, color: '#8b5cf6' },
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-slate-50 font-['Outfit'] selection:bg-emerald-500/30">
      
      {/* Sidebar Simulação (Apenas Decorativa para Estética) */}
      <div className="fixed left-0 top-0 bottom-0 w-20 hidden lg:flex flex-col items-center py-10 bg-slate-900/40 border-r border-white/5 z-50">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center mb-10 shadow-lg shadow-emerald-500/20">
          <Box className="text-white" size={24} />
        </div>
        <div className="flex flex-col gap-8">
          <BarChart3 className="text-emerald-400 cursor-pointer" size={22} />
          <Users className="text-slate-500 hover:text-emerald-400 transition-colors cursor-pointer" size={22} />
          <Map className="text-slate-500 hover:text-emerald-400 transition-colors cursor-pointer" size={22} />
          <AlertCircle className="text-slate-500 hover:text-emerald-400 transition-colors cursor-pointer" size={22} />
        </div>
      </div>

      <main className="lg:ml-20 p-6 md:p-12 max-w-[1600px] mx-auto">
        
        {/* Header Profissional */}
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-12 gap-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/20">
                SaaS Enterprise
              </span>
              <span className="text-slate-500 text-xs font-medium">Atualizado agora</span>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white mb-1">
              Dashboard <span className="agro-gradient-text">Executivo</span>
            </h1>
            <div className="flex items-center gap-2 text-slate-400">
              <Building2 size={16} className="text-emerald-400" />
              <p className="text-sm font-medium tracking-wide">{selectedTenant}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {isMatriz && (
              <div className="relative group">
                <select 
                  value={selectedTenant}
                  onChange={(e) => setSelectedTenant(e.target.value)}
                  className="appearance-none bg-slate-900/60 border border-white/10 rounded-2xl px-6 py-3.5 pr-12 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 transition-all cursor-pointer backdrop-blur-md"
                >
                  {tenants.map(t => <option key={t} value={t} className="bg-slate-900">{t}</option>)}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 group-hover:text-emerald-400 transition-colors pointer-events-none" size={18} />
              </div>
            )}
            <button className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-8 py-3.5 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-emerald-500/20 active:scale-95">
              Exportar Relatório
            </button>
          </div>
        </header>

        {/* Stats Cards - Padrão Multinacional */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
          {stats.map((stat, i) => (
            <motion.div 
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-panel p-8 group hover:border-emerald-500/30 transition-all duration-500"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-2xl bg-slate-800/50 flex items-center justify-center group-hover:bg-emerald-500/10 transition-colors border border-white/5">
                  <stat.icon style={{ color: stat.color }} size={24} />
                </div>
                <div className={`flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg ${stat.trend === 'up' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                  {stat.trend === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {stat.change}
                </div>
              </div>
              <div>
                <h3 className="text-3xl font-black text-white mb-1 tracking-tight">{stat.value}</h3>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest">{stat.label}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Seção de Gráficos e Atividade */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          <div className="xl:col-span-2 glass-panel p-10">
            <div className="flex justify-between items-center mb-10">
              <div className="flex items-center gap-4">
                <div className="w-1.5 h-8 bg-emerald-500 rounded-full" />
                <h2 className="text-2xl font-bold tracking-tight">Performance <span className="text-slate-500 font-medium">Sazonal</span></h2>
              </div>
              <div className="flex gap-2">
                {['Mês', 'Semana', 'Dia'].map(t => (
                  <button key={t} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${t === 'Dia' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative h-[400px] w-full rounded-3xl bg-slate-900/20 border border-white/5 flex flex-col items-center justify-center overflow-hidden">
               {/* Simulação de Gráfico */}
               <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(16,185,129,0.1),transparent)]" />
               <BarChart3 className="text-slate-700 mb-4 animate-pulse-slow" size={64} />
               <p className="text-slate-500 font-medium text-sm tracking-wide">Processando fluxo de dados em tempo real...</p>
            </div>
          </div>

          <div className="glass-panel p-10 flex flex-col">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-bold tracking-tight">Atividade Recente</h2>
              <MoreHorizontal className="text-slate-500 cursor-pointer" size={20} />
            </div>
            <div className="space-y-8 flex-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="relative flex gap-5 items-start">
                  {n < 5 && <div className="absolute left-[19px] top-10 bottom-[-20px] w-[2px] bg-slate-800" />}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 border-4 border-[#020617] ${n % 2 === 0 ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                    {n % 2 === 0 ? <Users size={18} /> : <CheckCircle2 size={18} />}
                  </div>
                  <div className="pt-1">
                    <p className="text-sm font-bold text-slate-200">
                      {n % 2 === 0 ? 'Equipe Alpha iniciou turno' : 'Auditória de Qualidade OK'}
                    </p>
                    <p className="text-xs font-medium text-slate-500 mt-1">
                      Fazenda Bom Jesus • {n * 12}m atrás
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <button className="mt-10 w-full py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-bold transition-all border border-white/5">
              Ver Histórico Completo
            </button>
          </div>

        </div>

      </main>
    </div>
  );
}
