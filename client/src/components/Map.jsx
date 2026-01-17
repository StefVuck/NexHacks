import React, { useEffect, useState, useRef, useMemo } from 'react';
import Map, { Source, Layer, Marker, Popup, useMap } from 'react-map-gl';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { getServicePoints } from '../services/ilpApi';
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw } from "lucide-react";

// Access Token
const MAPBOX_TOKEN = 'pk.eyJ1IjoiYWtzaGF6NyIsImEiOiJjbWlnM2lhbTIwMmVwM2RzODY5M3Vzd2dqIn0.oou6CIFHrUZ1u63Ayr22HQ';

const ROUTE_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// Smart Drone Animator for Mapbox
const DroneAnimator = ({ dronePath, color, isPlaying, speed, onDeliveryStatusUpdate, theme }) => {
    const [position, setPosition] = useState(null);
    const [currentDeliveryIndex, setCurrentDeliveryIndex] = useState(0);
    const [isHovering, setIsHovering] = useState(false);
    const requestRef = useRef();
    const startTimeRef = useRef();
    const [progress, setProgress] = useState(0);

    // Reset when dronePath changes
    useEffect(() => {
        if (!dronePath || dronePath.deliveries.length === 0) {
            setPosition(null);
            setCurrentDeliveryIndex(0);
            setProgress(0);
            setIsHovering(false);
            startTimeRef.current = null;
            return;
        }
        const startPos = dronePath.deliveries[0].flightPath[0];
        setPosition([startPos.lng, startPos.lat]); // Mapbox uses [lng, lat]
        setCurrentDeliveryIndex(0);
        setProgress(0);
        setIsHovering(false);
        startTimeRef.current = null;
    }, [dronePath]);

    useEffect(() => {
        if (!isPlaying || isHovering || !dronePath || dronePath.deliveries.length === 0) {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            startTimeRef.current = null;
            return;
        }

        const currentDelivery = dronePath.deliveries[currentDeliveryIndex];
        if (!currentDelivery) {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            startTimeRef.current = null;
            return;
        }

        const segmentCoords = currentDelivery.flightPath.map(p => [p.lng, p.lat]); // [lng, lat]

        if (progress === 0 && onDeliveryStatusUpdate) {
            onDeliveryStatusUpdate(currentDelivery.deliveryId, 'in-progress');
        }

        const duration = 3000 / speed; // Adjust duration based on speed

        const animate = (time) => {
            if (!startTimeRef.current) startTimeRef.current = time - (progress * duration);

            const elapsed = time - startTimeRef.current;
            const newProgress = Math.min(elapsed / duration, 1);
            setProgress(newProgress);

            const totalPoints = segmentCoords.length;
            const index = Math.floor(newProgress * (totalPoints - 1));
            const nextIndex = Math.min(index + 1, totalPoints - 1);

            const p1 = segmentCoords[index];
            const p2 = segmentCoords[nextIndex];

            const segmentProgress = (newProgress * (totalPoints - 1)) - index;
            const lng = p1[0] + (p2[0] - p1[0]) * segmentProgress;
            const lat = p1[1] + (p2[1] - p1[1]) * segmentProgress;

            setPosition([lng, lat]);

            if (newProgress >= 1) {
                setPosition(segmentCoords[segmentCoords.length - 1]);
                setIsHovering(true);
                if (onDeliveryStatusUpdate) {
                    onDeliveryStatusUpdate(currentDelivery.deliveryId, 'delivering');
                }

                setTimeout(() => {
                    setIsHovering(false);
                    if (onDeliveryStatusUpdate) {
                        onDeliveryStatusUpdate(currentDelivery.deliveryId, 'completed');
                    }
                    setCurrentDeliveryIndex(prev => prev + 1);
                    setProgress(0);
                    startTimeRef.current = null;
                }, 1500 / speed); // Also speed up hover time
            } else {
                requestRef.current = requestAnimationFrame(animate);
            }
        };

        requestRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(requestRef.current);
    }, [isPlaying, isHovering, currentDeliveryIndex, dronePath, progress, onDeliveryStatusUpdate, speed]);

    if (!position) return null;

    const strokeColor = theme === 'dark' ? 'white' : 'black';

    return (
        <Marker longitude={position[0]} latitude={position[1]} anchor="center">
            <div style={{
                filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.5))',
                width: '48px', height: '48px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transform: 'translateY(-50%)' // Adjust for anchor
            }}>
                <svg fill={color} width="100%" height="100%" viewBox="0 0 64 64" style={{ overflow: 'visible' }}>
                    <path stroke={strokeColor} strokeWidth="2" d="M32,49c2.8,0,5-2.2,5-5s-2.2-5-5-5s-5,2.2-5,5S29.2,49,32,49z M32,41c1.7,0,3,1.3,3,3s-1.3,3-3,3s-3-1.3-3-3    S30.3,41,32,41z" />
                    <path stroke={strokeColor} strokeWidth="2" d="M25.6,48c-0.5,0.3-0.6,0.9-0.3,1.4c1.5,2.3,4,3.6,6.7,3.6s5.2-1.3,6.7-3.6c0.3-0.5,0.2-1.1-0.3-1.4    c-0.5-0.3-1.1-0.2-1.4,0.3C35.9,50,34,51,32,51s-3.9-1-5-2.7C26.7,47.8,26.1,47.7,25.6,48z" />
                    <path stroke={strokeColor} strokeWidth="2" d="M24.1,51.1c-0.3-0.4-1-0.5-1.4-0.2c-0.4,0.3-0.5,1-0.2,1.4c2.3,3,5.7,4.7,9.5,4.7s7.2-1.7,9.5-4.7    c0.3-0.4,0.3-1.1-0.2-1.4c-0.4-0.3-1.1-0.3-1.4,0.2C38,53.6,35.1,55,32,55S26,53.6,24.1,51.1z" />
                    <path stroke={strokeColor} strokeWidth="2" d="M42.8,53.9C40.1,57.1,36.2,59,32,59s-8.1-1.9-10.8-5.1c-0.4-0.4-1-0.5-1.4-0.1c-0.4,0.4-0.5,1-0.1,1.4    C22.7,58.9,27.2,61,32,61s9.3-2.1,12.3-5.8c0.4-0.4,0.3-1.1-0.1-1.4C43.8,53.4,43.1,53.5,42.8,53.9z" />
                    <path stroke={strokeColor} strokeWidth="2" d="M32,34c1.7,0,3-1.3,3-3s-1.3-3-3-3s-3,1.3-3,3S30.3,34,32,34z M32,30c0.6,0,1,0.4,1,1s-0.4,1-1,1s-1-0.4-1-1    S31.4,30,32,30z" />
                    <path stroke={strokeColor} strokeWidth="2" d="M58.5,3h-11C46.1,3,45,4.1,45,5.5S46.1,8,47.5,8H52v2h-1c-0.6,0-1,0.4-1,1c0,1.7-1.3,3-3,3h-3.2c-0.4-1.2-1.5-2-2.8-2h-3    H26h-3c-1.3,0-2.4,0.8-2.8,2H17c-1.7,0-3-1.3-3-3c0-0.6-0.4-1-1-1h-1V8h4.5C17.9,8,19,6.9,19,5.5S17.9,3,16.5,3h-11    C4.1,3,3,4.1,3,5.5S4.1,8,5.5,8H10v2H9c-0.6,0-1,0.4-1,1c0,4.9,3.9,8.8,8.7,9c-3.4,1.6-5.7,5-5.7,9v16c0,0,0,0,0,0    c-1.2,0.9-2,2.3-2,4c0,0.6,0.4,1,1,1h8c0.6,0,1-0.4,1-1c0-1.6-0.8-3.1-2-4c0,0,0,0,0,0V29c0-2.1,1.7-3.9,3.8-4    c0.5,0.6,1.3,1,2.2,1v3c0,5,4,9,9,9s9-4,9-9v-3c0.9,0,1.7-0.4,2.2-1c2.1,0.1,3.8,1.8,3.8,4v16c0,0,0,0,0,0c-1.2,0.9-2,2.3-2,4    c0,0.6,0.4,1,1,1h8c0.6,0,1-0.4,1-1c0-1.6-0.8-3.1-2-4c0,0,0,0,0,0V29c0-4-2.3-7.4-5.7-9c4.8-0.2,8.7-4.1,8.7-9c0-0.6-0.4-1-1-1    h-1V8h4.5C59.9,8,61,6.9,61,5.5S59.9,3,58.5,3z M5,5.5C5,5.2,5.2,5,5.5,5h11C16.8,5,17,5.2,17,5.5S16.8,6,16.5,6h-11    C5.2,6,5,5.8,5,5.5z M37,14v3c0,0.6-0.4,1-1,1h-8c-0.6,0-1-0.4-1-1v-3H37z M10.1,12h2c0.5,2.3,2.5,4,4.9,4h3v2h-3    C13.5,18,10.6,15.4,10.1,12z M11.2,48c0.4-1.2,1.5-2,2.8-2s2.4,0.8,2.8,2H11.2z M15,29v15.1C14.7,44,14.3,44,14,44s-0.7,0-1,0.1    V29c0-4.1,3.1-7.4,7-7.9V23c0,0,0,0.1,0,0.1C17.2,23.6,15,26,15,29z M39,29c0,3.9-3.1,7-7,7s-7-3.1-7-7v-3h14V29z M41,24h-1H24h-1    c-0.6,0-1-0.4-1-1v-4v-4c0-0.6,0.4-1,1-1h2v3c0,1.7,1.3,3,3,3h8c1.7,0,3-1.3,3-3v-3h2c0.6,0,1,0.4,1,1v4v4C42,23.6,41.6,24,41,24z     M47.2,48c0.4-1.2,1.5-2,2.8-2s2.4,0.8,2.8,2H47.2z M51,29v15.1C50.7,44,50.3,44,50,44s-0.7,0-1,0.1V29c0-3-2.2-5.4-5-5.9    c0,0,0-0.1,0-0.1v-1.9C47.9,21.6,51,24.9,51,29z M47,18h-3v-2h3c2.4,0,4.4-1.7,4.9-4h2C53.4,15.4,50.5,18,47,18z M58.5,6h-11    C47.2,6,47,5.8,47,5.5S47.2,5,47.5,5h11C58.8,5,59,5.2,59,5.5S58.8,6,58.5,6z" />
                </svg>
                {isHovering && (
                    <div className="absolute top-[-30px] left-1/2 -translate-x-1/2 bg-white text-black text-xs font-bold px-2 py-1 rounded shadow whitespace-nowrap z-50">
                        #{dronePath.deliveries[currentDeliveryIndex]?.deliveryId}
                    </div>
                )}
            </div>
        </Marker>
    );
};



const MapComponent = ({ flightPath, secondaryFlightPath, showServicePoints = true, showNoFlyZones = true, onDeliveryStatusUpdate, restrictedAreas, theme = 'dark', deliveryStatuses = {} }) => {
    const [servicePoints, setServicePoints] = useState([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1);
    const mapRef = useRef(null);

    // Mapbox Styles
    const MAP_STYLE_DARK = "mapbox://styles/mapbox/dark-v11";
    const MAP_STYLE_LIGHT = "mapbox://styles/mapbox/light-v11";

    useEffect(() => {
        const fetchData = async () => {
            try {
                const points = await getServicePoints();
                setServicePoints(points);
            } catch (error) {
                console.error("Error fetching map data:", error);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        if (flightPath && flightPath.dronePaths && flightPath.dronePaths.length > 0) {
            setIsPlaying(true);

            // Auto fit bounds
            if (mapRef.current) {
                const allCoords = flightPath.dronePaths.flatMap(dp =>
                    dp.deliveries.flatMap(d =>
                        d.flightPath.map(p => [p.lng, p.lat])
                    )
                );

                if (allCoords.length > 0) {
                    const bounds = allCoords.reduce((bounds, coord) => {
                        return bounds.extend(coord);
                    }, new mapboxgl.LngLatBounds(allCoords[0], allCoords[0]));

                    mapRef.current.fitBounds(bounds, { padding: 50 });
                }
            }
        } else {
            setIsPlaying(false);
        }
    }, [flightPath]);

    const [animationKey, setAnimationKey] = useState(0);

    const togglePlayback = () => setIsPlaying(!isPlaying);
    const restartAnimation = () => {
        setAnimationKey(prev => prev + 1);
        setIsPlaying(true);
    };

    // Prepare GeoJSON for Restricted Areas
    const restrictedAreasGeoJSON = useMemo(() => ({
        type: 'FeatureCollection',
        features: restrictedAreas.map(area => ({
            type: 'Feature',
            geometry: {
                type: 'Polygon',
                coordinates: [area.vertices.map(v => [v.lng, v.lat])]
            },
            properties: { name: area.name }
        }))
    }), [restrictedAreas]);

    // Prepare GeoJSON for Flight Paths (Static Lines)
    const flightPathsGeoJSON = useMemo(() => {
        if (!flightPath || !flightPath.dronePaths) return null;
        return {
            type: 'FeatureCollection',
            features: flightPath.dronePaths.flatMap((dp, i) =>
                dp.deliveries.map(d => ({
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates: d.flightPath.map(p => [p.lng, p.lat])
                    },
                    properties: {
                        color: ROUTE_COLORS[i % ROUTE_COLORS.length],
                        isReturn: !d.deliveryId
                    }
                }))
            )
        };
    }, [flightPath]);

    // Prepare GeoJSON for Secondary Flight Paths (Comparison)
    const secondaryFlightPathsGeoJSON = useMemo(() => {
        if (!secondaryFlightPath || !secondaryFlightPath.dronePaths) return null;
        return {
            type: 'FeatureCollection',
            features: secondaryFlightPath.dronePaths.flatMap((dp, i) =>
                dp.deliveries.map(d => ({
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates: d.flightPath.map(p => [p.lng, p.lat])
                    },
                    properties: {
                        color: '#888888', // Grey for comparison
                        isReturn: !d.deliveryId
                    }
                }))
            )
        };
    }, [secondaryFlightPath]);

    return (
        <div className="relative h-full w-full">
            <Map
                ref={mapRef}
                initialViewState={{
                    longitude: -3.188,
                    latitude: 55.944,
                    zoom: 13
                }}
                style={{ width: '100%', height: '100%' }}
                mapStyle={theme === 'dark' ? MAP_STYLE_DARK : MAP_STYLE_LIGHT}
                mapboxAccessToken={MAPBOX_TOKEN}
            >
                {/* Restricted Areas */}
                {showNoFlyZones && (
                    <Source id="restricted-areas" type="geojson" data={restrictedAreasGeoJSON}>
                        <Layer
                            id="restricted-areas-fill"
                            type="fill"
                            paint={{
                                'fill-color': '#ef4444',
                                'fill-opacity': 0.1
                            }}
                        />
                        <Layer
                            id="restricted-areas-outline"
                            type="line"
                            paint={{
                                'line-color': '#ef4444',
                                'line-width': 1,
                                'line-dasharray': [2, 2]
                            }}
                        />
                    </Source>
                )}

                {/* Secondary Flight Paths (Comparison) */}
                {secondaryFlightPath && (
                    <Source id="secondary-flight-paths" type="geojson" data={secondaryFlightPathsGeoJSON}>
                        <Layer
                            id="secondary-flight-paths-line"
                            type="line"
                            paint={{
                                'line-color': '#888888',
                                'line-width': 2,
                                'line-opacity': 0.3,
                                'line-dasharray': [2, 2]
                            }}
                            layout={{
                                'line-cap': 'round',
                                'line-join': 'round'
                            }}
                        />
                    </Source>
                )}

                {/* Flight Paths (Static Trails) */}
                {flightPath && (
                    <Source id="flight-paths" type="geojson" data={flightPathsGeoJSON}>
                        <Layer
                            id="flight-paths-line"
                            type="line"
                            paint={{
                                'line-color': ['get', 'color'],
                                'line-width': 4,
                                'line-opacity': 0.5,
                                'line-dasharray': ['case', ['get', 'isReturn'], ['literal', [2, 2]], ['literal', [1]]]
                            }}
                            layout={{
                                'line-cap': 'round',
                                'line-join': 'round'
                            }}
                        />
                    </Source>
                )}

                {/* Delivery Locations (Medical Pack Icon) - Using Markers for reliability */}
                {flightPath && flightPath.dronePaths && flightPath.dronePaths.map((dronePath) =>
                    dronePath.deliveries.map((d) => {
                        if (!d.flightPath || d.flightPath.length === 0) return null;
                        const dest = d.flightPath[d.flightPath.length - 1];

                        // Only show if delivered
                        if (deliveryStatuses[d.deliveryId] !== 'completed') return null;

                        return (
                            <Marker
                                key={`delivery-${d.deliveryId}`}
                                longitude={dest.lng}
                                latitude={dest.lat}
                                anchor="bottom"
                            >
                                <div className="relative group cursor-pointer">
                                    <img
                                        src="/medical-pack-svgrepo-com.svg"
                                        alt="Delivery"
                                        className={`w-8 h-8 drop-shadow-lg transition-transform hover:scale-110 ${theme === 'dark' ? 'invert' : ''}`}
                                    />
                                    {/* Tooltip on hover */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-black/80 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-50">
                                        Order #{d.orderNo}
                                    </div>
                                </div>
                            </Marker>
                        );
                    })
                )}

                {/* Service Points */}
                {showServicePoints && servicePoints.map((sp, index) => (
                    <Marker
                        key={sp.name}
                        longitude={sp.location.lng}
                        latitude={sp.location.lat}
                        anchor="center"
                    >
                        <div className="flex flex-col items-center">
                            {/* Label - Always Visible */}
                            <div className="mb-1 bg-zinc-900/90 text-white text-[10px] font-medium px-2 py-0.5 rounded-full shadow-md whitespace-nowrap border border-zinc-700 z-10">
                                Service Point {index + 1}: {sp.name}
                            </div>

                            {/* Marker Icon with Pulse */}
                            <div className="relative flex items-center justify-center w-8 h-8">
                                <div className="absolute inset-0 bg-blue-500 rounded-full opacity-30 pulse-marker"></div>
                                <div className="relative w-6 h-6 bg-blue-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                                    <div className="w-2 h-2 bg-white rounded-full" />
                                </div>
                            </div>
                        </div>
                    </Marker>
                ))}

                {/* Drones */}
                {flightPath && flightPath.dronePaths.map((dronePath, index) => (
                    <DroneAnimator
                        key={`${dronePath.droneId}-${animationKey}`}
                        dronePath={dronePath}
                        color={ROUTE_COLORS[index % ROUTE_COLORS.length]}
                        isPlaying={isPlaying}
                        speed={speed}
                        onDeliveryStatusUpdate={onDeliveryStatusUpdate}
                        theme={theme}
                    />
                ))}
            </Map>

            {/* Playback Controls */}
            {flightPath && (
                <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2 items-start">
                    <div className="bg-background/90 backdrop-blur p-1 rounded-lg border shadow-lg flex gap-1">
                        {[0.5, 1, 2, 4].map(s => (
                            <Button
                                key={s}
                                variant={speed === s ? "secondary" : "ghost"}
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() => setSpeed(s)}
                            >
                                {s}x
                            </Button>
                        ))}
                    </div>
                    <div className="bg-background/90 backdrop-blur p-2 rounded-lg border shadow-lg flex gap-2">
                        <Button variant="outline" size="icon" onClick={togglePlayback}>
                            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                        <Button variant="outline" size="icon" onClick={restartAnimation}>
                            <RotateCcw className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MapComponent;
