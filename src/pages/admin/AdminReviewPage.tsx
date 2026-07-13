import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Search, CheckCircle, XCircle, Eye, FileText, Loader2 } from "lucide-react";
import { useAuthStore } from "../../store/authStore";

export default function AdminReviewPage() {
  const { user } = useAuthStore();
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const loadDocs = async () => {
    const { data } = await supabase
      .from("documents")
      .select("*, irrigation_areas(name), document_categories(name)")
      .eq("status", "review")
      .order("created_at", { ascending: false });
    if (data) setDocs(data);
    setLoading(false);
  };

  useEffect(() => { loadDocs(); }, []);

  const handleReview = async (id: string, status: "approved" | "rejected") => {
    await supabase.from("documents").update({ status, reviewed_by: user?.id }).eq("id", id);
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
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="outline" size="sm" asChild>
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                        <Eye className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" className="text-green-600" onClick={() => handleReview(doc.id, "approved")}>
                      <CheckCircle className="h-4 w-4 mr-1" /> Setujui
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600" onClick={() => handleReview(doc.id, "rejected")}>
                      <XCircle className="h-4 w-4 mr-1" /> Tolak
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
