
import React from 'react';
import { Utensils } from 'lucide-react';
import { AppConfig } from '../types';

export const BrandLogo = ({ size = 'normal', dark = false, config }: { size?: 'small'|'normal'|'large', dark?: boolean, config?: AppConfig }) => {
    const sizeClasses = { small: 'text-lg', normal: 'text-2xl', large: 'text-4xl' };
    const iconSize = size === 'large' ? 48 : size === 'normal' ? 32 : 20;
    
    const appName = config?.appName || "Jhans Burgers";
    const appLogo = config?.appLogoUrl;

    return (
        <div className={`flex items-center gap-3 font-extrabold tracking-tight ${sizeClasses[size]} ${dark ? 'text-slate-800' : 'text-white'}`}>
            {appLogo ? (
                <div className={`rounded-xl flex items-center justify-center shadow-md overflow-hidden bg-slate-800 ${size === 'small' ? 'w-8 h-8' : size === 'normal' ? 'w-12 h-12' : 'w-20 h-20'} shrink-0`}>
                    <img src={appLogo} alt="Logo" className="w-full h-full object-cover"/>
                </div>
            ) : (
                <div className={`bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md shadow-orange-500/20 shrink-0 ${size === 'small' ? 'p-1.5' : 'p-2.5'}`}>
                    <Utensils className="text-white" size={iconSize} />
                </div>
            )}
            
            {/* Oculta o texto no mobile se estiver dentro da sidebar compacta (controlado pelo pai ou classes globais se necessário, mas aqui deixamos flexível) */}
            <div className="flex flex-col leading-none items-start gap-1.5 md:flex hidden">
                <span>{appName}</span>
                {size !== 'small' && <span className={`text-[0.4em] uppercase tracking-widest text-left ${dark ? 'text-slate-500' : 'text-slate-400'}`}>Delivery System</span>}
            </div>
        </div>
    );
};

export function SidebarBtn({ icon, label, active, onClick, highlight }: any) {
  return (
    <button 
        onClick={onClick} 
        className={`w-full flex items-center justify-start gap-4 p-3.5 rounded-xl transition-all border-2 
        ${active 
            ? 'bg-slate-800 border-slate-700 text-white shadow-md' // Active: Dark Gray, firm border
            : highlight 
                ? 'bg-white/5 text-white border-white/10 hover:bg-white/10' // Highlight: Transparent bg, light border
                : 'border-transparent text-slate-400 hover:bg-slate-800 hover:text-white' // Default: Transparent border
        }`}
        title={label} 
    >
      <div className={`shrink-0 ${active ? 'text-emerald-500' : highlight ? 'text-amber-400' : 'text-current'}`}>{icon}</div>
      <span className="font-medium text-sm block">{label}</span>
    </button>
  );
}

export function StatBox({label, value, icon, color, subtext}: any) {
   return (
      <div className="bg-slate-900 p-4 md:p-5 rounded-2xl border border-slate-800 shadow-lg flex items-center justify-between gap-3 hover:border-amber-500/30 transition-all duration-300 w-full overflow-hidden">
         <div className="min-w-0 flex-1">
             <p className="text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-wide mb-1 truncate">{label}</p>
             <p className="text-xl md:text-2xl font-extrabold text-white truncate leading-none">{value}</p>
             {subtext && <p className="text-[9px] md:text-[10px] text-slate-500 mt-2 truncate">{subtext}</p>}
         </div>
         <div className={`p-3 rounded-xl shrink-0 flex items-center justify-center ${color || 'bg-slate-800 text-slate-400'}`}>
             {/* Clona o elemento icon para forçar tamanho consistente se necessário, ou assume que icon já tem tamanho */}
             {icon}
         </div>
      </div>
   )
}

export const PixIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 48 48" className={className}>
        <path fill="currentColor" d="M11.9,12h-0.68l8.04-8.04c2.62-2.61,6.86-2.61,9.48,0L36.78,12H36.1c-1.6,0-3.11,0.62-4.24,1.76	l-6.8,6.77c-0.59,0.59-1.53,0.59-2.12,0l-6.8-6.77C15.01,12.62,13.5,12,11.9,12z"></path>
        <path fill="currentColor" d="M36.1,36h0.68l-8.04,8.04c-2.62,2.61-6.86,2.61-9.48,0L11.22,36h0.68c1.6,0,3.11-0.62,4.24,1.76	l6.8-6.77c0.59-0.59,1.53-0.59,2.12,0l6.8,6.77C32.99,35.38,34.5,36,36.1,36z"></path>
        <path fill="currentColor" d="M44.04,28.74L38.78,34H36.1c-1.07,0-2.07-0.42-2.83-1.17l-6.8-6.78c-1.36-1.36-3.58-1.36-4.94,0	l-6.8,6.78C13.97,33.58,12.97,34,11.9,34H9.22l-5.26-5.26c-2.61-2.62-2.61-6.86,0-9.48L9.22,14h2.68c1.07,0,2.07,0.42,2.83,1.17	l6.8,6.78c0.68,0.68,1.58,1.02,2.47,1.02s1.79-0.34,2.47-1.02l6.8-6.78C34.03,14.42,35.03,14,36.1,14h2.68l5.26,5.26	C46.65,21.88,46.65,26.12,44.04,28.74z"></path>
    </svg>
);

// Adiciona CSS para o efeito de shine se não existir globalmente
const ShineStyles = () => (
    <style>{`
        @keyframes shine {
            0% { background-position: 200% center; }
            100% { background-position: -200% center; }
        }
        .animate-shine {
            background: linear-gradient(to right, #4b5563 20%, #f59e0b 40%, #f59e0b 60%, #4b5563 80%);
            background-size: 200% auto;
            background-clip: text;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            animation: shine 3s linear infinite;
        }
    `}</style>
);

export const Footer = () => (
    <>
    <ShineStyles />
    <div className="w-full py-8 mt-auto flex flex-col items-center justify-center border-t border-slate-800/50 bg-transparent shrink-0">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-1">
            Desenvolvido por <span className="font-black animate-shine cursor-default">Jhan Houzer</span>
        </p>
        <p className="text-[9px] text-slate-600 font-medium">
            © Todos os direitos reservados 2026
        </p>
    </div>
    </>
);
