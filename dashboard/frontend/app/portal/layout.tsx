"use client";

import { useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useClinic } from "@/context/ClinicContext";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { clinic, user, loading } = useClinic();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth");
    } else if (!loading && user && clinic && clinic.status === "pending") {
      router.replace("/pending");
    } else if (!loading && user && !clinic) {
      router.replace("/onboarding");
    }
  }, [loading, user, clinic]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8fafc",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div
            style={{
              width: 48,
              height: 48,
              border: "4px solid #e2e8f0",
              borderTopColor: "#3b82f6",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          />
          <p style={{ marginTop: 24, color: "#475569", fontSize: 16, fontWeight: 500 }}>
            Loading your clinic...
          </p>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  if (!clinic || clinic.status !== "active") return null;

  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#f8fafc",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div
              style={{
                width: 48,
                height: 48,
                border: "4px solid #e2e8f0",
                borderTopColor: "#3b82f6",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
            <p style={{ marginTop: 24, color: "#475569", fontSize: 16, fontWeight: 500 }}>
              Loading portal view...
            </p>
          </div>
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
