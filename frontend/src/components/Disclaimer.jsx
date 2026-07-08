export default function Disclaimer({ compact = false }) {
  return (
    <div
      data-testid="medical-disclaimer"
      className={`border border-border rounded-md bg-muted text-muted-foreground ${
        compact ? "px-3 py-2 text-xs" : "px-4 py-3 text-sm"
      }`}
    >
      <span className="overline text-primary mr-2">Disclaimer</span>
      This tool provides AI-generated preliminary insights only. It is not a
      substitute for professional medical advice, diagnosis, or treatment.
      Always seek advice from a qualified healthcare provider.
    </div>
  );
}
