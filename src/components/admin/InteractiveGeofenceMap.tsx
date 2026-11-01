"use client";

import React, { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

interface InteractiveGeofenceMapProps {
  lat: number;
  lon: number;
  radiusMeters: number;
  onChangeLocation: (lat: number, lon: number) => void;
}

export const InteractiveGeofenceMap: React.FC<InteractiveGeofenceMapProps> = ({
  lat,
  lon,
  radiusMeters,
  onChangeLocation,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Initialize Map
  useEffect(() => {
    if (!containerRef.current) return;

    // Prevent double-initialization in React 19 / StrictMode
    const container = containerRef.current as HTMLElement & { _leaflet_id?: number };
    if (container._leaflet_id) {
      container._leaflet_id = undefined;
    }

    const safeLat = typeof lat === 'number' && !isNaN(lat) ? lat : -7.7828;
    const safeLon = typeof lon === 'number' && !isNaN(lon) ? lon : 110.3608;

    const map = L.map(containerRef.current, {
      center: [safeLat, safeLon],
      zoom: 17,
      scrollWheelZoom: true,
      zoomControl: true,
    });

    mapInstanceRef.current = map;

    // OpenStreetMap Tile Layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
    }).addTo(map);

    // Custom High-Res Pin Marker
    const customIcon = L.divIcon({
      className: 'custom-geofence-pin',
      html: `
        <div style="position: relative; width: 34px; height: 42px; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; cursor: grab;">
          <div style="position: absolute; width: 34px; height: 34px; border-radius: 9999px; background: rgba(249, 115, 22, 0.3); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: relative; width: 30px; height: 30px; border-radius: 9999px; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(234, 88, 12, 0.5); border: 2.5px solid #ffffff;">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ffffff" width="16" height="16">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </div>
          <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid #ea580c; margin-top: -2px;"></div>
        </div>
      `,
      iconSize: [34, 42],
      iconAnchor: [17, 40],
      popupAnchor: [0, -38],
    });

    // Create Draggable Marker
    const marker = L.marker([safeLat, safeLon], {
      icon: customIcon,
      draggable: true,
      title: 'Geser untuk mengubah titik koordinat kantor',
    }).addTo(map);

    markerRef.current = marker;

    marker.bindPopup(`
      <div style="font-family: sans-serif; font-size: 11px; font-weight: bold; color: #1e293b; text-align: center; padding: 2px;">
        🏢 <strong>Titik Kantor / Pabrik</strong><br/>
        <span style="color: #64748b; font-size: 10px;">Geser pin atau klik peta untuk memindahkan</span>
      </div>
    `);

    // Handle marker dragend
    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      const newLat = Number(pos.lat.toFixed(7));
      const newLon = Number(pos.lng.toFixed(7));
      onChangeLocation(newLat, newLon);
    });

    // Geofence Circle
    const safeRadius = typeof radiusMeters === 'number' && radiusMeters > 0 ? radiusMeters : 50;
    const circle = L.circle([safeLat, safeLon], {
      radius: safeRadius,
      color: '#ea580c',
      weight: 2,
      dashArray: '5, 5',
      fillColor: '#f97316',
      fillOpacity: 0.22,
    }).addTo(map);

    circleRef.current = circle;

    // Handle Map Click to Pinpoint
    map.on('click', (e: L.LeafletMouseEvent) => {
      const clickedLat = Number(e.latlng.lat.toFixed(7));
      const clickedLon = Number(e.latlng.lng.toFixed(7));
      marker.setLatLng([clickedLat, clickedLon]);
      circle.setLatLng([clickedLat, clickedLon]);
      onChangeLocation(clickedLat, clickedLon);
    });

    // Resize observer to handle map layout adjustments
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
      circleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update marker & circle when lat / lon props change externally
  useEffect(() => {
    if (!mapInstanceRef.current || !markerRef.current || !circleRef.current) return;
    if (typeof lat !== 'number' || typeof lon !== 'number' || isNaN(lat) || isNaN(lon)) return;

    const currentMarkerPos = markerRef.current.getLatLng();
    const isDifferent =
      Math.abs(currentMarkerPos.lat - lat) > 0.000001 ||
      Math.abs(currentMarkerPos.lng - lon) > 0.000001;

    if (isDifferent) {
      markerRef.current.setLatLng([lat, lon]);
      circleRef.current.setLatLng([lat, lon]);
      mapInstanceRef.current.panTo([lat, lon]);
    }
  }, [lat, lon]);

  // Update circle radius dynamically
  useEffect(() => {
    if (!circleRef.current) return;
    const safeRadius = typeof radiusMeters === 'number' && radiusMeters > 0 ? radiusMeters : 50;
    circleRef.current.setRadius(safeRadius);
  }, [radiusMeters]);

  // GPS Geolocation Handler
  const handleUseCurrentLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      alert('Perangkat atau browser Anda tidak mendukung fitur deteksi lokasi GPS.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const userLat = Number(pos.coords.latitude.toFixed(7));
        const userLon = Number(pos.coords.longitude.toFixed(7));
        onChangeLocation(userLat, userLon);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([userLat, userLon], 18);
        }
      },
      (err) => {
        setIsLocating(false);
        let msg = 'Gagal mendeteksi lokasi GPS.';
        if (err.code === 1) msg = 'Izin akses lokasi GPS ditolak oleh browser.';
        else if (err.code === 2) msg = 'Posisi lokasi GPS tidak dapat ditemukan.';
        else if (err.code === 3) msg = 'Waktu deteksi lokasi GPS habis (timeout).';
        alert(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleCenterMap = () => {
    if (mapInstanceRef.current && typeof lat === 'number' && typeof lon === 'number') {
      mapInstanceRef.current.setView([lat, lon], 17);
    }
  };

  return (
    <div className="relative w-full h-full min-h-[340px] md:min-h-[400px] flex flex-col rounded-2xl overflow-hidden border border-gray-200 shadow-inner bg-slate-100">
      {/* Map Container */}
      <div ref={containerRef} className="w-full h-full min-h-[340px] md:min-h-[400px] z-0" />

      {/* Top Overlay: Instructions & Info Badge */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-[1000] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="bg-slate-900/85 backdrop-blur-md text-white text-[11px] font-bold px-3 py-1.5 rounded-xl shadow-lg border border-white/10 flex items-center gap-1.5 pointer-events-auto">
          <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse"></span>
          <span>Klik peta atau geser pin untuk menentukan titik</span>
        </div>

        <div className="bg-orange-500 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-xl shadow-lg pointer-events-auto">
          Radius: {radiusMeters} Meter
        </div>
      </div>

      {/* Bottom Floating Control Buttons */}
      <div className="absolute bottom-3 left-3 right-3 z-[1000] flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={isLocating}
          className="hover-lift bg-white hover:bg-orange-50 text-slate-800 hover:text-orange-600 border border-slate-200/80 text-xs font-bold px-3 py-2 rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          title="Gunakan titik koordinat GPS perangkat Anda saat ini"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2.5"
            stroke="currentColor"
            className={`w-3.5 h-3.5 text-orange-500 ${isLocating ? 'animate-spin' : ''}`}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
            />
          </svg>
          {isLocating ? 'Mendeteksi...' : 'Lokasi GPS Saya'}
        </button>

        <button
          type="button"
          onClick={handleCenterMap}
          className="hover-lift bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 text-xs font-bold px-3 py-2 rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
          title="Pusatkan peta ke titik kantor"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2.5"
            stroke="currentColor"
            className="w-3.5 h-3.5 text-slate-500"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
            />
          </svg>
          Pusatkan
        </button>
      </div>
    </div>
  );
};

export default InteractiveGeofenceMap;

