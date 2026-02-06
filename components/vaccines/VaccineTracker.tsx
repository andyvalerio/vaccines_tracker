
import React, { useState, useEffect } from 'react';
import { StorageService } from '../../services/storageService';
import { ExportService } from '../../services/exportService';
import { GeminiService } from '../../services/geminiService';
import { Account, Vaccine, Suggestion } from '../../types';
import { PlusIcon, TrashIcon, CalendarIcon, DownloadIcon, PencilIcon, SparklesIcon, ChevronUpIcon, ChevronDownIcon, WarningIcon, CheckIcon, XMarkIcon, ShieldCheckIcon } from '../Icons';
import AddVaccineModal from './AddVaccineModal';
import ConfirmModal from './ConfirmModal';

interface VaccineTrackerProps {
  account: Account;
}

const VaccineTracker: React.FC<VaccineTrackerProps> = ({ account }) => {
  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVaccine, setEditingVaccine] = useState<Vaccine | null>(null);
  const [prefilledName, setPrefilledName] = useState<string>('');
  
  const [vaccineToDelete, setVaccineToDelete] = useState<Vaccine | null>(null);
  const [vaccineToConfirmDose, setVaccineToConfirmDose] = useState<Vaccine | null>(null);

  const [hasCheckedSuggestions, setHasCheckedSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [activeSuggestionId, setActiveSuggestionId] = useState<string | null>(null);
  
  const [isSuggestionsExpanded, setIsSuggestionsExpanded] = useState(true);

  useEffect(() => {
    const unsubscribeVaccines = StorageService.subscribeVaccines(account.id, (loadedVaccines) => {
      const sorted = loadedVaccines.sort((a, b) => {
         const aMissing = !a.dateTaken;
         const bMissing = !b.dateTaken;
         if (aMissing && !bMissing) return -1;
         if (!aMissing && bMissing) return 1;
         const aNeedsAnalysis = !a.nextDueDate && !a.analysisStatus;
         const bNeedsAnalysis = !b.nextDueDate && !b.analysisStatus;
         if (aNeedsAnalysis && !bNeedsAnalysis) return -1;
         if (!aNeedsAnalysis && bNeedsAnalysis) return 1;
         const dateA = a.dateTaken ? new Date(a.dateTaken).getTime() : 0;
         const dateB = b.dateTaken ? new Date(b.dateTaken).getTime() : 0;
         return dateB - dateA;
      });
      setVaccines(sorted);
    });

    const unsubscribeSuggestions = StorageService.subscribeSuggestions(account.id, (loadedSuggestions) => {
      setSuggestions(loadedSuggestions);
    });

    return () => {
      unsubscribeVaccines();
      unsubscribeSuggestions();
    };
  }, [account.id]);

  useEffect(() => {
    const checkSuggestions = async () => {
      if (hasCheckedSuggestions || vaccines.length === 0 || loadingSuggestions) return;
      if (suggestions.length > 0) {
        setHasCheckedSuggestions(true);
        return;
      }
      setLoadingSuggestions(true);
      try {
        const dismissed = await StorageService.getDismissedNames(account.id);
        const newSuggestions = await GeminiService.suggestMissingVaccines(vaccines, dismissed);
        if (newSuggestions.length > 0) {
          await StorageService.setSuggestions(account.id, newSuggestions);
        }
      } catch (e) {
        console.error("Error generating suggestions:", e);
      } finally {
        setLoadingSuggestions(false);
        setHasCheckedSuggestions(true);
      }
    };
    const timeout = setTimeout(checkSuggestions, 2000);
    return () => clearTimeout(timeout);
  }, [account.id, vaccines, suggestions.length, hasCheckedSuggestions, loadingSuggestions]);

  useEffect(() => {
    const candidate = vaccines.find(v => !v.nextDueDate && !v.analysisStatus);
    if (candidate) {
      const analyze = async () => {
        try {
          await StorageService.updateVaccine(account.id, { ...candidate, analysisStatus: 'loading' });
          const result = await GeminiService.analyzeVaccine(candidate.name, candidate.dateTaken, candidate.history);
          await StorageService.updateVaccine(account.id, {
            ...candidate,
            analysisStatus: 'completed',
            suggestedNextDueDate: result.nextDueDate,
            suggestedNotes: result.notes,
          });
        } catch (err) {
          console.error("Analysis failed", err);
          await StorageService.updateVaccine(account.id, { ...candidate, analysisStatus: 'dismissed' });
        }
      };
      const timer = setTimeout(analyze, 1000);
      return () => clearTimeout(timer);
    }
  }, [vaccines, account.id]);

  const handleSaveVaccine = async (vaccine: Vaccine) => {
    try {
      if (editingVaccine) {
        const vaccineToSave = { ...vaccine };
        if (!vaccineToSave.nextDueDate && vaccineToSave.analysisStatus === 'completed') {
             vaccineToSave.analysisStatus = undefined;
        }
        await StorageService.updateVaccine(account.id, vaccineToSave);
      } else {
        await StorageService.addVaccine(account.id, vaccine);
        if (activeSuggestionId) {
            await StorageService.removeSuggestion(account.id, activeSuggestionId);
        }
      }
    } catch (e) {
      console.error("Failed to save vaccine", e);
      alert("Failed to save record.");
    }
  };

  const handleEdit = (vaccine: Vaccine) => {
    setEditingVaccine(vaccine);
    setPrefilledName('');
    setActiveSuggestionId(null);
    setIsModalOpen(true);
  };

  const handleAddFromSuggestion = (suggestion: Suggestion) => {
    setEditingVaccine(null);
    setPrefilledName(suggestion.name);
    setActiveSuggestionId(suggestion.id);
    setIsModalOpen(true);
  };

  const handleDismissSuggestion = async (suggestion: Suggestion) => {
    try {
      await StorageService.removeSuggestion(account.id, suggestion.id);
      await StorageService.addToDismissed(account.id, suggestion.name);
    } catch (e) {
      console.error("Failed to dismiss suggestion", e);
    }
  };

  const handleAcceptAnalysis = async (vaccine: Vaccine, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updatedNote = vaccine.notes 
        ? `${vaccine.notes}\n\nAI Note: ${vaccine.suggestedNotes || ''}`
        : vaccine.suggestedNotes || '';
      const updates: any = {
        ...vaccine,
        notes: updatedNote.trim(),
        suggestedNextDueDate: null,
        suggestedNotes: null,
        analysisStatus: 'accepted'
      };
      if (vaccine.suggestedNextDueDate) updates.nextDueDate = vaccine.suggestedNextDueDate;
      await StorageService.updateVaccine(account.id, updates);
    } catch (err) {
      console.error("Failed to accept analysis", err);
    }
  };

  const handleDismissAnalysis = async (vaccine: Vaccine, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await StorageService.updateVaccine(account.id, {
        ...vaccine,
        suggestedNextDueDate: null,
        suggestedNotes: null,
        analysisStatus: 'dismissed'
      });
    } catch (err) {
      console.error("Failed to dismiss analysis", err);
    }
  };

  const initiateConfirmDose = (vaccine: Vaccine, e: React.MouseEvent) => {
     e.stopPropagation();
     setVaccineToConfirmDose(vaccine);
  };

  const executeConfirmDose = async () => {
    if (!vaccineToConfirmDose || !vaccineToConfirmDose.nextDueDate) return;
    try {
      const vaccine = vaccineToConfirmDose;
      const newHistory = [...(vaccine.history || [])];
      if (vaccine.dateTaken) newHistory.push(vaccine.dateTaken);
      await StorageService.updateVaccine(account.id, {
        ...vaccine,
        dateTaken: vaccine.nextDueDate,
        history: newHistory,
        nextDueDate: undefined,
        analysisStatus: undefined,
        suggestedNextDueDate: null,
        suggestedNotes: null
      });
      setVaccineToConfirmDose(null);
    } catch(err) {
      console.error("Failed to confirm dose", err);
    }
  };

  const confirmDelete = async () => {
    if (!vaccineToDelete) return;
    try {
      await StorageService.deleteVaccine(account.id, vaccineToDelete.id);
      setVaccineToDelete(null);
    } catch (e) {
      console.error("Failed to delete", e);
    }
  };

  const upcomingVaccines = vaccines.filter(v => {
    if (!v.nextDueDate) return false;
    const dueDate = new Date(v.nextDueDate);
    if (isNaN(dueDate.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sixMonthsFromNow = new Date(today);
    sixMonthsFromNow.setMonth(today.getMonth() + 6);
    return dueDate >= today && dueDate <= sixMonthsFromNow;
  }).sort((a, b) => new Date(a.nextDueDate!).getTime() - new Date(b.nextDueDate!).getTime());

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-end mb-6">
        <div>
           <h1 className="text-2xl font-bold text-slate-900">Vaccine Tracker</h1>
           <p className="text-slate-500">Keep your immunizations up to date</p>
        </div>
      </div>

      {upcomingVaccines.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 px-1">Upcoming</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {upcomingVaccines.map(vaccine => (
              <div key={vaccine.id} onClick={() => handleEdit(vaccine)} className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 text-white shadow-lg cursor-pointer hover:scale-[1.01] transition-transform relative group">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-lg">{vaccine.name}</h3>
                  <button onClick={(e) => initiateConfirmDose(vaccine, e)} className="text-xs bg-emerald-500/20 hover:bg-emerald-50 text-emerald-300 border border-emerald-500/50 px-2 py-1 rounded-full font-medium">
                    Due: {vaccine.nextDueDate}
                  </button>
                </div>
                <p className="text-slate-400 text-sm mt-1">{vaccine.dateTaken ? `Last taken: ${vaccine.dateTaken}` : 'Scheduled'}</p>
                {vaccine.notes && (
                  <p className="text-xs text-slate-300 mt-2 line-clamp-1">
                    {vaccine.notes}
                  </p>
                )}
                <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                   <PencilIcon className="w-4 h-4 text-white/50" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-8">
        <div className="flex items-center justify-between mb-4 px-1">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Records</h2>
          {vaccines.length > 0 && (
            <button onClick={() => ExportService.exportToExcel(vaccines)} className="flex items-center gap-2 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full transition-colors">
              <DownloadIcon className="w-4 h-4" /> Export Excel
            </button>
          )}
        </div>
        
        {vaccines.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
            <CalendarIcon className="w-8 h-8 mx-auto text-slate-300 mb-4" />
            <h3 className="text-slate-900 font-medium text-lg">No records found</h3>
          </div>
        ) : (
          <div className="space-y-3">
            {vaccines.map(vaccine => (
              <div key={vaccine.id} onClick={() => handleEdit(vaccine)} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md cursor-pointer group">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-800 text-lg">{vaccine.name}</h3>
                    <div className="flex items-center gap-2 text-slate-500 text-sm mt-1 flex-wrap">
                      {vaccine.dateTaken ? (
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-medium">Taken: {vaccine.dateTaken}</span>
                      ) : (
                        <span className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded text-amber-700 border border-amber-200"><WarningIcon className="w-3.5 h-3.5" /> Missing</span>
                      )}
                      {vaccine.nextDueDate && <button onClick={(e) => initiateConfirmDose(vaccine, e)} className="text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded flex items-center gap-1">Next: {vaccine.nextDueDate} <CheckIcon className="w-3.5 h-3.5" /></button>}
                      {!vaccine.nextDueDate && vaccine.analysisStatus === 'loading' && <span className="text-purple-600 bg-purple-50 px-2 py-0.5 rounded animate-pulse">Analyzing...</span>}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); handleEdit(vaccine); }} className="text-slate-300 hover:text-blue-600 p-2" title="Edit Record">
                      <PencilIcon className="w-5 h-5" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setVaccineToDelete(vaccine); }} className="text-slate-300 hover:text-red-500 p-2" title="Delete Record">
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {vaccine.notes && (
                  <div className="mt-3 pt-3 border-t border-slate-50">
                    <p className="text-sm text-slate-600 leading-relaxed line-clamp-2">
                      {vaccine.notes}
                    </p>
                  </div>
                )}

                {vaccine.suggestedNextDueDate && !vaccine.nextDueDate && (
                  <div className="mt-4 bg-purple-50 border border-purple-100 rounded-lg p-3">
                    <p className="text-sm font-semibold text-purple-900 mb-1">Suggested Next Due Date: {vaccine.suggestedNextDueDate}</p>
                    <div className="flex gap-2 mt-2">
                      <button onClick={(e) => handleAcceptAnalysis(vaccine, e)} className="bg-purple-600 text-white text-xs font-bold px-3 py-1.5 rounded-md">Accept & Set</button>
                      <button onClick={(e) => handleDismissAnalysis(vaccine, e)} className="bg-white border border-purple-200 text-purple-700 text-xs px-3 py-1.5 rounded-md">Dismiss</button>
                    </div>
                  </div>
                )}

                {!vaccine.suggestedNextDueDate && vaccine.analysisStatus === 'completed' && vaccine.suggestedNotes && (
                  <div className="mt-4 bg-emerald-50 border border-emerald-100 rounded-lg p-3 flex items-start gap-2">
                    <ShieldCheckIcon className="w-4 h-4 text-emerald-600 mt-0.5" />
                    <p className="text-xs text-emerald-700 leading-relaxed">{vaccine.suggestedNotes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {suggestions.length > 0 && (
        <div className="mb-8">
          <div onClick={() => setIsSuggestionsExpanded(!isSuggestionsExpanded)} className="flex items-center justify-between mb-4 px-1 cursor-pointer">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Might Be Missing</h2>
            {isSuggestionsExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
          </div>
          {isSuggestionsExpanded && (
            <div className="grid gap-3 sm:grid-cols-2">
              {suggestions.map(suggestion => (
                 <div key={suggestion.id} className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                    <h3 className="font-bold text-amber-900">{suggestion.name}</h3>
                    <p className="text-amber-700/80 text-sm mt-1 mb-4">{suggestion.reason}</p>
                    <div className="flex gap-2">
                       <button onClick={() => handleAddFromSuggestion(suggestion)} className="flex-1 bg-amber-200 text-amber-900 font-medium text-sm py-2 px-3 rounded-lg">Add Record</button>
                       <button onClick={() => handleDismissSuggestion(suggestion)} className="bg-white text-amber-600 border border-amber-200 p-2 rounded-lg">Dismiss</button>
                    </div>
                 </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="fixed bottom-6 right-6 z-30">
        <button onClick={() => { setEditingVaccine(null); setPrefilledName(''); setIsModalOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg hover:scale-105 transition-all">
          <PlusIcon className="w-7 h-7" />
        </button>
      </div>

      <AddVaccineModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveVaccine} existingVaccines={vaccines} userSuggestions={suggestions} vaccineToEdit={editingVaccine} prefilledName={prefilledName} />
      <ConfirmModal isOpen={!!vaccineToDelete} onClose={() => setVaccineToDelete(null)} onConfirm={confirmDelete} title="Delete Record?" message={`Are you sure you want to remove ${vaccineToDelete?.name}?`} />
      <ConfirmModal isOpen={!!vaccineToConfirmDose} onClose={() => setVaccineToConfirmDose(null)} onConfirm={executeConfirmDose} title="Confirm Vaccination" message={`Did you take the ${vaccineToConfirmDose?.name} on ${vaccineToConfirmDose?.nextDueDate}?`} isDestructive={false} />
    </div>
  );
};

export default VaccineTracker;
