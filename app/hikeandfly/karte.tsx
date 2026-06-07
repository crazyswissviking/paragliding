"use client";
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Punkt = {
  id: number;
  titel: string;
  startpunkt: string;
  lat: number;
  lng: number;
  landeplatz?: string;
  landeplatz_lat?: number;
  landeplatz_lng?: number;
};

type Props = {
  abenteuer: Punkt[];
  ausgewaehlt: number | null;
  onAuswaehlen: (id: number) => void;
};

export default function Karte({ abenteuer, ausgewaehlt, onAuswaehlen }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<number, L.Marker>>({});
  const layerRef = useRef<L.TileLayer | null>(null);
  const [kartentyp, setKartentyp] = useState<"osm" | "swisstopo">("osm");

  const tiles = {
    osm: {
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: "© OpenStreetMap",
    },
    swisstopo: {
      url: "https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/{z}/{x}/{y}.jpeg",
      attribution: "© swisstopo",
    },
  };

  useEffect(() => {
    if (mapRef.current) return;

    const karte = L.map("hike-karte", { zoomControl: true });
    mapRef.current = karte;

    const t = tiles[kartentyp];
    layerRef.current = L.tileLayer(t.url, { attribution: t.attribution, maxZoom: 19 }).addTo(karte);

    const startIcon = L.divIcon({
      html: `<div style="background:#3355cc;color:white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:16px;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)">🥾</div>`,
      className: "",
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    const landeIcon = L.divIcon({
      html: `<div style="background:#2d6a4f;color:white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:14px;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)">🟢</div>`,
      className: "",
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    const alleBounds: [number, number][] = [];

    abenteuer.forEach((a) => {
      const marker = L.marker([a.lat, a.lng], { icon: startIcon })
        .addTo(karte)
        .bindPopup(`<strong>${a.titel}</strong><br/>🚩 ${a.startpunkt}`);
      marker.on("click", () => onAuswaehlen(a.id));
      markersRef.current[a.id] = marker;
      alleBounds.push([a.lat, a.lng]);

      if (a.landeplatz_lat && a.landeplatz_lng) {
        L.marker([a.landeplatz_lat, a.landeplatz_lng], { icon: landeIcon })
          .addTo(karte)
          .bindPopup(`<strong>${a.titel}</strong><br/>🟢 Landeplatz: ${a.landeplatz}`);
        alleBounds.push([a.landeplatz_lat, a.landeplatz_lng]);
      }
    });

    if (alleBounds.length > 0) {
      const bounds = L.latLngBounds(alleBounds);
      karte.fitBounds(bounds, { padding: [40, 40] });
    }

    return () => {
      karte.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !layerRef.current) return;
    mapRef.current.removeLayer(layerRef.current);
    const t = tiles[kartentyp];
    layerRef.current = L.tileLayer(t.url, { attribution: t.attribution, maxZoom: 19 }).addTo(mapRef.current);
  }, [kartentyp]);

  useEffect(() => {
    if (ausgewaehlt && markersRef.current[ausgewaehlt]) {
      markersRef.current[ausgewaehlt].openPopup();
      mapRef.current?.panTo(markersRef.current[ausgewaehlt].getLatLng());
    }
  }, [ausgewaehlt]);

  return (
    <div style={{ position: "relative" }}>
      {/* Umschalter */}
      <div style={{
        position: "absolute",
        top: "10px",
        right: "10px",
        zIndex: 1000,
        display: "flex",
        gap: "4px",
        background: "white",
        borderRadius: "8px",
        padding: "4px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
      }}>
        <button
          onClick={() => setKartentyp("osm")}
          style={{
            padding: "6px 12px",
            background: kartentyp === "osm" ? "#3355cc" : "transparent",
            color: kartentyp === "osm" ? "white" : "#555",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: "bold",
          }}
        >
          🗺 OSM
        </button>
        <button
          onClick={() => setKartentyp("swisstopo")}
          style={{
            padding: "6px 12px",
            background: kartentyp === "swisstopo" ? "#3355cc" : "transparent",
            color: kartentyp === "swisstopo" ? "white" : "#555",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: "bold",
          }}
        >
          🇨🇭 Swisstopo
        </button>
      </div>
      <div id="hike-karte" style={{ height: "800px", width: "100%" }} />
    </div>
  );
}