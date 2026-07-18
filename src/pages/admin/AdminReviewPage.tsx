import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "../../components/ui/alert-dialog";
import { Search, CheckCircle, XCircle, Eye, FileText, Loader2, FolderOpen } from "lucide-react";
import { useAuthStore } from "../../store/authStore";

const GAS_URL = import.meta.env.VITE_GAS_URL;
const GAS_API_KEY = import.meta.env.VITE_GAS_API_KEY;

function formatFileSize(bytes: number | null) {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminReviewPage() {
  const { user } = useAuthStore();
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [moving, setMoving] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; doc: any | null }>({ open: false, doc: null });
  const [rejectNote, setRejectNote] = useState("");

  const loadDocs = async () => {
    const { data } = await supabase
      .from("documents")
      .select("*, irrigation_areas!inner(name, irrigation_types!inner(name)), document_categories(name), uploader:users!documents_uploaded_by_fkey(name)")
      .eq("status", "review")
      .order("created_at", { ascending: false });
    if (data) setDocs(data);
    setLoading(false);
  };

  useEffect(() => { loadDocs(); }, []);

  const handleReview = async (doc: any, status: "approved" | "rejected", notes?: string) => {
    setMoving(doc.id);
    if (status === "rejected" && doc.file_id) {
      try {
        await fetch(GAS_URL, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ _method: "DELETE", apiKey: GAS_API_KEY, fileId: doc.file_id }),
        });
      } catch { /* cleanup handled by admin */ }
    }
    await supabase.rpc("admin_review_document", {
      p_doc_id: doc.id,
      p_status: status,
      p_reviewed_by: user?.id,
      p_notes: notes || null,
    });
    await supabase.from("document_activity_log").insert({
      irrigation_area_id: doc.irrigation_area_id,
      file_name: doc.file_name,
      category_name: doc.document_categories?.name,
      action: status,
      performed_by: user?.id,
      notes: notes || null,
    });
    setMoving(null);
    setRejectDialog({ open: false, doc: null });
    setRejectNote("");
    loadDocs();
  };

  const filteredDocs = searchQuery
    ? docs.filter((d) => d.file_name.toLowerCase().includes(searchQuery.toLowerCase()))
    : docs;

  // Group by irrigation type > irrigation area
  const grouped = filteredDocs.reduce((acc, doc) => {
    const irrType = doc.irrigation_areas?.irrigation_types?.name || "Lainnya";
    const irrArea = doc.irrigation_areas?.name || "Lainnya";
    if (!acc[irrType]) acc[irrType] = {};
    if (!acc[irrType][irrArea]) acc[irrType][irrArea] = [];
    acc[irrType][irrArea].push(doc);
    return acc;
  }, {} as Record<string, Record<string, any[]>>);

  const irrigationTypeOrder = ["Irigasi Air Permukaan", "Irigasi Air Tanah"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Review Dokumen</h1>
        <p className="text-muted-foreground">Periksa dan setujui/tolak dokumen yang diupload.</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Cari dokumen..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : filteredDocs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <CheckCircle className="h-12 w-12 mb-3 opacity-50" />
            <p>Semua dokumen sudah direview</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped)
            .sort(([a], [b]) => {
              const ia = irrigationTypeOrder.indexOf(a);
              const ib = irrigationTypeOrder.indexOf(b);
              return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
            })
            .map(([irrType, areas]) => (
              <div key={irrType}>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-muted-foreground" />
                  {irrType}
                </h2>
                <div className="space-y-4 pl-4">
                  {Object.entries(areas).map(([irrArea, areaDocs]) => (
                    <div key={irrArea}>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">
                        DI. {irrArea}
                      </h3>
                      <div className="grid gap-3">
                        {(areaDocs as any[]).map((doc) => (
                          <Card key={doc.id}>
                            <CardContent className="py-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                                    <p className="font-medium truncate">{doc.file_name}</p>
                                  </div>
                                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                    <span>{doc.document_categories?.name}</span>
                                    {doc.year && <span>Tahun {doc.year}</span>}
                                    <span>{formatFileSize(doc.file_size)}</span>
                                  </div>
                                  {doc.uploader?.name && (
                                    <p className="text-xs text-muted-foreground mt-1">Diupload oleh {doc.uploader.name}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <Button variant="outline" size="sm" asChild>
                                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                                      <Eye className="h-4 w-4" />
                                    </a>
                                  </Button>
                                  <Button variant="outline" size="sm" className="text-green-600" disabled={moving === doc.id} onClick={() => handleReview(doc, "approved")}>
                                    {moving === doc.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />} Sesuai
                                  </Button>
                                  <AlertDialog open={rejectDialog.open && rejectDialog.doc?.id === doc.id} onOpenChange={(open) => setRejectDialog(open ? { open: true, doc } : { open: false, doc: null })}>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="outline" size="sm" className="text-red-600" disabled={moving === doc.id}>
                                        <XCircle className="h-4 w-4 mr-1" /> Tidak Sesuai
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Catatan Perbaikan</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Berikan catatan perbaikan untuk dokumen ini (opsional).
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <Textarea
                                        placeholder="Contoh: Dokumen kurang lengkap, mohon dilengkapi..."
                                        value={rejectNote}
                                        onChange={(e) => setRejectNote(e.target.value)}
                                        className="min-h-[100px]"
                                      />
                                      <AlertDialogFooter>
                                        <AlertDialogCancel onClick={() => { setRejectNote(""); setRejectDialog({ open: false, doc: null }); }}>Batal</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleReview(doc, "rejected", rejectNote)}>
                                          Tolak Dokumen
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
