'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getUserLogin, setAuthToken } from "../utils/user";

export function FormsLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await getUserLogin(email, password);
      if (response.success) {
        const token = response.response?.token;

        if (token) {
          localStorage.setItem("token", token);
          sessionStorage.removeItem("skipDemoLogin");
          setAuthToken(token);
        }

        router.push("/dashboard");
      } else {
        setError(response.message || "Identifiants invalides");
      }
    } catch (err: any) {
      setError(err?.message || "Erreur lors de la connexion.");
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-[#0f1115] px-4 py-10 sm:px-6 lg:px-8"
      style={{ fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif" }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg border border-[#2a2e37] bg-[#171a20] p-8 text-[#e8e8e8]
                   sm:max-w-md sm:p-10
                   md:max-w-lg md:p-12
                   lg:max-w-xl lg:p-14
                   xl:max-w-2xl xl:p-16
                   2xl:max-w-3xl"
      >
        <h2 className="mb-8 text-center text-2xl font-semibold sm:text-3xl md:mb-10 md:text-4xl lg:text-5xl">
          Login
        </h2>

        <div className="mb-5 md:mb-6 lg:mb-8">
          <label
            htmlFor="email"
            className="mb-2 block text-sm text-[#9aa0aa] sm:text-base lg:text-lg"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vous@exemple.com"
            required
            className="w-full rounded-md border border-[#3a3f4a] bg-[#0f1115] px-4 py-3 text-base text-[#e8e8e8]
                       placeholder-[#5c6270] focus:border-[#4fc3f7] focus:outline-none
                       sm:px-5 sm:py-3.5 sm:text-lg
                       lg:px-6 lg:py-4 lg:text-xl"
          />
        </div>

        <div className="mb-8 md:mb-10 lg:mb-12">
          <label
            htmlFor="password"
            className="mb-2 block text-sm text-[#9aa0aa] sm:text-base lg:text-lg"
          >
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="w-full rounded-md border border-[#3a3f4a] bg-[#0f1115] px-4 py-3 text-base text-[#e8e8e8]
                       placeholder-[#5c6270] focus:border-[#4fc3f7] focus:outline-none
                       sm:px-5 sm:py-3.5 sm:text-lg
                       lg:px-6 lg:py-4 lg:text-xl"
          />
        </div>

        {error && (
          <p
            className="mb-6 rounded-md border border-[#8b0000]/40 bg-[#8b0000]/20 px-4 py-3 text-sm text-[#ff8a80]
                       sm:text-base lg:text-lg"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md border border-[#3a3f4a] bg-[#4fc3f7] py-3 text-base font-semibold text-[#0f1115]
                     transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60
                     sm:py-3.5 sm:text-lg
                     lg:py-4 lg:text-xl"
        >
          {loading ? "Connexion..." : "Se connecter"}
        </button>
      </form>
    </div>
  );
}