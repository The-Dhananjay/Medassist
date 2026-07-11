import PublicPageLayout from "@/components/PublicPageLayout";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const questions = [
  {
    q: "Does MedAssist replace a doctor?",
    a: "No. MedAssist is designed to help you organize symptoms and review AI-guided possibilities, but it does not replace licensed medical advice, diagnosis, or treatment.",
  },
  {
    q: "Where are my reports stored?",
    a: "Reports are stored inside your authenticated account history so you can revisit, download, or delete them later.",
  },
  {
    q: "Can I manage signed-in devices?",
    a: "Yes. The session manager lets you review device metadata and sign out specific sessions or every device at once.",
  },
  {
    q: "Does the app support dark mode?",
    a: "Yes. You can choose light, dark, or system mode from the new settings page and MedAssist will remember your preference.",
  },
];

export default function FAQ() {
  return (
    <PublicPageLayout
      eyebrow="FAQ"
      title="Answers to the most common MedAssist questions."
      description="This page keeps the most important product and account answers in one place without changing the existing experience."
    >
      <Accordion type="single" collapsible className="w-full">
        {questions.map((item) => (
          <AccordionItem key={item.q} value={item.q}>
            <AccordionTrigger className="font-serif text-xl text-primary">{item.q}</AccordionTrigger>
            <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
              {item.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </PublicPageLayout>
  );
}
