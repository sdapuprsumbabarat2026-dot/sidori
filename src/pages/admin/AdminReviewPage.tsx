import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Search, CheckCircle, XCircle, Eye, FileText, Loader2 } from "lucide-react";
import { useAuthStore } from "../../store/authStore";

const GAS_URL = import.meta.env.VITE_GAS_URL;
const GAS_API_KEY = import.meta.env.VITE_GAS_API_KEY;

export default function AdminReviewPage() {
  const { user } = useAuthStore();
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [moving, setMoving] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

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

  const handleReview = async (doc: any, status: "approved" | "rejected") => {
    setMoving(doc.id);
    if (status === "approved" && doc.file_id) {
      try {
        await fetch(GAS_URL, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            _method: "MOVE",
            apiKey: GAS_API_KEY,
            fileId: doc.file_id,
            year: (doc.year || new Date().getFullYear()).toString(),
            irigationType: doc.irrigation_areas?.irrigation_types?.name || "",
            category: doc.document_categories?.name || "",
          }),
        });
      } catch { /* cleanup handled by admin */ }
    }
    if (status === "rejected" && doc.file_id) {
      try {
        await fetch(GAS_URL, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ _method: "DELETE", apiKey: GAS_API_KEY, fileId: doc.file_id }),
        });
      } catch { /* cleanup handled by admin */ }
    }
    await supabase.rpc("admin_review_document", { p_doc_id: doc.id, p_status: status, p_reviewed_by: user?.id });
    await supabase.from("document_activity_log").insert({
      irrigation_area_id: doc.irrigation_area_id,
      file_name: doc.file_name,
      category_name: doc.document_categories?.name,
      action: status,
      performed_by: user?.id,
    });
    setMoving(null);
    loadDocs();
  };

  const filteredDocs = searchQuery
    ? docs.filter((d) => d.file_name.toLowerCase().includes(searchQuery.toLowerCase()))
    : docs;

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

      <div className="grid gap-3">
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
          filteredDocs.map((doc) => (
            <Card key={doc.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <p className="font-medium truncate">{doc.file_name}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {doc.irrigation_areas?.name} &middot; {doc.document_categories?.name}
                    </p>
                    {doc.uploader?.name && (
                      <p className="text-xs text-muted-foreground">Diupload oleh {doc.uploader.name}</p>
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
                    <Button variant="outline" size="sm" className="text-red-600" disabled={moving === doc.id} onClick={() => handleReview(doc, "rejected")}>
                      <XCircle className="h-4 w-4 mr-1" /> Tidak Sesuai
                    </Button>
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
