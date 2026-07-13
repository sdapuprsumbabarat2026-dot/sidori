import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { StatusBadge } from "../components/StatusBadge";
import { Loader2, Upload, Eye, FileText, Search } from "lucide-react";
import type { IrrigationArea, DocumentCategory } from "../types";
import { useAuthStore } from "../store/authStore";

export default function AreaDocumentsPage() {
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const [area, setArea] = useState<IrrigationArea & { irrigation_types: { name: string } } | null>(null);
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredDocs = searchQuery
    ? documents.filter(
        (d) =>
          d.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          d.document_categories?.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : documents;

  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase.from("irrigation_areas").select("*, irrigation_types(name)").eq("id", id).single().then(({ data }) => setArea(data as any)),
      supabase.from("document_categories").select("*").order("sort_order").then(({ data }) => setCategories(data || [])),
      supabase
        .from("documents")
        .select("*, document_categories(name)")
        .eq("irrigation_area_id", id)
        .order("created_at", { ascending: false })
        .then(({ data }) => setDocuments(data || [])),
    ]).finally(() => setLoading(false));
  }, [id]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadCategory || !id) return;
    setUploading(true);
    const fileInput = document.getElementById("file-upload") as HTMLInputElement;
    if (!fileInput?.files?.[0]) {
      setUploading(false);
      return;
    }
    const file = fileInput.files[0];

    const { data: uploadData, error: uploadError } = await supabase.storage.from("documents").upload(`${id}/${Date.now()}_${file.name}`, file);
    if (uploadError || !uploadData) {
      alert("Upload gagal: " + (uploadError?.message || "unknown"));
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("documents").getPublicUrl(uploadData.path);

    await supabase.from("documents").insert({
      irrigation_area_id: id,
      category_id: uploadCategory,
      file_name: file.name,
      file_url: urlData?.publicUrl || "",
      status: "review",
      uploaded_by: user?.id,
    });

    setUploading(false);
    setUploadCategory("");
    if (fileInput) fileInput.value = "";

    const { data: newDocs } = await supabase
      .from("documents")
      .select("*, document_categories(name)")
      .eq("irrigation_area_id", id)
      .order("created_at", { ascending: false });
    if (newDocs) setDocuments(newDocs);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{area?.name || "Daerah Irigasi"}</h1>
        <p className="text-muted-foreground">{area?.irrigation_types?.name}</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari dokumen..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Upload className="h-4 w-4 mr-2" /> Upload Dokumen
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Dokumen</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="doc-category">Kategori</Label>
                <Select value={uploadCategory} onValueChange={setUploadCategory} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="file-upload">File</Label>
                <Input id="file-upload" type="file" required />
              </div>
              <Button type="submit" disabled={uploading} className="w-full">
                {uploading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {uploading ? "Mengupload..." : "Upload"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3">
        {filteredDocs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mb-3 opacity-50" />
              <p>Belum ada dokumen</p>
            </CardContent>
          </Card>
        ) : (
          filteredDocs.map((doc) => (
            <Card key={doc.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="font-medium truncate">{doc.file_name}</p>
                    <p className="text-xs text-muted-foreground">{doc.document_categories?.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={doc.status} />
                  <Button variant="ghost" size="icon" asChild>
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                      <Eye className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
