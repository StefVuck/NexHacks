import React, { useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Map from './components/Map';
import LandingPage from './pages/LandingPage';
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Moon, Sun } from "lucide-react";

// Lazy load DeployPage for better initial load
const DeployPage = lazy(() => import('./pages/DeployPage'));

// Simple Map App Component
function MapApp() {
  const [theme, setTheme] = useState('dark');

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  // Initialize theme on mount
  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background text-foreground font-sans transition-colors duration-300">
      {/* Full Screen Map */}
      <div className="absolute inset-0 z-0">
        <Map theme={theme} />
      </div>

      {/* Floating Theme Toggle (Top Right) */}
      <Card className="absolute top-4 right-4 z-10 w-40 bg-background/90 backdrop-blur border-border/50 shadow-lg">
        <div className="p-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="theme-toggle" className="text-xs cursor-pointer flex items-center gap-2">
              {theme === 'dark' ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
              {theme === 'dark' ? 'Dark' : 'Light'}
            </Label>
            <Switch
              id="theme-toggle"
              checked={theme === 'dark'}
              onCheckedChange={toggleTheme}
              className="scale-75"
            />
          </div>
        </div>
      </Card>
    </div>
  );
}

// Loading fallback for lazy-loaded pages
function PageLoader() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    </div>
  );
}

// Main App with Routing
function App() {
  return (
    <Router>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/app" element={<MapApp />} />
          <Route path="/deploy/:id" element={<DeployPage />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
