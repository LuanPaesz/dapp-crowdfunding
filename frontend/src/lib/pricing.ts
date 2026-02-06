import { useEffect, useState } from "react";

export function useEthUsdPrice() {
  const [price, setPrice] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
          { cache: "no-store" }
        );
        const data = await res.json();
        const p = data?.ethereum?.usd;

        if (!cancelled && typeof p === "number") setPrice(p);
      } catch {
        if (!cancelled) setPrice(null);
      }
    }

    load();
    const id = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return price;
}

export function formatUsd(v: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);
}

export function formatEth(v: number) {
  // mais amigável: 4 casas quando < 1, senão 2
  const digits = v < 1 ? 4 : 2;
  return `${v.toFixed(digits)} ETH`;
}
