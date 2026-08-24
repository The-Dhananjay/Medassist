import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import AppShell from "@/components/AppShell";
import Disclaimer from "@/components/Disclaimer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Search, Plus, X, Sparkles } from "lucide-react";
import AIThinkingAnimation from "@/components/animations/AIThinkingAnimation";
import HealthPulseAnimation from "@/components/animations/HealthPulseAnimation";

const CORE_SYMPTOMS = [
  "Fever", "Cough", "Headache", "Vomiting", "Chest Pain", "Fatigue",
  "Sore Throat", "Body Pain", "Nausea", "Diarrhea", "Shortness of Breath",
];

export default function NewDiagnosis() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [allSymptoms, setAllSymptoms] = useState(CORE_SYMPTOMS);
  const [selected, setSelected] = useState([]);
  const [query, setQuery] = useState("");
  const [manual, setManual] = useState("");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [age, setAge] = useState(user?.age || "");
  const [gender, setGender] = useState(user?.gender || "");
  const [existing, setExisting] = useState(user?.medical_history || "");
  const [allergies, setAllergies] = useState(user?.allergies || "");
  const [meds, setMeds] = useState(user?.current_medicines || "");
  const [isPregnant, setIsPregnant] = useState(user?.is_pregnant || false);
  const [isBreastfeeding, setIsBreastfeeding] = useState(user?.is_breastfeeding || false);
  const [kidneyLiver, setKidneyLiver] = useState(user?.kidney_liver_disease || "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get("/symptoms")
      .then(({ data }) => setAllSymptoms(data.symptoms || CORE_SYMPTOMS))
      .catch(() => {});
  }, []);

  const suggestions = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return allSymptoms.filter((s) => s.toLowerCase().includes(q) && !selected.includes(s)).slice(0, 6);
  }, [query, allSymptoms, selected]);

  const toggle = (s) => setSelected((cur) => cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]);
  const remove = (s) => setSelected((cur) => cur.filter((x) => x !== s));
  const addManual = () => {
    const v = manual.trim();
    if (!v) return;
    if (!selected.includes(v)) setSelected((c) => [...c, v]);
    setManual("");
  };
  const addFromQuery = (s) => {
    if (!selected.includes(s)) setSelected((c) => [...c, s]);
    setQuery("");
  };

  const submit = async () => {
    if (selected.length === 0) {
      toast.error("Please select or add at least one symptom.");
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post("/predict", {
        symptoms: selected,
        duration: duration || null,
        additional_notes: notes || null,
        age: age ? Number(age) : null,
        gender: gender || null,
        existing_diseases: existing || null,
        allergies: allergies || null,
        current_medicines: meds || null,
        is_pregnant: gender === "female" ? isPregnant : null,
        is_breastfeeding: gender === "female" ? isBreastfeeding : null,
        kidney_liver_disease: kidneyLiver || null,
      });
      toast.success("Report generated");
      navigate(`/reports/${data.report.id}`);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <main className="mx-auto max-w-5xl space-y-8 px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
        <div>
          <span className="overline text-muted-foreground">— New diagnosis</span>
          <h1 className="mt-2 font-serif text-3xl text-primary sm:text-4xl" data-testid="diagnose-title">
            What are you feeling today?
          </h1>
          <p className="mt-2 text-muted-foreground max-w-xl">
            Pick from common symptoms, search, or type your own. Add a few
            profile details for better accuracy.
          </p>
        </div>

        <Disclaimer />

        <section className="bg-card border border-border rounded-xl p-6">
          <div className="overline text-muted-foreground">Common symptoms</div>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {CORE_SYMPTOMS.map((s) => {
              const on = selected.includes(s);
              return (
                <label key={s}
                  data-testid={`symptom-checkbox-${s.toLowerCase().replace(/\s+/g, "-")}`}
                  className={`flex items-center gap-3 rounded-md border px-3 py-2 cursor-pointer transition-colors duration-150 ${
                    on ? "border-primary bg-secondary" : "border-border hover:bg-muted"
                  }`}
                >
                  <Checkbox checked={on} onCheckedChange={() => toggle(s)} />
                  <span className="text-sm font-medium">{s}</span>
                </label>
              );
            })}
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <div className="overline text-muted-foreground mb-2">Search symptoms</div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. dizziness"
                  className="pl-9"
                  data-testid="symptom-search-input"
                />
              </div>
              <AnimatePresence>
              {suggestions.length > 0 && (
                <motion.ul
                  className="mt-2 border border-border rounded-md bg-popover shadow-sm divide-y divide-border"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                >
                  {suggestions.map((s) => (
                    <motion.li key={s} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
                      <button
                        type="button"
                        onClick={() => addFromQuery(s)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                        data-testid={`symptom-suggestion-${s.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        {s}
                      </button>
                    </motion.li>
                  ))}
                </motion.ul>
              )}
              </AnimatePresence>
            </div>

            <div>
              <div className="overline text-muted-foreground mb-2">Add manually</div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={manual}
                  onChange={(e) => setManual(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addManual())}
                  placeholder="Type and press Add"
                  data-testid="symptom-manual-input"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={addManual}
                  data-testid="symptom-manual-add"
                  className="min-h-[44px] w-full sm:w-auto"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </div>
            </div>
          </div>

          {selected.length > 0 && (
            <div className="mt-6">
              <div className="overline text-muted-foreground mb-2">Selected ({selected.length})</div>
              <div className="flex flex-wrap gap-2" data-testid="selected-symptoms-list">
                <AnimatePresence>
                  {selected.map((s) => (
                    <motion.span
                      key={s}
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.18 }}
                      data-testid={`selected-symptom-${s.toLowerCase().replace(/\s+/g, "-")}`}
                      className="inline-flex items-center gap-2 rounded-full bg-secondary text-secondary-foreground px-3 py-1 text-sm font-medium"
                    >
                      {s}
                      <button type="button" onClick={() => remove(s)} className="hover:opacity-70">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </motion.span>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
        </section>

        <section className="bg-card border border-border rounded-xl p-6">
          <div className="overline text-muted-foreground">Context (optional but recommended)</div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Duration</Label>
              <Input value={duration} onChange={(e) => setDuration(e.target.value)}
                placeholder="e.g. 3 days" data-testid="input-duration" className="mt-1" />
            </div>
            <div>
              <Label>Age</Label>
              <Input type="number" value={age} onChange={(e) => setAge(e.target.value)}
                data-testid="input-age" className="mt-1" />
            </div>
            <div>
              <Label>Gender</Label>
              <select value={gender} onChange={(e) => setGender(e.target.value)}
                data-testid="input-gender"
                className="mt-1 w-full h-10 rounded-md border border-input bg-transparent px-3 text-sm">
                <option value="">Prefer not to say</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <Label>Existing conditions</Label>
              <Input value={existing} onChange={(e) => setExisting(e.target.value)}
                placeholder="e.g. asthma, diabetes"
                data-testid="input-existing" className="mt-1" />
            </div>
            <div>
              <Label>Allergies</Label>
              <Input value={allergies} onChange={(e) => setAllergies(e.target.value)}
                placeholder="e.g. penicillin, peanuts"
                data-testid="input-allergies" className="mt-1" />
            </div>
            <div>
              <Label>Current medicines</Label>
              <Input value={meds} onChange={(e) => setMeds(e.target.value)}
                placeholder="e.g. metformin"
                data-testid="input-meds" className="mt-1" />
            </div>
            <div>
              <Label>Kidney or liver disease</Label>
              <Input value={kidneyLiver} onChange={(e) => setKidneyLiver(e.target.value)}
                placeholder="e.g. chronic kidney disease"
                data-testid="input-kidney-liver" className="mt-1" />
            </div>
            {gender === "female" && (
              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <Checkbox checked={isPregnant} onCheckedChange={(v) => setIsPregnant(!!v)} data-testid="checkbox-pregnant" />
                  Currently pregnant
                </label>
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <Checkbox checked={isBreastfeeding} onCheckedChange={(v) => setIsBreastfeeding(!!v)} data-testid="checkbox-breastfeeding" />
                  Currently breastfeeding
                </label>
              </div>
            )}
          </div>
          <div className="mt-4">
            <Label>Additional notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything else the AI should know…"
              data-testid="input-notes" className="mt-1" rows={3} />
          </div>
        </section>

        <div className="sticky bottom-4 flex justify-stretch sm:justify-end">
          {busy ? (
            <div className="mr-0 hidden w-full max-w-sm sm:mr-4 sm:block">
              <AIThinkingAnimation />
            </div>
          ) : null}
          <Button
            size="lg"
            onClick={submit}
            disabled={busy}
            className="min-h-[44px] w-full rounded-full px-8 shadow-lg sm:w-auto"
            data-testid="diagnose-submit-button"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {busy ? "Analyzing symptoms…" : "Analyze with AI"}
          </Button>
        </div>
        {busy ? (
          <div className="sm:hidden">
            <HealthPulseAnimation message="Analyzing your health..." />
          </div>
        ) : null}
      </main>
    </AppShell>
  );
}
