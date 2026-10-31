import { WatchlistView } from "@/components/watchlist/watchlist-view";
import type { Metadata } from "next";


export const metadata: Metadata = { title: "Watchlist - Market Insight" };

export default function WatchlistPage() {
  return <WatchlistView />;
}
