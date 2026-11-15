import React, { useEffect, useRef } from 'react';
import { Incident, TrainingUnit } from '../../types';
import L from 'leaflet';
import { MapPin, Navigation, Shield, AlertTriangle } from 'lucide-react';

interface IncidentMapProps {
  incidents: Incident[];
  selectedIncident: Incident | null;
  units: TrainingUnit[];
  onSelectIncident: (id: string) => void;
}

// Curated SF landmarks catalog for reference pins
const SF_CATALOG = [
  { name: 'Ferry Building', lat: 37.7955, lng: -122.3934 },
  { name: 'Union Square', lat: 37.7879, lng: -122.4075 },
  { name: 'Golden Gate Bridge', lat: 37.8199, lng: -122.4783 },
  { name: 'Oracle Park', lat: 37.7786, lng: -122.3893 },
  { name: 'Mission Dolores Park', lat: 37.7596, lng: -122.4269 },
  { name: 'San Francisco City Hall', lat: 37.7793, lng: -122.4193 },
  { name: 'Pier 39', lat: 37.8087, lng: -122.4098 },
];

export const IncidentMap: React.FC<IncidentMapProps> = ({
  incidents,
  selectedIncident,
  units,
  onSelectIncident,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Center on San Francisco
    const map = L.map(mapContainerRef.current, {
      center: [37.7749, -122.4194],
      zoom: 13,
      zoomControl: true,
      attributionControl: true,
    });

    // Dark-themed CartoDB Positron / OSM tiles for professional operations console
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = layerGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update map markers when incidents, selected incident, or units change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = markersLayerRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    // 1. Render Catalog Landmarks (subtle civic markers)
    SF_CATALOG.forEach((lm) => {
      const landmarkIcon = L.divIcon({
        className: 'custom-landmark-icon',
        html: `
          <div style="background-color: #1e293b; border: 1px solid #475569; color: #94a3b8; font-family: monospace; font-size: 10px; padding: 2px 6px; border-radius: 4px; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.5);">
            🏛️ ${lm.name}
          </div>
        `,
        iconSize: [100, 20],
        iconAnchor: [50, 10],
      });

      L.marker([lm.lat, lm.lng], { icon: landmarkIcon }).addTo(layerGroup);
    });

    // 2. Render Simulated Training Responder Units
    units.forEach((unit) => {
      const isAvailable = unit.is_available;
      const typeColor = unit.unit_type === 'AMBULANCE' ? '#10b981' : unit.unit_type === 'FIRE' ? '#ef4444' : '#3b82f6';
      const statusText = isAvailable ? 'AVAILABLE' : 'ASSIGNED';

      const unitIcon = L.divIcon({
        className: 'custom-unit-icon',
        html: `
          <div style="display: flex; align-items: center; gap: 4px; background-color: #0b1120; border: 1.5px solid ${isAvailable ? typeColor : '#64748b'}; color: white; font-family: monospace; font-size: 10px; font-weight: bold; padding: 3px 6px; border-radius: 6px; box-shadow: 0 4px 6px rgba(0,0,0,0.6);">
            <span style="width: 7px; height: 7px; border-radius: 50%; background-color: ${isAvailable ? typeColor : '#64748b'};"></span>
            <span>${unit.unit_name}</span>
          </div>
        `,
        iconSize: [80, 24],
        iconAnchor: [40, 12],
      });

      const m = L.marker([unit.latitude, unit.longitude], { icon: unitIcon }).addTo(layerGroup);
      m.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px;">
          <strong style="color: #f59e0b;">${unit.unit_name}</strong> (Simulated)<br/>
          Type: ${unit.unit_type}<br/>
          Status: <strong style="color: ${isAvailable ? '#10b981' : '#f87171'};">${statusText}</strong><br/>
          Lat/Lng: ${unit.latitude.toFixed(4)}, ${unit.longitude.toFixed(4)}
        </div>
      `);
    });

    // 3. Render Incidents
    incidents.forEach((inc) => {
      if (!inc.latitude || !inc.longitude) return;

      const isSelected = selectedIncident?.id === inc.id;
      const pinColor = isSelected ? '#f59e0b' : '#ef4444';

      const incidentIcon = L.divIcon({
        className: 'custom-incident-pin',
        html: `
          <div style="position: relative; display: flex; align-items: center; justify-content: center;">
            ${isSelected ? `<div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background-color: rgba(245, 158, 11, 0.3); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>` : ''}
            <div style="width: 22px; height: 22px; border-radius: 50%; background-color: ${pinColor}; border: 2px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.8); z-index: 20;">
              <span style="font-size: 10px; font-weight: bold; color: black;">!</span>
            </div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const m = L.marker([inc.latitude, inc.longitude], { icon: incidentIcon }).addTo(layerGroup);
      m.on('click', () => onSelectIncident(inc.id));
      m.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px;">
          <strong style="color: #f59e0b;">${inc.category || 'Incident'}</strong><br/>
          Location: ${inc.reported_location || 'Unknown'}<br/>
          Status: <strong>${inc.status}</strong><br/>
          <button style="margin-top: 6px; background-color: #f59e0b; color: black; border: none; padding: 3px 8px; border-radius: 4px; font-weight: bold; cursor: pointer;" onclick="window.selectIncident('${inc.id}')">Select</button>
        </div>
      `);
    });

    // Expose selectIncident on window for Leaflet popup button
    (window as any).selectIncident = (id: string) => {
      onSelectIncident(id);
    };

    // Pan map to selected incident if available
    if (selectedIncident?.latitude && selectedIncident?.longitude) {
      map.setView([selectedIncident.latitude, selectedIncident.longitude], 14, {
        animate: true,
      });
    }
  }, [incidents, selectedIncident, units, onSelectIncident]);

  return (
    <div className="relative w-full h-full flex flex-col bg-surface-dark overflow-hidden">
      {/* Top Map Bar */}
      <div className="p-3 bg-midnight-900 border-b border-surface-border flex items-center justify-between text-xs font-mono text-slate-300 z-10">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-white uppercase">Live Geographic Operations Map</span>
          <span className="text-[11px] text-slate-400">— San Francisco Training Zone</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span> Incident Pin
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Unit Available
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-500"></span> Unit Assigned
          </span>
        </div>
      </div>

      {/* Leaflet Map Target */}
      <div ref={mapContainerRef} className="flex-1 w-full h-full" />
    </div>
  );
};
