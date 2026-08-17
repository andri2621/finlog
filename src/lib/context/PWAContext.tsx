"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface PWAContextType {
  isInstalled: boolean;
  isInstallable: boolean;
  platform: "ios" | "android" | "desktop";
  installApp: () => Promise<"installed" | "dismissed" | "guide_ios" | "guide_manual">;
  deferredPrompt: any;
}

const PWAContext = createContext<PWAContextType | undefined>(undefined);

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [platform] = useState<"ios" | "android" | "desktop">(() => {
    if (typeof window !== "undefined") {
      const ua = window.navigator.userAgent.toLowerCase();
      if (/iphone|ipad|ipod/.test(ua)) return "ios";
      if (/android/.test(ua)) return "android";
    }
    return "desktop";
  });

  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return (
        window.matchMedia("(display-mode: standalone)").matches ||
        Boolean((window.navigator as any).standalone)
      );
    }
    return false;
  });

  const [deferredPrompt, setDeferredPrompt] = useState<any>(() => {
    if (typeof window !== "undefined") {
      return (window as any).deferredPWAInstallPrompt || null;
    }
    return null;
  });

  useEffect(() => {
    // 1. Capture beforeinstallprompt globally
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      (window as any).deferredPWAInstallPrompt = e;
      setDeferredPrompt(e);
      console.log("PWA beforeinstallprompt captured successfully");
    };

    // 2. Capture appinstalled
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      (window as any).deferredPWAInstallPrompt = null;
      console.log("PWA installed successfully");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    // If global prompt was captured before this effect ran
    if ((window as any).deferredPWAInstallPrompt && !deferredPrompt) {
      setDeferredPrompt((window as any).deferredPWAInstallPrompt);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [deferredPrompt]);

  const installApp = async (): Promise<"installed" | "dismissed" | "guide_ios" | "guide_manual"> => {
    if (isInstalled) {
      return "installed";
    }

    // Check if we have native install prompt
    const promptEvent = deferredPrompt || (typeof window !== "undefined" ? (window as any).deferredPWAInstallPrompt : null);

    if (promptEvent) {
      try {
        promptEvent.prompt();
        const { outcome } = await promptEvent.userChoice;
        if (outcome === "accepted") {
          setIsInstalled(true);
          setDeferredPrompt(null);
          (window as any).deferredPWAInstallPrompt = null;
          return "installed";
        }
        return "dismissed";
      } catch (err) {
        console.error("Install prompt error:", err);
      }
    }

    if (platform === "ios") {
      return "guide_ios";
    }

    return "guide_manual";
  };

  return (
    <PWAContext.Provider
      value={{
        isInstalled,
        isInstallable: Boolean(deferredPrompt),
        platform,
        installApp,
        deferredPrompt,
      }}
    >
      {children}
    </PWAContext.Provider>
  );
}

export function usePWAInstall() {
  const context = useContext(PWAContext);
  if (!context) {
    throw new Error("usePWAInstall must be used within a PWAProvider");
  }
  return context;
}
