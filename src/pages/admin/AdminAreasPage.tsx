import { useEffect, useState, useRef } from "react";
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
import { Plus, Loader2, Trash2, ExternalLink, Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { IrrigationType } from "../../types";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 8 }, (_, i) => CURRENT_YEAR - 2 + i);

type FormState = {
  name: string;
  typeId: string;
  menuKegiatan: string;
  kecamatan: string;
  desa: string;
  outcomeHa: string;
  paguRp: string;
  tahunAnggaran: string;
  status: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  typeId: "",
  menuKegiatan: "",
  kecamatan: "",
  desa: "",
  outcomeHa: "",
  paguRp: "",
  tahunAnggaran: String(CURRENT_YEAR),
  status: "active",
};

export default function AdminAreasPage() {
  const [areas, setAreas] = useState<any[]>([]);
  const [types, setTypes] = useState<IrrigationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editArea, setEditArea] = useState<any>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
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

  const setField = (key: keyof FormState) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const resetForm = () => setForm(EMPTY_FORM);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { data } = await supabase.rpc("admin_create_area_full", {
      p_name: form.name,
      p_irrigation_type_id: form.typeId,
      p_menu_kegiatan: form.menuKegiatan,
      p_kecamatan: form.kecamatan,
      p_desa: form.desa,
      p_outcome_ha: form.outcomeHa ? Number(form.outcomeHa) : null,
      p_pagu_rp: form.paguRp ? Number(form.paguRp) : null,
      p_tahun_anggaran: Number(form.tahunAnggaran),
    });
    if (form.status !== "active" && data?.id) {
      await supabase.rpc("admin_update_area", {
        p_area_id: data.id,
        p_name: form.name,
        p_irrigation_type_id: form.typeId,
        p_status: form.status,
      });
    }
    setSubmitting(false);
    resetForm();
    setCreateOpen(false);
    loadData();
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editArea) return;
    setSubmitting(true);
    await supabase.rpc("admin_update_area_full", {
      p_area_id: editArea.id,
      p_name: form.name,
      p_irrigation_type_id: form.typeId,
      p_menu_kegiatan: form.menuKegiatan,
      p_kecamatan: form.kecamatan,
      p_desa: form.desa,
      p_outcome_ha: form.outcomeHa ? Number(form.outcomeHa) : null,
      p_pagu_rp: form.paguRp ? Number(form.paguRp) : null,
      p_tahun_anggaran: Number(form.tahunAnggaran),
    });
    if (form.status !== editArea.status) {
      await supabase.rpc("admin_update_area", {
        p_area_id: editArea.id,
        p_name: form.name,
        p_irrigation_type_id: form.typeId,
        p_status: form.status,
      });
    }
    setSubmitting(false);
    setEditArea(null);
    setEditOpen(false);
    loadData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus daerah irigasi ini?")) return;
    await supabase.rpc("admin_delete_area", { p_area_id: id });
    loadData();
  };

  const openEdit = (area: any) => {
    setEditArea(area);
    setForm({
      name: area.name,
      typeId: area.irrigation_type_id,
      menuKegiatan: area.menu_kegiatan || "",
      kecamatan: area.kecamatan || "",
      desa: area.desa || "",
      outcomeHa: area.outcome_ha != null ? String(area.outcome_ha) : "",
      paguRp: area.pagu_rp != null ? String(area.pagu_rp) : "",
      tahunAnggaran: area.tahun_anggaran ? String(area.tahun_anggaran) : String(CURRENT_YEAR),
      status: area.status,
    });
    setEditOpen(true);
  };

  const AreaForm = ({ onSubmit, submitLabel }: { onSubmit: (e: React.FormEvent) => void; submitLabel: string }) => {
    const formRef = useRef<HTMLFormElement>(null);
    useEffect(() => {
      const timer = setTimeout(() => {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }, 0);
      return () => clearTimeout(timer);
    }, []);
    return (
      <form onSubmit={onSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1" ref={formRef}>
        <div className="space-y-2">
          <Label>Nama Daerah Irigasi</Label>
          <Input value={form.name} onChange={(e) => setField("name")(e.target.value)} required placeholder="Contoh: DI. Sadang" />
        </div>
        <div className="space-y-2">
          <Label>Jenis Daerah Irigasi</Label>
          <Select value={form.typeId} onValueChange={setField("typeId")} required>
            <SelectTrigger><SelectValue placeholder="Pilih jenis" /></SelectTrigger>
            <SelectContent>
              {types.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Menu Kegiatan</Label>
          <Select value={form.menuKegiatan} onValueChange={setField("menuKegiatan")} required>
            <SelectTrigger><SelectValue placeholder="Pilih menu kegiatan" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="peningkatan">Peningkatan</SelectItem>
              <SelectItem value="pembangunan">Pembangunan</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Menentukan kategori dokumen wajib (Peningkatan: 8, Pembangunan: 9 termasuk Surat Izin Penggunaan Lahan).
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Kecamatan</Label>
            <Input value={form.kecamatan} onChange={(e) => setField("kecamatan")(e.target.value)} required placeholder="Contoh: Wanokaka" />
          </div>
          <div className="space-y-2">
            <Label>Desa</Label>
            <Input value={form.desa} onChange={(e) => setField("desa")(e.target.value)} required placeholder="Contoh: Prai Paha" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Outcome (Ha)</Label>
            <Input type="number" step="0.01" min="0" value={form.outcomeHa} onChange={(e) => setField("outcomeHa")(e.target.value)} required placeholder="Contoh: 500" />
          </div>
          <div className="space-y-2">
            <Label>Pagu (Rp)</Label>
            <Input type="number" step="1" min="0" value={form.paguRp} onChange={(e) => setField("paguRp")(e.target.value)} required placeholder="Contoh: 5000000000" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Tahun Anggaran</Label>
            <Select value={form.tahunAnggaran} onValueChange={setField("tahunAnggaran")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status Usulan</Label>
            <Select value={form.status} onValueChange={setField("status")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Menunggu Verifikasi</SelectItem>
                <SelectItem value="approved">Disetujui</SelectItem>
                <SelectItem value="stock_program">Tidak Disetujui</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          {submitLabel}
        </Button>
      </form>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Daerah Irigasi</h1>
          <p className="text-muted-foreground">Kelola daerah irigasi.</p>
        </div>
        <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Tambah</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Tambah Daerah Irigasi</DialogTitle>
            </DialogHeader>
            <AreaForm onSubmit={handleCreate} submitLabel="Simpan" />
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
                <div key={a.id} className="flex items-center justify-between p-4 gap-3 flex-wrap">
                  <div>
                    <p className="font-medium">{a.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {a.irrigation_types?.name}
                      {a.menu_kegiatan && <> &middot; {a.menu_kegiatan === "peningkatan" ? "Peningkatan" : "Pembangunan"}</>}
                      {a.kecamatan && <> &middot; {a.kecamatan}{a.desa ? `, ${a.desa}` : ""}</>}
                      {a.tahun_anggaran && <> &middot; TA {a.tahun_anggaran}</>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={a.status} />
                    <Button variant="ghost" size="icon" onClick={() => openEdit(a)} title="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => navigate(`/area/${a.id}`)} title="Lihat dokumen">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(a.id)} title="Hapus">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Daerah Irigasi</DialogTitle>
          </DialogHeader>
          {editArea && <AreaForm onSubmit={handleEdit} submitLabel="Simpan Perubahan" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}