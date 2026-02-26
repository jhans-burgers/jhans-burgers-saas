import React, { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type LatLng = { lat: number; lng: number };

type Props = {
  value?: LatLng | null;
  onChange: (loc: LatLng) => void;
};

function InvalidateSizeOnMount() {
  const map = useMap();

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        map.invalidateSize();
      } catch (e) {
        // evita erro se o modal desmontar muito rápido
        console.warn("[Leaflet] invalidateSize failed:", e);
      }
    }, 150);

    return () => clearTimeout(t);
  }, [map]);

  return null;
}

function Recenter({ center }: { center: LatLng }) {
  const map = useMap();

  useEffect(() => {
    if (!center || !Number.isFinite(center.lat) || !Number.isFinite(center.lng)) return;

    // Evita ficar "pulando" quando o centro não muda
    const current = map.getCenter();
    const same =
      Math.abs(current.lat - center.lat) < 1e-7 && Math.abs(current.lng - center.lng) < 1e-7;

    if (same) return;

    map.setView([center.lat, center.lng], map.getZoom(), { animate: false });
  }, [map, center.lat, center.lng]);

  return null;
}

function ClickToSet({ onPick }: { onPick: (loc: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

// Fix do ícone do marker no Vite
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export default function LocationPicker({ value, onChange }: Props) {
  const initial = useMemo<LatLng>(() => {
    const lat = Number((value as any)?.lat);
    const lng = Number((value as any)?.lng);

    if (Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)) {
      return { lat, lng };
    }

    // fallback: Fortaleza-CE (você pode trocar)
    return { lat: -3.71722, lng: -38.54337 };
  }, [value]);

  const [center, setCenter] = useState<LatLng>(initial);

  // Se o value mudar externamente, acompanha
  useEffect(() => {
    setCenter(initial);
  }, [initial.lat, initial.lng]);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocalização não suportada neste navegador.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCenter(loc);
        onChange(loc);
      },
      (err) => {
        console.error("Geolocation error:", err);

        // mensagens comuns e claras
        if (err.code === 1) alert("Permissão negada. Libere a localização no navegador.");
        else if (err.code === 2) alert("Posição indisponível. Verifique GPS/conexão.");
        else if (err.code === 3) alert("Tempo esgotado ao obter localização. Tente novamente.");
        else alert("Não foi possível obter sua localização. Verifique permissões do navegador.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );
  };

  const markerPos: LatLng = useMemo(() => {
    const lat = Number((value as any)?.lat);
    const lng = Number((value as any)?.lng);

    if (Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)) {
      return { lat, lng };
    }
    return center;
  }, [value, center]);

  return (
    <div className="relative w-full h-full">
      {/* Botão “usar minha localização” */}
      <div className="absolute z-[500] top-3 left-3">
        <button
          type="button"
          onClick={handleUseMyLocation}
          className="bg-slate-900/90 hover:bg-slate-800 text-white text-xs font-bold px-3 py-2 rounded-xl border border-slate-700 shadow"
        >
          Usar minha localização (GPS)
        </button>
      </div>

      <MapContainer
        center={[center.lat, center.lng]}
        zoom={15}
        className="h-full w-full"
        scrollWheelZoom={false} // ✅ não prende o scroll do modal
        dragging={true}
      >
        <InvalidateSizeOnMount />
        <Recenter center={center} />

        <ClickToSet
          onPick={(loc) => {
            setCenter(loc);
            onChange(loc);
          }}
        />

        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Marker
          position={[markerPos.lat, markerPos.lng]}
          draggable
          icon={DefaultIcon}
          eventHandlers={{
            dragend: (e: any) => {
              const ll = e.target.getLatLng();
              const loc = { lat: ll.lat, lng: ll.lng };
              setCenter(loc);
              onChange(loc);
            },
          }}
        />
      </MapContainer>
    </div>
  );
}