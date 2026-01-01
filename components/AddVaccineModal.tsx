import React, { useState, useMemo } from 'react';
import { Vaccine } from '../types';

interface AddVaccineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (vaccine: Vaccine) => void;
  activeUser: { id: string, name: string };
  existingVaccines: Vaccine[];
}

const COMMON_VACCINES = [
  "Flu Shot (Influenza)",
  "Tetanus (Tdap)",
  "COVID-19",
  "Hepatitis A",
  "Hepatitis B",
  "HPV (Gardasil)",
  "MMR (Measles, Mumps, Rubella)",
  "Shingles",
  "Pneumococcal",
  "Meningococcal"
];

const AddVaccineModal: React.FC<AddVaccineModalProps> = ({ isOpen, onClose, onAdd, activeUser, existingVaccines }) => {
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [nextDueDate, setNextDueDate] = useState('');
  
  // Date State
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(currentYear);
  const [month, setMonth] = useState<string>('');
  const [day, setDay] = useState<string>('');

  // Filter suggestions: Show up to 5 common vaccines that the user DOES NOT have yet
  // MOVED UP: Must be called before any early return to satisfy Rules of Hooks
  const suggestions = useMemo(() => {
    return COMMON_VACCINES.filter(common => 
      !existingVaccines.some(existing => 
        existing.name.toLowerCase().includes(common.split(' ')[0].toLowerCase())
      )
    ).slice(0, 5);
  }, [existingVaccines]);

  // MOVED DOWN: Early return must happen after hooks
  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Construct fuzzy date string
    let dateStr = `${year}`;
    if (month) {
      dateStr += `-${month}`;
      if (day) {
        dateStr += `-${day.padStart(2, '0')}`;
      }
    }

    const newVaccine: Vaccine = {
      id: Date.now().toString(),
      profileId: activeUser.id,
      name,
      dateTaken: dateStr,
      nextDueDate: nextDueDate || undefined,
      notes: notes || undefined,
      createdAt: Date.now(),
    };
    onAdd(newVaccine);
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setName('');
    setYear(currentYear);
    setMonth('');
    setDay('');
    setNotes('');
    setNextDueDate('');
  };

  // Helper for generating year options (1950 - Current)
  const years = Array.from({ length: currentYear - 1949 }, (_, i) => currentYear - i);
  
  // Helper for days
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-slate-800">Add Record for {activeUser.name}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Name with Suggestions */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Vaccine Name</label>
            <div className="relative">
              <input
                type="text"
                required
                list="vaccine-suggestions"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="e.g. Tetanus, Flu Shot"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="off"
              />
              <datalist id="vaccine-suggestions">
                {COMMON_VACCINES.map(v => (
                  <option key={v} value={v} />
                ))}
              </datalist>
              {/* Fallback for visual helper */}
              {name.length === 0 && suggestions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {suggestions.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setName(s)}
                      className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded-md border border-slate-200 transition"
                    >
                      + {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Flexible Date Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <div className="col-span-1 sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Date Taken (Approximate OK)</label>
                <div className="flex gap-2">
                   <select 
                      className="flex-1 px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      value={year}
                      onChange={(e) => setYear(parseInt(e.target.value))}
                   >
                      {years.map(y => <option key={y} value={y}>{y}</option>)}
                   </select>

                   <select 
                      className="flex-1 px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      value={month}
                      onChange={(e) => setMonth(e.target.value)}
                   >
                      <option value="">Month...</option>
                      <option value="01">Jan</option>
                      <option value="02">Feb</option>
                      <option value="03">Mar</option>
                      <option value="04">Apr</option>
                      <option value="05">May</option>
                      <option value="06">Jun</option>
                      <option value="07">Jul</option>
                      <option value="08">Aug</option>
                      <option value="09">Sep</option>
                      <option value="10">Oct</option>
                      <option value="11">Nov</option>
                      <option value="12">Dec</option>
                   </select>

                   <select 
                      className="w-20 px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white disabled:opacity-50"
                      value={day}
                      onChange={(e) => setDay(e.target.value)}
                      disabled={!month}
                   >
                      <option value="">Day</option>
                      {days.map(d => <option key={d} value={d}>{d}</option>)}
                   </select>
                </div>
             </div>
          </div>

          <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">Next Due (Optional)</label>
              <input
                type="date"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                value={nextDueDate}
                onChange={(e) => setNextDueDate(e.target.value)}
              />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
              placeholder="Side effects, batch number, clinic location..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            ></textarea>
          </div>

          <div className="pt-2 flex gap-3">
             <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition shadow-md"
            >
              Save Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddVaccineModal;