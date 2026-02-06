
import React from 'react';
import { SparklesIcon } from '../Icons';

const DietTracker: React.FC = () => {
  return (
    <div className="animate-fade-in text-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 text-blue-600 mb-6">
        <SparklesIcon className="w-8 h-8" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Diet & Nutrition Tracker</h2>
      <p className="text-slate-500 max-w-sm mx-auto mb-8">
        We're working on something amazing. Soon you'll be able to track your meals, analyze nutrition with AI, and get personalized diet advice.
      </p>
      <div className="flex justify-center gap-3">
        <span className="bg-slate-100 text-slate-500 px-4 py-2 rounded-full text-sm font-medium">Coming Soon</span>
      </div>
    </div>
  );
};

export default DietTracker;
