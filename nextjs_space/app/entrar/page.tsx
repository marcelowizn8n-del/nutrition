'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function EntrarPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error ?? 'Falha ao entrar.');
      if (data.role === 'PATIENT') router.push('/portal');
      else router.push('/profissional');
    } catch (e: any) {
      setError(e?.message ?? 'Erro inesperado.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Entrar</h1>
          <p className="text-sm text-gray-500 mt-1">
            Use os logins de demonstração para acessar.
          </p>
        </div>
        <div className="space-y-3">
          <input
            className="w-full rounded-md border px-3 py-2"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <input
            className="w-full rounded-md border px-3 py-2"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
          />
          {error && <div className="text-sm text-red-600">{error}</div>}
          <button
            className="w-full rounded-md bg-black text-white py-2 disabled:opacity-50"
            disabled={loading}
            onClick={handleLogin}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <button
            className="rounded-md border py-2"
            onClick={() => { setEmail('nutri@thinkingtools.health'); setPassword('Nutri@123'); }}
          >
            Preencher Nutri
          </button>
          <button
            className="rounded-md border py-2"
            onClick={() => { setEmail('alice@thinkingtools.health'); setPassword('Paciente@123'); }}
          >
            Preencher Paciente
          </button>
        </div>
      </div>
    </div>
  );
}
