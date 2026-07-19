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
  const [totalOutputKm, setTotalOutputKm] = useState(0);
  const [approvedOutputKm, setApprovedOutputKm] = useState(0);

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
        supabase.from("irrigation_areas").select("id, irrigation_type_id, status, outcome_ha, pagu_rp, output_km").eq("tahun_anggaran", year),
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

      const sum = (arr: typeof areas, key: "pagu_rp" | "outcome_ha" | "output_km") =>
        arr.reduce((acc, a) => acc + (Number(a[key]) || 0), 0);

      setTotalPagu(sum(areas, "pagu_rp"));
      setApprovedPagu(sum(areas.filter((a) => a.status === "approved"), "pagu_rp"));
      setTotalOutcome(sum(areas, "outcome_ha"));
      setApprovedOutcome(sum(areas.filter((a) => a.status === "approved"), "outcome_ha"));
      setTotalOutputKm(sum(areas, "output_km"));
      setApprovedOutputKm(sum(areas.filter((a) => a.status === "approved"), "output_km"));

      setLoading(false);
    }
    load();
  }, [year]);

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
          <div>
            <h2 className="text-lg font-semibold mb-3">Daerah Irigasi</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {typeBreakdown.map((t) => (
                <Card key={t.id} className="bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-lg text-emerald-800 dark:text-emerald-300">{t.name}</h3>
                      <MapPin className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-emerald-700 dark:text-emerald-400">Jumlah</span>
                        <span className="font-medium text-emerald-800 dark:text-emerald-300">{t.area_count}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-emerald-700 dark:text-emerald-400">Disetujui</span>
                        <span className="font-medium text-green-600">{t.approved_count}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-emerald-700 dark:text-emerald-400">Stock Program</span>
                        <span className="font-medium text-amber-600">{t.stock_count}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-3">Status Dokumen</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="rounded-lg bg-amber-100 dark:bg-amber-900/30 p-2.5">
                    <FileText className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm text-amber-700 dark:text-amber-400">Menunggu Review</p>
                    <p className="text-2xl font-bold text-amber-800 dark:text-amber-300">{docReview}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-900">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="rounded-lg bg-green-100 dark:bg-green-900/30 p-2.5">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-green-700 dark:text-green-400">Sesuai</p>
                    <p className="text-2xl font-bold text-green-800 dark:text-green-300">{docApproved}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-3">Status Usulan</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {typeBreakdown.map((t) => (
                <Card key={t.id} className="bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800">
                  <CardContent className="p-4">
                    <p className="font-medium mb-3 text-slate-700 dark:text-slate-300">{t.name}</p>
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

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 dark:bg-blue-900/30 p-2.5">
                  <Wallet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-blue-700 dark:text-blue-400">Total Pagu (Rp)</p>
                  <p className="text-xl font-bold text-blue-800 dark:text-blue-300">{formatRp(totalPagu)}</p>
                  <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-0.5">Disetujui: {formatRp(approvedPagu)}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-lg bg-emerald-100 dark:bg-emerald-900/30 p-2.5">
                  <Ruler className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm text-emerald-700 dark:text-emerald-400">Total Outcome (Ha)</p>
                  <p className="text-xl font-bold text-emerald-800 dark:text-emerald-300">{totalOutcome.toLocaleString("id-ID")} Ha</p>
                  <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-0.5">Disetujui: {approvedOutcome.toLocaleString("id-ID")} Ha</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-lg bg-purple-100 dark:bg-purple-900/30 p-2.5">
                  <Ruler className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-purple-700 dark:text-purple-400">Total Output (Km)</p>
                  <p className="text-xl font-bold text-purple-800 dark:text-purple-300">{totalOutputKm.toLocaleString("id-ID")} Km</p>
                  <p className="text-xs text-purple-600/70 dark:text-purple-400/70 mt-0.5">Disetujui: {approvedOutputKm.toLocaleString("id-ID")} Km</p>
                </div>
              </CardContent>
            </Card>
          </div>

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
