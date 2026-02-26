
import React, { useState } from 'react';
import { Driver } from '../types';
import { ArrowLeft, Lock, ChevronRight } from 'lucide-react';

interface DriverSelectionProps {
    drivers: Driver[];
    onSelect: (id: string) => void;
    onBack: () => void;
}

export default function DriverSelection({ drivers, onSelect, onBack }: DriverSelectionProps) {
    const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSelect = (driver: Driver) => {
        if (driver.password) {
            setSelectedDriver(driver);
            setPassword('');
            setError('');
        } else {
            onSelect(driver.id);
        }
    };

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedDriver && selectedDriver.password === password) {
            onSelect(selectedDriver.id);
        } else {
            setError('Senha incorreta');
        }
    };

    if (selectedDriver) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
                <div className="bg-slate-900 w-full max-w-sm p-6 rounded-3xl border border-slate-800 shadow-2xl animate-in zoom-in">
                    <button onClick={() => setSelectedDriver(null)} className="text-slate-400 hover:text-white mb-6 flex items-center gap-2 text-sm font-bold transition-colors">
                        <ArrowLeft size={16}/> Voltar
                    </button>
                    
                    <div className="text-center mb-6">
                        <div className="w-20 h-20 rounded-full mx-auto mb-3 border-4 border-slate-800 shadow-lg overflow-hidden">
                            <img src={selectedDriver.avatar} className="w-full h-full object-cover" alt={selectedDriver.name} />
                        </div>
                        <h2 className="text-xl font-bold text-white">Olá, {selectedDriver.name}</h2>
                        <p className="text-slate-500 text-sm">Digite sua senha para entrar</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18}/>
                            <input 
                                type="password" 
                                autoFocus
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-4 pl-12 pr-4 text-white text-center text-lg tracking-widest outline-none focus:border-amber-500 transition-colors"
                                placeholder="****"
                                value={password}
                                onChange={e => { setPassword(e.target.value); setError(''); }}
                            />
                        </div>
                        {error && <p className="text-red-500 text-xs text-center font-bold animate-pulse">{error}</p>}
                        
                        <button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-4 rounded-xl shadow-lg active:scale-95 transition-all">
                            Acessar Painel
                        </button>
                    </form>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col p-4 animate-in fade-in">
            <div className="max-w-md w-full mx-auto flex-1 flex flex-col">
                <div className="mb-6 mt-4">
                    <button onClick={onBack} className="text-slate-400 hover:text-white flex items-center gap-2 text-sm font-bold mb-4 transition-colors">
                        <ArrowLeft size={16}/> Voltar ao Início
                    </button>
                    <h1 className="text-2xl font-black text-white">Quem é você?</h1>
                    <p className="text-slate-500">Selecione seu perfil para continuar.</p>
                </div>

                <div className="space-y-3 overflow-y-auto pb-4 custom-scrollbar flex-1">
                    {drivers.map(driver => (
                        <button 
                            key={driver.id} 
                            onClick={() => handleSelect(driver)}
                            className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-800 p-4 rounded-2xl flex items-center gap-4 transition-all group text-left shadow-sm hover:shadow-md active:scale-[0.98]"
                        >
                            <img src={driver.avatar} className="w-12 h-12 rounded-full object-cover bg-slate-800 border border-slate-700" alt={driver.name}/>
                            <div className="flex-1">
                                <h3 className="font-bold text-white text-base group-hover:text-amber-500 transition-colors">{driver.name}</h3>
                                <p className="text-xs text-slate-500">{driver.vehicle || 'Entregador'}</p>
                            </div>
                            <div className="text-slate-600 group-hover:text-white transition-colors">
                                <ChevronRight size={20}/>
                            </div>
                        </button>
                    ))}
                    {drivers.length === 0 && (
                        <div className="text-center py-10 text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                            <p>Nenhum motorista cadastrado.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
