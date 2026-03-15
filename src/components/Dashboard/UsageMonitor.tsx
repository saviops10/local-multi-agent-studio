import React from 'react';
import { Activity, Zap, Cpu, Database } from 'lucide-react';

export const UsageMonitor: React.FC = () => {
  // Mock data for now
  const metrics = [
    { label: 'GROQ API Usage', value: '1.2k', unit: 'tokens', icon: Zap, color: 'text-amber-500', progress: 45 },
    { label: 'Local Inference', value: '850', unit: 'ms', icon: Cpu, color: 'text-emerald-500', progress: 20 },
    { label: 'Storage Used', value: '124', unit: 'MB', icon: Database, color: 'text-blue-500', progress: 12 },
    { label: 'Active Tasks', value: '4', unit: 'running', icon: Activity, color: 'text-purple-500', progress: 60 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">AI Consumption Monitor</h2>
        <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Real-time Metrics</span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m, i) => (
          <div key={i} className="bg-zinc-900/40 border border-zinc-800 p-5 rounded-2xl hover:border-zinc-700 transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 rounded-lg bg-zinc-900 border border-zinc-800 ${m.color}`}>
                <m.icon className="w-4 h-4" />
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-white">{m.value}</span>
                <span className="text-[10px] text-zinc-600 ml-1 uppercase">{m.unit}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-widest">
                <span className="text-zinc-500">{m.label}</span>
                <span className="text-zinc-400">{m.progress}%</span>
              </div>
              <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${m.color.replace('text-', 'bg-')}`}
                  style={{ width: `${m.progress}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
