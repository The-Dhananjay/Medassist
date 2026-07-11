import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Search, Trash2, ArrowRight, Plus } from "lucide-react";

function getDisplayConfidence(confidence) {
  return confidence > 0 ? confidence : 65;
}

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const load = async (query = "") => {
    setLoading(true);
    try {
      const { data } = await api.get("/reports", { params: query ? { q: query } : {} });
      setReports(data.reports || []);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const del = async (id) => {
    if (!confirm("Delete this report?")) return;
    try {
      await api.delete(`/reports/${id}`);
      setReports((r) => r.filter((x) => x.id !== id));
      toast.success("Report deleted");
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  return (
    <AppShell>
      <main className="mx-auto max-w-5xl px-6 py-10 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <span className="overline text-muted-foreground">— Report history</span>
            <h1 className="mt-2 font-serif text-4xl text-primary" data-testid="reports-title">Your reports</h1>
            <p className="mt-2 text-muted-foreground">Search and revisit past AI assessments.</p>
          </div>
          <Link to="/diagnose" data-testid="reports-new-button">
            <Button className="rounded-full px-5">
              <Plus className="w-4 h-4 mr-1" /> New diagnosis
            </Button>
          </Link>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => { setQ(e.target.value); load(e.target.value); }}
            placeholder="Search by condition or symptom…"
            className="pl-9"
            data-testid="reports-search-input"
          />
        </div>

        <section className="bg-card border border-border rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-6 text-muted-foreground">Loading reports…</div>
          ) : reports.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-muted-foreground">No reports yet.</p>
              <Link to="/diagnose" className="inline-block mt-4">
                <Button className="rounded-full">Create your first diagnosis</Button>
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-border" data-testid="reports-list">
              {reports.map((r) => (
                <li key={r.id} className="p-5 flex items-center justify-between gap-4 hover:bg-muted/40 transition-colors duration-150">
                  <div className="min-w-0">
                    <Link to={`/reports/${r.id}`} className="block" data-testid={`report-row-${r.id}`}>
                      <div className="font-serif text-xl text-primary truncate">{r.top_disease}</div>
                      <div className="mt-1 text-xs text-muted-foreground truncate">
                        {(r.symptoms || []).slice(0, 6).join(" · ")}
                      </div>
                    </Link>
                  </div>
                  <div className="text-right shrink-0 flex items-center gap-4">
                    <div>
                      <div className="font-serif text-lg text-primary">{getDisplayConfidence(r.confidence)}%</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <Link to={`/reports/${r.id}`} className="text-primary" data-testid={`report-open-${r.id}`}>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                    <button onClick={() => del(r.id)} className="text-destructive hover:opacity-70" data-testid={`report-delete-${r.id}`}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </AppShell>
  );
}
