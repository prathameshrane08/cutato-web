export function isAppleDevice() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /iPhone|iPad|Macintosh/.test(ua);
}

export function directionsUrl(params: {
  destinationName?: string;
  destinationAddress?: string;
  lat?: number;
  lng?: number;
  travelMode?: "driving" | "walking" | "transit";
}) {
  const mode = params.travelMode ?? "driving";

  // Destination string for query
  const dest =
    params.lat != null && params.lng != null
      ? `${params.lat},${params.lng}`
      : params.destinationAddress ?? "";

  const qName = params.destinationName ? `${params.destinationName} ` : "";
  const q = encodeURIComponent(`${qName}${dest}`.trim());

  // Apple Maps uses "daddr" (destination address)
  const apple = `https://maps.apple.com/?daddr=${q}&dirflg=${mode === "walking" ? "w" : mode === "transit" ? "r" : "d"}`;

  // Google Maps directions
  const google = `https://www.google.com/maps/dir/?api=1&destination=${q}&travelmode=${encodeURIComponent(mode)}`;

  return { apple, google };
}

export function openDirections(params: Parameters<typeof directionsUrl>[0]) {
  const { apple, google } = directionsUrl(params);
  // Prefer Apple Maps on Apple devices, else Google
  const url = isAppleDevice() ? apple : google;
  window.open(url, "_blank", "noopener,noreferrer");
}