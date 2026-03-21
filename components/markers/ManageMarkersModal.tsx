import React, { useState } from 'react';
import { StorageService } from '../../services/storageService';
import { BloodMarker } from '../../types';
import { XMarkIcon, PlusIcon, TrashIcon, PencilIcon } from '../Icons';

interface Props {
    accountId: string;
    markers: BloodMarker[];
    onClose: () => void;
}

const ManageMarkersModal: React.FC<Props> = ({ accountId, markers, onClose }) => {
    const [editingMarker, setEditingMarker] = useState<BloodMarker | null>(null);
    const [isAdding, setIsAdding] = useState(false);

    const [name, setName] = useState('');
    const [unit, setUnit] = useState('');
    const [rangeMin, setRangeMin] = useState<string>('');
    const [rangeMax, setRangeMax] = useState<string>('');

    const resetForm = () => {
        setName('');
        setUnit('');
        setRangeMin('');
        setRangeMax('');
        setEditingMarker(null);
        setIsAdding(false);
    };

    const startEdit = (marker: BloodMarker) => {
        setEditingMarker(marker);
        setName(marker.name);
        setUnit(marker.unit || '');
        setRangeMin(marker.rangeMin !== undefined ? marker.rangeMin.toString() : '');
        setRangeMax(marker.rangeMax !== undefined ? marker.rangeMax.toString() : '');
        setIsAdding(false);
    };

    const handleDelete = async (markerId: string) => {
        if (window.confirm("Are you sure you want to delete this marker? This will not delete its records immediately, but they may become orphaned.")) {
            await StorageService.deleteMarker(accountId, markerId);
            if (editingMarker?.id === markerId) {
                resetForm();
            }
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        const rMin = rangeMin !== '' ? Number(rangeMin) : undefined;
        const rMax = rangeMax !== '' ? Number(rangeMax) : undefined;

        try {
            if (editingMarker) {
                await StorageService.updateMarker(accountId, {
                    ...editingMarker,
                    name: name.trim(),
                    unit: unit.trim() || undefined,
                    rangeMin: rMin,
                    rangeMax: rMax
                });
            } else {
                await StorageService.addMarker(accountId, {
                    name: name.trim(),
                    unit: unit.trim() || undefined,
                    rangeMin: rMin,
                    rangeMax: rMax
                });
            }
            resetForm();
        } catch (err) {
            console.error("Failed to save marker", err);
            alert("Failed to save marker.");
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 sm:p-0">
            <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-4 sm:p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Manage Markers</h2>
                        <p className="text-sm text-slate-500">Add or edit tracked markers</p>
                    </div>
                    <button onClick={onClose} className="p-2 -mr-2 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-full transition-colors">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-4 sm:p-6 overflow-y-auto">
                    {(!isAdding && !editingMarker) ? (
                        <div>
                            <button onClick={() => setIsAdding(true)} className="w-full flex items-center justify-center gap-2 bg-blue-50 text-blue-700 py-3 rounded-xl border border-blue-100 font-medium hover:bg-blue-100 mb-6 transition-colors">
                                <PlusIcon className="w-5 h-5" /> Add New Marker
                            </button>

                            <div className="space-y-3">
                                {markers.length === 0 ? (
                                    <p className="text-center text-slate-400 py-4">No markers defined yet.</p>
                                ) : (
                                    markers.map(marker => (
                                        <div key={marker.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-blue-200 bg-slate-50 hover:bg-white group cursor-pointer" onClick={() => startEdit(marker)}>
                                            <div>
                                                <p className="font-semibold text-slate-800">{marker.name} {marker.unit ? `(${marker.unit})` : ''}</p>
                                                {(marker.rangeMin !== undefined || marker.rangeMax !== undefined) && (
                                                    <p className="text-xs text-slate-500">
                                                        Normal Range: {marker.rangeMin ?? '-'} to {marker.rangeMax ?? '-'}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button onClick={(e) => { e.stopPropagation(); startEdit(marker); }} className="p-2 text-slate-400 hover:text-blue-600"><PencilIcon className="w-4 h-4" /></button>
                                                <button onClick={(e) => { e.stopPropagation(); handleDelete(marker.id); }} className="p-2 text-slate-400 hover:text-red-500"><TrashIcon className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Name <span className="text-red-500">*</span></label>
                                <input required autoFocus type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. LDL Cholesterol" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium text-slate-900" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Unit (Optional)</label>
                                <input type="text" value={unit} onChange={e => setUnit(e.target.value)} placeholder="e.g. mmol/L, mg/dL" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium text-slate-900" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Min Normal (Opt)</label>
                                    <input type="number" step="any" value={rangeMin} onChange={e => setRangeMin(e.target.value)} placeholder="e.g. 3.0" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium text-slate-900" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Max Normal (Opt)</label>
                                    <input type="number" step="any" value={rangeMax} onChange={e => setRangeMax(e.target.value)} placeholder="e.g. 5.0" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium text-slate-900" />
                                </div>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={resetForm} className="flex-1 px-4 py-3 rounded-xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">Cancel</button>
                                <button type="submit" disabled={!name.trim()} className="flex-1 px-4 py-3 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Save Marker</button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ManageMarkersModal;
