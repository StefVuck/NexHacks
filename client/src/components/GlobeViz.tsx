
import React, { useEffect, useState, useRef } from 'react';
import Globe from 'react-globe.gl';

interface GlobeProps {
    width?: number;
    height?: number;
}

const GlobeViz: React.FC<GlobeProps> = ({ width, height }) => {
    const globeEl = useRef<any>(null);
    const [places, setPlaces] = useState<any[]>([]);
    const [arcs, setArcs] = useState<any[]>([]);

    useEffect(() => {
        // Generate random data for devices (places)
        const N = 30;
        const generatedPlaces = [...Array(N).keys()].map(() => ({
            lat: (Math.random() - 0.5) * 160,
            lng: (Math.random() - 0.5) * 360,
            size: Math.random() / 3,
            name: `Device ${Math.floor(Math.random() * 1000)}`
        }));

        setPlaces(generatedPlaces);

        // Generate arcs (links)
        const generatedArcs = [...Array(30).keys()].map(() => {
            const start = generatedPlaces[Math.floor(Math.random() * N)];
            const end = generatedPlaces[Math.floor(Math.random() * N)];
            return {
                startLat: start.lat,
                startLng: start.lng,
                endLat: end.lat,
                endLng: end.lng,
                color: ['#FCD34D', '#F59E0B'][Math.round(Math.random())] // yellow/amber shades
            };
        });

        setArcs(generatedArcs);
    }, []);

    useEffect(() => {
        // Auto-rotate
        if (globeEl.current) {
            globeEl.current.controls().autoRotate = true;
            globeEl.current.controls().autoRotateSpeed = 0.5;
            globeEl.current.pointOfView({ altitude: 2.5 });
        }
    }, [width]); // Re-apply when width changes/re-renders

    return (
        <Globe
            ref={globeEl}
            globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
            backgroundColor="rgba(0,0,0,0)"
            arcsData={arcs}
            arcColor="color"
            arcDashLength={0.5}
            arcDashGap={1}
            arcDashAnimateTime={() => Math.random() * 4000 + 500}
            arcStroke={0.5}
            pointsData={places}
            pointColor={() => '#60A5FA'} // blue-400
            pointAltitude={0.05}
            pointRadius={0.4}
            atmosphereColor="#3B82F6"
            atmosphereAltitude={0.15}
            width={width}
            height={height}
        />
    );
};

export default GlobeViz;
