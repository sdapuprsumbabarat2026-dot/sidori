import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { StatsCard } from "../components/StatsCard";
import { Droplets, Users, MapPin, FileText } from "lucide-react";

export default function DashboardPage() {
  const [stats, setStats] = useState({ areas: 0, users: 0, docs: 0, review: 0 });

  useEffect(() => {
    async function load() {
      const [areas, users, docs, review] = await Promise.all([
        supabase.from("irrigation_areas").select("*", { count: "exact", head: true }),
        supabase.from("users").select("*", { count: "exact", head: true }),
        supabase.from("documents").select("*", { count: "exact", head: true }),
        supabase.from("documents").select("*", { count: "exact", head: true }).eq("status", "review"),
      ]);
      setStats({
        areas: areas.count ?? 0,
        users: users.count ?? 0,
        docs: docs.count ?? 0,
        review: review.count ?? 0,
      });
    }
    load();
  }, []);

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
    </div>
  );
}
