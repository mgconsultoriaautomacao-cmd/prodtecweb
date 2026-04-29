'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { ShieldCheck, ArrowRight, Box, Lock, Mail } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center relative overflow-hidden font-['Outfit']">
      
      {/* Background Decorativo High-Tech */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 blur-[120px] rounded-full animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[120px] rounded-full" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="glass-panel w-full max-w-[480px] p-12 relative z-10 mx-4 border-white/10"
      >
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-12">
          <div className="w-20 h-20 rounded-[28px] bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center mb-6 shadow-2xl shadow-emerald-500/20">
            <Box className="text-white" size={40} />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white mb-2">
            PROD<span className="agro-gradient-text uppercase">TECH</span>
          </h1>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
            <ShieldCheck size={12} className="text-emerald-400" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Enterprise Access</span>
          </div>
        </div>

        {/* Form Section */}
        <form className="space-y-6">
          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">E-mail Corporativo</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-400 transition-colors" size={18} />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome.sobrenome@agricolafamosa.com"
                className="w-full bg-slate-900/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 transition-all placeholder:text-slate-600"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Senha de Segurança</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-400 transition-colors" size={18} />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-900/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 transition-all placeholder:text-slate-600"
              />
            </div>
          </div>

          <button 
            type="button"
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-emerald-500/10 active:scale-95 group"
          >
            AUTENTICAR SISTEMA
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        {/* Footer Link */}
        <div className="mt-10 pt-8 border-t border-white/5 text-center">
          <p className="text-xs font-medium text-slate-500">
            Problemas no acesso? <span className="text-emerald-400 hover:underline cursor-pointer">Contatar TI Matriz</span>
          </p>
        </div>
      </motion.div>

      {/* Floating Info (Decorative) */}
      <div className="absolute bottom-8 left-8 hidden md:block">
        <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.4em]">Agricultural Management Suite v3.0</p>
      </div>
    </div>
  );
}
