import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import CapacitorBridge from "@/components/native/CapacitorBridge";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import SEO from "@/components/SEO";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import VerifyEmail from "@/pages/VerifyEmail";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Dashboard from "@/pages/Dashboard";
import NewDiagnosis from "@/pages/NewDiagnosis";
import Reports from "@/pages/Reports";
import ReportDetail from "@/pages/ReportDetail";
import Sessions from "@/pages/Sessions";
import Profile from "@/pages/Profile";
import Settings from "@/pages/Settings";
import About from "@/pages/About";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsAndConditions from "@/pages/TermsAndConditions";
import Contact from "@/pages/Contact";
import FAQ from "@/pages/FAQ";

const SITE_URL = "https://medassist-tau.vercel.app";

const seo = {
  home: {
    title: "MedAssist - AI Healthcare Assistant",
    description:
      "MedAssist is an AI-powered healthcare assistant that analyzes symptoms, provides medical insights, generates reports, and helps users make informed health decisions.",
    keywords:
      "MedAssist, AI Healthcare, Medical AI, Symptom Checker, Health Assistant, Disease Prediction",
    url: `${SITE_URL}/`,
  },
  login: {
    title: "Login - MedAssist",
    description: "Log in to MedAssist to continue your AI-guided healthcare sessions and reports.",
    keywords: "MedAssist login, AI healthcare login, medical reports",
    url: `${SITE_URL}/login`,
  },
  register: {
    title: "Register - MedAssist",
    description: "Create a MedAssist account to start using AI-powered symptom analysis and health reports.",
    keywords: "MedAssist register, AI healthcare signup, symptom checker account",
    url: `${SITE_URL}/register`,
  },
  dashboard: {
    title: "Dashboard - MedAssist",
    description: "View your MedAssist health dashboard, recent sessions, insights, and report activity.",
    keywords: "MedAssist dashboard, health dashboard, AI medical insights",
    url: `${SITE_URL}/dashboard`,
  },
  reports: {
    title: "Reports - MedAssist",
    description: "Access AI-generated MedAssist health reports and symptom analysis summaries.",
    keywords: "MedAssist reports, AI medical reports, health report generator",
    url: `${SITE_URL}/reports`,
  },
  profile: {
    title: "Profile - MedAssist",
    description: "Manage your MedAssist profile and personal healthcare preferences.",
    keywords: "MedAssist profile, healthcare profile, health assistant settings",
    url: `${SITE_URL}/profile`,
  },
};

function Page({ meta, children }) {
  return (
    <>
      <SEO {...meta} />
      {children}
    </>
  );
}

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <CapacitorBridge />
          <Routes>
            <Route path="/" element={<Page meta={seo.home}><Landing /></Page>} />
            <Route path="/login" element={<Page meta={seo.login}><Login /></Page>} />
            <Route path="/register" element={<Page meta={seo.register}><Register /></Page>} />
            <Route path="/verify-email" element={<Page meta={{ title: "Verify Email - MedAssist", description: "Verify your MedAssist account email to activate secure access.", keywords: "MedAssist verify email, healthcare account verification", url: `${SITE_URL}/verify-email` }}><VerifyEmail /></Page>} />
            <Route path="/forgot-password" element={<Page meta={{ title: "Forgot Password - MedAssist", description: "Reset access to your MedAssist healthcare assistant account.", keywords: "MedAssist forgot password, reset healthcare account", url: `${SITE_URL}/forgot-password` }}><ForgotPassword /></Page>} />
            <Route path="/reset-password" element={<Page meta={{ title: "Reset Password - MedAssist", description: "Create a new password for your MedAssist account.", keywords: "MedAssist reset password, healthcare account security", url: `${SITE_URL}/reset-password` }}><ResetPassword /></Page>} />
            <Route path="/about" element={<Page meta={{ title: "About - MedAssist", description: "Learn about MedAssist and how its AI healthcare assistant supports symptom understanding and report generation.", keywords: "About MedAssist, AI healthcare assistant, medical AI platform", url: `${SITE_URL}/about` }}><About /></Page>} />
            <Route path="/privacy-policy" element={<Page meta={{ title: "Privacy Policy - MedAssist", description: "Read how MedAssist handles privacy and healthcare-related user information.", keywords: "MedAssist privacy policy, healthcare data privacy", url: `${SITE_URL}/privacy-policy` }}><PrivacyPolicy /></Page>} />
            <Route path="/terms-and-conditions" element={<Page meta={{ title: "Terms and Conditions - MedAssist", description: "Review the terms and conditions for using MedAssist.", keywords: "MedAssist terms, healthcare assistant terms", url: `${SITE_URL}/terms-and-conditions` }}><TermsAndConditions /></Page>} />
            <Route path="/contact" element={<Page meta={{ title: "Contact - MedAssist", description: "Contact the MedAssist team for support, questions, or feedback.", keywords: "Contact MedAssist, healthcare assistant support", url: `${SITE_URL}/contact` }}><Contact /></Page>} />
            <Route path="/faq" element={<Page meta={{ title: "FAQ - MedAssist", description: "Find answers to common questions about MedAssist AI healthcare features.", keywords: "MedAssist FAQ, AI healthcare questions, symptom checker help", url: `${SITE_URL}/faq` }}><FAQ /></Page>} />
            <Route
              path="/dashboard"
              element={<Page meta={seo.dashboard}><ProtectedRoute><Dashboard /></ProtectedRoute></Page>}
            />
            <Route
              path="/profile"
              element={<Page meta={seo.profile}><ProtectedRoute><Profile /></ProtectedRoute></Page>}
            />
            <Route
              path="/settings"
              element={<Page meta={{ title: "Settings - MedAssist", description: "Update your MedAssist account, app, and healthcare assistant preferences.", keywords: "MedAssist settings, health assistant preferences", url: `${SITE_URL}/settings` }}><ProtectedRoute><Settings /></ProtectedRoute></Page>}
            />
            <Route
              path="/sessions"
              element={<Page meta={{ title: "Sessions - MedAssist", description: "Review your MedAssist symptom analysis sessions and AI health conversations.", keywords: "MedAssist sessions, symptom analysis history, AI health sessions", url: `${SITE_URL}/sessions` }}><ProtectedRoute><Sessions /></ProtectedRoute></Page>}
            />
            <Route
              path="/diagnose"
              element={<Page meta={{ title: "New Diagnosis - MedAssist", description: "Start a new AI-guided symptom analysis with MedAssist.", keywords: "MedAssist diagnosis, AI symptom checker, disease prediction", url: `${SITE_URL}/diagnose` }}><ProtectedRoute><NewDiagnosis /></ProtectedRoute></Page>}
            />
            <Route
              path="/reports"
              element={<Page meta={seo.reports}><ProtectedRoute><Reports /></ProtectedRoute></Page>}
            />
            <Route
              path="/reports/:id"
              element={<Page meta={{ title: "Report Details - MedAssist", description: "View details from an AI-generated MedAssist health report.", keywords: "MedAssist report details, AI medical report, health insights", url: `${SITE_URL}/reports` }}><ProtectedRoute><ReportDetail /></ProtectedRoute></Page>}
            />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </div>
  );
}

export default App;
