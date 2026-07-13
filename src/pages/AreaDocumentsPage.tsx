import { useEffect, useState, useRef, useCallback } from "react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../components/ui/alert-dialog";
import { StatusBadge } from "../components/StatusBadge";
import {
  Loader2, Upload, Eye, FileText, Search, Trash2,
  Calendar, HardDrive, Clock, Check
} from "lucide-react";
import type { IrrigationArea, DocumentCategory } from "../types";
import { useAuthStore } from "../store/authStore";

const GAS_URL = import.meta.env.VITE_GAS_URL;
const GAS_API_KEY = import.meta.env.VITE_GAS_API_KEY;
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 16 }, (_, i) => CURRENT_YEAR - 5 + i);

const MAX_FILE_SIZE = 15 * 1024 * 1024;

function formatSize(bytes: number) {
  if (!bytes) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++ }
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString("id-ID", { year: "numeric", month: "short", day: "numeric" });
}

export default function AreaDocumentsPage() {
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const [area, setArea] = useState<IrrigationArea & { irrigation_types: { name: string } } | null>(null);
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadPhase, setUploadPhase] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [uploadedFileId, setUploadedFileId] = useState("");
  const [uploadCategory, setUploadCategory] = useState("");
  const [uploadYear, setUploadYear] = useState(CURRENT_YEAR.toString());
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [dragFile, setDragFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredDocs = searchQuery
    ? documents.filter(
        (d) =>
          d.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          d.document_categories?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          d.year?.toString().includes(searchQuery)
      )
    : documents;

  const loadData = useCallback(() => {
    if (!id) return;
    Promise.all([
      supabase.from("irrigation_areas").select("*, irrigation_types(name)").eq("id", id).maybeSingle().then(({ data }) => setArea(data as any)),
      supabase.from("document_categories").select("*").order("sort_order").then(({ data }) => setCategories(data || [])),
      supabase
        .from("documents")
        .select("*, document_categories(name)")
        .eq("irrigation_area_id", id)
        .order("created_at", { ascending: false })
        .then(({ data }) => setDocuments(data || [])),
    ]).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { loadData() }, [loadData]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f && f.size > MAX_FILE_SIZE) { alert("File terlalu besar. Maksimal 15 MB."); return; }
    if (f) setDragFile(f);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && f.size > MAX_FILE_SIZE) { alert("File terlalu besar. Maksimal 15 MB."); return; }
    if (f) { setDragFile(f); setDragOver(false) }
  };

  const removeDragFile = () => {
    setDragFile(null);
    setUploadedUrl("");
    setUploadedFileId("");
    setUploadPhase("idle");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const cancelUpload = useCallback(async () => {
    if (uploadedFileId) {
      try {
        await fetch(GAS_URL, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ _method: "DELETE", apiKey: GAS_API_KEY, fileId: uploadedFileId }),
        });
      } catch { /* ignore */ }
    }
    removeDragFile();
  }, [uploadedFileId]);

  const uploadFileToGAS = useCallback(async (file: File) => {
    if (!area) return;
    setUploadPhase("uploading");
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const binary = bytes.reduce((acc, b) => acc + String.fromCharCode(b), "");
      const fileBase64 = btoa(binary);

      const res = await fetch(GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          apiKey: GAS_API_KEY,
          fileBase64,
          fileName: file.name,
          mimeType: file.type,
          irigationType: area.irrigation_types?.name || "",
          category: "",
          year: uploadYear,
        }),
      });

      const result = await res.json();
      if (!result.success) {
        alert("Upload ke Google Drive gagal: " + (result.error || "unknown"));
        setUploadPhase("error");
        return;
      }
      setUploadedUrl(result.fileUrl);
      setUploadedFileId(result.fileId);
      setUploadPhase("done");
    } catch (err) {
      alert("Upload ke Google Drive gagal: " + (err instanceof Error ? err.message : "unknown"));
      setUploadPhase("error");
    }
  }, [area, uploadYear]);

  useEffect(() => {
    if (dragFile && uploadPhase === "idle") uploadFileToGAS(dragFile);
  }, [dragFile, uploadFileToGAS, uploadPhase]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadCategory || !id || !user || !dragFile || !uploadedUrl) return;
    await supabase.from("documents").insert({
      irrigation_area_id: id,
      category_id: uploadCategory,
      file_name: dragFile.name,
      file_url: uploadedUrl,
      file_size: dragFile.size,
      year: parseInt(uploadYear),
      status: "review",
      uploaded_by: user.id,
    });
    removeDragFile();
    setUploadCategory("");
    setUploadYear(CURRENT_YEAR.toString());
    setDialogOpen(false);
    loadData();
  };

  const handleDelete = async (doc: any) => {
    await supabase.rpc("admin_delete_document", { p_doc_id: doc.id });
    loadData();
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{area?.name || "Daerah Irigasi"}</h1>
          <p className="text-sm text-muted-foreground">{area?.irrigation_types?.name}</p>
        </div>
        <div className="text-sm text-muted-foreground">
          {documents.length} dokumen
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari dokumen..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) cancelUpload(); setDialogOpen(v) }}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="h-4 w-4 mr-2" /> Upload Dokumen
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Upload Dokumen</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-5">
              <div className="space-y-2">
                <Label>Kategori</Label>
                <Select value={uploadCategory} onValueChange={setUploadCategory} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tahun Dokumen</Label>
                <Select value={uploadYear} onValueChange={setUploadYear}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map((y) => (
                      <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>File</Label>
                {uploadPhase === "done" ? (
                  <div className="border rounded-lg p-4 bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-green-100 dark:bg-green-900 p-1.5">
                        <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{dragFile!.name}</p>
                        <p className="text-xs text-muted-foreground">{formatSize(dragFile!.size)} &middot; Tersimpan di Google Drive</p>
                      </div>
                      <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={removeDragFile}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : uploadPhase === "uploading" ? (
                  <div className="border rounded-lg p-6 text-center bg-muted/30">
                    <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin text-primary" />
                    <p className="text-sm font-medium">Mengupload ke Google Drive...</p>
                    <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: "60%" }} />
                    </div>
                  </div>
                ) : dragFile ? (
                  <div className="relative border rounded-lg p-4 bg-muted/30">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-primary shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{dragFile.name}</p>
                        <p className="text-xs text-muted-foreground">{formatSize(dragFile.size)} &middot; {dragFile.type || "Unknown"}</p>
                      </div>
                      <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={removeDragFile}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                      dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">Seret file ke sini atau klik untuk pilih</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG, DOC, XLS — Maks 15MB</p>
                    <Input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
                  </div>
                )}
              </div>

              {uploadPhase === "done" ? (
                <Button type="submit" disabled={!uploadCategory} className="w-full">
                  <Check className="h-4 w-4 mr-2" /> Simpan Dokumen
                </Button>
              ) : (
                <Button type="submit" disabled className="w-full">
                  {uploadPhase === "uploading" ? "Mengupload..." : "Pilih file terlebih dahulu"}
                </Button>
              )}
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3">
        {filteredDocs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mb-3 opacity-50" />
              <p>{searchQuery ? "Dokumen tidak ditemukan" : "Belum ada dokumen"}</p>
              {!searchQuery && (
                <Button variant="link" onClick={() => setDialogOpen(true)}>Upload dokumen pertama</Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredDocs.map((doc) => (
            <Card key={doc.id} className="group">
              <CardContent className="py-4">
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-primary/10 p-2.5 shrink-0 hidden sm:block">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{doc.file_name}</p>
                        <p className="text-xs text-muted-foreground">{doc.document_categories?.name}</p>
                      </div>
                      <StatusBadge status={doc.status} />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                      {doc.year && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {doc.year}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {formatDate(doc.created_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <HardDrive className="h-3 w-3" /> {formatSize(doc.file_size)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" asChild title="Lihat">
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                        <Eye className="h-4 w-4" />
                      </a>
                    </Button>
                    {user?.role === "super_admin" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity" title="Hapus">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Hapus Dokumen</AlertDialogTitle>
                            <AlertDialogDescription>
                              Yakin ingin menghapus <strong>{doc.file_name}</strong>? Tindakan ini tidak bisa dibatalkan.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(doc)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Hapus
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
