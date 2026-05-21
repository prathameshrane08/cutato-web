function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toICSDateUTC(dt: Date) {
  // YYYYMMDDTHHMMSSZ
  const y = dt.getUTCFullYear();
  const m = pad2(dt.getUTCMonth() + 1);
  const d = pad2(dt.getUTCDate());
  const hh = pad2(dt.getUTCHours());
  const mm = pad2(dt.getUTCMinutes());
  const ss = pad2(dt.getUTCSeconds());
  return `${y}${m}${d}T${hh}${mm}${ss}Z`;
}

function escICS(s: string) {
  // minimal escaping for ICS
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export function downloadICS(params: {
  filename: string;
  title: string;
  description?: string;
  location?: string;
  startLocal: Date; // local time
  endLocal: Date;   // local time
}) {
  const uid = `${Date.now()}-${Math.random().toString(16).slice(2)}@cutato`;
  const dtstamp = toICSDateUTC(new Date());

  const ics =
    [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//CUTATO//Booking//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${toICSDateUTC(params.startLocal)}`,
      `DTEND:${toICSDateUTC(params.endLocal)}`,
      `SUMMARY:${escICS(params.title)}`,
      params.location ? `LOCATION:${escICS(params.location)}` : "",
      params.description ? `DESCRIPTION:${escICS(params.description)}` : "",
      "END:VEVENT",
      "END:VCALENDAR",
    ]
      .filter(Boolean)
      .join("\r\n") + "\r\n";

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = params.filename.endsWith(".ics") ? params.filename : `${params.filename}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}