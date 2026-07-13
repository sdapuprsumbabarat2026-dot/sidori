import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import { StatusBadge } from "../../components/StatusBadge";
import { Plus, Loader2, Trash2, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { IrrigationArea, IrrigationType } from "../../types";

export default function AdminAreasPage() {
  const [areas, setAreas] = useState<(IrrigationArea & { irrigation_types: { name: string }; documents: { status: string }[] })[]>([]);
  const [types, setTypes] = useState<IrrigationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [typeId, setTypeId] = useState("");
  const [status, setStatus] = useState("active");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const loadData = async () => {
    const [a, t] = await Promise.all([
      supabase.from("irrigation_areas").select("*, irrigation_types(name), documents(status)").order("created_at", { ascending: false }),
      supabase.from("irrigation_types").select("*"),
    ]);
    if (a.data) setAreas(a.data as any);
    if (t.data) setTypes(t.data);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await supabase.rpc("admin_create_area", { p_name: name, p_irrigation_type_id: typeId, p_status: status });
    setSubmitting(false);
    setName(""); setTypeId(""); setStatus("active");
    loadData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus daerah irigasi ini?")) return;
    await supabase.rpc("admin_delete_area", { p_area_id: id });
    loadData();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Daerah Irigasi</h1>
          <p className="text-muted-foreground">Kelola daerah irigasi.</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Tambah
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah Daerah Irigasi</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Nama Daerah Irigasi</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Jenis Irigasi</Label>
                <Select value={typeId} onValueChange={setTypeId} required>
                  <SelectTrigger><SelectValue placeholder="Pilih jenis" /></SelectTrigger>
                  <SelectContent>
                    {types.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Aktif</SelectItem>
                    <SelectItem value="approved">Disetujui</SelectItem>
                    <SelectItem value="stock_program">Stock Program</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Simpan
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : areas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Belum ada daerah irigasi</div>
            ) : (
              areas.map((a) => (
                <div key={a.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{a.name}</p>
                    <p className="text-sm text-muted-foreground">{a.irrigation_types?.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={a.status} />
                    <Button variant="ghost" size="icon" onClick={() => navigate(`/area/${a.id}`)}>
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(a.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
