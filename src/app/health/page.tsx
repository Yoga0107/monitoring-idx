import { HealthView } from "@/components/health/health-view";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "API Health - Market Insight" };

export default function HealthPage() {
  return <HealthView />;
}
