import React, { useState, useMemo, useEffect } from 'react';
import { Vaccine, Suggestion } from '../types';
import { PencilIcon } from './Icons';

interface AddVaccineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (vaccine: Vaccine) => void;
  existingVaccines: Vaccine[];
  userSuggestions: Suggestion[];
  vaccineToEdit?: Vaccine | null;
  prefilledName?: string;
}

const COMMON_VACCINES = [
  "Flu Shot (Influenza)",
  "Tetanus (Tdap/DTaP)",
  "MMR (Measles, Mumps, Rubella)",
  "Hepatitis B",
  "Polio (IPV)",
  "Varicella (Chickenpox)",
  "Pneumococcal (PCV)",
  "Hepatitis A",
  "HPV (Gardasil)",
  "COVID-19"
];

const AddVaccineModal: React.FC<AddVaccineModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  existingVaccines, 
  userSuggestions,
  vaccineToEdit, 
  prefilledName 
}) => {
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  
  // Date Taken State
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(currentYear);
  const [month, setMonth] = useState<string>('');
  const [day, setDay] = useState<string>('');

  // Next Due Date State
  const [nextYear, setNextYear] = useState<number | ''>('');
  const [nextMonth, setNextMonth] = useState<string>('');
  const [nextDay, setNextDay] = useState<string>('');

  // Load data for editing or prefilling
  useEffect(() => {
    if (isOpen) {
      if (vaccineToEdit) {
        // Edit Mode
        setName(vaccineToEdit.name);
        setNotes(vaccineToEdit.notes || '');
        
        // Parse "YYYY-MM-DD" or "YYYY-MM" or "YYYY" for Date Taken
        if (vaccineToEdit.dateTaken) {
          const parts = vaccineToEdit.dateTaken.split('-');
          if (parts[0]) setYear(parseInt(parts[0]));
          if (parts[1]) setMonth(parts[1]);
          else setMonth('');
          // Fix: Parse int to remove leading zeros (e.g. "05" -> "5") to match select options
          if (parts[2]) setDay(parseInt(parts[2]).toString());
          else setDay('');
        }

        // Parse "YYYY-MM-DD" or "YYYY-MM" or "YYYY" for Next Due Date
        if (vaccineToEdit.nextDueDate) {
          const parts = vaccineToEdit.nextDueDate.split('-');
          if (parts[0]) setNextYear(parseInt(parts[0]));
          if (parts[1]) setNextMonth(parts[1]);
          else setNextMonth('');
          // Fix: Parse int to remove leading zeros
          if (parts[2]) setNextDay(parseInt(parts[2]).toString());
          else setNextDay('');
        } else {
          setNextYear('');
          setNextMonth('');
          setNextDay('');
        }
      } else {
        // Add Mode (reset or prefill)
        resetForm();
        if (prefilledName) {
          setName(prefilledName);
        }
      }
    }
  }, [isOpen, vaccineToEdit, prefilledName]);

  // Calculate days in month dynamically
  const getDaysInMonth = (y: number | '', m: string) => {
    if (!y || !m) return 31;
    // new Date(y, monthIndex, 0) returns last day of previous month
    // If m="01" (Jan), parseInt is 1. new Date(y, 1, 0) is Jan 31.
    // If m="02" (Feb), parseInt is 2. new Date(y, 2, 0) is Feb 28 or 29.
    return new Date(y as number, parseInt(m), 0).getDate();
  };

  const daysInCurrentMonth = useMemo(() => getDaysInMonth(year, month), [year, month]);
  const daysInNextMonth = useMemo(() => getDaysInMonth(nextYear, nextMonth), [nextYear, nextMonth]);

  // Clamp selections if they exceed the new month's days
  useEffect(() => {
    if (day && parseInt(day) > daysInCurrentMonth) {
      setDay('');
    }
  }, [daysInCurrentMonth, day]);

  useEffect(() => {
    if (nextDay && parseInt(nextDay) > daysInNextMonth) {
      setNextDay('');
    }
  }, [daysInNextMonth, nextDay]);

  // Filter suggestions: Mix of User Suggestions (AI) + Common Defaults
  const quickAddOptions = useMemo(() => {
    const options: string[] = [];

    // 1. Add specific AI suggestions first (if not already recorded)
    userSuggestions.forEach(s => {
      // Check if user already has this vaccine name roughly
      const alreadyHas = existingVaccines.some(v => v.name.toLowerCase() === s.name.toLowerCase());
      if (!alreadyHas) {
        options.push(s.name);
      }
    });

    // 2. Fill the rest with Common Vaccines until we have 5
    for (const common of COMMON_VACCINES) {
      if (options.length >= 5) break;

      // Check if already in options
      if (options.includes(common)) continue;

      // Check if user already has it (fuzzy match)
      const commonRoot = common.split(' ')[0].toLowerCase();
      const alreadyHas = existingVaccines.some(v => 
        v.name.toLowerCase().includes(commonRoot)
      );

      if (!alreadyHas) {
        options.push(common);
      }
    }

    return options;
  }, [existingVaccines, userSuggestions]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Construct fuzzy date string for Date Taken
    let dateStr = `${year}`;
    if (month) {
      dateStr += `-${month}`;
      if (day) {
        dateStr += `-${day.padStart(2, '0')}`;
      }
    }

    // Construct fuzzy date string for Next Due Date
    let nextDueDateStr = '';
    if (nextYear) {
      nextDueDateStr = `${nextYear}`;
      if (nextMonth) {
        nextDueDateStr += `-${nextMonth}`;
        if (nextDay) {
          nextDueDateStr += `-${nextDay.padStart(2, '0')}`;
        }
      }
    }

    const vaccine: Vaccine = {
      id: vaccineToEdit ? vaccineToEdit.id : Date.now().toString(),
      name,
      dateTaken: dateStr,
      createdAt: vaccineToEdit ? vaccineToEdit.createdAt : Date.now(),
    };

    if (notes.trim()) {
      vaccine.notes = notes.trim();
    }
    
    if (nextDueDateStr) {
      vaccine.nextDueDate = nextDueDateStr;
    }

    onSave(vaccine);
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setName('');
    setYear(currentYear);
    setMonth('');
    setDay('');
    setNotes('');
    setNextYear('');
    setNextMonth('');
    setNextDay('');
  };

  // Helper for generating year options (1950 - Current)
  const years = Array.from({ length: currentYear - 1949 }, (_, i) => currentYear - i);
  
  // Helper for future years (Current - Current + 50)
  const futureYears = Array.from({ length: 51 }, (_, i) => currentYear + i);
  
  // Dynamic day lists
  const currentDaysList = Array.from({ length: daysInCurrentMonth }, (_, i) => i + 1);
  const nextDaysList = Array.from({ length: daysInNextMonth }, (_, i) => i + 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-slate-800">
            {vaccineToEdit ? 'Edit Record' : 'Add New Record'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Name with Suggestions */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Vaccine Name {vaccineToEdit && <span className="text-xs font-normal text-slate-400 ml-1">(Cannot change name)</span>}
            </label>
            <div className="relative">
              <input
                type="text"
                required
                disabled={!!vaccineToEdit}
                list="vaccine-suggestions"
                className={`w-full px-3 py-2 rounded-lg border outline-none transition-colors ${
                  vaccineToEdit 
                    ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed' 
                    : 'bg-white text-slate-900 border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                }`}
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
              {/* Fallback for visual helper - Only show on Add mode when empty and not prefilled */}
              {!vaccineToEdit && name.length === 0 && quickAddOptions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {quickAddOptions.map(s => (
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
          <div className="grid grid-cols-1 gap-5">
             <div className="">
                <label className="block text-sm font-medium text-slate-700 mb-1">Date Taken</label>
                <div className="flex gap-2">
                   <select 
                      className="flex-1 px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                      value={year}
                      onChange={(e) => setYear(parseInt(e.target.value))}
                   >
                      {years.map(y => <option key={y} value={y}>{y}</option>)}
                   </select>

                   <select 
                      className="flex-1 px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
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
                      className="w-20 px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900 disabled:opacity-50"
                      value={day}
                      onChange={(e) => setDay(e.target.value)}
                      disabled={!month}
                   >
                      <option value="">Day</option>
                      {currentDaysList.map(d => <option key={d} value={d}>{d}</option>)}
                   </select>
                </div>
             </div>

             <div className="">
                <label className="block text-sm font-medium text-slate-700 mb-1">Next Due Date</label>
                <div className="flex gap-2">
                   <select 
                      className="flex-1 px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                      value={nextYear}
                      onChange={(e) => setNextYear(e.target.value ? parseInt(e.target.value) : '')}
                   >
                      <option value="">Year...</option>
                      {futureYears.map(y => <option key={y} value={y}>{y}</option>)}
                   </select>

                   <select 
                      className="flex-1 px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900 disabled:opacity-50"
                      value={nextMonth}
                      onChange={(e) => setNextMonth(e.target.value)}
                      disabled={!nextYear}
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
                      className="w-20 px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900 disabled:opacity-50"
                      value={nextDay}
                      onChange={(e) => setNextDay(e.target.value)}
                      disabled={!nextMonth}
                   >
                      <option value="">Day</option>
                      {nextDaysList.map(d => <option key={d} value={d}>{d}</option>)}
                   </select>
                </div>
             </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none bg-white text-slate-900 shadow-sm"
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
              {vaccineToEdit ? 'Update Record' : 'Save Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddVaccineModal;