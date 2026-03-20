"use client";
import { useEffect } from "react";

export function SWRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(async (reg) => {
          try {
            const perm = await Notification.requestPermission();
            if (perm !== "granted") return;
            const existing = await reg.pushManager.getSubscription();
            const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "BI1Hmqx5lG-s3Z9Zzv5iL3z6p7G1f8U9H0I1J2K3L4M5N6O7P8Q9R0S1T2U3V4W5X6Y7Z8A9B0C1D2E3F4G5H6I7J8K9";
            if (!vapid) return;
            const key = urlBase64ToUint8Array(vapid);
            const sub =
              existing ||
              (await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: key,
              }));
            // Save to backend
            await fetch(
              `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"}/donations/push/subscribe/`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  ...(getAuthHeader() || {}),
                },
                body: JSON.stringify(sub.toJSON()),
              }
            );
          } catch {
          }
        })
        .catch(() => {});
    }
  }, []);
  return null;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function getAuthHeader(): Record<string, string> | null {
  try {
    const access = window.localStorage.getItem("access");
    if (!access) return null;
    return { Authorization: `Bearer ${access}` };
  } catch {
    return null;
  }
}
