import { cn } from "../lib/utils";

const statusMap: Record<string, { label: string; class: string }> = {
  review: { label: "Review", class: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
  rejected: { label: "Ditolak", class: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
  approved: { label: "Disetujui", class: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  active: { label: "Aktif", class: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  stock_program: { label: "Stock Program", class: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = statusMap[status] || { label: status, class: "bg-gray-100 text-gray-800" };
  return <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", s.class)}>{s.label}</span>;
}
