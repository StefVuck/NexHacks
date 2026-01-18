import React, { useEffect, useRef } from 'react';
import {
    Play,
    Zap,
    Activity,
    Server,
    TrendingUp,
    AlertTriangle,
} from 'lucide-react';
import {
    LineChart,
    Line,
    Tooltip,
    ResponsiveContainer,
    XAxis,
    YAxis,
    CartesianGrid
} from 'recharts';
import { Button } from '@/components/ui/button';
import { useWoodwide } from '@/hooks/useWoodwide';

// --- Mock Data ---

const analyticsData = [
    { name: '00:00', value: 240, cpu: 12 },
    { name: '04:00', value: 300, cpu: 18 },
    { name: '08:00', value: 500, cpu: 45 },
    { name: '12:00', value: 450, cpu: 38 },
    { name: '16:00', value: 600, cpu: 55 },
    { name: '20:00', value: 400, cpu: 30 },
    { name: '23:59', value: 350, cpu: 22 },
];

const processes = [
    { pid: 1024, name: 'helios_core.d', cpu: '12.4%', mem: '140MB', status: 'RUNNING' },
    { pid: 1025, name: 'node_listener', cpu: '0.8%', mem: '45MB', status: 'SLEEP' },
    { pid: 1026, name: 'telemetry_stream', cpu: '4.2%', mem: '210MB', status: 'RUNNING' },
    { pid: 1027, name: 'kernel_task', cpu: '0.1%', mem: '12MB', status: 'IDLE' },
];

// --- Components ---

const NetworkGraph: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rotationRef = useRef({ x: 0, y: 0 });
    const isDraggingRef = useRef(false);
    const lastMousePosRef = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = canvas.width = canvas.offsetWidth;
        let height = canvas.height = canvas.offsetHeight;

        const nodes: { x: number; y: number; z: number }[] = [];
        const nodeCount = 12;

        for (let i = 0; i < nodeCount; i++) {
            nodes.push({
                x: (Math.random() - 0.5) * 2,
                y: (Math.random() - 0.5) * 2,
                z: (Math.random() - 0.5) * 2
            });
        }

        let animationFrameId: number;

        const project = (x: number, y: number, z: number, rx: number, ry: number) => {
            let x1 = x * Math.cos(ry) - z * Math.sin(ry);
            let z1 = z * Math.cos(ry) + x * Math.sin(ry);

            let y2 = y * Math.cos(rx) - z1 * Math.sin(rx);
            let z2 = z1 * Math.cos(rx) + y * Math.sin(rx);

            const fov = 2;
            const scale = fov / (fov + z2);

            return {
                x: x1 * scale * (Math.min(width, height) / 3) + width / 2,
                y: y2 * scale * (Math.min(width, height) / 3) + height / 2,
                scale: scale,
                z: z2
            };
        };

        const render = () => {
            ctx.clearRect(0, 0, width, height);
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, width, height);

            const rx = rotationRef.current.x;
            const ry = rotationRef.current.y;

            const projectedNodes = nodes.map(node => ({
                ...node,
                ...project(node.x, node.y, node.z, rx, ry)
            }));

            // Connections
            for (let i = 0; i < nodeCount; i++) {
                for (let j = i + 1; j < nodeCount; j++) {
                    const dx = nodes[i].x - nodes[j].x;
                    const dy = nodes[i].y - nodes[j].y;
                    const dz = nodes[i].z - nodes[j].z;
                    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

                    if (dist < 1.8) {
                        const nA = projectedNodes[i];
                        const nB = projectedNodes[j];
                        const alpha = (1.8 - dist) / 1.8 * Math.min(1, nA.scale);
                        if (alpha > 0.1) {
                            ctx.beginPath();
                            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
                            ctx.lineWidth = 0.5 * nA.scale;
                            ctx.moveTo(nA.x, nA.y);
                            ctx.lineTo(nB.x, nB.y);
                            ctx.stroke();
                        }
                    }
                }
            }

            // Nodes
            ctx.fillStyle = '#fff';
            projectedNodes.forEach(p => {
                const size = 3 * p.scale;
                ctx.globalAlpha = Math.min(1, p.scale);
                ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size);
                ctx.globalAlpha = 1.0;
            });

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        const handleResize = () => {
            if (canvas) {
                width = canvas.width = canvas.offsetWidth;
                height = canvas.height = canvas.offsetHeight;
            }
        };

        const handleMouseDown = (e: MouseEvent) => {
            isDraggingRef.current = true;
            lastMousePosRef.current = { x: e.clientX, y: e.clientY };
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (!isDraggingRef.current) return;
            const deltaX = e.clientX - lastMousePosRef.current.x;
            const deltaY = e.clientY - lastMousePosRef.current.y;
            rotationRef.current.y += deltaX * 0.01;
            rotationRef.current.x += deltaY * 0.01;
            lastMousePosRef.current = { x: e.clientX, y: e.clientY };
        };

        const handleMouseUp = () => {
            isDraggingRef.current = false;
        };

        window.addEventListener('resize', handleResize);
        canvas.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('resize', handleResize);
            canvas.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return <canvas ref={canvasRef} className="w-full h-full block cursor-move" />;
};

const Panel: React.FC<{ title: string; children: React.ReactNode; className?: string; height?: string }> = ({ title, children, className, height }) => (
    <div className={`bg-[#000] border border-[#333] flex flex-col ${className}`} style={{ height }}>
        <div className="bg-[#000] px-3 py-1.5 border-b border-[#333] flex justify-between items-center select-none group">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 border border-[#444] block"></span>
                {title}
            </h3>
            <div className="flex gap-2 text-[#333] group-hover:text-[#555] transition-colors">
            </div>
        </div>
        <div className="p-0 flex-1 overflow-hidden relative">
            {children}
        </div>
    </div>
);

const MetricRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div className="flex justify-between items-center py-1.5 border-b border-[#222] last:border-0 px-3 hover:bg-[#111]">
        <span className="text-[10px] text-gray-500 font-mono">{label}</span>
        <span className="text-[10px] text-gray-300 font-mono font-bold">{value}</span>
    </div>
);

export const DashboardPage: React.FC = () => {
    const [demoSessionId, setDemoSessionId] = React.useState<string | null>(null);
    const [isStartingDemo, setIsStartingDemo] = React.useState(false);
    const [demoError, setDemoError] = React.useState<string | null>(null);

    const {
        stats,
        predictions,
        insights,
        readings,
        isLoading,
        isAnalyzing,
        error,
        analyzeTrafficData,
    } = useWoodwide({ autoFetch: true, pollInterval: 10000 });

    const handleRunAnalysis = async () => {
        await analyzeTrafficData('congestion_level');
    };

    const handleStartDemoSimulation = async () => {
        try {
            setIsStartingDemo(true);
            setDemoError(null);

            // Start simple demo data generation
            const response = await fetch('http://localhost:8000/api/woodwide/demo/start', {
                method: 'POST'
            });

            const result = await response.json();

            if (result.status === 'started' || result.status === 'already_running') {
                setDemoSessionId('demo-active');
                console.log('Demo data generation started!');
            } else {
                throw new Error(result.message || 'Failed to start demo');
            }
        } catch (err: any) {
            console.error('Failed to start demo:', err);
            setDemoError(err.message || 'Failed to start demo data generation');
        } finally {
            setIsStartingDemo(false);
        }
    };

    const handleStopDemoSimulation = async () => {
        if (!demoSessionId) return;
        try {
            await fetch('http://localhost:8000/api/woodwide/demo/stop', {
                method: 'POST'
            });
            setDemoSessionId(null);
        } catch (err) {
            console.error('Failed to stop demo:', err);
        }
    };

    // Format AI insights for display
    const formatAiInsights = () => {
        if (isAnalyzing) {
            return [
                { label: 'STATUS', value: 'ANALYZING...', color: 'text-yellow-400' },
                { label: 'PROGRESS', value: 'Training model...', color: 'text-white' },
            ];
        }

        if (predictions) {
            return [
                { label: 'MODEL_ID', value: predictions.model_id?.substring(0, 12) + '...', color: 'text-green-500' },
                { label: 'STATUS', value: predictions.training_status || 'COMPLETE', color: 'text-green-500' },
                { label: 'DATASET', value: predictions.dataset_id?.substring(0, 12) + '...', color: 'text-white' },
            ];
        }

        if (stats && stats.count > 0) {
            return [
                { label: 'DATA_POINTS', value: stats.count.toString(), color: 'text-white' },
                { label: 'NODES', value: stats.nodes?.toString() || '0', color: 'text-white' },
                { label: 'AVG_SPEED', value: stats.average_speed_kmh?.toFixed(1) + ' km/h' || 'N/A', color: 'text-white' },
            ];
        }

        return [
            { label: 'STATUS', value: 'NO DATA', color: 'text-gray-500' },
            { label: 'INFO', value: 'Waiting for sensor data...', color: 'text-gray-500' },
        ];
    };

    return (
        <div className="h-screen bg-[#000] text-[#ccc] font-sans text-xs selection:bg-white/20 overflow-hidden flex flex-col">
            {/* Top Navigation - OS Bar */}
            <header className="h-8 bg-[#000] border-b border-[#333] flex items-center justify-between px-3 select-none">
                <div className="flex items-center gap-6">
                    <div className="font-bold text-xs tracking-widest text-white flex items-center gap-2">
                        <div className="w-3 h-3 bg-white"></div>
                        HELIOS_OS <span className="text-gray-600 font-normal">v2.1.0</span>
                    </div>
                    <nav className="flex gap-4 h-full items-center">
                        {['SYSTEM', 'VIEW', 'NET', 'TOOLS', 'WINDOW', 'HELP'].map((item) => (
                            <button key={item} className="text-[10px] font-bold text-gray-500 hover:text-white transition-colors uppercase">
                                {item}
                            </button>
                        ))}
                    </nav>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono">
                        <Activity className="w-3 h-3" />
                        <span>CPU: 12%</span>
                    </div>
                    <div className="w-[1px] h-3 bg-[#333]"></div>
                    <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono">
                        <Server className="w-3 h-3" />
                        <span>MEM: 4.2GB</span>
                    </div>
                    <div className="w-[1px] h-3 bg-[#333]"></div>
                    <div className="text-[10px] text-white font-mono font-bold">
                        14:20:45 UTC
                    </div>
                </div>
            </header>

            <main className="flex-1 p-2 grid grid-cols-12 grid-rows-12 gap-2 overflow-hidden">
                {/* Left Column: Metrics & Controls */}
                <div className="col-span-3 row-span-12 flex flex-col gap-2">
                    <Panel title="System Status" className="flex-none">
                        <div className="p-3 space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-[#000] border border-[#333] p-2 text-center group hover:border-[#666] transition-colors cursor-pointer">
                                    <div className="text-[9px] uppercase text-gray-600 mb-1">Data Points</div>
                                    <div className="text-xl font-bold text-white font-mono">
                                        {stats?.count || 0}
                                    </div>
                                </div>
                                <div className="bg-[#000] border border-[#333] p-2 text-center group hover:border-[#666] transition-colors cursor-pointer">
                                    <div className="text-[9px] uppercase text-gray-600 mb-1">Sensor Nodes</div>
                                    <div className="text-xl font-bold text-white font-mono">
                                        {stats?.nodes || 0}
                                    </div>
                                </div>
                            </div>
                            <div className="border border-[#333]">
                                <MetricRow label="AVG_SPEED" value={stats?.average_speed_kmh ? `${stats.average_speed_kmh.toFixed(1)} km/h` : 'N/A'} />
                                <MetricRow label="AVG_DENSITY" value={stats?.average_density_percent ? `${stats.average_density_percent.toFixed(1)}%` : 'N/A'} />
                                <MetricRow label="LOCATIONS" value={stats?.locations?.toString() || '0'} />
                                <MetricRow label="AI_STATUS" value={predictions ? 'TRAINED' : isAnalyzing ? 'ANALYZING' : 'READY'} />
                            </div>
                        </div>
                    </Panel>

                    <Panel title="Process Control" className="flex-1">
                        <div className="p-3 flex flex-col h-full">
                            <div className="space-y-2 flex-none">
                                {!demoSessionId ? (
                                    <Button
                                        variant="outline"
                                        onClick={handleStartDemoSimulation}
                                        disabled={isStartingDemo}
                                        className="w-full justify-between rounded-none h-8 text-[10px] border-[#333] hover:bg-white hover:text-black text-gray-300 bg-[#000] font-mono uppercase transition-all"
                                    >
                                        <span>{isStartingDemo ? 'STARTING...' : 'START_DEMO_SIMULATION'}</span>
                                        <Play className="w-3 h-3" />
                                    </Button>
                                ) : (
                                    <Button
                                        variant="outline"
                                        onClick={handleStopDemoSimulation}
                                        className="w-full justify-between rounded-none h-8 text-[10px] border-[#333] hover:bg-red-500 hover:text-white text-gray-300 bg-[#000] font-mono uppercase transition-all"
                                    >
                                        <span>STOP_SIMULATION</span>
                                        <Zap className="w-3 h-3" />
                                    </Button>
                                )}
                            </div>
                            <div className="h-[1px] bg-[#333] my-2 flex-none"></div>
                            <div className="text-[9px] text-gray-600 font-mono mb-1 flex-none">&gt; SYSTEM LOGS</div>
                            <div className="flex-1 bg-[#111] border border-[#333] p-1 font-mono text-[9px] text-gray-400 overflow-y-auto min-h-0">
                                <div className="text-white">root@helios:~$ status</div>
                                {demoSessionId && <div className="text-green-500">DEMO SIMULATION RUNNING (Session: {demoSessionId.substring(0, 8)}...)</div>}
                                {demoError && <div className="text-red-500">ERROR: {demoError}</div>}
                                {!demoSessionId && !demoError && <div className="text-gray-500">Click START to begin data collection...</div>}
                            </div>
                        </div>
                    </Panel>
                </div>




                {/* Center Column: Intelligence & Data Visualization */}
                <div className="col-span-6 row-span-12 flex flex-col gap-2">
                    <Panel title="Wood Wide Intelligence" className="flex-1">
                        <div className="p-2 font-mono text-[9px] text-green-500/80 h-full overflow-hidden flex flex-col font-bold leading-relaxed">
                            <div className="mb-2 text-white border-b border-[#333] pb-1 flex justify-between items-center">
                                <span>&gt; WOODWIDE_AI_ANALYSIS --v2.1</span>
                                <Button
                                    variant="outline"
                                    onClick={handleRunAnalysis}
                                    disabled={isAnalyzing || !stats || stats.count === 0}
                                    className="h-5 px-2 text-[9px] border-[#333] hover:bg-white hover:text-black text-gray-300 bg-[#000] font-mono uppercase transition-all"
                                >
                                    {isAnalyzing ? (
                                        <>
                                            <Activity className="w-2 h-2 mr-1 animate-spin" />
                                            ANALYZING
                                        </>
                                    ) : (
                                        <>
                                            <TrendingUp className="w-2 h-2 mr-1" />
                                            RUN ANALYSIS
                                        </>
                                    )}
                                </Button>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-2">
                                {error && (
                                    <div>
                                        <span className="text-gray-500">&gt;</span> ERROR:<br />
                                        <span className="text-red-400">{error}</span>
                                    </div>
                                )}

                                {formatAiInsights().map((insight, idx) => (
                                    <div key={idx}>
                                        <span className="text-gray-500">&gt;</span> {insight.label}:<br />
                                        <span className={insight.color}>{insight.value}</span>
                                    </div>
                                ))}

                                {predictions && predictions.predictions && (
                                    <>
                                        <div>
                                            <span className="text-gray-500">&gt;</span> PREDICTIONS:<br />
                                            <span className="text-green-400">Model training complete. {Object.keys(predictions.predictions.prediction || {}).length} predictions generated.</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">&gt;</span> FORECAST:<br />
                                            <div className="ml-2 mt-1 grid grid-cols-10 gap-1">
                                                {Object.entries(predictions.predictions.prediction || {}).slice(0, 50).map(([idx, level]: [string, any]) => (
                                                    <div
                                                        key={idx}
                                                        className={`w-2 h-2 border ${
                                                            level === 0 ? 'bg-green-600 border-green-600' :
                                                            level === 1 ? 'bg-yellow-600 border-yellow-600' :
                                                            level === 2 ? 'bg-orange-600 border-orange-600' :
                                                            'bg-red-600 border-red-600'
                                                        }`}
                                                        title={`Step ${idx}: Congestion Level ${level}`}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">&gt;</span> SUMMARY:<br />
                                            <span className="text-white ml-2">
                                                {(() => {
                                                    const preds = Object.values(predictions.predictions.prediction || {});
                                                    const counts = [0, 0, 0, 0];
                                                    preds.forEach((level: any) => counts[level]++);
                                                    return (
                                                        <>
                                                            <div>Low: {counts[0]} | Moderate: {counts[1]}</div>
                                                            <div>High: {counts[2]} | Severe: {counts[3]}</div>
                                                        </>
                                                    );
                                                })()}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">&gt;</span> RECOMMENDATION:<br />
                                            <span className="text-white">
                                                {(() => {
                                                    const preds = Object.values(predictions.predictions.prediction || {});
                                                    const severeCount = preds.filter((l: any) => l >= 2).length;
                                                    const severePercent = Math.round((severeCount / preds.length) * 100);

                                                    if (severePercent > 30) {
                                                        return '⚠️ HIGH congestion expected. Consider traffic management measures.';
                                                    } else if (severePercent > 15) {
                                                        return '⚡ MODERATE congestion expected. Monitor closely.';
                                                    } else {
                                                        return '✓ LOW congestion expected. Normal traffic flow anticipated.';
                                                    }
                                                })()}
                                            </span>
                                        </div>
                                    </>
                                )}

                                {!predictions && !isAnalyzing && stats && stats.count > 0 && (
                                    <div>
                                        <span className="text-gray-500">&gt;</span> READY:<br />
                                        <span className="text-white">
                                            {stats.count} data points collected. Click "RUN ANALYSIS" to generate predictions.
                                        </span>
                                    </div>
                                )}

                                {(!stats || stats.count === 0) && !isAnalyzing && (
                                    <div>
                                        <span className="text-gray-500">&gt;</span> WAITING:<br />
                                        <span className="text-gray-400">
                                            No sensor data received. Start simulation or connect devices.
                                        </span>
                                    </div>
                                )}

                                {stats && stats.congestion_distribution && Object.keys(stats.congestion_distribution).length > 0 && !predictions && (
                                    <div>
                                        <span className="text-gray-500">&gt;</span> CONGESTION ANALYSIS:<br />
                                        {Object.entries(stats.congestion_distribution).map(([level, count]) => (
                                            <div key={level} className="ml-2 text-gray-300">
                                                Level {level}: {count} readings {parseInt(level) >= 2 ? '⚠️' : ''}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </Panel>

                    {/* Bottom Graph: Network Traffic */}
                    <Panel title="Network I/O Stream" className="flex-1">
                        <div className="h-full w-full bg-[#000] p-2 relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={analyticsData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                                    <XAxis dataKey="name" fontSize={10} stroke="#444" tickLine={false} axisLine={false} tick={{ fill: '#666' }} />
                                    <YAxis fontSize={10} stroke="#444" tickLine={false} axisLine={false} tick={{ fill: '#666' }} />
                                    <Tooltip
                                        cursor={{ stroke: '#444', strokeWidth: 1 }}
                                        contentStyle={{ backgroundColor: '#000', border: '1px solid #fff', fontSize: '10px', fontFamily: 'monospace', color: '#fff' }}
                                    />
                                    <Line type="step" dataKey="value" stroke="#fff" strokeWidth={1.5} dot={false} activeDot={{ r: 4, fill: '#fff' }} />
                                    <Line type="monotone" dataKey="cpu" stroke="#444" strokeWidth={1} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </Panel>
                </div>

                {/* Right Column: Sensor Readings & Logs */}
                <div className="col-span-3 row-span-12 flex flex-col gap-2">
                    <Panel title="Sensor Readings" className="h-[60%]">
                        <div className="overflow-auto scrollbar-hide h-full">
                            {(() => {
                                // Group readings by node_id, keeping only the latest reading for each sensor
                                const latestReadings = new Map<string, typeof readings[0]>();
                                readings.forEach(reading => {
                                    const existing = latestReadings.get(reading.node_id);
                                    if (!existing || reading.timestamp > existing.timestamp) {
                                        latestReadings.set(reading.node_id, reading);
                                    }
                                });

                                const uniqueReadings = Array.from(latestReadings.values());

                                return uniqueReadings.length > 0 ? (
                                    <table className="w-full text-left font-mono text-[9px]">
                                        <thead className="bg-[#111] text-gray-500 sticky top-0 z-10">
                                            <tr>
                                                <th className="px-1 py-2 border-b border-[#333]">ID</th>
                                                <th className="px-1 py-2 border-b border-[#333]">LOC</th>
                                                <th className="px-1 py-2 border-b border-[#333] text-right">SPD</th>
                                                <th className="px-1 py-2 border-b border-[#333] text-right">DEN</th>
                                                <th className="px-1 py-2 border-b border-[#333] text-right">CNG</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#222]">
                                            {uniqueReadings.map((reading) => (
                                                <tr key={reading.node_id} className="hover:bg-white hover:text-black cursor-pointer group transition-colors">
                                                    <td className="px-1 py-2 text-gray-300 group-hover:text-black font-bold truncate max-w-[60px]" title={reading.node_id}>
                                                        {reading.node_id.replace('traffic_sensor_', 'S')}
                                                    </td>
                                                    <td className="px-1 py-2 text-gray-400 group-hover:text-black truncate max-w-[40px]" title={reading.location}>
                                                        {reading.location.replace('intersection_', '')}
                                                    </td>
                                                    <td className="px-1 py-2 text-right text-gray-400 group-hover:text-black">
                                                        {reading.average_speed_kmh ? `${reading.average_speed_kmh.toFixed(0)}` : '-'}
                                                    </td>
                                                    <td className="px-1 py-2 text-right text-gray-400 group-hover:text-black">
                                                        {reading.traffic_density_percent ? `${reading.traffic_density_percent.toFixed(0)}%` : '-'}
                                                    </td>
                                                    <td className="px-1 py-2 text-right group-hover:text-black">
                                                        <span className={`px-1 text-[8px] border ${
                                                            reading.congestion_level === 0 ? 'border-green-600 text-green-400' :
                                                            reading.congestion_level === 1 ? 'border-yellow-600 text-yellow-400' :
                                                            reading.congestion_level === 2 ? 'border-orange-600 text-orange-400' :
                                                            'border-red-600 text-red-400'
                                                        } group-hover:border-black group-hover:text-black`}>
                                                            {reading.congestion_level ?? '-'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="p-4 text-center text-gray-500 font-mono text-[10px]">
                                        <div className="mb-2">NO SENSOR DATA</div>
                                        <div className="text-[9px] text-gray-600">
                                            {demoSessionId ? 'Waiting for sensor readings...' : 'Start simulation to see data'}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </Panel>

                    <Panel title="Network Topology" className="flex-1">
                        <div className="w-full h-full bg-[#000] relative group">
                            <NetworkGraph />
                            <div className="absolute top-2 right-2 text-[9px] text-gray-500 font-mono border border-[#333] bg-black px-1">
                                NODES: 12 ONLINE
                            </div>
                        </div>
                    </Panel>
                </div>

            </main>
        </div>
    );
};

export default DashboardPage;
