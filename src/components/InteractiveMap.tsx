import { useEffect, useRef, useState } from "react";
import { Locate, Loader2, Maximize2, Minimize2 } from "lucide-react";
import { Report } from "../types";

interface InteractiveMapProps {
  reports: Report[];
  selectedReportId: string | null;
  onSelectReport: (id: string) => void;
  onMapClick: (lat: number, lng: number) => void;
  newReportCoords: { lat: number; lng: number } | null;
  theme?: "light" | "dark";
}

export default function InteractiveMap({
  reports,
  selectedReportId,
  onSelectReport,
  onMapClick,
  newReportCoords,
  theme = "light",
}: InteractiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: any }>({});
  const newMarkerRef = useRef<any>(null);
  const initialReportIdsRef = useRef<Set<string>>(new Set());

  // GPS geolocation tracking states
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const userMarkerRef = useRef<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Invalidate Leaflet size on fullscreen toggle to ensure correct rendering
  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => {
        mapRef.current.invalidateSize();
      }, 100);
    }
  }, [isFullscreen]);

  // Capture initial report list when it first populates to know which are newly added in this session
  useEffect(() => {
    if (reports.length > 0 && initialReportIdsRef.current.size === 0) {
      reports.forEach((r) => initialReportIdsRef.current.add(r.id));
    }
  }, [reports]);

  // Start continuous user location tracking
  const startTracking = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    setIsTracking(true);

    const L = (window as any).L;
    const map = mapRef.current;

    // First request immediate position to center quickly
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const { latitude: lat, longitude: lng } = position.coords;
        setUserCoords({ lat, lng });

        if (map) {
          map.setView([lat, lng], 16, { animate: true, duration: 0.8 });
        }
      },
      (error) => {
        setIsLocating(false);
        console.error("Error getting location: ", error);
        setIsTracking(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );

    // Watch position for continuous updates
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        setUserCoords({ lat, lng });
        
        // As the user moves, continuously center the map on their new position
        if (map) {
          map.setView([lat, lng], map.getZoom(), { animate: true, duration: 0.5 });
        }
      },
      (error) => {
        console.error("Error watching location: ", error);
      },
      { enableHighAccuracy: true, maximumAge: 1000 }
    );
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
    setUserCoords(null);

    // Remove user marker from map
    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }
  };

  const handleToggleTracking = () => {
    if (isTracking) {
      stopTracking();
    } else {
      startTracking();
    }
  };

  // Synchronize userCoords with a dedicated pulse marker on the map
  useEffect(() => {
    const L = (window as any).L;
    const map = mapRef.current;
    if (!L || !map) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }

    if (userCoords) {
      const userIcon = L.divIcon({
        className: "user-location-marker",
        html: `
          <div style="
            position: relative;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            transform: translate(-50%, -50%);
          ">
            <div style="
              position: absolute;
              width: 14px;
              height: 14px;
              border-radius: 50%;
              background-color: #3b82f6;
              border: 3px solid #ffffff;
              box-shadow: 0 0 12px rgba(59, 130, 246, 0.8);
            "></div>
            <div style="
              position: absolute;
              width: 28px;
              height: 28px;
              border-radius: 50%;
              border: 2.5px solid #3b82f6;
              animation: user-ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
            "></div>
          </div>
          <style>
            @keyframes user-ping {
              0% {
                transform: scale(0.6);
                opacity: 0.9;
              }
              100% {
                transform: scale(2.2);
                opacity: 0;
              }
            }
          </style>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      userMarkerRef.current = L.marker([userCoords.lat, userCoords.lng], {
        icon: userIcon,
        zIndexOffset: 1000,
      }).addTo(map);
    }
  }, [userCoords]);

  // Clean up tracking watch on component unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Get color based on status or category
  const getMarkerColor = (status: string, category: string) => {
    if (status === "Resolved") return "#10b981"; // Emerald
    switch (category) {
      case "Pothole":
        return "#f97316"; // Orange
      case "Water Leakage":
        return "#06b6d4"; // Cyan
      case "Damaged Streetlight":
        return "#eab308"; // Yellow
      case "Waste Management":
        return "#ec4899"; // Pink
      case "Public Transport/Transit Gap":
        return "#8b5cf6"; // Purple
      default:
        return "#94a3b8"; // Slate
    }
  };

  // 1. Initialize Map
  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapContainerRef.current || mapRef.current) return;

    // Start centered at San Francisco civic center
    const initialLat = 37.7749;
    const initialLng = -122.4194;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([initialLat, initialLng], 14);

    // Initial tile layer selection based on theme
    const initialUrl = theme === "dark"
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

    tileLayerRef.current = L.tileLayer(initialUrl, {
      maxZoom: 19,
    }).addTo(map);

    // Add zoom controls to the bottom right
    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Map click listener
    map.on("click", (e: any) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    });

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Synchronize Tile Layer Theme
  useEffect(() => {
    const L = (window as any).L;
    const map = mapRef.current;
    if (!L || !map) return;

    if (tileLayerRef.current) {
      tileLayerRef.current.remove();
    }

    const url = theme === "dark"
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

    tileLayerRef.current = L.tileLayer(url, {
      maxZoom: 19,
    }).addTo(map);
  }, [theme]);

  // 2. Synchronize Reports Markers
  useEffect(() => {
    const L = (window as any).L;
    const map = mapRef.current;
    if (!L || !map) return;

    // Clear old markers that are no longer in the list
    Object.keys(markersRef.current).forEach((id) => {
      if (!reports.find((r) => r.id === id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

    // Add or update markers
    reports.forEach((report) => {
      const color = getMarkerColor(report.status, report.category);
      const isSelected = selectedReportId === report.id;

      // Determine recently reported state (within last 1 hour)
      const isRecent = (Date.now() - new Date(report.createdAt).getTime()) < 1000 * 60 * 60;
      const isNewSessionReport = !initialReportIdsRef.current.has(report.id) && initialReportIdsRef.current.size > 0;
      const shouldAnimate = isRecent || isNewSessionReport;

      // Custom HTML Marker using SVG for a modern, sleek circle marker with glow
      const customIcon = L.divIcon({
        className: "custom-marker-icon",
        html: `
          <div class="${isNewSessionReport ? 'marker-pop-in' : ''} ${shouldAnimate ? 'hazard-pulse' : ''}" style="
            position: relative;
            width: ${isSelected ? "28px" : "20px"};
            height: ${isSelected ? "28px" : "20px"};
            border-radius: 50%;
            background-color: ${color};
            border: 2px solid #ffffff;
            box-shadow: 0 0 12px ${color}, inset 0 0 4px rgba(0,0,0,0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease-out;
            transform: translate(-50%, -50%);
          ">
            ${
              shouldAnimate
                ? `<div class="hazard-ring" style="
                    position: absolute;
                    top: -6px;
                    left: -6px;
                    right: -6px;
                    bottom: -6px;
                    border-radius: 50%;
                    border: 2px solid ${color};
                    opacity: 0.8;
                    pointer-events: none;
                   "></div>`
                : ""
            }
            ${
              isSelected
                ? `<div style="width: 8px; height: 8px; border-radius: 50%; background-color: #ffffff;"></div>`
                : ""
            }
          </div>
        `,
        iconSize: isSelected ? [28, 28] : [20, 20],
        iconAnchor: isSelected ? [14, 14] : [10, 10],
      });

      if (markersRef.current[report.id]) {
        // Marker exists, update it
        const marker = markersRef.current[report.id];
        marker.setLatLng([report.latitude, report.longitude]);
        marker.setIcon(customIcon);
        if (isSelected) {
          map.setView([report.latitude, report.longitude], map.getZoom(), {
            animate: true,
            duration: 0.6,
          });
        }
      } else {
        // Create new marker
        const marker = L.marker([report.latitude, report.longitude], {
          icon: customIcon,
        }).addTo(map);

        marker.on("click", (e: any) => {
          L.DomEvent.stopPropagation(e);
          onSelectReport(report.id);
        });

        markersRef.current[report.id] = marker;
      }
    });
  }, [reports, selectedReportId]);

  // 3. Synchronize New Report Placement Marker
  useEffect(() => {
    const L = (window as any).L;
    const map = mapRef.current;
    if (!L || !map) return;

    if (newMarkerRef.current) {
      newMarkerRef.current.remove();
      newMarkerRef.current = null;
    }

    if (newReportCoords) {
      const pinIcon = L.divIcon({
        className: "new-marker-icon",
        html: `
          <div style="
            position: relative;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            transform: translate(-50%, -50%);
          ">
            <div style="
              position: absolute;
              width: 12px;
              height: 12px;
              border-radius: 50%;
              background-color: #3b82f6;
              border: 2px solid #ffffff;
              box-shadow: 0 0 10px #3b82f6;
            "></div>
            <div style="
              position: absolute;
              width: 24px;
              height: 24px;
              border-radius: 50%;
              border: 2px solid #3b82f6;
              animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
            "></div>
          </div>
          <style>
            @keyframes ping {
              75%, 100% {
                transform: scale(2);
                opacity: 0;
              }
            }
          </style>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      newMarkerRef.current = L.marker(
        [newReportCoords.lat, newReportCoords.lng],
        { icon: pinIcon }
      ).addTo(map);

      map.setView([newReportCoords.lat, newReportCoords.lng], map.getZoom(), {
        animate: true,
        duration: 0.5,
      });
    }
  }, [newReportCoords]);

  return (
    <div
      id="interactive-map-container"
      className={`${
        isFullscreen
          ? "fixed inset-0 z-[9999] rounded-none w-screen h-screen"
          : "relative w-full h-full rounded-2xl border shadow-sm"
      } overflow-hidden transition-all duration-300 ${theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}
    >
      {/* Map Element */}
      <div id="hyperlocal-map" ref={mapContainerRef} className="w-full h-full" />

      {/* Floating Instructions Banner */}
      <div className={`absolute top-4 left-4 z-[999] backdrop-blur-md px-4 py-2.5 rounded-xl border text-xs pointer-events-none shadow-md max-w-xs md:max-w-sm ${theme === "dark" ? "bg-slate-900/95 border-slate-800 text-slate-300" : "bg-white/95 border-slate-200 text-slate-600"}`}>
        <p className={`font-semibold flex items-center gap-1.5 ${theme === "dark" ? "text-slate-100" : "text-slate-800"}`}>
          <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
          Hyperlocal Map Grid
        </p>
        <p className={`mt-1 text-[11px] ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
          Click anywhere on the map grid to lock coordinates and report a local infrastructure issue.
        </p>
      </div>

      {/* Floating Map Controls (GPS Track & Fullscreen) */}
      <div className="absolute top-4 right-4 z-[999] flex items-center gap-2">
        {/* Fullscreen Button */}
        <button
          id="map-fullscreen-toggle-btn"
          onClick={() => setIsFullscreen(!isFullscreen)}
          className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold shadow-md cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 ${
            isFullscreen
              ? "bg-indigo-600 hover:bg-indigo-700 border-indigo-500 text-white"
              : theme === "dark"
              ? "bg-slate-900/95 border-slate-800 text-slate-100 hover:bg-slate-800"
              : "bg-white/95 border-slate-200 text-slate-800 hover:bg-slate-50"
          }`}
          title={isFullscreen ? "Exit Fullscreen Map View" : "Expand Map to Fullscreen"}
        >
          {isFullscreen ? (
            <>
              <Minimize2 className="w-4 h-4 text-white" />
              <span>Exit Fullscreen</span>
            </>
          ) : (
            <>
              <Maximize2 className={`w-4 h-4 ${theme === "dark" ? "text-indigo-400" : "text-indigo-600"}`} />
              <span>Fullscreen</span>
            </>
          )}
        </button>

        {/* GPS Tracking Button */}
        <button
          id="map-recenter-btn"
          onClick={handleToggleTracking}
          className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold shadow-md cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 ${
            isTracking
              ? "bg-blue-600 hover:bg-blue-700 border-blue-500 text-white"
              : theme === "dark"
              ? "bg-slate-900/95 border-slate-800 text-slate-100 hover:bg-slate-800"
              : "bg-white/95 border-slate-200 text-slate-800 hover:bg-slate-50"
          }`}
          title={isTracking ? "Stop tracking location" : "Locate and track me continuously on the map"}
        >
          {isLocating ? (
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
          ) : (
            <Locate className={`w-4 h-4 ${isTracking ? "animate-pulse text-white" : "text-indigo-600"}`} />
          )}
          <span>
            {isLocating ? "Locating..." : isTracking ? "Tracking Me" : "Recenter on me"}
          </span>
        </button>
      </div>

      {/* Map Legend */}
      <div className={`absolute bottom-4 left-4 z-[999] backdrop-blur-md px-4 py-3 rounded-xl border shadow-md text-[11px] flex flex-col gap-2 ${theme === "dark" ? "bg-slate-900/95 border-slate-800 text-slate-300" : "bg-white/95 border-slate-200 text-slate-600"}`}>
        <div className={`font-bold uppercase tracking-wider text-[10px] ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>Issue Legend</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_4px_rgba(249,115,22,0.4)]"></span>
            <span>Pothole</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow-[0_0_4px_rgba(6,182,212,0.4)]"></span>
            <span>Water Leak</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 shadow-[0_0_4px_rgba(234,179,8,0.4)]"></span>
            <span>Streetlight</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-pink-500 shadow-[0_0_4px_rgba(236,72,153,0.4)]"></span>
            <span>Waste</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-[0_0_4px_rgba(139,92,246,0.4)]"></span>
            <span>Transit Gap</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.4)]"></span>
            <span>Resolved</span>
          </div>
        </div>
      </div>
    </div>
  );
}
