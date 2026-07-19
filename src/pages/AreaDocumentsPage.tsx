import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
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
  Check, Circle
} from "lucide-react";
import type { IrrigationArea, KategoriDokumen } from "../types";
import { useAuthStore } from "../store/authStore";

const GAS_PROXY = "/api/gas-proxy?target=" + encodeURIComponent(import.meta.env.VITE_GAS_URL);
const GAS_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? import.meta.env.VITE_GAS_URL
  : GAS_PROXY;
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
  return new Date(ts).toLocaleString("id-ID", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

async function compressImageIfNeeded(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") return file;

  const isPng = file.type === "image/png";
  const MAX_DIMENSION = 1200;
  const QUALITY = 0.5;

  const imgUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = imgUrl;
    });

    let { width, height } = img;
    const needsResize = width > MAX_DIMENSION || height > MAX_DIMENSION;
    if (!needsResize && isPng) return file;

    if (needsResize) {
      if (width > height) {
        height = Math.round((height * MAX_DIMENSION) / width);
        width = MAX_DIMENSION;
      } else {
        width = Math.round((width * MAX_DIMENSION) / height);
        height = MAX_DIMENSION;
      }
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, width, height);

    const outputType = isPng ? "image/png" : "image/jpeg";
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, outputType, isPng ? undefined : QUALITY)
    );
    if (!blob) return file;

    if (blob.size >= file.size) return file;

    const newName = isPng
      ? file.name
      : file.name.replace(/\.(png|jpe?g|webp)$/i, "") + ".jpg";
    return new File([blob], newName, { type: outputType, lastModified: Date.now() });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(imgUrl);
  }
}

export default function AreaDocumentsPage() {
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const [area, setArea] = useState<IrrigationArea & { irrigation_types: { name: string } } | null>(null);
  const [categories, setCategories] = useState<KategoriDokumen[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadPhase, setUploadPhase] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [uploadedFileId, setUploadedFileId] = useState("");
  const [compressedFile, setCompressedFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState("");
  const uploadCategoryRef = useRef(uploadCategory);
  uploadCategoryRef.current = uploadCategory;
  const [uploadYear, setUploadYear] = useState(CURRENT_YEAR.toString());
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [dragFile, setDragFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const existingDocForCategory = useCallback((catId: string) => {
    return documents.find((d) => d.category_id === catId);
  }, [documents]);

  const filteredCategories = searchQuery
    ? categories.filter((c) => {
        const doc = existingDocForCategory(c.id);
        const nameMatch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
        const fileMatch = doc?.file_name?.toLowerCase().includes(searchQuery.toLowerCase());
        const yearMatch = doc?.year?.toString().includes(searchQuery);
        return nameMatch || fileMatch || yearMatch;
      })
    : categories;

  const loadData = useCallback(async () => {
    if (!id) return;
    const { data: areaData } = await supabase.from("irrigation_areas").select("*, irrigation_types(name)").eq("id", id).maybeSingle();
    setArea(areaData as any);

    let catQuery;
    if (areaData?.menu_kegiatan) {
      const { data: menuRow } = await supabase.from("menu_kegiatan").select("id").eq("slug", areaData.menu_kegiatan).maybeSingle();
      if (menuRow?.id) {
        catQuery = supabase.from("kategori_dokumen").select("*").eq("menu_kegiatan_id", menuRow.id).order("sort_order");
      } else {
        catQuery = supabase.from("kategori_dokumen").select("*").order("sort_order");
      }
    } else {
      catQuery = supabase.from("kategori_dokumen").select("*").order("sort_order");
    }

    let docQuery = supabase
      .from("documents")
      .select("*, kategori_dokumen(name), uploader:users!documents_uploaded_by_fkey(name)")
      .eq("irrigation_area_id", id);
    docQuery = docQuery.order("created_at", { ascending: false });

    const [catRes, docRes] = await Promise.all([
      catQuery,
      docQuery,
    ]);
    setCategories(catRes.data || []);
    setDocuments(docRes.data || []);
    setLoading(false);
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
    if (f && f.size > MAX_FILE_SIZE) { toast.error("File terlalu besar. Maksimal 15 MB."); return; }
    if (f && !uploadCategory) { toast.error("Pilih kategori terlebih dahulu."); return; }
    if (f && uploadCategory && existingDocForCategory(uploadCategory)) {
      toast.error("Dokumen untuk kategori ini sudah ada. Hapus yang ada terlebih dahulu jika ingin mengganti."); return;
    }
    if (f) { removeDragFile(); setTimeout(() => setDragFile(f), 0) }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && f.size > MAX_FILE_SIZE) { toast.error("File terlalu besar. Maksimal 15 MB."); return; }
    if (f && !uploadCategory) { toast.error("Pilih kategori terlebih dahulu."); return; }
    if (f && uploadCategory && existingDocForCategory(uploadCategory)) {
      toast.error("Dokumen untuk kategori ini sudah ada. Hapus yang ada terlebih dahulu jika ingin mengganti."); return;
    }
    if (f) { removeDragFile(); setTimeout(() => { setDragFile(f); setDragOver(false) }, 0) }
  };

  const removeDragFile = () => {
    setDragFile(null);
    setCompressedFile(null);
    setUploadedUrl("");
    setUploadedFileId("");
    setUploadPhase("idle");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const cancelUpload = useCallback(async () => {
    if (uploadedFileId) {
      try {
        navigator.sendBeacon(GAS_URL, new URLSearchParams({ _method: "DELETE", apiKey: GAS_API_KEY, fileId: uploadedFileId }));
      } catch { /* ignore */ }
    }
    removeDragFile();
  }, [uploadedFileId]);

  const uploadToGAS = useCallback(async (file: File) => {
    if (!area) return;
    setUploadPhase("uploading");
    setUploadProgress(0);
    try {
      setUploadProgress(5);
      const toUpload = await compressImageIfNeeded(file);
      setCompressedFile(toUpload);
      setUploadProgress(10);

      const fileBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onprogress = (e) => {
          if (e.lengthComputable) setUploadProgress(10 + Math.round((e.loaded / e.total) * 20));
        };
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(toUpload);
      });
      setUploadProgress(30);

      const body = new URLSearchParams({
        apiKey: GAS_API_KEY, fileBase64, fileName: toUpload.name, mimeType: toUpload.type,
        irigationType: area.irrigation_types?.name || "", areaName: area.name, year: uploadYear,
      });

      setUploadProgress(40);
      const sim = setInterval(() => setUploadProgress((p) => Math.min(p + 1, 95)), 500);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 300000);
      let result: any;
      try {
        const res = await fetch(GAS_URL, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: body.toString(),
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        result = await res.json();
      } finally { clearInterval(sim) }

      if (!result.success) throw new Error(result.error || "unknown");
      setUploadedUrl(result.fileUrl);
      setUploadedFileId(result.fileId);
      setUploadProgress(100);
      setUploadPhase("done");
    } catch (err) {
      toast.error("Upload gagal: " + ((err as any)?.message || "unknown"));
      setUploadPhase("error");
    }
  }, [area, uploadYear]);

  useEffect(() => {
    if (dragFile && uploadPhase === "idle") uploadToGAS(dragFile);
  }, [dragFile, uploadToGAS, uploadPhase]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadCategory || !id || !user || !dragFile || !uploadedUrl) return;
    const existing = existingDocForCategory(uploadCategory);
    if (existing) {
      if (existing.file_id) {
        navigator.sendBeacon(GAS_URL, new URLSearchParams({ _method: "DELETE", apiKey: GAS_API_KEY, fileId: existing.file_id }));
      }
      await supabase.from("document_activity_log").insert({
        irrigation_area_id: id, file_name: existing.file_name,
        category_name: existing.kategori_dokumen?.name, action: "replace",
        performed_by: user.id,
      });
      await supabase.rpc("admin_delete_document", { p_doc_id: existing.id });
    }
    await supabase.from("documents").insert({
      irrigation_area_id: id,
      category_id: uploadCategory,
      file_name: (compressedFile || dragFile).name,
      file_url: uploadedUrl,
      file_id: uploadedFileId,
      file_size: (compressedFile || dragFile).size,
      year: parseInt(uploadYear),
      status: "review",
      uploaded_by: user.id,
    });
    const catName = categories.find((c) => c.id === uploadCategory)?.name;
    await supabase.from("document_activity_log").insert({
      irrigation_area_id: id,
      file_name: (compressedFile || dragFile).name,
      category_name: catName,
      action: "upload",
      performed_by: user.id,
    });
    removeDragFile();
    setUploadCategory("");
    setUploadYear(CURRENT_YEAR.toString());
    setDialogOpen(false);
    toast.success("Dokumen berhasil diupload dan menunggu review.");
    loadData();
  };

  const handleDelete = async (doc: any) => {
    if (doc.file_id) {
      navigator.sendBeacon(GAS_URL, new URLSearchParams({ _method: "DELETE", apiKey: GAS_API_KEY, fileId: doc.file_id }));
    }
    await supabase.from("document_activity_log").insert({
      irrigation_area_id: id,
      file_name: doc.file_name,
      category_name: doc.kategori_dokumen?.name,
      action: "delete",
      performed_by: user?.id,
    });
    await supabase.rpc("admin_delete_document", { p_doc_id: doc.id });
    toast.success("Dokumen berhasil dihapus.");
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
          {documents.length} dari {categories.length} kategori terisi
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
                    {categories.filter((c) => {
                      const doc = existingDocForCategory(c.id);
                      return !doc || doc.status === "rejected";
                    }).map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}{existingDocForCategory(c.id) ? " (ganti)" : ""}</SelectItem>
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

              {uploadCategory ? (
                <div className="space-y-2">
                  <Label>File</Label>
                  {uploadPhase === "done" ? (
                    <div className="border rounded-lg p-4 bg-muted/30">
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-green-100 dark:bg-green-900 p-1.5">
                          <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{(compressedFile || dragFile)!.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatSize((compressedFile || dragFile)!.size)} &middot; Tersimpan di Google Drive
                            {compressedFile && dragFile && compressedFile.size < dragFile.size && (
                              <span className="text-green-600 dark:text-green-400">
                                {" "}(dikompres dari {formatSize(dragFile.size)}, hemat {Math.round((1 - compressedFile.size / dragFile.size) * 100)}%)
                              </span>
                            )}
                          </p>
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={cancelUpload}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : uploadPhase === "uploading" ? (
                    <div className="border rounded-lg p-6 text-center bg-muted/30">
                      <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin text-primary" />
                      <p className="text-sm font-medium">
                        {uploadProgress < 40 ? "Mengompres..." : `Mengupload... (${formatSize(dragFile!.size)})`}
                      </p>
                      <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                      </div>
                    </div>
                  ) : uploadPhase === "error" ? (
                    <div className="border rounded-lg p-6 text-center bg-destructive/5 border border-destructive/30">
                      <p className="text-sm font-medium text-destructive mb-1">Upload gagal</p>
                      <p className="text-xs text-muted-foreground mb-3">Coba lagi atau pilih file lain</p>
                      <div className="flex justify-center gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => dragFile && uploadToGAS(dragFile)}>
                          <Upload className="h-3 w-3 mr-1" /> Ulangi
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={removeDragFile}>
                          Ganti File
                        </Button>
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
                      <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG, DOC, XLS — Maks 15MB (gambar otomatis dikompres)</p>
                      <Input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
                    </div>
                  )}
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-lg p-6 text-center text-muted-foreground">
                  <Upload className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Pilih kategori terlebih dahulu</p>
                </div>
              )}

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
        {filteredCategories.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mb-3 opacity-50" />
              <p>{searchQuery ? "Kategori tidak ditemukan" : "Belum ada kategori dokumen"}</p>
            </CardContent>
          </Card>
        ) : filteredCategories.map((cat) => {
          const existing = existingDocForCategory(cat.id);
          return (
            <Card key={cat.id} className={existing ? "" : "border-dashed"}>
              <CardContent className="py-3 px-4 flex items-center gap-3">
                <div className={`rounded-full p-1.5 shrink-0 ${existing ? "bg-green-100 dark:bg-green-900" : "bg-muted"}`}>
                  {existing ? <Check className="h-4 w-4 text-green-600 dark:text-green-400" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium ${existing ? "" : "text-muted-foreground"}`}>{cat.name}</p>
                  {existing ? (
                    <div className="text-xs text-muted-foreground">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                        <span className="truncate max-w-[300px]">{existing.file_name}</span>
                        {existing.year && <span>{existing.year}</span>}
                        <span>{formatDate(existing.created_at)}</span>
                        <span>{formatSize(existing.file_size)}</span>
                        {existing.uploader?.name && <span>oleh {existing.uploader.name}</span>}
                      </div>
                      {existing.status === "rejected" && existing.notes && (
                        <p className="mt-1 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2 py-1 rounded border border-red-200 dark:border-red-900">
                          Catatan: {existing.notes}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Belum diupload</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {existing && (
                    <>
                      <Button variant="ghost" size="icon" asChild title="Lihat">
                        <a href={existing.file_url} target="_blank" rel="noopener noreferrer">
                          <Eye className="h-4 w-4" />
                        </a>
                      </Button>
                      {existing.status !== "approved" && (
                        <Button variant="ghost" size="icon" title="Ganti" onClick={() => { setUploadCategory(existing.category_id); setDialogOpen(true) }}>
                          <Upload className="h-4 w-4" />
                        </Button>
                      )}
                      <StatusBadge status={existing.status} />
                      {(user?.role === "super_admin" || (user?.role === "user" && existing.status !== "approved")) && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive" title="Hapus">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Hapus Dokumen</AlertDialogTitle>
                              <AlertDialogDescription>
                                Yakin ingin menghapus <strong>{existing.file_name}</strong>? Tindakan ini tidak bisa dibatalkan.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Batal</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(existing)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Hapus
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
