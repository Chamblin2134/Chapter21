import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import type { ComponentProps } from "react";

type ThemeProviderProps = ComponentProps<typeof NextThemesProvider>;

function ThemeProvider({
  children,
  defaultTheme = "dark",
  switchable = false,
  ...props
}: ThemeProviderProps & { switchable?: boolean }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={defaultTheme}
      enableSystem={switchable}
      forcedTheme={switchable ? undefined : defaultTheme}
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}

export { ThemeProvider, useTheme };
