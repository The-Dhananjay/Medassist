import { ThemeProvider } from "next-themes";

export default function AppThemeProvider({ children }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      storageKey="medassist-theme"
      enableSystem
    >
      {children}
    </ThemeProvider>
  );
}
