import React, { useRef } from 'react';
import Map from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Access Token
const MAPBOX_TOKEN = 'pk.eyJ1IjoiYWtzaGF6NyIsImEiOiJjbWlnM2lhbTIwMmVwM2RzODY5M3Vzd2dqIn0.oou6CIFHrUZ1u63Ayr22HQ';

const MapComponent = ({ theme = 'dark' }) => {
    const mapRef = useRef(null);

    // Mapbox Styles
    const MAP_STYLE_DARK = "mapbox://styles/mapbox/dark-v11";
    const MAP_STYLE_LIGHT = "mapbox://styles/mapbox/light-v11";

    return (
        <div className="relative h-full w-full">
            <Map
                ref={mapRef}
                initialViewState={{
                    longitude: -79.9428,
                    latitude: 40.4432,
                    zoom: 16.5
                }}
                style={{ width: '100%', height: '100%' }}
                mapStyle={theme === 'dark' ? MAP_STYLE_DARK : MAP_STYLE_LIGHT}
                mapboxAccessToken={MAPBOX_TOKEN}
            />
        </div>
    );
};

export default MapComponent;
