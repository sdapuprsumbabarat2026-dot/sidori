import { cn } from "../lib/utils";
import type { LucideIcon } from "lucide-react";

export function StatsCard({ icon: Icon, label, value, className }: { icon: LucideIcon; label: string; value: number | string; className?: string }) {
  return (
    <div className={cn("rounded-xl border bg-card p-5 text-card-foreground shadow-sm", className)}>
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}
