export type Theme = "dark" | "light";

export const THEME_KEY = "traveldls-theme";
const THEME_EVENT = "traveldls-theme-change";

// Runs before the first paint so saved preferences also apply during navigation.
export const themeInitializationScript = `(()=>{let theme="dark";try{if(localStorage.getItem("${THEME_KEY}")==="light")theme="light"}catch{}document.documentElement.dataset.theme=theme})()`;

export function getTheme(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

export function getServerTheme(): Theme {
  return "dark";
}

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem(THEME_KEY, theme); } catch { /* Works without storage too. */ }
  window.dispatchEvent(new Event(THEME_EVENT));
}

export function subscribeToTheme(listener: () => void) {
  const synchronize = (event: StorageEvent) => {
    if (event.key !== THEME_KEY && event.key !== null) return;
    document.documentElement.dataset.theme = event.newValue === "light" ? "light" : "dark";
    listener();
  };
  window.addEventListener(THEME_EVENT, listener);
  window.addEventListener("storage", synchronize);
  return () => {
    window.removeEventListener(THEME_EVENT, listener);
    window.removeEventListener("storage", synchronize);
  };
}
