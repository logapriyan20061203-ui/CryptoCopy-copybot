import React, { createContext, useContext, useLayoutEffect, useState } from 'react';

const ThemeContext = createContext(null);

const getInitialTheme = () => {
  try {
    return window.localStorage.getItem('cryptocopy-theme') === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(getInitialTheme);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem('cryptocopy-theme', theme);
    } catch {
      // The current session still uses the selected theme when storage is unavailable.
    }
  }, [theme]);

  const toggleTheme = () => setTheme((current) => (current === 'light' ? 'dark' : 'light'));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};