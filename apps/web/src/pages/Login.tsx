import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, Building, ChevronDown, CheckCircle2, ShieldCheck, Zap, Globe } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tenants, setTenants] = useState<{id: string, name: string}[]>([]);
  const [selectedTenant, setSelectedTenant] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    fetch('/api/auth/tenants')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setTenants(data);
      })
      .catch(err => console.error('Error fetching tenants', err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, selectedTenantId: selectedTenant })
      });

      const data = await res.json();

      if (res.ok) {
        login(data.token, data.user);
        navigate('/');
      } else {
        setError(data.error || 'Credenciales incorrectas o empresa no válida');
      }
    } catch (err) {
      setError('No se pudo establecer conexión con el servidor');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white overflow-hidden font-sans">
      
      {/* SECTION IZQUIERDA: Brand & Visual (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-2/5 relative overflow-hidden bg-slate-900">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/assets/login_bg.png" 
            alt="Business Background" 
            className="w-full h-full object-cover opacity-60 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-950 via-blue-900/60 to-transparent" />
        </div>

        {/* Content Overlay */}
        <div className="relative z-10 w-full flex flex-col p-12 justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-2xl">
              <span className="text-white text-xl font-black italic tracking-tighter">OF</span>
            </div>
            <span className="text-2xl font-black text-white tracking-tight">OpenFactu</span>
          </div>

          <div className="space-y-8 animate-in fade-in slide-in-from-left-8 duration-700">
             <div className="space-y-4">
                <h2 className="text-5xl font-black text-white leading-[1.1] tracking-tighter">
                   Gestión centralizada <br />
                   <span className="text-blue-400">para empresas</span> inteligentes.
                </h2>
                <p className="text-lg text-slate-300 max-w-sm leading-relaxed font-medium">
                   Optimiza tus compras, ventas y logística en una única plataforma Open Source de alto rendimiento.
                </p>
             </div>

             <div className="grid grid-cols-1 gap-6 pt-4">
                <div className="flex items-start gap-4 group">
                   <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 border border-blue-500/20 group-hover:bg-blue-500 group-hover:text-white transition-all">
                      <Zap size={20} />
                   </div>
                   <div>
                      <h4 className="text-white font-bold text-sm">Rendimiento Real</h4>
                      <p className="text-slate-400 text-xs mt-1">Lógica compartida y reactividad instantánea en todas tus operaciones.</p>
                   </div>
                </div>
                <div className="flex items-start gap-4 group">
                   <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                      <ShieldCheck size={20} />
                   </div>
                   <div>
                      <h4 className="text-white font-bold text-sm">Seguridad Multi-inquilino</h4>
                      <p className="text-slate-400 text-xs mt-1">Aislamiento total de datos en esquemas dedicados de base de datos.</p>
                   </div>
                </div>
             </div>
          </div>

          <div className="flex items-center justify-between text-slate-500 text-[10px] font-black uppercase tracking-widest pt-12 border-t border-white/10">
             <span>v0.1.0-alpha</span>
             <div className="flex gap-4">
                <span className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"><Globe size={10} /> ES</span>
                <span className="hover:text-white transition-colors cursor-pointer">Documentación</span>
             </div>
          </div>
        </div>
      </div>

      {/* SECTION DERECHA: Login Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50/30 relative">
        <div className="w-full max-w-md space-y-10 animate-in fade-in zoom-in-95 duration-500">
          
          <div className="lg:hidden flex flex-col items-center mb-8">
             <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/20 mb-4">
                <span className="text-white text-xl font-black">O</span>
             </div>
             <h1 className="text-2xl font-black text-slate-900 tracking-tight">OpenFactu</h1>
          </div>

          <div className="space-y-2">
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">Iniciar Sesión</h3>
            <p className="text-slate-500 font-medium">Introduce tus credenciales para acceder al ERP.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-sm font-bold flex items-center gap-3 animate-in shake duration-300">
                <ShieldCheck size={18} />
                {error}
              </div>
            )}

            <div className="space-y-5">
              {/* Selector de Empresa */}
              {tenants.length > 0 && (
                <div className="space-y-1.5 focus-within:translate-y-[-2px] transition-transform">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Empresa</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-4 flex items-center text-slate-400 group-focus-within:text-blue-600 transition-colors pointer-events-none">
                      <Building className="w-4 h-4" />
                    </div>
                    <select 
                      value={selectedTenant}
                      onChange={(e) => setSelectedTenant(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-10 text-slate-900 text-sm appearance-none focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all cursor-pointer font-semibold shadow-sm"
                    >
                      <option value="">Seleccionar Empresa...</option>
                      {tenants.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-4 flex items-center text-slate-400 pointer-events-none group-focus-within:rotate-180 transition-transform">
                      <ChevronDown size={18} />
                    </div>
                  </div>
                </div>
              )}

              {/* Input Email / Username */}
              <div className="space-y-1.5 focus-within:translate-y-[-2px] transition-transform">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Usuario / Email</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-4 flex items-center text-slate-400 group-focus-within:text-blue-600 transition-colors pointer-events-none">
                    <Mail size={18} />
                  </div>
                  <input 
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin o usuario@empresa.com"
                    className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-slate-900 text-sm placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-semibold shadow-sm"
                  />
                </div>
              </div>

              {/* Input Password */}
              <div className="space-y-1.5 focus-within:translate-y-[-2px] transition-transform">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Contraseña</label>
                  <button type="button" className="text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline transition">Olvido su contraseña?</button>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-4 flex items-center text-slate-400 group-focus-within:text-blue-600 transition-colors pointer-events-none">
                    <Lock size={18} />
                  </div>
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-12 text-slate-900 text-sm placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-semibold shadow-sm"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-4 flex items-center text-slate-400 hover:text-blue-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2">
               <button 
                 type="submit"
                 disabled={isSubmitting}
                 className="w-full bg-slate-950 hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-4.5 rounded-2xl shadow-xl shadow-slate-900/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group tracking-tight"
               >
                 {isSubmitting ? (
                   <Loader2 className="animate-spin" size={20} />
                 ) : (
                   <>
                     Entrar al Sistema
                     <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                   </>
                 )}
               </button>
            </div>

            <div className="text-center pt-4">
               <p className="text-slate-400 text-xs font-bold">
                  Dudas con tu acceso? <button type="button" className="text-blue-600 hover:underline">Contactar soporte</button>
               </p>
            </div>
          </form>

          {/* Trusted Badges */}
          <div className="pt-12 flex items-center justify-center gap-8 opacity-40 grayscale hover:grayscale-0 transition-all">
             <div className="flex items-center gap-2 text-[10px] font-black text-slate-900 tracking-tighter">
                <CheckCircle2 size={16} />
                <span>SECURED DB</span>
             </div>
             <div className="flex items-center gap-2 text-[10px] font-black text-slate-900 tracking-tighter">
                <Zap size={16} />
                <span>TURBO CORE</span>
             </div>
          </div>
        </div>

        <p className="absolute bottom-8 text-slate-300 text-[10px] font-black uppercase tracking-[0.2em] pointer-events-none">
          Open Source ERP Platform &bull; 2026
        </p>
      </div>
    </div>
  );
};
