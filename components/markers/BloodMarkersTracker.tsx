import React, { useState, useEffect } from 'react';
import { StorageService } from '../../services/storageService';
import { Account, BloodMarker, BloodMarkerRecord } from '../../types';
import { PlusIcon, TrashIcon, PencilIcon, SparklesIcon } from '../Icons';
import MarkerGraph from './MarkerGraph';
import ManageMarkersModal from './ManageMarkersModal';
import ManageRecordsModal from './ManageRecordsModal';
import ImportDataModal from './ImportDataModal';

interface Props {
    account: Account;
}

const BloodMarkersTracker: React.FC<Props> = ({ account }) => {
    const [markers, setMarkers] = useState<BloodMarker[]>([]);
    const [records, setRecords] = useState<BloodMarkerRecord[]>([]);

    const [isManageMarkersOpen, setIsManageMarkersOpen] = useState(false);
    const [isManageRecordsOpen, setIsManageRecordsOpen] = useState(false);
    const [isImportDataOpen, setIsImportDataOpen] = useState(false);

    const [editingRecord, setEditingRecord] = useState<BloodMarkerRecord | null>(null);

    useEffect(() => {
        const unsubMarkers = StorageService.subscribeMarkers(account.id, setMarkers);
        const unsubRecords = StorageService.subscribeMarkerRecords(account.id, setRecords);
        return () => {
            unsubMarkers();
            unsubRecords();
        };
    }, [account.id]);

    const sortedRecords = [...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const getMarkerName = (markerId: string) => {
        const marker = markers.find(m => m.id === markerId);
        return marker ? marker.name : 'Unknown Marker';
    };

    const getMarkerUnit = (markerId: string) => {
        const marker = markers.find(m => m.id === markerId);
        return marker?.unit ? ` ${marker.unit}` : '';
    };

    const handleEditRecord = (record: BloodMarkerRecord) => {
        setEditingRecord(record);
        setIsManageRecordsOpen(true);
    };

    const handleDeleteRecord = async (recordId: string) => {
        if (window.confirm("Delete this record?")) {
            await StorageService.deleteMarkerRecord(account.id, recordId);
        }
    };

    return (
        <div className="animate-fade-in">
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Blood Markers</h1>
                    <p className="text-slate-500">Track and visualize your health metrics over time</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setIsManageMarkersOpen(true)} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors">
                        Manage Markers
                    </button>
                    <button onClick={() => setIsImportDataOpen(true)} className="px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-100 text-sm font-medium rounded-lg hover:bg-purple-100 transition-colors flex items-center gap-1">
                        <SparklesIcon className="w-4 h-4" /> Import Document
                    </button>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-8">
                <MarkerGraph markers={markers} records={records} />
            </div>

            <div className="mb-8">
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 px-1">Recent Records</h2>
                {records.length === 0 ? (
                    <div className="text-center py-10 bg-white rounded-xl border border-dashed border-slate-200 text-slate-400">
                        No records yet. Add a new record or import from a document!
                    </div>
                ) : (
                    <div className="space-y-3">
                        {sortedRecords.map(record => (
                            <div key={record.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center group">
                                <div>
                                    <h3 className="font-bold text-slate-800">{getMarkerName(record.markerId)}</h3>
                                    <p className="text-sm text-slate-500">{record.date}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="font-semibold text-lg text-slate-900">{record.value}{getMarkerUnit(record.markerId)}</span>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleEditRecord(record)} className="p-2 text-slate-300 hover:text-blue-600"><PencilIcon className="w-4 h-4" /></button>
                                        <button onClick={() => handleDeleteRecord(record.id)} className="p-2 text-slate-300 hover:text-red-500"><TrashIcon className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="fixed bottom-6 right-6 z-30">
                <button onClick={() => { setEditingRecord(null); setIsManageRecordsOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg hover:scale-105 transition-all">
                    <PlusIcon className="w-7 h-7" />
                </button>
            </div>

            {isManageMarkersOpen && <ManageMarkersModal accountId={account.id} markers={markers} onClose={() => setIsManageMarkersOpen(false)} />}
            {isManageRecordsOpen && <ManageRecordsModal accountId={account.id} markers={markers} recordToEdit={editingRecord} onClose={() => setIsManageRecordsOpen(false)} />}
            {isImportDataOpen && <ImportDataModal accountId={account.id} existingMarkers={markers} onClose={() => setIsImportDataOpen(false)} />}
        </div>
    );
};

export default BloodMarkersTracker;
