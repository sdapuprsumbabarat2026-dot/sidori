import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

import { MapPin, FileText, Search, ArrowLeft, Loader2, ExternalLink } from "lucide-react";

export default function IrrigationAreasPage() {
  const { typeId } = useParams<{ typeId: string }>();
  const navigate = useNavigate();
  const [irrigationType, setIrrigationType] = useState<{ name: string } | null>(null);
  const [areas, setAreas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = searchQuery
    ? areas.filter((a) => a.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : areas;

  useEffect(() => {
    if (!typeId) return;
    Promise.all([
      supabase.from("irrigation_types").select("name").eq("id", typeId).maybeSingle().then(({ data }) => setIrrigationType(data)),
      supabase.from("irrigation_areas").select("*, documents(status)").eq("irrigation_type_id", typeId).order("name").then(({ data }) => setAreas(data || [])),
    ]).finally(() => setLoading(false));
  }, [typeId]);

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

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Cari daerah irigasi..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
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
          filtered.map((area) => (
            <Card key={area.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/area/${area.id}`)}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{area.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                      <FileText className="h-3 w-3" /> {area.documents?.length || 0} dokumen
                    </p>
                  </div>
                </div>
                <ExternalLink className="h-5 w-5 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
