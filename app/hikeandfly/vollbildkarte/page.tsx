"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../supabase";
import dynamic from "next/dynamic";

import type { ComponentProps } from "react";
import type KarteType from "../karte.tsx";

const Karte = dynamic<ComponentProps<typeof KarteType>>(
  () => import("../karte"),
  { ssr: false }
);

type HikeAndFly = {
  id: number;
  titel: string;
  startpunkt: string;
  ziel: string;
  lat: number;
  lng: number;
  landeplatz: string;
  landeplatz_lat: number;
  landeplatz_lng: number;
  startplatz_hoehe: number;
  landeplatz_hoehe: number;
  schwierigkeit: string;
};

export default function VollbildKartePage() {
  const [abenteuer, setAbenteuer] = useState<HikeAndFly[]>([]);
  const router = useRouter();

  useEffect(() => {
    async function laden() {
      const { data } = await supabase
        .from("hikeandfly")
        .select("*")
        .eq("aktiv", true)
        .order("id", { ascending: true });
      setAbenteuer(data || []);
    }
    laden();
  }, []);

  return (
    <main style={{ padding: "0", fontFamily: "sans-serif", height: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.3)" }}>
        <h1 style={{ fontSize: "20px", margin: "0", color: "#fff" }}>🗺 Hike & Fly Übersichtskarte</h1>
        <a href="/hikeandfly" style={{ fontSize: "14px", color: "#7799ff", textDecoration: "none" }}>← Zurück zur Übersicht</a>
      </div>
      <div style={{ flex: 1, position: "relative" }}>
        {abenteuer.filter((a) => a.lat && a.lng).length > 0 && (
          <Karte
            abenteuer={abenteuer.filter((a) => a.lat && a.lng)}
            ausgewaehlt={null}
            onAuswaehlen={(id) => {
              router.push(`/hikeandfly?open=${id}`);
            }}
          />
        )}
      </div>
    </main>
  );
}