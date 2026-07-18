import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { StatusBadge } from "../components/StatusBadge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import { useAuthStore } from "../store/authStore";
import { ListChecks, MapPin, Search, Loader2, CheckCircle2, Archive, ExternalLink, XCircle, AlertCircle } from "lucide-react";

export default function UsulanPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [areas, setAreas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});

  const isAdmin = user?.role === "super_admin";

  const load = async () => {
    let query = supabase
      .from("irrigation_areas")
      .select("*, irrigation_types(name), documents(status)");
    if (selectedYear) query = query.eq("tahun_anggaran", Number(selectedYear));
    const { data } = await query.order("name");
    if (data) setAreas(data);

    const { data: menus } = await supabase.from("menu_kegiatan").select("id, slug");
    if (menus) {
      const counts: Record<string, number> = {};
      for (const menu of menus) {
        const { count } = await supabase
          .from("kategori_dokumen")
          .select("*", { count: "exact", head: true })
          .eq("menu_kegiatan_id", menu.id);
        if (count) counts[menu.slug] = count;
      }
      setCategoryCounts(counts);
    }

    const { data: yearsData } = await supabase
      .from("irrigation_areas")
      .select("tahun_anggaran")
      .not("tahun_anggaran", "is", null);
    const years = Array.from(new Set((yearsData || []).map((d) => d.tahun_anggaran))) as number[];
    years.sort((a, b) => b - a);
    setAvailableYears(years);

    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [selectedYear]);

  const setStatus = async (areaId: string, status: string) => {
    setUpdating(areaId);
    await supabase.rpc("admin_update_area", {
      p_area_id: areaId,
      p_name: areas.find((a) => a.id === areaId)?.name,
      p_irrigation_type_id: areas.find((a) => a.id === areaId)?.irrigation_type_id,
      p_status: status,
    });
    load();
    setUpdating(null);
  };

  const totalFor = (area: any) => categoryCounts[area.menu_kegiatan] ?? 9;

  const ready = areas.filter((a) => {
    const approved = a.documents?.filter((d: any) => d.status === "approved").length || 0;
    return approved >= totalFor(a) && a.status !== "approved" && a.status !== "stock_program";
  });

  const done = areas.filter((a) => a.status === "approved" || a.status === "stock_program");

  const filteredReady = searchQuery
    ? ready.filter((a) => a.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : ready;

  const filteredDone = searchQuery
    ? done.filter((a) => a.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : done;

  const groupByYear = (items: any[]) => {
    return items.reduce((acc: Record<string, any[]>, item) => {
      const year = item.tahun_anggaran || "Tanpa Tahun";
      if (!acc[year]) acc[year] = [];
      acc[year].push(item);
      return acc;
    }, {} as Record<string, any[]>);
  };

  const groupedReady = groupByYear(filteredReady);
  const groupedDone = groupByYear(filteredDone);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Usulan Kegiatan</h1>
        <p className="text-muted-foreground">Daftar daerah irigasi yang siap ditentukan statusnya.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Semua Tahun" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Semua Tahun</SelectItem>
            {availableYears.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari daerah irigasi..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-primary" />
          Menunggu Verifikasi
        </h2>
        <div className="grid gap-3">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : filteredReady.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mb-3 opacity-50" />
                <p>{searchQuery ? "Tidak ditemukan" : "Belum ada usulan yang siap ditentukan"}</p>
              </CardContent>
            </Card>
          ) : (
            Object.keys(groupedReady).sort((a, b) => Number(b) - Number(a)).map((year) => (
              <div key={year}>
                <h3 className="text-lg font-semibold mb-3 mt-6 first:mt-0">TA {year}</h3>
                <div className="grid gap-3">
                  {groupedReady[year].map((area) => (
                    <Card key={area.id} className="border-amber-200 dark:border-amber-900">
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="rounded-lg bg-amber-100 dark:bg-amber-900/30 p-2">
                              <ListChecks className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium truncate">{area.name}</p>
                                <StatusBadge status={area.status} />
                              </div>
                              <p className="text-xs text-muted-foreground">{area.irrigation_types?.name}</p>
                            </div>
                          </div>
                          {isAdmin && (
                            <div className="flex items-center gap-1 shrink-0">
                              <Button size="sm" disabled={updating === area.id} onClick={() => setStatus(area.id, "approved")}>
                                {updating === area.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                                Disetujui
                              </Button>
                              <Button size="sm" variant="secondary" disabled={updating === area.id} onClick={() => setStatus(area.id, "stock_program")}>
                                <XCircle className="h-3 w-3 mr-1" />
                                Tidak Disetujui
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Archive className="h-5 w-5 text-muted-foreground" />
          Hasil Verifikasi
        </h2>
        <div className="grid gap-3">
          {filteredDone.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Archive className="h-12 w-12 mb-3 opacity-50" />
                <p>Belum ada daerah yang diputuskan</p>
              </CardContent>
            </Card>
          ) : (
            Object.keys(groupedDone).sort((a, b) => Number(b) - Number(a)).map((year) => (
              <div key={year}>
                <h3 className="text-lg font-semibold mb-3 mt-6 first:mt-0">TA {year}</h3>
                <div className="grid gap-3">
                  {groupedDone[year].map((area) => {
                    const approved = area.documents?.filter((d: any) => d.status === "approved").length || 0;
                    const isStock = area.status === "stock_program";
                    return (
                      <Card key={area.id} className="opacity-80 hover:opacity-100 transition-opacity cursor-pointer" onClick={() => navigate(`/area/${area.id}`)}>
                        <CardContent className="py-4">
                          <div className="flex items-center justify-between flex-wrap gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="rounded-lg bg-primary/10 p-2">
                                <MapPin className="h-5 w-5 text-primary" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-medium truncate">{area.name}</p>
                                  <StatusBadge status={area.status} />
                                  {isStock && (
                                    <span className="text-xs text-muted-foreground italic flex items-center gap-1">
                                      <AlertCircle className="h-3 w-3" /> Dijadikan Stock Program
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">{area.irrigation_types?.name} &middot; {approved}/{totalFor(area)} dokumen</p>
                              </div>
                            </div>
                            <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
