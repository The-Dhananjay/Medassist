import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, FileSearch, FilterX, Plus, Search, Trash2 } from "lucide-react";

import AppShell from "@/components/AppShell";
import EmptyState from "@/components/EmptyState";
import ReportActionBar from "@/components/ReportActionBar";
import ReportSeverityBadge from "@/components/ReportSeverityBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/context/AuthContext";
import api, { formatApiError } from "@/lib/api";
import { formatReportDate, getSeverityMeta } from "@/lib/reportUtils";

export default function Reports() {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [diseaseQuery, setDiseaseQuery] = useState("");
  const [symptomQuery, setSymptomQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/reports");
      setReports(data.reports || []);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const del = async (id) => {
    if (!confirm("Delete this report?")) return;
    try {
      await api.delete(`/reports/${id}`);
      setReports((current) => current.filter((item) => item.id !== id));
      toast.success("Report deleted.");
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const clearFilters = () => {
    setDiseaseQuery("");
    setSymptomQuery("");
    setDateFilter("");
    setSeverityFilter("all");
    setSortBy("newest");
  };

  const filteredReports = useMemo(() => {
    const diseaseNeedle = diseaseQuery.trim().toLowerCase();
    const symptomNeedle = symptomQuery.trim().toLowerCase();

    const next = reports.filter((report) => {
      const diseaseMatch = diseaseNeedle
        ? String(report.top_disease || "").toLowerCase().includes(diseaseNeedle)
        : true;

      const symptomsMatch = symptomNeedle
        ? (report.symptoms || []).some((symptom) => String(symptom).toLowerCase().includes(symptomNeedle))
        : true;

      const dateMatch = dateFilter
        ? new Date(report.created_at).toISOString().slice(0, 10) === dateFilter
        : true;

      const severityMatch =
        severityFilter === "all"
          ? true
          : getSeverityMeta(report.confidence).slug === severityFilter;

      return diseaseMatch && symptomsMatch && dateMatch && severityMatch;
    });

    next.sort((left, right) => {
      if (sortBy === "oldest") {
        return new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
      }

      if (sortBy === "highest-confidence") {
        return Number(right.confidence || 0) - Number(left.confidence || 0);
      }

      if (sortBy === "lowest-confidence") {
        return Number(left.confidence || 0) - Number(right.confidence || 0);
      }

      return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
    });

    return next;
  }, [dateFilter, diseaseQuery, reports, severityFilter, sortBy, symptomQuery]);

  const hasActiveFilters =
    diseaseQuery || symptomQuery || dateFilter || severityFilter !== "all" || sortBy !== "newest";

  return (
    <AppShell>
      <main className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="overline text-muted-foreground">Report history</span>
            <h1 className="mt-2 font-serif text-3xl text-primary sm:text-4xl" data-testid="reports-title">Your reports</h1>
            <p className="mt-2 text-muted-foreground">
              Search by disease or symptoms, refine with filters, and export a polished PDF anytime.
            </p>
          </div>
          <Link to="/diagnose" data-testid="reports-new-button" className="block w-full sm:w-auto">
            <Button className="min-h-[44px] w-full rounded-full px-5 sm:w-auto">
              <Plus className="mr-1 h-4 w-4" /> New diagnosis
            </Button>
          </Link>
        </div>

        <section className="rounded-xl border border-border bg-card p-5">
          <div className="grid gap-4 lg:grid-cols-[1.2fr,1.2fr,0.8fr,0.9fr,0.9fr]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={diseaseQuery}
                onChange={(event) => setDiseaseQuery(event.target.value)}
                placeholder="Search by disease"
                className="pl-9"
              />
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={symptomQuery}
                onChange={(event) => setSymptomQuery(event.target.value)}
                placeholder="Search by symptoms"
                className="pl-9"
              />
            </div>
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="date"
                value={dateFilter}
                onChange={(event) => setDateFilter(event.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All severities</SelectItem>
                <SelectItem value="mild">Mild</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical Attention</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
                <SelectItem value="highest-confidence">Highest confidence</SelectItem>
                <SelectItem value="lowest-confidence">Lowest confidence</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {hasActiveFilters ? (
            <div className="mt-4">
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <FilterX className="mr-2 h-4 w-4" /> Clear filters
              </Button>
            </div>
          ) : null}
        </section>

        <section className="overflow-hidden rounded-xl border border-border bg-card">
          {loading ? (
            <div className="space-y-4 p-5">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="rounded-xl border border-border bg-muted/20 p-5">
                  <Skeleton className="h-7 w-48" />
                  <Skeleton className="mt-3 h-4 w-full" />
                  <Skeleton className="mt-2 h-4 w-2/3" />
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Skeleton className="h-9 w-28" />
                    <Skeleton className="h-9 w-28" />
                    <Skeleton className="h-9 w-28" />
                  </div>
                </div>
              ))}
            </div>
          ) : reports.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={FileSearch}
                title="No reports yet"
                description="Start your first diagnosis and MedAssist will build a reusable, downloadable report history here."
                actionLabel="Create first diagnosis"
                actionTo="/diagnose"
              />
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={FileSearch}
                title="Nothing matched those filters"
                description="Try a broader disease term, remove the date filter, or clear severity constraints to see more report history."
                actionLabel="Clear filters"
                action={clearFilters}
              />
            </div>
          ) : (
            <ul className="divide-y divide-border" data-testid="reports-list">
              {filteredReports.map((report) => (
                <li
                  key={report.id}
                  className="p-5 transition-colors duration-150 hover:bg-muted/35"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <Link to={`/reports/${report.id}`} className="block" data-testid={`report-row-${report.id}`}>
                        <div className="break-words font-serif text-2xl text-primary transition-colors duration-150 hover:text-primary/80">
                          {report.top_disease}
                        </div>
                        <div className="mt-2 break-words text-sm text-muted-foreground">
                          {(report.symptoms || []).slice(0, 6).join(", ")}
                        </div>
                      </Link>

                      <div className="mt-4">
                        <ReportActionBar report={report} user={user} compact />
                      </div>
                    </div>

                    <div className="flex w-full flex-row flex-wrap items-center justify-between gap-4 lg:w-auto lg:flex-col lg:items-end">
                      <ReportSeverityBadge confidence={report.confidence} align="right" />
                      <div className="text-sm text-muted-foreground">{formatReportDate(report.created_at)}</div>
                      <div className="flex w-full items-center justify-between gap-3 lg:w-auto lg:justify-start">
                        <Link to={`/reports/${report.id}`} className="text-primary" data-testid={`report-open-${report.id}`}>
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => del(report.id)}
                          className="text-destructive transition-opacity duration-150 hover:opacity-70"
                          data-testid={`report-delete-${report.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
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
