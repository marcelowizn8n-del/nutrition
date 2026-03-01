'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AvatarUpload } from '@/components/avatar-upload';
import { Loader2, ArrowLeft, User, Mail, Shield, Save } from 'lucide-react';
import Link from 'next/link';

const roleLabels: Record<string, string> = {
  ADMIN: 'Administrador',
  NUTRITIONIST: 'Nutricionista',
  PATIENT: 'Paciente',
};

export default function PerfilPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    avatarUrl: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [changePassword, setChangePassword] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setFormData(prev => ({
          ...prev,
          name: data.user.name,
          email: data.user.email,
          avatarUrl: data.user.avatarUrl || '',
        }));
      }
    } catch (err) {
      console.error('Error fetching user:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (changePassword) {
      if (formData.newPassword !== formData.confirmPassword) {
        setError('As novas senhas não coincidem');
        return;
      }
      if (formData.newPassword.length < 6) {
        setError('A nova senha deve ter pelo menos 6 caracteres');
        return;
      }
      if (!formData.currentPassword) {
        setError('Digite sua senha atual');
        return;
      }
    }

    setSaving(true);

    try {
      const payload: any = {
        name: formData.name,
        avatarUrl: formData.avatarUrl,
      };

      if (changePassword && formData.newPassword) {
        payload.currentPassword = formData.currentPassword;
        payload.newPassword = formData.newPassword;
      }

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Erro ao atualizar perfil');
        return;
      }

      setSuccess(true);
      setChangePassword(false);
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
      fetchUserData();
    } catch (err) {
      setError('Erro ao atualizar perfil');
    } finally {
      setSaving(false);
    }
  };

  const getBackUrl = () => {
    if (!user) return '/';
    switch (user.role) {
      case 'ADMIN': return '/admin';
      case 'NUTRITIONIST': return '/nutricionista';
      case 'PATIENT': return '/paciente';
      default: return '/';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href={getBackUrl()}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
            </Link>
          </Button>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <User className="w-6 h-6" />
          Meu Perfil
        </h1>
        <p className="text-gray-500">Gerencie suas informações pessoais</p>
      </div>

      {/* Avatar Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-6">
            <AvatarUpload
              currentUrl={formData.avatarUrl}
              onUpload={(url) => setFormData({ ...formData, avatarUrl: url })}
              size="lg"
            />
            <div className="flex-1">
              <h3 className="text-lg font-medium">{user?.name}</h3>
              <p className="text-sm text-gray-500">{user?.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Shield className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-blue-600 font-medium">
                  {roleLabels[user?.role] || user?.role}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Informações Pessoais</CardTitle>
            <CardDescription>Atualize seus dados de cadastro</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                disabled
                className="bg-gray-50"
              />
              <p className="text-xs text-gray-500">O email não pode ser alterado</p>
            </div>


          </CardContent>
        </Card>

        {/* Password Section */}
        <Card className="mt-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Alterar Senha</CardTitle>
                <CardDescription>Atualize sua senha de acesso</CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setChangePassword(!changePassword)}
              >
                {changePassword ? 'Cancelar' : 'Alterar'}
              </Button>
            </div>
          </CardHeader>
          {changePassword && (
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Senha Atual</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={formData.currentPassword}
                  onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova Senha</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={formData.newPassword}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                />
              </div>
            </CardContent>
          )}
        </Card>

        {/* Messages */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-4 p-3 bg-green-50 text-green-600 rounded-lg text-sm">
            Perfil atualizado com sucesso!
          </div>
        )}

        {/* Submit Button */}
        <Button type="submit" disabled={saving} className="w-full mt-4">
          {saving ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</>
          ) : (
            <><Save className="w-4 h-4 mr-2" /> Salvar Alterações</>
          )}
        </Button>
      </form>
    </div>
  );
}
