/**
 * Converts flight path data to a GeoJSON FeatureCollection.
 * @param {Object} flightPathData - The flight path data object from the API.
 * @param {Array} restrictedAreas - Array of restricted areas (optional).
 * @param {Array} servicePoints - Array of service points (optional).
 * @returns {Object} GeoJSON FeatureCollection
 */
export const generateGeoJson = (flightPathData, restrictedAreas = [], servicePoints = []) => {
    const features = [];

    // 1. Add Flight Paths (LineStrings)
    if (flightPathData && flightPathData.dronePaths) {
        flightPathData.dronePaths.forEach(dronePath => {
            dronePath.deliveries.forEach((delivery, index) => {
                const coordinates = delivery.flightPath.map(p => [p.lng, p.lat]);

                features.push({
                    type: "Feature",
                    properties: {
                        type: "flight-path",
                        droneId: dronePath.droneId,
                        deliveryId: delivery.deliveryId || "return-to-base",
                        order: index,
                        pathType: delivery.deliveryId ? "outbound" : "return"
                    },
                    geometry: {
                        type: "LineString",
                        coordinates: coordinates
                    }
                });
            });
        });
    }

    // 2. Add Restricted Areas (Polygons)
    restrictedAreas.forEach(area => {
        // Ensure the polygon is closed (first and last point match)
        const coordinates = area.vertices.map(v => [v.lng, v.lat]);
        if (coordinates.length > 0) {
            const first = coordinates[0];
            const last = coordinates[coordinates.length - 1];
            if (first[0] !== last[0] || first[1] !== last[1]) {
                coordinates.push(first);
            }
        }

        features.push({
            type: "Feature",
            properties: {
                type: "restricted-area",
                name: area.name
            },
            geometry: {
                type: "Polygon",
                coordinates: [coordinates]
            }
        });
    });

    // 3. Add Service Points (Points)
    servicePoints.forEach(sp => {
        features.push({
            type: "Feature",
            properties: {
                type: "service-point",
                name: sp.name
            },
            geometry: {
                type: "Point",
                coordinates: [sp.location.lng, sp.location.lat]
            }
        });
    });

    return {
        type: "FeatureCollection",
        features: features
    };
};

/**
 * Triggers a download of the GeoJSON data.
 * @param {Object} geoJsonData - The GeoJSON object.
 * @param {string} filename - The filename to save as.
 */
export const downloadGeoJson = (geoJsonData, filename = "flight-path.geojson") => {
    const dataStr = JSON.stringify(geoJsonData, null, 2);
    const blob = new Blob([dataStr], { type: "application/geo+json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
