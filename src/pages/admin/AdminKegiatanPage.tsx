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
import { Plus, Loader2, Trash2, Pencil, ListChecks } from "lucide-react";
import type { KategoriDokumen } from "../../types";

type FormState = {
  menuKegiatanId: string;
  name: string;
  sortOrder: string;
};

const EMPTY_FORM: FormState = { menuKegiatanId: "", name: "", sortOrder: "0" };

type MenuGroup = {
  id: string;
  name: string;
  slug: string;
  categories: KategoriDokumen[];
};

export default function AdminKegiatanPage() {
  const [groups, setGroups] = useState<MenuGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<KategoriDokumen | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const loadData = async () => {
    const { data } = await supabase.rpc("admin_list_kategori_dokumen");
    if (data) {
      const raw = data as KategoriDokumen[];
      const menuMap = new Map<string, MenuGroup>();
      for (const c of raw) {
        const key = c.menu_kegiatan_id;
        if (!menuMap.has(key)) {
          menuMap.set(key, {
            id: key,
            name: c.menu_kegiatan || "",
            slug: c.menu_slug || "",
            categories: [],
          });
        }
        menuMap.get(key)!.categories.push(c);
      }
      setGroups(
        Array.from(menuMap.values()).sort((a) => (a.slug === "peningkatan" ? -1 : 1))
      );
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const setField = (key: keyof FormState) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const resetForm = () => setForm(EMPTY_FORM);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await supabase.rpc("admin_insert_kategori_dokumen", {
      p_menu_kegiatan_id: form.menuKegiatanId,
      p_name: form.name,
      p_sort_order: Number(form.sortOrder),
    });
    setSubmitting(false);
    resetForm();
    setCreateOpen(false);
    loadData();
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCategory) return;
    setSubmitting(true);
    await supabase.rpc("admin_update_kategori_dokumen", {
      p_id: editCategory.id,
      p_name: form.name,
      p_sort_order: Number(form.sortOrder),
    });
    setSubmitting(false);
    setEditCategory(null);
    setEditOpen(false);
    loadData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus kategori dokumen ini?")) return;
    await supabase.rpc("admin_delete_kategori_dokumen", { p_id: id });
    loadData();
  };

  const openEdit = (cat: KategoriDokumen) => {
    setEditCategory(cat);
    setForm({
      menuKegiatanId: cat.menu_kegiatan_id,
      name: cat.name,
      sortOrder: String(cat.sort_order),
    });
    setEditOpen(true);
  };

  const allMenuItems = groups.map((g) => ({ id: g.id, name: g.name, slug: g.slug }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Menu Kegiatan</h1>
          <p className="text-muted-foreground">Kelola kategori dokumen per menu kegiatan.</p>
        </div>
        <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Tambah Kategori</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Tambah Kategori Dokumen</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Menu Kegiatan</Label>
                <Select value={form.menuKegiatanId} onValueChange={setField("menuKegiatanId")} required>
                  <SelectTrigger><SelectValue placeholder="Pilih menu kegiatan" /></SelectTrigger>
                  <SelectContent>
                    {allMenuItems.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nama Kategori</Label>
                <Input value={form.name} onChange={(e) => setField("name")(e.target.value)} required placeholder="Contoh: KTP" />
              </div>
              <div className="space-y-2">
                <Label>Urutan</Label>
                <Input type="number" min="0" value={form.sortOrder} onChange={(e) => setField("sortOrder")(e.target.value)} required />
              </div>
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Simpan
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8 text-muted-foreground">
            <ListChecks className="h-8 w-8 mx-auto mb-2 opacity-50" />
            Belum ada kategori dokumen
          </CardContent>
        </Card>
      ) : (
        groups.map((g) => (
          <Card key={g.id}>
            <CardContent className="p-0">
              <div className="px-4 py-3 bg-muted/50 border-b">
                <h3 className="font-semibold text-lg">{g.name}</h3>
                <p className="text-xs text-muted-foreground">{g.categories.length} kategori dokumen</p>
              </div>
              {g.categories.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">Belum ada kategori</div>
              ) : (
                <div className="divide-y">
                  {g.categories
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map((cat) => (
                      <div key={cat.id} className="flex items-center justify-between p-4 gap-3">
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground w-6 text-right font-mono">{cat.sort_order}</span>
                          <span className="font-medium">{cat.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(cat)} title="Edit">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(cat.id)} title="Hapus">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Kategori Dokumen</DialogTitle>
          </DialogHeader>
          {editCategory && (
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nama Kategori</Label>
                <Input value={form.name} onChange={(e) => setField("name")(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Urutan</Label>
                <Input type="number" min="0" value={form.sortOrder} onChange={(e) => setField("sortOrder")(e.target.value)} required />
              </div>
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Simpan Perubahan
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
