"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setStatus(null);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });

      const data = (await response.json()) as { success: boolean; message: string };
      setStatus(data.message);
      if (response.ok && data.success) {
        router.push("/admin");
      }
    } catch {
      setStatus("Login failed. Check API connectivity.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="mx-auto max-w-md rounded-3xl border border-white/10 bg-zinc-900/75 p-6 shadow-[0_20px_55px_rgba(2,6,23,0.45)]">
      <h2 className="text-2xl font-semibold text-white" style={{ fontFamily: "var(--font-display)" }}>Admin Login</h2>
      <p className="mt-2 text-sm text-zinc-300">Only the season admin can modify league data.</p>
      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <label className="block text-sm text-zinc-300" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="fx-input"
          required
        />
        <button
          type="submit"
          disabled={isLoading}
          className="fx-button-primary w-full"
        >
          {isLoading ? "Signing in..." : "Sign in"}
        </button>
      </form>
      {status ? (
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 rounded-lg bg-zinc-950/70 px-3 py-2 text-sm text-zinc-200"
        >
          {status}
        </motion.p>
      ) : null}
    </section>
  );
}
