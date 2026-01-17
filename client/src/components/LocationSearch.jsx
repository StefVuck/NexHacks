import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import axios from 'axios';

// Edinburgh Bounding Box for Photon (min_lon,min_lat,max_lon,max_lat)
const BBOX = "-3.32,55.88,-3.05,56.01";

const LocationSearch = ({ onLocationSelect }) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedName, setSelectedName] = useState("");

    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (query.length < 3) {
                setResults([]);
                return;
            }

            setLoading(true);
            try {
                // Using Photon API (by Komoot) - Free, based on OSM, better fuzzy search
                const response = await axios.get('https://photon.komoot.io/api/', {
                    params: {
                        q: query,
                        bbox: BBOX,
                        limit: 5
                    }
                });

                // Photon returns GeoJSON FeatureCollection
                setResults(response.data.features || []);
            } catch (error) {
                console.error("Error fetching locations:", error);
            } finally {
                setLoading(false);
            }
        }, 400); // Slightly faster debounce

        return () => clearTimeout(delayDebounceFn);
    }, [query]);

    const handleSelect = (feature) => {
        // Construct a display name from properties
        const props = feature.properties;
        const nameParts = [props.name, props.street, props.city, props.postcode].filter(Boolean);
        const displayName = nameParts.join(', ');

        setSelectedName(displayName || props.name || "Selected Location");

        onLocationSelect({
            lat: feature.geometry.coordinates[1], // GeoJSON is [lon, lat]
            lon: feature.geometry.coordinates[0]
        });
        setOpen(false);
        setQuery("");
    };

    return (
        <div className="flex flex-col space-y-2">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between truncate h-8 text-xs"
                    >
                        {selectedName || "Search location..."}
                        <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[280px] p-0" align="start">
                    <div className="flex items-center border-b px-3">
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <input
                            className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="Type to search..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                    </div>
                    <div className="max-h-[200px] overflow-y-auto p-1">
                        {loading && <div className="py-4 text-center text-xs text-muted-foreground">Searching...</div>}
                        {!loading && results.length === 0 && query.length >= 3 && (
                            <div className="py-4 text-center text-xs text-muted-foreground">No results found.</div>
                        )}
                        {!loading && results.map((feature, index) => {
                            const props = feature.properties;
                            const name = props.name || props.street || "Unknown Location";
                            const details = [props.street, props.city, props.postcode].filter(p => p && p !== name).join(', ');

                            return (
                                <div
                                    key={index}
                                    className={cn(
                                        "relative flex cursor-pointer select-none items-start rounded-sm px-2 py-1.5 text-xs outline-none hover:bg-accent hover:text-accent-foreground"
                                    )}
                                    onClick={() => handleSelect(feature)}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-3 w-3 mt-0.5",
                                            selectedName === name ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <div className="flex flex-col">
                                        <span className="font-medium">{name}</span>
                                        {details && <span className="text-[10px] text-muted-foreground">{details}</span>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
};

export default LocationSearch;
