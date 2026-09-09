import { topTen } from "@/lib/data";
import RecordsClient from "./RecordsClient";

export default function RecordsPage() {
  return <RecordsClient lists={topTen} />;
}
