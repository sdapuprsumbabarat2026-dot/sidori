import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Plus, MapPin, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { IrrigationType } from "../types";
import { useAuthStore } from "../store/authStore";

export default function IrrigationTypesPage() {
  const [types, setTypes] = useState<(IrrigationType & { area_count: number })[]>([]);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    supabase
      .from("irrigation_types")
      .select("*, irrigation_areas(count)")
      .then(({ data }) => {
        if (data) setTypes(data.map((t: any) => ({ ...t, area_count: t.irrigation_areas?.[0]?.count ?? 0 })));
      });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Jenis Irigasi</h1>
          <p className="text-muted-foreground">Kelola jenis irigasi dan daerah irigasinya.</p>
        </div>
        {user?.role === "super_admin" && (
          <Button onClick={() => navigate("/admin/areas")}>
            <Plus className="h-4 w-4 mr-2" /> Kelola Area
          </Button>
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {types.map((type) => (
          <Card key={type.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/area/${type.id}`)}>
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
  );
}

function Droplets({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </svg>
  );
}
