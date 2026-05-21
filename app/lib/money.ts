export function fmtEUR(v: number) {
  try {
    return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(v);
  } catch {
    return `€${v.toFixed(2)}`;
  }
}
