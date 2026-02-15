
import React, { useState, useEffect, useMemo } from 'react';
import { StorageService } from '../../services/storageService';
import { Account, DietEntry, DietEntryType } from '../../types';
import { PlusIcon, CalendarIcon, TrashIcon } from '../Icons';
import AddDietEntryModal from './AddDietEntryModal';
import ConfirmModal from '../vaccines/ConfirmModal';
import DietAnalytics from './DietAnalytics';

interface DietTrackerProps {
  account: Account;
}

const DietTracker: React.FC<DietTrackerProps> = ({ account }) => {
  const [entries, setEntries] = useState<DietEntry[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<DietEntryType>('food');
  const [prefilledName, setPrefilledName] = useState('');
  const [entryToDelete, setEntryToDelete] = useState<DietEntry | null>(null);

  useEffect(() => {
    const unsubscribe = StorageService.subscribeDietEntries(account.id, (loadedEntries) => {
      setEntries(loadedEntries);
    });
    return () => unsubscribe();
  }, [account.id]);

  const handleSaveEntry = async (entries: Partial<DietEntry>[]) => {
    try {
      await StorageService.addDietEntries(account.id, entries);
    } catch (e) {
      console.error("Failed to save diet entry", e);
    }
  };

  const handleDelete = async () => {
    if (!entryToDelete) return;
    try {
      await StorageService.deleteDietEntry(account.id, entryToDelete.id);
      setEntryToDelete(null);
    } catch (e) {
      console.error("Failed to delete diet entry", e);
    }
  };

  const openModal = (type: DietEntryType, name: string = '') => {
    setModalType(type);
    setPrefilledName(name);
    setIsModalOpen(true);
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const getIcon = (type: DietEntryType) => {
    switch (type) {
      case 'food': return '🍽️';
      case 'medicine': return '💊';
      case 'symptom': return '⚠️';
      default: return '📝';
    }
  };

  const getTypeColor = (type: DietEntryType) => {
    switch (type) {
      case 'food': return 'bg-blue-50 text-blue-600';
      case 'medicine': return 'bg-indigo-50 text-indigo-600';
      case 'symptom': return 'bg-amber-50 text-amber-600';
      default: return 'bg-slate-50 text-slate-600';
    }
  };

  const groupedEntries = useMemo(() => {
    const groups: { [key: string]: DietEntry[] } = {};
    entries.forEach(entry => {
      const date = formatDate(entry.timestamp);
      if (!groups[date]) groups[date] = [];
      groups[date].push(entry);
    });
    return groups;
  }, [entries]);

  return (
    <div className="animate-fade-in pb-10">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Diet Tracker</h1>
          <p className="text-slate-500">Log meals, meds, and track symptoms</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => openModal('food')}
            className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-2xl shadow-lg shadow-blue-100 transition active:scale-95"
            title="Add Log Entry"
          >
            <PlusIcon className="w-6 h-6" />
          </button>
        </div>
      </div>

      <DietAnalytics entries={entries} />

      <div className="flex gap-3 mb-10 hidden sm:flex">
        <button
          onClick={() => openModal('food')}
          className="flex-1 bg-white border-2 border-slate-200 hover:border-blue-600 hover:text-blue-600 text-slate-700 py-4 rounded-xl font-bold transition transform active:scale-95 shadow-sm flex items-center justify-center gap-2"
        >
          <span className="text-xl">🍽️</span> Log Food
        </button>
        <button
          onClick={() => openModal('medicine')}
          className="flex-1 bg-white border-2 border-slate-200 hover:border-indigo-600 hover:text-indigo-600 text-slate-700 py-4 rounded-xl font-bold transition transform active:scale-95 shadow-sm flex items-center justify-center gap-2"
        >
          <span className="text-xl">💊</span> Log Medicine
        </button>
        <button
          onClick={() => openModal('symptom')}
          className="flex-1 bg-white border-2 border-slate-200 hover:border-amber-600 text-slate-700 hover:text-amber-600 py-4 rounded-xl font-bold transition flex items-center justify-center gap-2 transform active:scale-95 shadow-sm"
        >
          <span className="text-xl">⚠️</span> Log Symptom
        </button>
      </div>

      <div className="space-y-8">
        {Object.entries(groupedEntries).length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200">
            <CalendarIcon className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <h3 className="text-slate-900 font-bold text-xl">No logs yet</h3>
            <p className="text-slate-400 text-sm mt-1">Your timeline of events will appear here.</p>
          </div>
        ) : (
          (Object.entries(groupedEntries) as [string, DietEntry[]][]).map(([date, items]) => (
            <div key={date}>
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-[0.1em] mb-4 px-1">{date}</h2>
              <div className="space-y-4">
                {items.map(entry => (
                  <div key={entry.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-5 group hover:border-blue-100 transition-colors">
                    <div className={`mt-0.5 w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center text-xl shadow-inner ${getTypeColor(entry.type)}`}>
                      {getIcon(entry.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2 flex-wrap">
                            {entry.name}
                            {entry.intensity !== undefined && (
                              <span className="text-[10px] bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full uppercase font-black tracking-wider">Level {entry.intensity}</span>
                            )}
                          </h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{formatTime(entry.timestamp)}</p>
                            {entry.afterFoodDelay && (
                              <span className="text-[10px] font-bold text-slate-300 uppercase italic">
                                • {entry.afterFoodDelay} after food
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => setEntryToDelete(entry)}
                          className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-2 bg-slate-50 rounded-lg"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                      {entry.notes && (
                        <p className="text-sm text-slate-600 mt-3 leading-relaxed border-l-2 border-slate-100 pl-3 italic">
                          "{entry.notes}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <AddDietEntryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveEntry}
        initialType={modalType}
        prefilledName={prefilledName}
        history={entries}
      />

      <ConfirmModal
        isOpen={!!entryToDelete}
        onClose={() => setEntryToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Log Entry?"
        message={`Are you sure you want to remove "${entryToDelete?.name}"? This action cannot be undone.`}
      />
    </div>
  );
};

export default DietTracker;
