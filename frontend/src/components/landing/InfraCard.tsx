import type { ReactNode } from "react";
import { BentoShell } from "@/components/ui/BentoShell";

type Props = {
  title: string;
  description: string;
  visual: ReactNode;
  visualClassName?: string;
};

export function InfraCard({
  title,
  description,
  visual,
  visualClassName = "",
}: Props) {
  return (
    <BentoShell className="group" height="h-[32rem]">
      <div className={`relative flex-1 overflow-hidden ${visualClassName}`}>
        {visual}
      </div>
      <div className="relative z-10 mt-auto p-8 transition-transform duration-500 group-hover:translate-x-0.5">
        <h3 className="mb-3 text-2xl font-medium tracking-tight text-foreground">
          {title}
        </h3>
        <p className="text-base leading-relaxed text-muted transition-colors group-hover:text-foreground/75">
          {description}
        </p>
      </div>
    </BentoShell>
  );
}
