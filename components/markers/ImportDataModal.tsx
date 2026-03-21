import React, { useState } from 'react';
import { StorageService } from '../../services/storageService';
import { MarkerImportService, ParsedBloodMarker } from '../../services/markerImportService';
import { BloodMarker } from '../../types';
import { XMarkIcon, SparklesIcon, CheckIcon, PlusIcon } from '../Icons';

interface Props {
    accountId: string;
    existingMarkers: BloodMarker[];
    onClose: () => void;
}

interface SelectableResult extends ParsedBloodMarker {
    selected: boolean;
    matchedMarkerId?: string; // If we found an existing marker with the same name
    isUpdated?: boolean; // True if the imported ranges/units differ from existing
}

const ImportDataModal: React.FC<Props> = ({ accountId, existingMarkers, onClose }) => {
    const [file, setFile] = useState<File | null>(null);
    const [isParsing, setIsParsing] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [results, setResults] = useState<SelectableResult[] | null>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            await handleParse(selectedFile);
        }
    };

    const handleParse = async (targetFile: File) => {
        setIsParsing(true);
        try {
            const extracted = await MarkerImportService.processFile(targetFile);

            const mapped = extracted.map(item => {
                // Try to find if marker already exists
                const matched = existingMarkers.find(mx => mx.name.toLowerCase() === item.name.toLowerCase());

                let isUpdated = false;
                if (matched) {
                    if (item.rangeMin !== undefined && matched.rangeMin !== item.rangeMin) isUpdated = true;
                    if (item.rangeMax !== undefined && matched.rangeMax !== item.rangeMax) isUpdated = true;
                    if (item.unit !== undefined && matched.unit !== item.unit) isUpdated = true;
                }
                return {
                    ...item,
                    selected: true,
                    matchedMarkerId: matched?.id,
                    isUpdated
                };
            });

            setResults(mapped);
        } catch (e) {
            console.error(e);
            alert("Failed to parse document. Please try again.");
        } finally {
            setIsParsing(false);
        }
    };

    const toggleSelection = (index: number) => {
        if (!results) return;
        const next = [...results];
        next[index].selected = !next[index].selected;
        setResults(next);
    };

    const handleImport = async () => {
        if (!results) return;
        const toImport = results.filter(r => r.selected);
        setIsImporting(true);

        try {
            // First, create any missing markers and grab their IDs, or update existing ones
            for (const item of toImport) {
                if (!item.matchedMarkerId) {
                    const newMarker: Partial<BloodMarker> = {
                        name: item.name,
                        unit: item.unit,
                        rangeMin: item.rangeMin,
                        rangeMax: item.rangeMax
                    };
                    item.matchedMarkerId = await StorageService.addMarker(accountId, newMarker);
                } else {
                    // Update existing marker's ranges if they've changed
                    const existing = existingMarkers.find(mx => mx.id === item.matchedMarkerId);
                    if (existing) {
                        let needsUpdate = false;
                        const updatedMarker = { ...existing };

                        // Treat the newly imported range/unit as the source of truth if provided
                        if (item.rangeMin !== undefined && existing.rangeMin !== item.rangeMin) {
                            updatedMarker.rangeMin = item.rangeMin;
                            needsUpdate = true;
                        }
                        if (item.rangeMax !== undefined && existing.rangeMax !== item.rangeMax) {
                            updatedMarker.rangeMax = item.rangeMax;
                            needsUpdate = true;
                        }
                        if (item.unit !== undefined && existing.unit !== item.unit) {
                            updatedMarker.unit = item.unit;
                            needsUpdate = true;
                        }

                        if (needsUpdate) {
                            await StorageService.updateMarker(accountId, updatedMarker);
                        }
                    }
                }
            }

            // Now that all markers exist and we have the IDs, append the records
            for (const item of toImport) {
                const mId = item.matchedMarkerId;
                if (mId) {
                    await StorageService.addMarkerRecord(accountId, {
                        markerId: mId,
                        date: item.date,
                        value: item.value
                    });
                }
            }

            onClose();
        } catch (e) {
            console.error("Save failure", e);
            alert("Failed to save imported data. Please try again.");
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Import Data</h2>
                        <p className="text-sm text-slate-500">Extract markers from document</p>
                    </div>
                    <button onClick={onClose} className="p-2 -mr-2 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-full transition-colors">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 max-h-[70vh] overflow-y-auto">
                    {!results ? (
                        <div className="space-y-6">
                            <div className={`border-2 border-dashed ${isParsing ? 'border-purple-300 bg-purple-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'} rounded-2xl p-8 text-center transition-colors relative`}>
                                {isParsing ? (
                                    <div className="flex flex-col items-center justify-center py-4">
                                        <div className="animate-spin rounded-full h-8 w-8 border-4 border-purple-200 border-t-purple-600 mb-4"></div>
                                        <p className="font-bold text-purple-700">Extracting Data...</p>
                                        <p className="text-sm text-purple-600/70 mt-1">Our AI is reading your document.</p>
                                    </div>
                                ) : (
                                    <input type="file" onChange={handleFileChange} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 mx-auto cursor-pointer" />
                                )}
                            </div>
                        </div>
                    ) : (
                        <div>
                            <div className="mb-4">
                                <h3 className="font-bold text-slate-900">Extracted Results</h3>
                                <p className="text-sm text-slate-500">Review and select the markers you want to import.</p>
                            </div>

                            <div className="overflow-x-auto rounded-xl border border-slate-200">
                                <table className="w-full text-left text-sm text-slate-600">
                                    <thead className="bg-slate-50 text-slate-900">
                                        <tr>
                                            <th className="p-3 w-10 text-center"></th>
                                            <th className="p-3">Marker</th>
                                            <th className="p-3">Value</th>
                                            <th className="p-3">Date</th>
                                            <th className="p-3">Range</th>
                                            <th className="p-3">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {results.length === 0 ? (
                                            <tr><td colSpan={5} className="p-4 text-center">No markers found.</td></tr>
                                        ) : (
                                            results.map((res, i) => (
                                                <tr key={i} className={`hover:bg-slate-50 cursor-pointer ${!res.selected && 'opacity-50'}`} onClick={() => toggleSelection(i)}>
                                                    <td className="p-3 text-center">
                                                        <input type="checkbox" checked={res.selected} readOnly className="w-4 h-4 text-blue-600 rounded" />
                                                    </td>
                                                    <td className="p-3 font-medium text-slate-900">
                                                        {res.name} {res.unit ? `(${res.unit})` : ''}
                                                    </td>
                                                    <td className="p-3">{res.value}</td>
                                                    <td className="p-3 whitespace-nowrap">{res.date}</td>
                                                    <td className="p-3 whitespace-nowrap text-slate-500">
                                                        {(res.rangeMin !== undefined || res.rangeMax !== undefined)
                                                            ? `${res.rangeMin ?? '-'} to ${res.rangeMax ?? '-'}`
                                                            : '-'}
                                                    </td>
                                                    <td className="p-3">
                                                        {res.matchedMarkerId ? (
                                                            res.isUpdated ? (
                                                                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded inline-flex items-center gap-1"><SparklesIcon className="w-3 h-3" /> Updated</span>
                                                            ) : (
                                                                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded inline-flex items-center gap-1"><CheckIcon className="w-3 h-3" /> Exists</span>
                                                            )
                                                        ) : (
                                                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded flex items-center gap-1 max-w-fit"><PlusIcon className="w-3 h-3" /> New</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-6 flex gap-3">
                                <button onClick={() => setResults(null)} disabled={isImporting} className="flex-1 px-4 py-3 rounded-xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-50">
                                    Go Back
                                </button>
                                <button onClick={handleImport} disabled={!results.some(r => r.selected) || isImporting} className="flex-1 px-4 py-3 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                                    {isImporting ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/20 border-t-white"></div> : <CheckIcon className="w-5 h-5" />}
                                    {isImporting ? 'Saving...' : 'Confirm Import'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImportDataModal;
