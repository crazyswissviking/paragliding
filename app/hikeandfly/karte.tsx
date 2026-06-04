"use client";
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Punkt = {
  id: number;
  titel: string;
  startpunkt: string;
  lat: number;
  lng: number;
};

type Props = {
  abenteuer: Punkt[];
  ausgewaehlt: number | null;
  onAuswaehlen: (id: number) => void;
};

export default function Karte({ abenteuer, ausgewaehlt, onAuswaehlen }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<number, L.Marker>>({});

  useEffect(() => {
    if (mapRef.current) return;

    const karte = L.map("hike-karte", { zoomControl: true });
    mapRef.current = karte;

    L.tileLayer("https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/{z}/{x}/{y}.jpeg", {
      attribution: "© swisstopo",
      maxZoom: 18,
    }).addTo(karte);

    const icon = L.divIcon({
      html: `<div style="background:#3355cc;color:white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:16px;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)">🥾</div>`,
      className: "",
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    abenteuer.forEach((a) => {
      const marker = L.marker([a.lat, a.lng], { icon })
        .addTo(karte)
        .bindPopup(`<strong>${a.titel}</strong><br/>🚩 ${a.startpunkt}`);
      marker.on("click", () => onAuswaehlen(a.id));
      markersRef.current[a.id] = marker;
    });

    if (abenteuer.length > 0) {
      const bounds = L.latLngBounds(abenteuer.map((a) => [a.lat, a.lng]));
      karte.fitBounds(bounds, { padding: [40, 40] });
    }

    return () => {
      karte.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (ausgewaehlt && markersRef.current[ausgewaehlt]) {
      markersRef.current[ausgewaehlt].openPopup();
      mapRef.current?.panTo(markersRef.current[ausgewaehlt].getLatLng());
    }
  }, [ausgewaehlt]);

  return <div id="hike-karte" style={{ height: "400px", width: "100%" }} />;
}