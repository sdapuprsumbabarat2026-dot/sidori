import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Card, CardContent } from "../components/ui/card";
import { StatsCard } from "../components/StatsCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Users, MapPin, FileText, Loader2, CheckCircle2, XCircle, Wallet, Ruler } from "lucide-react";

const CURRENT_YEAR = new Date().getFullYear();

interface TypeBreakdown {
  id: string;
  name: string;
  area_count: number;
  approved_count: number;
  stock_count: number;
}

export default function DashboardPage() {
  const [year, setYear] = useState<number>(CURRENT_YEAR);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  const [totalUsers, setTotalUsers] = useState(0);
  const [docReview, setDocReview] = useState(0);
  const [docApproved, setDocApproved] = useState(0);
  const [typeBreakdown, setTypeBreakdown] = useState<TypeBreakdown[]>([]);
  const [totalPagu, setTotalPagu] = useState(0);
  const [approvedPagu, setApprovedPagu] = useState(0);
  const [totalOutcome, setTotalOutcome] = useState(0);
  const [approvedOutcome, setApprovedOutcome] = useState(0);

  // Ambil daftar tahun yang tersedia dari data daerah irigasi
  useEffect(() => {
    async function loadYears() {
      const { data } = await supabase.from("irrigation_areas").select("tahun_anggaran");
      const years = Array.from(new Set((data || []).map((d) => d.tahun_anggaran).filter(Boolean))) as number[];
      if (!years.includes(CURRENT_YEAR)) years.push(CURRENT_YEAR);
      years.sort((a, b) => b - a);
      setAvailableYears(years);
    }
    loadYears();
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [usersRes, areasRes, docsRes, typesRes] = await Promise.all([
        supabase.from("users").select("*", { count: "exact", head: true }),
        supabase.from("irrigation_areas").select("id, irrigation_type_id, status, outcome_ha, pagu_rp").eq("tahun_anggaran", year),
        supabase.from("documents").select("status").eq("year", year),
        supabase.from("irrigation_types").select("*").order("name"),
      ]);

      setTotalUsers(usersRes.count ?? 0);

      const areas = areasRes.data || [];
      const docs = docsRes.data || [];
      const types = typesRes.data || [];

      setDocReview(docs.filter((d) => d.status === "review").length);
      setDocApproved(docs.filter((d) => d.status === "approved").length);

      setTypeBreakdown(
        types.map((t) => {
          const areasOfType = areas.filter((a) => a.irrigation_type_id === t.id);
          return {
            id: t.id,
            name: t.name,
            area_count: areasOfType.length,
            approved_count: areasOfType.filter((a) => a.status === "approved").length,
            stock_count: areasOfType.filter((a) => a.status === "stock_program").length,
          };
        })
      );

      const sum = (arr: typeof areas, key: "pagu_rp" | "outcome_ha") =>
        arr.reduce((acc, a) => acc + (Number(a[key]) || 0), 0);

      setTotalPagu(sum(areas, "pagu_rp"));
      setApprovedPagu(sum(areas.filter((a) => a.status === "approved"), "pagu_rp"));
      setTotalOutcome(sum(areas, "outcome_ha"));
      setApprovedOutcome(sum(areas.filter((a) => a.status === "approved"), "outcome_ha"));

      setLoading(false);
    }
    load();
  }, [year]);

  const totalAreas = typeBreakdown.reduce((acc, t) => acc + t.area_count, 0);

  const formatRp = (v: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v);

  return (
    <div className="space-y-6">
      <div className="relative rounded-2xl overflow-hidden min-h-[220px] flex items-end">
        <img
          src="/dashboard-hero.jpeg"
          alt="Irigasi Sumba Barat"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-blue-950/90 via-blue-950/50 to-blue-950/10" />
        <div className="relative p-6 md:p-8 text-white w-full flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-blue-100">Selamat Datang di</p>
            <h1 className="text-3xl font-bold tracking-tight">SIDORI</h1>
            <p className="text-sm font-medium text-blue-100 mt-1">Tahun Anggaran {year}</p>
            <p className="text-sm text-blue-100/90 max-w-2xl mt-2">
              Sistem Informasi Dokumen Perencanaan Irigasi merupakan sistem pengelolaan dokumen
              perencanaan konstruksi jaringan irigasi untuk mengawal proses pengusulan.
            </p>
          </div>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-36 bg-white/90 text-slate-900 backdrop-blur border-white/40">
              <SelectValue placeholder="Tahun" />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  Tahun {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* 1. Daerah Irigasi - total only (no per-type breakdown) */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Daerah Irigasi</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatsCard icon={MapPin} label="Total Daerah Irigasi" value={totalAreas} />
            </div>
          </div>

          {/* 2. Status Dokumen */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Status Dokumen</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="border-amber-200 dark:border-amber-900">
                <CardContent className="p-5 flex items-center gap-3">
                  <div className="rounded-lg bg-amber-100 dark:bg-amber-900/30 p-2.5">
                    <FileText className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Menunggu Review</p>
                    <p className="text-2xl font-bold">{docReview}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-green-200 dark:border-green-900">
                <CardContent className="p-5 flex items-center gap-3">
                  <div className="rounded-lg bg-green-100 dark:bg-green-900/30 p-2.5">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Sesuai</p>
                    <p className="text-2xl font-bold">{docApproved}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* 3. Status Usulan (per jenis irigasi) */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Status Usulan</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {typeBreakdown.map((t) => (
                <Card key={t.id}>
                  <CardContent className="p-5">
                    <p className="font-medium mb-3">{t.name}</p>
                    <div className="flex gap-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-muted-foreground">Disetujui</span>
                        <span className="font-semibold">{t.approved_count}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-500" />
                        <span className="text-sm text-muted-foreground">Tidak Disetujui</span>
                        <span className="font-semibold">{t.stock_count}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* 4 & 5. Total Pagu dan Total Outcome */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="border-blue-200 dark:border-blue-900">
              <CardContent className="p-5 flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 dark:bg-blue-900/30 p-2.5">
                  <Wallet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Pagu (Rp)</p>
                  <p className="text-xl font-bold">{formatRp(totalPagu)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Disetujui: {formatRp(approvedPagu)}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-emerald-200 dark:border-emerald-900">
              <CardContent className="p-5 flex items-center gap-3">
                <div className="rounded-lg bg-emerald-100 dark:bg-emerald-900/30 p-2.5">
                  <Ruler className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Outcome (Ha)</p>
                  <p className="text-xl font-bold">{totalOutcome.toLocaleString("id-ID")} Ha</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Disetujui: {approvedOutcome.toLocaleString("id-ID")} Ha</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 7. Pengguna */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Pengguna</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatsCard icon={Users} label="Total Pengguna" value={totalUsers} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
