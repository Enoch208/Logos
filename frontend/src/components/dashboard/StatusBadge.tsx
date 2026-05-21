import type { AgentTransaction } from "@/data/mockData";

type Props = {
  status: AgentTransaction["status"];
};

const TONES: Record<
  AgentTransaction["status"],
  { label: string; bg: string; border: string; text: string; dot: string }
> = {
  ESCROWED: {
    label: "Escrowed",
    bg: "bg-sky-400/[0.06]",
    border: "border-sky-400/20",
    text: "text-sky-300",
    dot: "bg-sky-300",
  },
  ATTESTED: {
    label: "Attested",
    bg: "bg-accent/[0.08]",
    border: "border-accent/25",
    text: "text-accent",
    dot: "bg-accent",
  },
  RATED: {
    label: "Rated",
    bg: "bg-emerald-400/[0.07]",
    border: "border-emerald-400/20",
    text: "text-emerald-300",
    dot: "bg-emerald-300",
  },
};

export function StatusBadge({ status }: Props) {
  const tone = TONES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] ${tone.border} ${tone.bg} ${tone.text}`}
    >
      <span className={`h-1 w-1 rounded-full ${tone.dot}`} />
      {tone.label}
    </span>
  );
}
