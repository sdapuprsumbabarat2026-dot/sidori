import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Plus, MapPin, ExternalLink, Upload, Trash2, CheckCircle2, XCircle, History, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { IrrigationType } from "../types";
import { useAuthStore } from "../store/authStore";

const ACTION_META: Record<string, { label: string; icon: any; className: string }> = {
  upload: { label: "mengupload", icon: Upload, className: "text-blue-600 dark:text-blue-400" },
  delete: { label: "menghapus", icon: Trash2, className: "text-red-600 dark:text-red-400" },
  approved: { label: "menyatakan sesuai", icon: CheckCircle2, className: "text-green-600 dark:text-green-400" },
  rejected: { label: "menyatakan tidak sesuai", icon: XCircle, className: "text-amber-600 dark:text-amber-400" },
};

function timeAgo(ts: string) {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60) return "baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} hari lalu`;
  return new Date(ts).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export default function IrrigationTypesPage() {
  const [types, setTypes] = useState<(IrrigationType & { area_count: number })[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    supabase
      .from("irrigation_types")
      .select("*, irrigation_areas(count)")
      .then(({ data }) => {
        if (data) setTypes(data.map((t: any) => ({ ...t, area_count: t.irrigation_areas?.[0]?.count ?? 0 })));
      });

    supabase
      .from("document_activity_log")
      .select("*, irrigation_areas(name), performer:users!document_activity_log_performed_by_fkey(name)")
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data }) => {
        setActivity(data || []);
        setActivityLoading(false);
      });
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Upload Dokumen</h1>
            <p className="text-muted-foreground">Pilih jenis irigasi untuk mengelola dokumen daerah irigasinya.</p>
          </div>
          {user?.role === "super_admin" && (
            <Button onClick={() => navigate("/admin/areas")}>
              <Plus className="h-4 w-4 mr-2" /> Kelola Area
            </Button>
          )}
        </div>
        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2 mt-4">
          {types.map((type) => (
            <Card key={type.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/irigasi/${type.id}/areas`)}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Droplets className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{type.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {type.area_count} Daerah Irigasi
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Riwayat aktivitas: siapa upload/hapus/review dokumen */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <History className="h-5 w-5 text-primary" /> Aktivitas Terbaru
        </h2>
        <Card>
          <CardContent className="p-0 divide-y">
            {activityLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : activity.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">Belum ada aktivitas dokumen</div>
            ) : (
              activity.map((a) => {
                const meta = ACTION_META[a.action] || ACTION_META.upload;
                const Icon = meta.icon;
                return (
                  <div key={a.id} className="flex items-start gap-3 p-4">
                    <div className={`rounded-full p-1.5 bg-muted shrink-0 ${meta.className}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        <span className="font-medium">{a.performer?.name || "Seseorang"}</span>{" "}
                        <span className={meta.className}>{meta.label}</span>{" "}
                        dokumen <span className="font-medium">{a.file_name}</span>
                        {a.category_name && <> ({a.category_name})</>}
                        {a.irrigation_areas?.name && <> di <span className="font-medium">{a.irrigation_areas.name}</span></>}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(a.created_at)}</p>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Droplets({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </svg>
  );
}
