import React, { useState, useEffect } from 'react';
import { StorageService } from '../../services/storageService';
import { BloodMarker, BloodMarkerRecord } from '../../types';
import { XMarkIcon } from '../Icons';

interface Props {
    accountId: string;
    markers: BloodMarker[];
    recordToEdit: BloodMarkerRecord | null;
    onClose: () => void;
}

const ManageRecordsModal: React.FC<Props> = ({ accountId, markers, recordToEdit, onClose }) => {
    const [markerId, setMarkerId] = useState(recordToEdit?.markerId || (markers.length > 0 ? markers[0].id : ''));
    const [date, setDate] = useState(recordToEdit?.date || new Date().toISOString().split('T')[0]);
    const [value, setValue] = useState<string>(recordToEdit?.value?.toString() || '');

    useEffect(() => {
        if (recordToEdit) {
            setMarkerId(recordToEdit.markerId);
            setDate(recordToEdit.date);
            setValue(recordToEdit.value.toString());
        } else {
            if (!markerId && markers.length > 0) {
                setMarkerId(markers[0].id);
            }
        }
    }, [recordToEdit, markers, markerId]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!markerId || !date || !value) return;

        try {
            const numValue = Number(value);
            if (recordToEdit) {
                await StorageService.updateMarkerRecord(accountId, {
                    ...recordToEdit,
                    markerId,
                    date,
                    value: numValue
                });
            } else {
                await StorageService.addMarkerRecord(accountId, {
                    markerId,
                    date,
                    value: numValue
                });
            }
            onClose();
        } catch (e) {
            console.error("Failed to save record", e);
            alert("Failed to save record.");
        }
    };

    if (markers.length === 0) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 text-center">
                <div className="bg-white rounded-3xl w-full max-w-sm p-8 shadow-2xl">
                    <h2 className="text-xl font-bold text-slate-900 mb-2">No Markers Definied</h2>
                    <p className="text-slate-500 mb-6">You must define at least one marker before adding a record.</p>
                    <button onClick={onClose} className="w-full py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200">
                        Close
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 sm:p-0">
            <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative">
                <div className="p-4 sm:p-6 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">{recordToEdit ? 'Edit Record' : 'Add Record'}</h2>
                        <p className="text-sm text-slate-500">Log a new blood test result</p>
                    </div>
                    <button onClick={onClose} className="p-2 -mr-2 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-full transition-colors">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Marker <span className="text-red-500">*</span></label>
                        <select required value={markerId} onChange={(e) => setMarkerId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium text-slate-900 appearance-none">
                            {markers.map(m => (
                                <option key={m.id} value={m.id}>{m.name} {m.unit ? `(${m.unit})` : ''}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Date <span className="text-red-500">*</span></label>
                        <input required type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium text-slate-900 uppercase" />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Value <span className="text-red-500">*</span></label>
                        <input required type="number" step="any" value={value} onChange={e => setValue(e.target.value)} placeholder="e.g. 4.8" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium text-slate-900" />
                        {markerId && markers.find(m => m.id === markerId)?.rangeMin !== undefined && (
                            <p className="text-xs text-slate-500 mt-2">
                                Normal range: {markers.find(m => m.id === markerId)?.rangeMin} - {markers.find(m => m.id === markerId)?.rangeMax}
                            </p>
                        )}
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-3 rounded-xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">Cancel</button>
                        <button type="submit" disabled={!markerId || !date || !value} className="flex-1 px-4 py-3 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Save</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ManageRecordsModal;
