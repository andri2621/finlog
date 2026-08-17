"use client";

/**
 * Helper to manage Web Notifications & PWA Local Reminders
 */

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    console.warn("Notifications not supported in this browser.");
    return "denied";
  }

  if (Notification.permission === "granted") {
    return "granted";
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (e) {
    console.error("Failed to request notification permission:", e);
    return "denied";
  }
}

export function getNotificationPermission(): NotificationPermission {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  return Notification.permission;
}

export interface SendNotificationOptions {
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  data?: any;
}

export async function sendLocalNotification(
  title: string,
  options: SendNotificationOptions
): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }

  let permission = Notification.permission;
  if (permission === "default") {
    permission = await requestNotificationPermission();
  }

  if (permission !== "granted") {
    return false;
  }

  const notificationOptions = {
    body: options.body,
    icon: options.icon || "/favicon/android-chrome-192x192.png",
    badge: options.badge || "/favicon/android-chrome-192x192.png",
    tag: options.tag || "finlog-notification",
    data: {
      url: options.url || "/",
      ...options.data,
    },
  };

  // 1. Try sending via Service Worker Registration (Required for Android & iOS PWA)
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      if (registration && "showNotification" in registration) {
        await registration.showNotification(title, notificationOptions);
        return true;
      }
    } catch (swErr) {
      console.warn("ServiceWorker showNotification fallback:", swErr);
    }
  }

  // 2. Fallback to standard Window Notification constructor
  try {
    const notification = new Notification(title, notificationOptions);
    notification.onclick = () => {
      window.focus();
      if (options.url) {
        window.location.href = options.url;
      }
      notification.close();
    };
    return true;
  } catch (err) {
    console.error("Window Notification error:", err);
    return false;
  }
}
