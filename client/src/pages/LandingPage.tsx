import React, { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Terminal, Cpu, Zap, ChevronRight, Activity, Globe as GlobeIcon, Shield, Radio } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import heliosLogo from '../assets/helios.png';

const GlobeViz = React.lazy(() => import('../components/GlobeViz'));

const LandingPage = () => {
    const navigate = useNavigate();
    const [typedText, setTypedText] = useState('');
    const fullText = "Deploy autonomous swarms. Anywhere. Anytime.";
    const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

    useEffect(() => {
        const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        let index = 0;
        const interval = setInterval(() => {
            setTypedText(fullText.slice(0, index));
            index++;
            if (index > fullText.length) clearInterval(interval);
        }, 80);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="fixed inset-0 bg-[#0a0a0a] text-white font-sans selection:bg-blue-500/30 overflow-hidden flex flex-col">
            {/* Globe Background */}
            <div className="absolute inset-0 z-0 opacity-40">
                <Suspense fallback={<div className="w-full h-full bg-[#0a0a0a]" />}>
                    <GlobeViz width={dimensions.width} height={dimensions.height} />
                </Suspense>
            </div>

            {/* Grid Background Overlay */}
            <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none"
                style={{
                    backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
                    backgroundSize: '50px 50px'
                }}
            />

            {/* Vignette */}
            <div className="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(10,10,10,0.9)_100%)]" />

            {/* Navigation */}
            <nav className="relative z-20 flex-none flex items-center justify-between px-12 py-6 border-b border-white/[0.08] bg-black/40 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <img src={heliosLogo} alt="Helios" className="w-15 h-12 object-contain" />
                    <span className="text-xl font-bold tracking-[0.02em] text-white"></span>
                </div>
                <div className="flex items-center gap-8 text-[13px] font-medium">
                    <a href="#capabilities" className="text-gray-400 hover:text-white transition-colors">Capabilities</a>
                    <a href="#technology" className="text-gray-400 hover:text-white transition-colors">Technology</a>
                    <a href="#mission" className="text-gray-400 hover:text-white transition-colors">Mission</a>
                    <button
                        onClick={() => navigate('/projects')}
                        className="px-5 py-2.5 bg-white text-black hover:bg-gray-200 transition-all flex items-center gap-2 font-semibold text-[13px] tracking-wide"
                    >
                        <span>LAUNCH PLATFORM</span>
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative z-10 flex-1 flex items-center justify-center px-12 pb-20 pt-10">
                <div className="max-w-6xl w-full">
                    {/* Status Badge */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="flex items-center gap-2 mb-8"
                    >
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-sm">
                            <Activity className="w-3 h-3 text-emerald-400" />
                            <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider">System Operational</span>
                        </div>
                    </motion.div>

                    {/* Main Headline */}
                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="text-7xl font-bold leading-[1.1] mb-8 tracking-tight"
                    >
                        Autonomous Systems.
                        <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-500">
                            Intelligent Swarms.
                        </span>
                    </motion.h1>

                    {/* Subheadline */}
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4, duration: 0.8 }}
                        className="text-xl text-gray-400 max-w-2xl mb-12 leading-relaxed"
                    >
                        Deploy complex embedded swarms using natural language. From generative firmware to verified simulation in seconds.
                    </motion.p>

                    {/* Terminal Command Input */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.6 }}
                        className="max-w-2xl relative group mb-12"
                    >
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600/30 to-purple-600/30 blur opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="relative flex items-center bg-black/80 border border-white/10 p-5 backdrop-blur-xl">
                            <Terminal className="w-5 h-5 text-gray-500 mr-3 flex-shrink-0" />
                            <span className="text-gray-500 mr-2 text-sm select-none font-mono">$</span>
                            <div className="flex-1 font-mono text-sm text-gray-300">
                                {typedText}<span className="animate-pulse">_</span>
                            </div>
                            <button
                                onClick={() => navigate('/projects')}
                                className="ml-4 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold tracking-wider uppercase transition-colors"
                            >
                                EXECUTE
                            </button>
                        </div>
                    </motion.div>

                    {/* Stats Row */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8 }}
                        className="flex items-center gap-12"
                    >
                        <StatItem value="<1s" label="Deployment Time" />
                        <StatItem value="100%" label="Mission Success" />
                        <StatItem value="∞" label="Scalability" />
                    </motion.div>
                </div>
            </section>
        </div>
    );
};

const StatItem = ({ value, label }: { value: string, label: string }) => (
    <div>
        <div className="text-3xl font-bold text-white mb-1">{value}</div>
        <div className="text-xs text-gray-500 uppercase tracking-wider font-mono">{label}</div>
    </div>
);



export default LandingPage;
