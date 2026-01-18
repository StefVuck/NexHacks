import React, { useEffect, useRef } from 'react';
import {
    Play,
    Zap,
    Activity,
    Server,
    Minimize2,
    Maximize2,
    X,
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

const nodes = [
    { id: 'n-001', ip: '192.168.1.10', lat: '12ms', load: '0.45', status: 'OK' },
    { id: 'n-002', ip: '192.168.1.11', lat: '14ms', load: '0.22', status: 'OK' },
    { id: 'n-003', ip: '192.168.1.12', lat: '15ms', load: '0.31', status: 'OK' },
    { id: 'n-004', ip: '192.168.1.13', lat: '11ms', load: '0.18', status: 'OK' },
    { id: 'n-005', ip: '192.168.1.14', lat: '98ms', load: '1.20', status: 'WARN' },
    { id: 'n-006', ip: '192.168.1.15', lat: '13ms', load: '0.25', status: 'OK' },
    { id: 'n-007', ip: '192.168.1.16', lat: '14ms', load: '0.28', status: 'OK' },
    { id: 'n-008', ip: '192.168.1.17', lat: 'N/A', load: '0.00', status: 'ERR' },
    { id: 'n-009', ip: '192.168.1.18', lat: '16ms', load: '0.41', status: 'OK' },
    { id: 'n-010', ip: '192.168.1.19', lat: '12ms', load: '0.33', status: 'OK' },
    { id: 'n-011', ip: '192.168.1.20', lat: '10ms', load: '0.15', status: 'OK' },
    { id: 'n-012', ip: '192.168.1.21', lat: '14ms', load: '0.39', status: 'OK' },
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
                <Minimize2 className="w-3 h-3" />
                <Maximize2 className="w-3 h-3" />
                <X className="w-3 h-3" />
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
                <div className="col-span-3 row-span-8 flex flex-col gap-2">
                    <Panel title="System Status" className="flex-none">
                        <div className="p-3 space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-[#000] border border-[#333] p-2 text-center group hover:border-[#666] transition-colors cursor-pointer">
                                    <div className="text-[9px] uppercase text-gray-600 mb-1">Active Nodes</div>
                                    <div className="text-xl font-bold text-white font-mono">12<span className="text-gray-600 text-sm">/12</span></div>
                                </div>
                                <div className="bg-[#000] border border-[#333] p-2 text-center group hover:border-[#666] transition-colors cursor-pointer">
                                    <div className="text-[9px] uppercase text-gray-600 mb-1">Warnings</div>
                                    <div className="text-xl font-bold text-white font-mono">02</div>
                                </div>
                            </div>
                            <div className="border border-[#333]">
                                <MetricRow label="KERNEL_VER" value="5.15.0-generic" />
                                <MetricRow label="UPTIME" value="14d 02h 12m" />
                                <MetricRow label="LOAD_AVG" value="0.45 0.52 0.48" />
                                <MetricRow label="SWARM_HASH" value="a1b2...c3d4" />
                            </div>
                        </div>
                    </Panel>

                    <Panel title="Process Control" className="flex-1">
                        <div className="p-3 space-y-2">
                            <Button variant="outline" className="w-full justify-between rounded-none h-8 text-[10px] border-[#333] hover:bg-white hover:text-black text-gray-300 bg-[#000] font-mono uppercase transition-all">
                                <span>INIT_DEPLOY_SEQUENCE</span>
                                <Play className="w-3 h-3" />
                            </Button>
                            <Button variant="outline" className="w-full justify-between rounded-none h-8 text-[10px] border-[#333] hover:bg-white hover:text-black text-gray-300 bg-[#000] font-mono uppercase transition-all">
                                <span>EMERGENCY_HALT</span>
                                <Zap className="w-3 h-3" />
                            </Button>
                            <div className="h-[1px] bg-[#333] my-2"></div>
                            <div className="text-[9px] text-gray-600 font-mono mb-1">&gt; SYSTEM LOGS</div>
                            <div className="h-20 bg-[#111] border border-[#333] p-1 font-mono text-[9px] text-gray-400 overflow-y-auto">
                                <div className="text-white">root@helios:~$ status</div>
                                <div className="text-green-500">ALL SYSTEMS GO.</div>
                                <div>Waiting for input...</div>
                            </div>
                        </div>
                    </Panel>
                </div>

                {/* Bottom Left: Network Topology */}
                <div className="col-span-3 row-span-4">
                    <Panel title="Network Topology" className="h-full">
                        <div className="w-full h-full bg-[#000] relative group">
                            <NetworkGraph />
                            <div className="absolute top-2 right-2 text-[9px] text-gray-500 font-mono border border-[#333] bg-black px-1">
                                NODES: 12 ONLINE
                            </div>
                        </div>
                    </Panel>
                </div>


                {/* Center Column: Data Visualization */}
                <div className="col-span-6 row-span-12 flex flex-col gap-2">
                    {/* Top Graph: Network Traffic */}
                    <Panel title="Network I/O Stream" className="h-full">
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

                {/* Right Column: Node List & Logs */}
                <div className="col-span-3 row-span-12 flex flex-col gap-2">
                    <Panel title="Active Nodes Directory" className="h-[60%]">
                        <div className="overflow-auto scrollbar-hide">
                            <table className="w-full text-left font-mono text-[10px]">
                                <thead className="bg-[#111] text-gray-500 sticky top-0 z-10">
                                    <tr>
                                        <th className="p-2 border-b border-[#333]">ID</th>
                                        <th className="p-2 border-b border-[#333]">STATUS</th>
                                        <th className="p-2 border-b border-[#333] text-right">LOAD</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#222]">
                                    {nodes.map((n, i) => (
                                        <tr key={n.id} className="hover:bg-white hover:text-black cursor-pointer group transition-colors">
                                            <td className="p-2 text-gray-300 group-hover:text-black font-bold">{n.id}</td>
                                            <td className="p-2">
                                                <span className={`px-1 text-[9px] border ${n.status === 'OK' ? 'border-gray-600 text-gray-400 group-hover:border-black group-hover:text-black' :
                                                    'border-white text-white group-hover:border-black group-hover:text-black'
                                                    }`}>
                                                    {n.status}
                                                </span>
                                            </td>
                                            <td className="p-2 text-right text-gray-500 group-hover:text-black">{n.load}</td>
                                        </tr>
                                    ))}
                                    {/* Duplicate nodes for scroll effect */}
                                    {[...Array(10)].map((_, i) => (
                                        <tr key={i} className="hover:bg-white hover:text-black cursor-pointer group transition-colors">
                                            <td className="p-2 text-gray-500 group-hover:text-black">n-0{10 + i}</td>
                                            <td className="p-2"><span className="px-1 text-[9px] border border-gray-800 text-gray-600 group-hover:border-black group-hover:text-black">IDLE</span></td>
                                            <td className="p-2 text-right text-gray-600 group-hover:text-black">0.02</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Panel>

                    <Panel title="Daemon Processes" className="flex-1">
                        <table className="w-full text-left font-mono text-[10px]">
                            <thead className="bg-[#000] text-gray-500 border-b border-[#333]">
                                <tr>
                                    <th className="p-1">PID</th>
                                    <th>CMD</th>
                                    <th className="text-right">MEM</th>
                                </tr>
                            </thead>
                            <tbody>
                                {processes.map(p => (
                                    <tr key={p.pid} className="hover:bg-[#111] cursor-pointer text-gray-400">
                                        <td className="p-1 text-gray-600">{p.pid}</td>
                                        <td>{p.name}</td>
                                        <td className="text-right">{p.mem}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Panel>
                </div>

            </main>
        </div>
    );
};

export default DashboardPage;
