import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Terminal, Shield, Cpu, Zap, ChevronRight, Activity, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
    const navigate = useNavigate();
    const [typedText, setTypedText] = useState('');
    const fullText = "Create a swarm of 5 drones to monitor the perimeter...";

    useEffect(() => {
        let index = 0;
        const interval = setInterval(() => {
            setTypedText(fullText.slice(0, index));
            index++;
            if (index > fullText.length) clearInterval(interval);
        }, 50);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-blue-500/30 overflow-hidden relative">
            {/* Grid Background */}
            <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" 
                style={{
                    backgroundImage: 'linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)',
                    backgroundSize: '40px 40px'
                }}
            />
            
            {/* Vignette */}
            <div className="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,#000000_90%)]" />

            {/* Navigation */}
            <nav className="relative z-10 flex items-center justify-between px-8 py-6 border-b border-white/5 bg-black/50 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                    <Shield className="w-6 h-6 text-blue-500" />
                    <span className="text-xl font-bold tracking-tight">SWARM <span className="text-gray-500">ARCHITECT</span></span>
                </div>
                <div className="flex items-center gap-6 text-sm font-medium text-gray-400">
                    <a href="#" className="hover:text-white transition-colors">Documentation</a>
                    <a href="#" className="hover:text-white transition-colors">Mission</a>
                    <button className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-all flex items-center gap-2">
                        <span>Deploy</span>
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
                <div className="mb-6 flex items-center gap-2 text-blue-500/80 text-xs font-mono uppercase tracking-[0.2em] border border-blue-500/20 px-3 py-1 bg-blue-500/5 backdrop-blur-md">
                    <Activity className="w-3 h-3" />
                    <span>System Operational</span>
                </div>

                <motion.h1 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="text-6xl md:text-8xl font-bold tracking-tighter mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-600"
                >
                    Natural Language<br />to <span className="text-white">Physical Logic</span>
                </motion.h1>

                <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4, duration: 0.8 }}
                    className="text-gray-400 max-w-2xl text-lg mb-12 leading-relaxed"
                >
                    Deploy complex embedded swarms using plain English. 
                    From generative firmware to verified simulation in seconds.
                </motion.p>

                {/* Interactive Terminal Input */}
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 }}
                    className="w-full max-w-2xl relative group"
                >
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 to-purple-600/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative flex items-center bg-[#0a0a0a] border border-white/10 p-4 shadow-2xl">
                        <Terminal className="w-5 h-5 text-gray-500 mr-3" />
                        <span className="text-gray-500 mr-2 text-sm select-none">{'>'}</span>
                        <div className="flex-1 font-mono text-sm text-gray-300 bg-transparent outline-none">
                            {typedText}<span className="animate-pulse">_</span>
                        </div>
                        <button 
                            onClick={() => navigate('/app')}
                            className="ml-4 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold tracking-wide uppercase transition-colors"
                        >
                            Execute
                        </button>
                    </div>
                    <div className="mt-2 text-right">
                        <span className="text-[10px] text-gray-600 uppercase tracking-wider">Example: "3 temperature sensors reporting to aggregation server"</span>
                    </div>
                </motion.div>
            </main>

            {/* Feature Grid */}
            <section className="relative z-10 px-8 py-24 border-t border-white/5 bg-black/20 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
                    <FeatureCard 
                        icon={<Cpu className="w-6 h-6 text-blue-400" />}
                        title="Generative Firmware"
                        desc="LLM-driven C code generation optimized for STM32 and ESP32 platforms."
                    />
                    <FeatureCard 
                        icon={<Globe className="w-6 h-6 text-purple-400" />}
                        title="Renode Simulation"
                        desc="Validate binary logic in a physics-accurate emulated environment before deployment."
                    />
                    <FeatureCard 
                        icon={<Zap className="w-6 h-6 text-amber-400" />}
                        title="Instant Deployment"
                        desc="Provision cloud aggregation servers via Terraform with a single command."
                    />
                </div>
            </section>
        </div>
    );
};

const FeatureCard = ({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) => (
    <div className="p-6 border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors group">
        <div className="mb-4 p-3 bg-white/5 w-fit rounded-none border border-white/5 group-hover:border-white/10 transition-colors">
            {icon}
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
    </div>
);

export default LandingPage;
