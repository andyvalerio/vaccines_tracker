import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    ReferenceArea
} from 'recharts';
import { BloodMarker, BloodMarkerRecord } from '../../types';

interface Props {
    markers: BloodMarker[];
    records: BloodMarkerRecord[];
}

const COLORS = [
    '#3b82f6', // blue-500
    '#ef4444', // red-500
    '#10b981', // emerald-500
    '#f59e0b', // amber-500
    '#8b5cf6', // violet-500
    '#ec4899', // pink-500
    '#06b6d4', // cyan-500
];

const ExpandIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
    </svg>
);

const CollapseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
    </svg>
);

const MarkerGraph: React.FC<Props> = ({ markers, records }) => {
    const [selectedReferenceMarkerId, setSelectedReferenceMarkerId] = useState<string>(() => {
        return localStorage.getItem('marker_highlightRangePrefs') || 'auto';
    });
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [hiddenMarkers, setHiddenMarkers] = useState<Record<string, boolean>>(() => {
        const saved = localStorage.getItem('marker_visibilityPrefs');
        return saved ? JSON.parse(saved) : {};
    });

    useEffect(() => {
        localStorage.setItem('marker_visibilityPrefs', JSON.stringify(hiddenMarkers));
    }, [hiddenMarkers]);

    useEffect(() => {
        localStorage.setItem('marker_highlightRangePrefs', selectedReferenceMarkerId);
    }, [selectedReferenceMarkerId]);

    const handleLegendClick = (e: any) => {
        const id = e.dataKey;
        setHiddenMarkers(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const { chartData, markersInCurrentData } = useMemo(() => {
        if (records.length === 0 || markers.length === 0) return { chartData: [], markersInCurrentData: [] };

        // Group by date
        const grouped: Record<string, any> = {};
        const markerIds = new Set<string>();

        records.forEach(r => {
            if (!grouped[r.date]) {
                grouped[r.date] = { name: r.date };
            }
            const marker = markers.find(m => m.id === r.markerId);
            if (marker) {
                grouped[r.date][marker.name] = r.value;
                markerIds.add(marker.id);
            }
        });

        const sortedDates = Object.keys(grouped).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
        const data = sortedDates.map(date => ({
            ...grouped[date],
            timestamp: new Date(date).getTime()
        }));

        return {
            chartData: data,
            markersInCurrentData: markers.filter(m => markerIds.has(m.id))
        };
    }, [records, markers]);

    const referenceMarker = useMemo(() => {
        if (selectedReferenceMarkerId === 'auto') {
            return markersInCurrentData.length === 1 ? markersInCurrentData[0] : null;
        }
        return markers.find(m => m.id === selectedReferenceMarkerId) || null;
    }, [selectedReferenceMarkerId, markersInCurrentData, markers]);

    if (records.length === 0 || markers.length === 0) {
        return (
            <div className="h-64 flex items-center justify-center text-slate-400">
                <p>No data to visualize</p>
            </div>
        );
    }

    // Determine chart Y domain dynamically
    let maxY: number | 'auto' = 'auto';

    if (referenceMarker) {
        if (referenceMarker.rangeMax !== undefined) {
            const dataMax = Math.max(0, ...records.filter(r => r.markerId === referenceMarker.id).map(r => r.value));
            maxY = Math.max(dataMax, referenceMarker.rangeMax) * 1.2;
        }
    }

    const containerClasses = isFullscreen
        ? "fixed inset-0 z-50 bg-white p-6 sm:p-10 flex flex-col overflow-hidden"
        : "w-full";

    const content = (
        <div className={containerClasses}>
            <div className="flex flex-wrap justify-between items-center mb-4">
                <h3 className="font-bold text-slate-800">Timeline Analysis</h3>
                {markersInCurrentData.length > 1 && (
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Highlight Range:</label>
                        <select
                            value={selectedReferenceMarkerId}
                            onChange={e => setSelectedReferenceMarkerId(e.target.value)}
                            className="text-sm bg-slate-50 border border-slate-200 rounded-lg py-1 px-2 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                        >
                            <option value="none">None</option>
                            {markersInCurrentData.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                    </div>
                )}
                <button
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="p-2 text-slate-400 hover:text-blue-600 transition-colors ml-auto md:ml-4"
                    title={isFullscreen ? "Exit Full Screen" : "Full Screen"}
                >
                    {isFullscreen ? <CollapseIcon /> : <ExpandIcon />}
                </button>
            </div>

            <div className={`w-full ${isFullscreen ? 'flex-1 min-h-[400px]' : 'h-[300px]'}`}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis
                            dataKey="timestamp"
                            type="number"
                            domain={['dataMin', 'dataMax']}
                            tickFormatter={(unixTime) => new Date(unixTime).toLocaleDateString()}
                            tick={{ fontSize: 12, fill: '#64748b' }}
                            tickLine={false}
                            axisLine={false}
                            dy={10}
                        />
                        <YAxis tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} domain={[0, maxY === 'auto' ? 'auto' : Math.ceil(maxY)] as any} />
                        <Tooltip
                            labelFormatter={(unixTime) => new Date(unixTime).toLocaleDateString()}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            itemStyle={{ fontSize: '14px', fontWeight: 600 }}
                            labelStyle={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}
                        />
                        <Legend
                            iconType="circle"
                            wrapperStyle={{ paddingTop: '20px', fontSize: '12px', cursor: 'pointer' }}
                            onClick={handleLegendClick}
                        />

                        {/* Render Reference Areas matching the selected marker */}
                        {referenceMarker && referenceMarker.rangeMin !== undefined && referenceMarker.rangeMax !== undefined && (
                            <>
                                <ReferenceArea
                                    y1={0}
                                    y2={referenceMarker.rangeMin}
                                    fill="rgb(255, 0, 0)"
                                    fillOpacity={0.15}
                                    stroke="transparent"
                                    ifOverflow="hidden"
                                />
                                <ReferenceArea
                                    y1={referenceMarker.rangeMin}
                                    y2={referenceMarker.rangeMax}
                                    fill="#22c55e"
                                    fillOpacity={0.15}
                                    stroke="#16a34a"
                                    strokeOpacity={0.6}
                                    ifOverflow="hidden"
                                    label={{ position: 'insideBottomLeft', value: `Min: ${referenceMarker.rangeMin}`, fill: '#16a34a', fontSize: 13, fontWeight: 'bold' } as any}
                                />
                                <ReferenceArea
                                    y1={referenceMarker.rangeMax}
                                    y2={maxY === 'auto' ? 99999 : (maxY as number) * 3}
                                    fill="rgb(255, 0, 0)"
                                    fillOpacity={0.15}
                                    stroke="transparent"
                                    ifOverflow="hidden"
                                    label={{ position: 'insideBottomLeft', value: `Max: ${referenceMarker.rangeMax}`, fill: 'rgb(200, 0, 0)', fontSize: 13, fontWeight: 'bold' } as any}
                                />
                            </>
                        )}

                        {markersInCurrentData.map((marker, index) => (
                            <Line
                                key={marker.id}
                                hide={hiddenMarkers[marker.name]}
                                type="monotone"
                                dataKey={marker.name}
                                stroke={COLORS[index % COLORS.length]}
                                strokeWidth={3}
                                dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                                activeDot={{ r: 6, strokeWidth: 0 }}
                                connectNulls
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );

    return isFullscreen ? createPortal(content, document.body) : content;
};

export default MarkerGraph;
