import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { StatusBadge } from "../components/StatusBadge";
import { useAuthStore } from "../store/authStore";
import { ListChecks, MapPin, Search, Loader2, CheckCircle2, Archive, ExternalLink } from "lucide-react";

const TOTAL_CATEGORIES = 9;

export default function UsulanPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [areas, setAreas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const isAdmin = user?.role === "super_admin";

  useEffect(() => {
    supabase
      .from("irrigation_areas")
      .select("*, irrigation_types(name), documents(status)")
      .order("name")
      .then(({ data }) => {
        if (data) setAreas(data);
        setLoading(false);
      });
  }, []);

  const setStatus = async (areaId: string, status: string) => {
    setUpdating(areaId);
    await supabase.rpc("admin_update_area", {
      p_area_id: areaId,
      p_name: areas.find((a) => a.id === areaId)?.name,
      p_irrigation_type_id: areas.find((a) => a.id === areaId)?.irrigation_type_id,
      p_status: status,
    });
    const { data } = await supabase.from("irrigation_areas").select("*, irrigation_types(name), documents(status)").order("name");
    if (data) setAreas(data);
    setUpdating(null);
  };

  const ready = areas.filter((a) => {
    const approved = a.documents?.filter((d: any) => d.status === "approved").length || 0;
    return approved >= TOTAL_CATEGORIES && a.status !== "approved" && a.status !== "stock_program";
  });

  const done = areas.filter((a) => a.status === "approved" || a.status === "stock_program");

  const filteredReady = searchQuery
    ? ready.filter((a) => a.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : ready;

  const filteredDone = searchQuery
    ? done.filter((a) => a.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : done;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Usulan</h1>
        <p className="text-muted-foreground">Daftar daerah irigasi yang siap ditentukan statusnya.</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Cari daerah irigasi..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-primary" />
          Menunggu Keputusan
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
            filteredReady.map((area) => (
              <Card key={area.id} className="border-amber-200 dark:border-amber-900">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="rounded-lg bg-amber-100 dark:bg-amber-900/30 p-2">
                        <ListChecks className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
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
                          <Archive className="h-3 w-3 mr-1" />
                          Stock Program
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Archive className="h-5 w-5 text-muted-foreground" />
          Sudah Diputuskan
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
            filteredDone.map((area) => {
              const approved = area.documents?.filter((d: any) => d.status === "approved").length || 0;
              return (
                <Card key={area.id} className="opacity-80 hover:opacity-100 transition-opacity cursor-pointer" onClick={() => navigate(`/area/${area.id}`)}>
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
                          <p className="text-xs text-muted-foreground">{area.irrigation_types?.name} &middot; {approved}/{TOTAL_CATEGORIES} dokumen</p>
                        </div>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
