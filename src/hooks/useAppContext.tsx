"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { UserPersona, AIModelId } from "@/lib/types";

interface AppContextValue {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  persona: UserPersona | null;
  setPersona: (persona: UserPersona | null) => void;
  selectPersona: (persona: UserPersona) => void;
  switchPersona: () => void;
  selectedModel: AIModelId;
  setSelectedModel: (model: AIModelId) => void;
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  activeTab: "chat" | "report";
  setActiveTab: (tab: "chat" | "report") => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [persona, setPersona] = useState<UserPersona | null>(null);
  const [selectedModel, setSelectedModel] = useState<AIModelId>("oracle-core");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "report">("chat");

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setSidebarOpen(mq.matches);
    const handler = (e: MediaQueryListEvent) => setSidebarOpen(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Safe client-side restoration from URL params and localStorage
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        const urlPersona = urlParams.get("persona") || urlParams.get("launch");
        if (urlPersona === "doctor" || urlPersona === "patient") {
          setPersona(urlPersona);
          const defaultModel: AIModelId = urlPersona === "doctor" ? "oracle-core" : "aegis-core";
          setSelectedModel(defaultModel);
          localStorage.setItem("hippocrates_persona", urlPersona);
          localStorage.setItem("hippocrates_model", defaultModel);
          return;
        }
      }

      const savedPersona = localStorage.getItem("hippocrates_persona") as UserPersona | null;
      if (savedPersona === "doctor" || savedPersona === "patient") {
        setPersona(savedPersona);
        const savedModel = localStorage.getItem("hippocrates_model") as AIModelId | null;
        if (savedModel) {
          setSelectedModel(savedModel);
        } else {
          setSelectedModel(savedPersona === "doctor" ? "oracle-core" : "aegis-core");
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const selectPersona = useCallback((newPersona: UserPersona) => {
    setPersona(newPersona);
    const defaultModel: AIModelId = newPersona === "doctor" ? "oracle-core" : "aegis-core";
    setSelectedModel(defaultModel);
    try {
      localStorage.setItem("hippocrates_persona", newPersona);
      localStorage.setItem("hippocrates_model", defaultModel);
    } catch {
      // Ignore
    }
  }, []);

  const switchPersona = useCallback(() => {
    setPersona(null);
    try {
      localStorage.removeItem("hippocrates_persona");
    } catch {
      // Ignore
    }
  }, []);

  const handleSetSelectedModel = useCallback((model: AIModelId) => {
    setSelectedModel(model);
    try {
      localStorage.setItem("hippocrates_model", model);
    } catch {
      // Ignore
    }
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  return (
    <AppContext.Provider
      value={{
        sidebarOpen,
        setSidebarOpen,
        toggleSidebar,
        persona,
        setPersona,
        selectPersona,
        switchPersona,
        selectedModel,
        setSelectedModel: handleSetSelectedModel,
        settingsOpen,
        setSettingsOpen,
        activeTab,
        setActiveTab,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within AppProvider");
  }
  return context;
}
