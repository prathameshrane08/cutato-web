"use client";

import { openDirections, directionsUrl } from "@/app/lib/maps";

export default function MapCard({
  title = "Location",
  name,
  address,
  lat,
  lng,
}: {
  title?: string;
  name: string;
  address: string;
  lat?: number;
  lng?: number;
}) {
  const { google } = directionsUrl({
    destinationName: name,
    destinationAddress: address,
    lat,
    lng,
    travelMode: "driving",
  });

  // ✅ Real embedded preview (no API key needed)
  const q =
    lat != null && lng != null
      ? encodeURIComponent(`${lat},${lng} (${name})`)
      : encodeURIComponent(`${name}, ${address}`);
  const embedUrl = `https://www.google.com/maps?q=${q}&output=embed`;

  return (
    <div className="theme-card" style={{ padding: 18, borderRadius: 18, display: "grid", gap: 12 }}>
      <div style={{ fontWeight: 900, fontSize: 16 }}>{title}</div>

      <div
        style={{
          borderRadius: 16,
          overflow: "hidden",
          border: "1px solid rgba(0,0,0,0.08)",
          background: "rgba(0,0,0,0.02)",
        }}
      >
        <iframe
          title="Map preview"
          src={embedUrl}
          style={{ width: "100%", height: 220, border: 0, display: "block" }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>

      <div style={{ display: "grid", gap: 4 }}>
        <div style={{ fontWeight: 900 }}>{name}</div>
        <div className="theme-muted" style={{ fontSize: 13 }}>
          {address}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          className="btn btn-primary"
          onClick={() => openDirections({ destinationName: name, destinationAddress: address, lat, lng })}
        >
          Get directions
        </button>

        <a className="btn btn-secondary" href={google} target="_blank" rel="noreferrer">
          Open in Google Maps
        </a>
      </div>
    </div>
  );
}