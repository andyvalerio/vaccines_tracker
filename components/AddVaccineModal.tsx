import React, { useState } from 'react';
import { Vaccine } from '../types'; // Removed User import as we treat it loosely here
import { SparklesIcon } from './Icons';
import { GeminiService } from '../services/geminiService';

interface AddVaccineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (vaccine: Vaccine) => void;
  activeUser: { id: string, name: string }; // Simplified interface
}

const AddVaccineModal: React.FC<AddVaccineModalProps> = ({ isOpen, onClose, onAdd, activeUser }) => {
  const [name, setName] = useState('');
  const [dateTaken, setDateTaken] = useState('');
  const [notes, setNotes] = useState('');
  const [nextDueDate, setNextDueDate] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  if (!isOpen) return null;

  const handleAiFill = async () => {
    if (!name || !dateTaken) {
      alert("Please enter a vaccine name and date first.");
      return;
    }
    setIsAnalyzing(true);
    const suggestion = await GeminiService.analyzeVaccine(name, dateTaken);
    setIsAnalyzing(false);
    
    if (suggestion.notes) setNotes(prev => prev ? `${prev}\n\nAI Note: ${suggestion.notes}` : suggestion.notes);
    if (suggestion.nextDueDate) setNextDueDate(suggestion.nextDueDate);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newVaccine: Vaccine = {
      id: Date.now().toString(),
      profileId: activeUser.id, // Changed from userId to profileId
      name,
      dateTaken,
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
    setDateTaken('');
    setNotes('');
    setNextDueDate('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-slate-800">Add Record for {activeUser.name}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Vaccine Name</label>
            <input
              type="text"
              required
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="e.g. Tetanus, Flu Shot"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date Taken</label>
              <input
                type="date"
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                value={dateTaken}
                onChange={(e) => setDateTaken(e.target.value)}
              />
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
          </div>

          {/* AI Helper Button */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleAiFill}
              disabled={isAnalyzing || !name || !dateTaken}
              className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-full transition-colors ${
                isAnalyzing ? 'bg-indigo-100 text-indigo-400' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
              }`}
            >
              <SparklesIcon className="w-4 h-4" />
              {isAnalyzing ? 'Asking AI...' : 'Auto-suggest Next Date'}
            </button>
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

          <div className="pt-4 flex gap-3">
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