import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
type ResolvedTheme = Exclude<ThemeMode, 'system'>;

interface ThemeContextType {
 theme: ThemeMode;
 resolvedTheme: ResolvedTheme;
 setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const THEME_STORAGE_KEY = 'bpms-theme-mode';

const getSystemTheme = (): ResolvedTheme =>
 window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
 const [theme, setTheme] = useState<ThemeMode>(() => {
 const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
 return savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system' ? savedTheme : 'system';
 });
 const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme);

 useEffect(() => {
 const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
 const updateSystemTheme = () => setSystemTheme(mediaQuery.matches ? 'light' : 'dark');

 mediaQuery.addEventListener('change', updateSystemTheme);
 return () => mediaQuery.removeEventListener('change', updateSystemTheme);
 }, []);

 const resolvedTheme = theme === 'system' ? systemTheme : theme;

 useEffect(() => {
 document.documentElement.dataset.theme = resolvedTheme;
 document.documentElement.style.colorScheme = resolvedTheme;
 window.localStorage.setItem(THEME_STORAGE_KEY, theme);
 }, [resolvedTheme, theme]);

 const value = useMemo(() => ({ theme, resolvedTheme, setTheme }), [theme, resolvedTheme]);

 return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
 const context = useContext(ThemeContext);
 if (!context) {
 throw new Error('useTheme must be used within a ThemeProvider');
 }

 return context;
};
