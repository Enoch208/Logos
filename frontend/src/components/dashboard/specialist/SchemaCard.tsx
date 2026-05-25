import { CheckmarkCircle02Icon } from "hugeicons-react";

type Props = {
  schema: object;
};

export function SchemaCard({ schema }: Props) {
  const json = JSON.stringify(schema, null, 2);
  return (
    <div className="rounded-xl border border-white/5 bg-[#0B0C0E] p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
          Response schema
        </h3>
        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-accent">
          <CheckmarkCircle02Icon size={12} strokeWidth={1.5} />
          validated before payment
        </span>
      </div>
      <pre className="mt-4 overflow-x-auto rounded-lg border border-white/[0.04] bg-black/40 p-4 font-mono text-[11.5px] leading-relaxed text-foreground/85">
        {json}
      </pre>
      <p className="mt-3 text-[11.5px] leading-relaxed text-muted">
        Every attestation is checked against this schema on-chain; payment only
        releases if the response conforms.
      </p>
    </div>
  );
}
