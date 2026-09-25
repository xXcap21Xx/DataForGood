"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { BASE_PATH } from "@/lib/base-path";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await fetch(`${BASE_PATH}/api/auth/logout`, { method: "POST" });
    } finally {
      router.push("/entrar");
      router.refresh();
    }
  }

  return (
    <Button variant="secondary" size="sm" onClick={handleLogout} disabled={loading}>
      {loading ? "Cerrando..." : "Cerrar sesión"}
    </Button>
  );
}
