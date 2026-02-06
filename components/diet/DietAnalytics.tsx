
import React, { useMemo, useState } from 'react';
import { DietEntry } from '../../types';
import { ChevronUpIcon, ChevronDownIcon } from '../Icons';

interface DietAnalyticsProps {
  entries: DietEntry[];
}

const DietAnalytics: React.FC<DietAnalyticsProps> = ({ entries }) => {
  const [hoveredEntry, setHoveredEntry] = useState<DietEntry | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [range, setRange] = useState<number>(7);

  const ranges = [5, 7, 14, 30];

  // Process data for the dynamic range
  const dailyData = useMemo(() => {
    const days: { [key: string]: DietEntry[] } = {};
    const now = new Date();
    
    for (let i = 0; i < range; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateKey = d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
      days[dateKey] = [];
    }

    entries.forEach(entry => {
      const dateKey = new Date(entry.timestamp).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
      if (days[dateKey]) {
        days[dateKey].push(entry);
      }
    });

    return Object.entries(days).sort((a, b) => {
        const timeA = a[1][0]?.timestamp || (new Date(a[0] + ", " + new Date().getFullYear()).getTime());
        const timeB = b[1][0]?.timestamp || (new Date(b[0] + ", " + new Date().getFullYear()).getTime());
        return timeB - timeA;
    });
  }, [entries, range]);

  const getEntryIcon = (type: string) => {
    if (type === 'food') return '🍽️';
    if (type === 'medicine') return '💊';
    return '⚠️';
  };

  if (entries.length === 0) return null;

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden mb-8 animate-fade-in transition-all duration-300">
      <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
            Correlation Map
          </h2>
          {!isMinimized && (
            <div className="hidden sm:flex bg-slate-200/50 p-1 rounded-lg gap-1">
              {ranges.map(r => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`text-[10px] px-2 py-0.5 rounded font-black uppercase transition-all ${range === r ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {r}D
                </button>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-4">
           {!isMinimized && (
            <div className="hidden md:flex gap-4 text-[10px] font-bold uppercase tracking-tighter text-slate-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400"></span> Food</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-400"></span> Medicine</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400"></span> Symptom</span>
            </div>
           )}
           <button 
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 transition-colors"
           >
             {isMinimized ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronUpIcon className="w-4 h-4" />}
           </button>
        </div>
      </div>

      <div className={`overflow-hidden transition-all duration-500 ${isMinimized ? 'max-h-0 opacity-0' : 'max-h-[800px] opacity-100'}`}>
        <div className="p-6">
          <div className="relative space-y-4">
            {/* X-Axis labels */}
            <div className="flex justify-between text-[10px] font-bold text-slate-300 border-b border-slate-50 pb-2 mb-2 px-1">
              <span>00:00</span>
              <span>06:00</span>
              <span>12:00</span>
              <span>18:00</span>
              <span>23:59</span>
            </div>

            <div className={`space-y-4 ${range > 14 ? 'max-h-[400px] overflow-y-auto pr-2 custom-scrollbar' : ''}`}>
              {dailyData.map(([date, items]) => (
                <div key={date} className="relative group">
                  <div className="flex items-center gap-4">
                    <div className="w-16 shrink-0 text-[10px] font-black text-slate-400 uppercase leading-tight">
                      {date.split(',')[0]}<br/>
                      <span className="font-medium text-slate-300">{date.split(',')[1]}</span>
                    </div>
                    
                    <div className="flex-1 h-10 bg-slate-50/50 rounded-xl relative overflow-hidden border border-slate-100 shadow-inner">
                      {/* Hour markers grid */}
                      <div className="absolute inset-0 flex justify-between px-0 pointer-events-none opacity-10">
                        {[...Array(24)].map((_, i) => (
                          <div key={i} className="h-full w-[1px] bg-slate-300"></div>
                        ))}
                      </div>

                      {/* Lane Dividers */}
                      <div className="absolute top-1/3 left-0 w-full h-[1px] bg-slate-200/30"></div>
                      <div className="absolute top-2/3 left-0 w-full h-[1px] bg-slate-200/30"></div>

                      {/* Data Points */}
                      {items.map(entry => {
                        const dateObj = new Date(entry.timestamp);
                        const hours = dateObj.getHours() + (dateObj.getMinutes() / 60);
                        const position = (hours / 24) * 100;
                        
                        let topPos = 'top-1';
                        let bgColor = 'bg-blue-500';
                        if (entry.type === 'medicine') {
                            topPos = 'top-[0.8rem]';
                            bgColor = 'bg-indigo-500';
                        } else if (entry.type === 'symptom') {
                            topPos = 'bottom-1';
                            bgColor = 'bg-gradient-to-br from-amber-400 to-red-500';
                        }
                        
                        return (
                          <button
                            key={entry.id}
                            onMouseEnter={() => setHoveredEntry(entry)}
                            onMouseLeave={() => setHoveredEntry(null)}
                            className={`absolute w-4 h-4 -ml-2 rounded-lg transition-all transform hover:scale-150 z-10 cursor-help flex items-center justify-center shadow-sm text-[10px] text-white ${bgColor} ${topPos}`}
                            style={{ left: `${position}%` }}
                          >
                            {getEntryIcon(entry.type)}
                            
                            {entry.type === 'symptom' && (
                                <div 
                                  className="absolute inset-0 rounded-lg ring-2 ring-white/30 animate-pulse" 
                                  style={{ opacity: (entry.intensity || 1) / 5 }}
                                />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Hover Information / Detail View */}
          <div className="mt-8 h-16 border-t border-slate-100 pt-4 flex items-center">
            {hoveredEntry ? (
              <div className="flex items-center gap-4 animate-fade-in w-full">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-sm ${
                    hoveredEntry.type === 'food' ? 'bg-blue-100 text-blue-600' : 
                    hoveredEntry.type === 'medicine' ? 'bg-indigo-100 text-indigo-600' : 
                    'bg-amber-100 text-amber-600'
                }`}>
                  {getEntryIcon(hoveredEntry.type)}
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm leading-none flex items-center gap-2">
                    {hoveredEntry.name}
                    {hoveredEntry.type === 'symptom' && (
                      <span className="text-[9px] bg-amber-500 text-white px-1.5 py-0.5 rounded-full">Level {hoveredEntry.intensity}</span>
                    )}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 font-medium">
                    {hoveredEntry.type.charAt(0).toUpperCase() + hoveredEntry.type.slice(1)} logged at {new Date(hoveredEntry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {hoveredEntry.notes && (
                  <div className="ml-auto text-[11px] text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg max-w-[200px] truncate border border-slate-100 italic">
                    "{hoveredEntry.notes}"
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center w-full text-xs text-slate-300 font-medium italic">
                Hover over a marker to see details and discover patterns across food, meds, and symptoms.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DietAnalytics;
