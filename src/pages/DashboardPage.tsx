import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Card, CardContent } from "../components/ui/card";
import { StatsCard } from "../components/StatsCard";
import { Droplets, Users, MapPin, FileText, Loader2, CheckCircle2, Archive } from "lucide-react";

export default function DashboardPage() {
  const [stats, setStats] = useState({ areas: 0, users: 0, docs: 0, review: 0, approved: 0, stock: 0 });
  const [typeStats, setTypeStats] = useState<{ name: string; area_count: number; doc_count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [areas, users, docs, review, approved, stock, irigasi, allAreas, allDocs] = await Promise.all([
        supabase.from("irrigation_areas").select("*", { count: "exact", head: true }),
        supabase.from("users").select("*", { count: "exact", head: true }),
        supabase.from("documents").select("*", { count: "exact", head: true }),
        supabase.from("documents").select("*", { count: "exact", head: true }).eq("status", "review"),
        supabase.from("irrigation_areas").select("*", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("irrigation_areas").select("*", { count: "exact", head: true }).eq("status", "stock_program"),
        supabase.from("irrigation_types").select("*").order("name"),
        supabase.from("irrigation_areas").select("id, irrigation_type_id, status"),
        supabase.from("documents").select("irrigation_area_id"),
      ]);

      setStats({
        areas: areas.count ?? 0,
        users: users.count ?? 0,
        docs: docs.count ?? 0,
        review: review.count ?? 0,
        approved: approved.count ?? 0,
        stock: stock.count ?? 0,
      });

      const types = irigasi.data || [];
      const areaList = allAreas.data || [];
      const docList = allDocs.data || [];

      setTypeStats(
        types.map((t) => ({
          name: t.name,
          area_count: areaList.filter((a) => a.irrigation_type_id === t.id).length,
          doc_count: docList.filter((d) => areaList.some((a) => a.id === d.irrigation_area_id && a.irrigation_type_id === t.id)).length,
        }))
      );

      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview sistem inventarisasi dokumen irigasi.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard icon={MapPin} label="Daerah Irigasi" value={stats.areas} />
        <StatsCard icon={Users} label="Pengguna" value={stats.users} />
        <StatsCard icon={FileText} label="Dokumen" value={stats.docs} className="border-blue-200 dark:border-blue-900" />
        <StatsCard icon={Droplets} label="Perlu Review" value={stats.review} className="border-amber-200 dark:border-amber-900" />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Rekapitulasi Daerah Irigasi</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="border-green-200 dark:border-green-900">
            <CardContent className="p-5 flex items-center gap-3">
              <div className="rounded-lg bg-green-100 dark:bg-green-900/30 p-2.5">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Disetujui akan dibangun</p>
                <p className="text-2xl font-bold">{stats.approved}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-blue-200 dark:border-blue-900">
            <CardContent className="p-5 flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 dark:bg-blue-900/30 p-2.5">
                <Archive className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Stock Program</p>
                <p className="text-2xl font-bold">{stats.stock}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Statistik per Jenis Irigasi</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {typeStats.map((t) => (
            <Card key={t.name}>
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-primary/10 p-2.5">
                    <Droplets className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{t.name}</p>
                    <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                      <span>{t.area_count} daerah</span>
                      <span>{t.doc_count} dokumen</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
