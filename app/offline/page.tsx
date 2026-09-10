import { WifiOff } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";

export const metadata = {
  title: "Offline",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <EmptyState icon={WifiOff} title="You're offline">
      {
        "Pages you've already opened still work from the cache. Reconnect to load anything new."
      }
    </EmptyState>
  );
}
