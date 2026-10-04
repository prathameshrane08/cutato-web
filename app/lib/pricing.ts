export type Demand = "quiet" | "normal" | "busy";

// Shared by the booking UI and the Stripe checkout route so the price a
// customer sees is exactly the price the server charges.
export function demandForTime(time: string): Demand {
  const [h] = time.split(":").map(Number);
  if (h >= 17) return "busy";
  if (h < 11) return "quiet";
  return "normal";
}

export function demandLabel(d: Demand) {
  if (d === "busy") return "Busy";
  if (d === "quiet") return "Quiet";
  return "Normal";
}

export function calcDynamicPriceEuro(base: number, demand: Demand) {
  const mult = demand === "busy" ? 1.2 : demand === "quiet" ? 0.85 : 1;
  return Math.round(base * mult * 100) / 100;
}
