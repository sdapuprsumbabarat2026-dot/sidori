import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { StatusBadge } from "../components/StatusBadge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import { useAuthStore } from "../store/authStore";
import { MapPin, FileText, Search, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";

export default function IrrigationAreasPage() {
  const { typeId } = useParams<{ typeId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [irrigationType, setIrrigationType] = useState<{ name: string } | null>(null);
  const [areas, setAreas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});

  const filtered = searchQuery
    ? areas.filter((a) => a.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : areas;

  const isAdmin = user?.role === "super_admin";

  useEffect(() => {
    if (!typeId) return;
    (async () => {
      let areasQuery = supabase
        .from("irrigation_areas")
        .select("*, documents(status)")
        .eq("irrigation_type_id", typeId);
      if (selectedYear) areasQuery = areasQuery.eq("tahun_anggaran", Number(selectedYear));
      areasQuery = areasQuery.order("name");

      const [typeRes, areasRes, yearsRes] = await Promise.all([
        supabase.from("irrigation_types").select("name").eq("id", typeId).maybeSingle(),
        areasQuery,
        supabase.from("irrigation_areas").select("tahun_anggaran").eq("irrigation_type_id", typeId).not("tahun_anggaran", "is", null),
      ]);
      setIrrigationType(typeRes.data);
      setAreas(areasRes.data || []);
      const years = Array.from(new Set((yearsRes.data || []).map((d) => d.tahun_anggaran))) as number[];
      years.sort((a, b) => b - a);
      setAvailableYears(years);

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

      setLoading(false);
    })();
  }, [typeId, selectedYear]);

  const setStatus = async (areaId: string, status: string) => {
    setUpdating(areaId);
    await supabase.rpc("admin_update_area", {
      p_area_id: areaId,
      p_name: areas.find((a) => a.id === areaId)?.name,
      p_irrigation_type_id: areas.find((a) => a.id === areaId)?.irrigation_type_id,
      p_status: status,
    });
    const { data } = await supabase.from("irrigation_areas").select("*, documents(status)").eq("irrigation_type_id", typeId).order("name");
    if (data) setAreas(data);
    setUpdating(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/irigasi")} className="mb-1 -ml-2">
            <ArrowLeft className="h-4 w-4 mr-1" /> Kembali
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">{irrigationType?.name || "Daerah Irigasi"}</h1>
          <p className="text-sm text-muted-foreground">{areas.length} daerah irigasi</p>
        </div>
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
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari daerah irigasi..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-3">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <MapPin className="h-12 w-12 mb-3 opacity-50" />
              <p>{searchQuery ? "Daerah tidak ditemukan" : "Belum ada daerah irigasi"}</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((area) => {
            const approved = area.documents?.filter((d: any) => d.status === "approved").length || 0;
            const total = categoryCounts[area.menu_kegiatan] ?? 9;
            const allApproved = approved >= total;
            return (
              <Card key={area.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/area/${area.id}`)}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="rounded-lg bg-primary/10 p-2">
                        <MapPin className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{area.name}</p>
                          <StatusBadge status={area.status} />
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" /> {approved}/{total} disetujui
                          </span>
                        </div>
                        <div className="mt-1.5 w-full max-w-[200px] bg-muted rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all ${allApproved ? "bg-green-500" : "bg-primary"}`}
                            style={{ width: `${(approved / total) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    {isAdmin && allApproved && area.status !== "approved" && area.status !== "stock_program" && (
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" className="text-xs" disabled={updating === area.id} onClick={() => setStatus(area.id, "approved")}>
                          {updating === area.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                          Disetujui
                        </Button>
                        <Button size="sm" variant="secondary" className="text-xs" disabled={updating === area.id} onClick={() => setStatus(area.id, "stock_program")}>
                          Stock Program
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
