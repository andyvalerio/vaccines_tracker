
import React, { useState, useEffect, useRef } from 'react';
import { DietEntryType, DietEntry } from '../../types';
import { XMarkIcon, SparklesIcon } from '../Icons';
import { GeminiDietService } from '../../services/geminiDietService';

interface AddDietEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entries: Partial<DietEntry>[]) => void;
  initialType?: DietEntryType;
  prefilledName?: string;
  history: DietEntry[];
}

const ONSET_DELAYS = ['Immediately', '15m', '1h', '2h', '4h', '8h'];

const entriesToSubmit = (drafts: Record<DietEntryType, DraftEntry>) => {
  return Object.values(drafts).some(d => d.name.trim());
};

interface DraftEntry {
  name: string;
  timestamp: Date;
  notes: string;
  intensity: number;
  afterFoodDelay?: string;
}

const defaultDraft: DraftEntry = {
  name: '',
  timestamp: new Date(),
  notes: '',
  intensity: 3,
  afterFoodDelay: undefined
};

const AddDietEntryModal: React.FC<AddDietEntryModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialType = 'food',
  prefilledName = '',
  history
}) => {
  const [activeTab, setActiveTab] = useState<DietEntryType>(initialType);

  // Independent drafts for each tab
  const [drafts, setDrafts] = useState<Record<DietEntryType, DraftEntry>>({
    food: { ...defaultDraft },
    medicine: { ...defaultDraft },
    symptom: { ...defaultDraft }
  });

  const [suggestions, setSuggestions] = useState<{
    food: string[];
    medicine: string[];
    symptom: string[];
  }>({ food: [], medicine: [], symptom: [] });

  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const hasFetchedRef = useRef(false);

  // Initialize drafts when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialType);

      // Reset drafts, optionally prefilling the initial one
      const now = new Date();
      const newDrafts = {
        food: { ...defaultDraft, timestamp: now },
        medicine: { ...defaultDraft, timestamp: now },
        symptom: { ...defaultDraft, timestamp: now }
      };

      if (prefilledName) {
        newDrafts[initialType].name = prefilledName;
      }

      setDrafts(newDrafts);

      if (!hasFetchedRef.current) {
        const fetchSuggestions = async () => {
          setIsLoadingSuggestions(true);
          try {
            const result = await GeminiDietService.getDietSuggestions(history);
            setSuggestions({
              food: result.food || [],
              medicine: result.medicines || [],
              symptom: result.symptoms || []
            });
            hasFetchedRef.current = true;
          } catch (e) {
            console.error("Failed to load suggestions", e);
          } finally {
            setIsLoadingSuggestions(false);
          }
        };
        fetchSuggestions();
      }
    } else {
      hasFetchedRef.current = false;
    }
  }, [isOpen, initialType, prefilledName, history]);

  if (!isOpen) return null;

  const currentDraft = drafts[activeTab];

  const updateCurrentDraft = (updates: Partial<DraftEntry>) => {
    setDrafts(prev => ({
      ...prev,
      [activeTab]: { ...prev[activeTab], ...updates }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Collect all drafts that have a name
    const entriesToSave: Partial<DietEntry>[] = [];

    // Helper to format a draft into a Partial<DietEntry>
    const formatEntry = (type: DietEntryType, draft: DraftEntry): Partial<DietEntry> => ({
      type,
      name: draft.name.trim(),
      timestamp: draft.timestamp.getTime(),
      notes: draft.notes.trim(),
      intensity: type === 'symptom' ? draft.intensity : undefined,
      afterFoodDelay: type === 'symptom' ? draft.afterFoodDelay : undefined
    });

    // Check each draft
    (['food', 'medicine', 'symptom'] as DietEntryType[]).forEach(type => {
      const draft = drafts[type];
      if (draft.name.trim()) {
        entriesToSave.push(formatEntry(type, draft));
      }
    });

    if (entriesToSave.length > 0) {
      onSave(entriesToSave);
      onClose();
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val) {
      updateCurrentDraft({ timestamp: new Date(val) });
    }
  };

  const getTabColor = (type: DietEntryType, isActive: boolean) => {
    if (isActive) {
      switch (type) {
        case 'food': return 'bg-white text-blue-600 shadow-md';
        case 'medicine': return 'bg-white text-indigo-600 shadow-md';
        case 'symptom': return 'bg-white text-amber-600 shadow-md';
      }
    }
    return 'text-slate-500 hover:text-slate-700';
  };

  const hasContent = (type: DietEntryType) => !!drafts[type].name.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-xl font-bold text-slate-800">
            Log {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition text-slate-500">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 bg-white max-h-[80vh] overflow-y-auto custom-scrollbar">
          {/* Tab Navigation */}
          <div className="flex p-1 bg-slate-100 rounded-xl gap-1">
            {(['food', 'medicine', 'symptom'] as DietEntryType[]).map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setActiveTab(type)}
                className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all relative ${getTabColor(type, activeTab === type)}`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
                {/* Draft Indicator */}
                {hasContent(type) && (
                  <span className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${type === 'food' ? 'bg-blue-500' :
                    type === 'medicine' ? 'bg-indigo-500' :
                      'bg-amber-500'
                    }`} />
                )}
              </button>
            ))}
          </div>

          {/* Name Input */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              {activeTab === 'food' ? 'What did you eat?' : activeTab === 'medicine' ? 'What did you take?' : 'What do you feel?'}
            </label>
            <input
              type="text"
              autoFocus
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-0 outline-none transition shadow-sm font-medium text-lg"
              placeholder={activeTab === 'food' ? "e.g. Scrambled Eggs" : activeTab === 'medicine' ? "e.g. Multivitamin" : "e.g. Bloating"}
              value={currentDraft.name}
              onChange={(e) => updateCurrentDraft({ name: e.target.value })}
            />

            {/* AI Suggestions Row */}
            <div className="mt-3 flex flex-wrap gap-2 items-center min-h-[40px]">
              {isLoadingSuggestions ? (
                <div className="flex items-center gap-2 text-slate-500 text-xs font-medium px-1">
                  <div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin"></div>
                  <span>AI is thinking...</span>
                </div>
              ) : (
                <>
                  {suggestions[activeTab].length > 0 && <SparklesIcon className="w-4 h-4 text-blue-500 mr-0.5" />}
                  {suggestions[activeTab].map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => updateCurrentDraft({ name: s })}
                      className={`text-xs bg-slate-50 hover:bg-opacity-100 border border-slate-200 px-3 py-1.5 rounded-lg transition-all font-semibold ${activeTab === 'food' ? 'hover:bg-blue-600 hover:border-blue-600 hover:text-white' :
                        activeTab === 'medicine' ? 'hover:bg-indigo-600 hover:border-indigo-600 hover:text-white' :
                          'hover:bg-amber-600 hover:border-amber-600 hover:text-white'
                        }`}
                    >
                      {s}
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Onset Delay - SYMPTOM ONLY */}
          {activeTab === 'symptom' && (
            <div className="animate-fade-in py-2 border-t border-slate-50 mt-2">
              <label className="block text-sm font-bold text-slate-700 mb-2">How long after eating?</label>
              <div className="grid grid-cols-3 gap-2">
                {ONSET_DELAYS.map((delay) => (
                  <button
                    key={delay}
                    type="button"
                    onClick={() => updateCurrentDraft({ afterFoodDelay: delay })}
                    className={`px-2 py-2 rounded-xl text-xs font-bold border-2 transition-all ${currentDraft.afterFoodDelay === delay
                      ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-100'
                      : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'
                      }`}
                  >
                    {delay}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Absolute Time Picker */}
          <div className="animate-fade-in border-t border-slate-50 pt-4">
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Time of Event
            </label>
            <input
              type="datetime-local"
              required
              className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-100 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white focus:ring-0 outline-none transition font-medium text-sm"
              value={new Date(currentDraft.timestamp.getTime() - currentDraft.timestamp.getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
              onChange={handleDateChange}
            />
          </div>

          {/* Intensity Slider - SYMPTOM ONLY */}
          {activeTab === 'symptom' && (
            <div className="animate-fade-in">
              <label className="block text-sm font-bold text-slate-700 mb-2">Intensity (1-5)</label>
              <div className="flex justify-between items-center gap-2">
                {[1, 2, 3, 4, 5].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => updateCurrentDraft({ intensity: num })}
                    className={`w-11 h-11 rounded-full font-bold transition-all border-2 ${currentDraft.intensity === num ? 'bg-amber-500 border-amber-500 text-white scale-110 shadow-lg' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Notes Field */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Notes (Optional)</label>
            <textarea
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-0 outline-none h-20 resize-none transition shadow-sm font-medium"
              placeholder="Any additional details..."
              value={currentDraft.notes}
              onChange={(e) => updateCurrentDraft({ notes: e.target.value })}
            ></textarea>
          </div>

          <button
            type="submit"
            disabled={!entriesToSubmit(drafts)}
            className={`w-full font-bold py-4 px-4 rounded-xl shadow-xl transition-all active:scale-95 mt-2 text-lg text-white ${!entriesToSubmit(drafts) ? 'bg-slate-300 cursor-not-allowed shadow-none' :
              activeTab === 'food' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-100' :
                activeTab === 'medicine' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100' :
                  'bg-amber-600 hover:bg-amber-700 shadow-amber-100'
              }`}
          >
            {/* Dynamic Save Text */}
            {(() => {
              const count = Object.values(drafts).filter(d => d.name.trim()).length;
              if (count > 1) return `Save ${count} Entries`;
              return 'Save Entry';
            })()}
          </button>
        </form>
      </div>
    </div>
  );
};



export default AddDietEntryModal;

