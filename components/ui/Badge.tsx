export type BadgeKind = "pb" | "sb" | "sr" | "mac" | "aartfc";

const CONFIG: Record<BadgeKind, { label: string; title: string; color: string }> = {
  pb: { label: "PB", title: "Personal best", color: "text-pb" },
  sb: { label: "SB", title: "Season best", color: "text-sb" },
  sr: { label: "SR", title: "School record", color: "text-brand" },
  mac: { label: "MAC Q", title: "Meets the MAC qualifying standard", color: "text-mac" },
  aartfc: { label: "AARTFC Q", title: "Meets the AARTFC qualifying standard", color: "text-aartfc" },
};

export default function Badge({ kind }: { kind: BadgeKind }) {
  const c = CONFIG[kind];
  return (
    <span
      title={c.title}
      className={`inline-flex items-center rounded-full border border-current px-1.5 py-px text-[0.65rem] font-bold uppercase leading-none tracking-wide ${c.color}`}
    >
      {c.label}
    </span>
  );
}
