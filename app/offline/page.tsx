import { WifiOff } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";

export const metadata = { title: "Offline — Stevens Stats" };

export default function OfflinePage() {
  return (
    <EmptyState icon={WifiOff} title="You're offline">
      {
        "Pages you've already opened still work from the cache. Reconnect to load anything new."
      }
    </EmptyState>
  );
}
