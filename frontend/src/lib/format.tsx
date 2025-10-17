export const fmtEth = (v: bigint | number) =>
  (Number(v) / 1e18).toLocaleString("pt-BR", { maximumFractionDigits: 6 });

export const fmtDate = (s: bigint | number) =>
  new Date(Number(s) * 1000).toLocaleString();

export const timeLeft = (deadline: bigint) => {
  const now = Math.floor(Date.now() / 1000);
  const left = Number(deadline) - now;
  if (left <= 0) return "encerrada";
  const d = Math.floor(left / 86400);
  const h = Math.floor((left % 86400) / 3600);
  return d > 0 ? `${d}d ${h}h` : `${h}h`;
};
