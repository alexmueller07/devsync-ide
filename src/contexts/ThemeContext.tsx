import React, { createContext, useContext, useState, useEffect } from 'react';

interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme === 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.style.setProperty('--primary-bg', '#1a1a1a');
      root.style.setProperty('--surface-bg', '#2d2d2d');
      root.style.setProperty('--primary-text', '#ffffff');
      root.style.setProperty('--secondary-text', '#b0b0b0');
      root.style.setProperty('--border-color', '#404040');
      root.style.setProperty('--hover-color', '#404040');
      root.style.setProperty('--shadow-md', '0 2px 4px rgba(0,0,0,0.2)');
      root.style.setProperty('--accent-color', '#90caf9');
      document.body.style.backgroundColor = '#1a1a1a';
    } else {
      root.style.setProperty('--primary-bg', '#ffffff');
      root.style.setProperty('--surface-bg', '#f5f5f5');
      root.style.setProperty('--primary-text', '#202124');
      root.style.setProperty('--secondary-text', '#5f6368');
      root.style.setProperty('--border-color', '#dadce0');
      root.style.setProperty('--hover-color', '#f1f3f4');
      root.style.setProperty('--shadow-md', '0 2px 4px rgba(0,0,0,0.1)');
      root.style.setProperty('--accent-color', '#1a73e8');
      document.body.style.backgroundColor = '#ffffff';
    }
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
} 