import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Card, CardContent } from "../components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { StatusBadge } from "../components/StatusBadge";
import { Loader2, History, FileText, MapPin, Ruler, Wallet } from "lucide-react";

const CURRENT_YEAR = new Date().getFullYear();

export default function RiwayatPage() {
  const navigate = useNavigate();
  const [year, setYear] = useState<number>(CURRENT_YEAR);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("irrigation_areas")
      .select("tahun_anggaran")
      .then(({ data }) => {
        const years = Array.from(new Set((data || []).map((d) => d.tahun_anggaran).filter(Boolean))) as number[];
        if (!years.includes(CURRENT_YEAR)) years.push(CURRENT_YEAR);
        years.sort((a, b) => b - a);
        setAvailableYears(years);
      });
  }, []);

  useEffect(() => {
    setLoading(true);
    supabase
      .from("irrigation_areas")
      .select("*, irrigation_types(name)")
      .eq("tahun_anggaran", year)
      .order("name")
      .then(({ data }) => {
        setAreas(data || []);
        setLoading(false);
      });
  }, [year]);

  const totalOutcome = areas.reduce((acc, a) => acc + (Number(a.outcome_ha) || 0), 0);
  const totalOutputKm = areas.reduce((acc, a) => acc + (Number(a.output_km) || 0), 0);
  const totalPagu = areas.reduce((acc, a) => acc + (Number(a.pagu_rp) || 0), 0);

  const formatRp = (v: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v);

  const menuLabel = (m: string) => (m === "peningkatan" ? "Peningkatan" : m === "pembangunan" ? "Pembangunan" : "-");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <History className="h-6 w-6 text-primary" /> Riwayat Daerah Irigasi
          </h1>
          <p className="text-muted-foreground">Rekap daerah irigasi berdasarkan tahun anggaran.</p>
        </div>
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-36">
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

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : areas.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <History className="h-12 w-12 mb-3 opacity-50" />
            <p>Belum ada data daerah irigasi untuk tahun {year}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile: card list */}
          <div className="grid gap-3 md:hidden">
            {areas.map((a) => (
              <Card key={a.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/area/${a.id}`)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 shrink-0 text-primary" />
                        <p className="font-medium truncate">{a.name}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {a.irrigation_types?.name}{a.menu_kegiatan ? ` · ${menuLabel(a.menu_kegiatan)}` : ""}
                        {a.kecamatan ? ` · ${a.kecamatan}${a.desa ? `, ${a.desa}` : ""}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={a.status} />
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Ruler className="h-3 w-3" /> {a.outcome_ha ? `${Number(a.outcome_ha).toLocaleString("id-ID")} Ha` : "-"}</span>
                    <span className="flex items-center gap-1"><Ruler className="h-3 w-3" /> {a.output_km ? `${Number(a.output_km).toLocaleString("id-ID")} Km` : "-"}</span>
                    <span className="flex items-center gap-1"><Wallet className="h-3 w-3" /> {a.pagu_rp ? formatRp(Number(a.pagu_rp)) : "-"}</span>
                  </div>
                  {a.status_verifikasi && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {a.status_verifikasi === "usulan_baru" ? "Usulan Baru" : "Stock Program"}
                      {a.status === "stock_program" && <span className="italic ml-1">(Dijadikan Stock Program)</span>}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
            {/* Mobile total */}
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold">
                  <span>Total: {areas.length} daerah</span>
                  <span>{totalOutcome.toLocaleString("id-ID")} Ha</span>
                  <span>{totalOutputKm.toLocaleString("id-ID")} Km</span>
                  <span>{formatRp(totalPagu)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Desktop: table */}
          <Card className="hidden md:block">
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">No</TableHead>
                    <TableHead>Nama DI</TableHead>
                    <TableHead>Jenis DI</TableHead>
                    <TableHead>Menu</TableHead>
                    <TableHead>Kecamatan</TableHead>
                    <TableHead>Desa</TableHead>
                    <TableHead className="text-right">Outcome (Ha)</TableHead>
                    <TableHead className="text-right">Output (Km)</TableHead>
                    <TableHead className="text-right">Pagu (Rp)</TableHead>
                    <TableHead>Jenis Usulan</TableHead>
                    <TableHead>Status Usulan</TableHead>
                    <TableHead className="text-right">Dokumen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {areas.map((a, idx) => (
                    <TableRow key={a.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/area/${a.id}`)}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell className="font-medium">{a.name}</TableCell>
                      <TableCell>{a.irrigation_types?.name || "-"}</TableCell>
                      <TableCell>{menuLabel(a.menu_kegiatan)}</TableCell>
                      <TableCell>{a.kecamatan || "-"}</TableCell>
                      <TableCell>{a.desa || "-"}</TableCell>
                      <TableCell className="text-right">{a.outcome_ha ? Number(a.outcome_ha).toLocaleString("id-ID") : "-"}</TableCell>
                      <TableCell className="text-right">{a.output_km ? Number(a.output_km).toLocaleString("id-ID") : "-"}</TableCell>
                      <TableCell className="text-right">{a.pagu_rp ? formatRp(Number(a.pagu_rp)) : "-"}</TableCell>
                      <TableCell>
                        {a.status_verifikasi === "usulan_baru"
                          ? "Usulan Baru"
                          : a.status_verifikasi === "stock_program"
                            ? "Stock Program"
                            : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={a.status} />
                          {a.status === "stock_program" && (
                            <span className="text-xs text-muted-foreground italic">Dijadikan Stock Program</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <FileText className="h-4 w-4 text-muted-foreground inline" />
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-semibold bg-muted/30">
                    <TableCell colSpan={6} className="text-right">Total</TableCell>
                    <TableCell className="text-right">{totalOutcome.toLocaleString("id-ID")}</TableCell>
                    <TableCell className="text-right">{totalOutputKm.toLocaleString("id-ID")}</TableCell>
                    <TableCell className="text-right">{formatRp(totalPagu)}</TableCell>
                    <TableCell colSpan={3} />
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
