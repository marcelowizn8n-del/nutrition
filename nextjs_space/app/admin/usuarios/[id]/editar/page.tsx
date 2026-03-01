'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { AvatarUpload } from '@/components/avatar-upload';
import { ArrowLeft, Loader2, UserCog } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';

export default function EditarUsuarioPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '' as string,
    avatarUrl: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    fetchUser();
  }, [userId]);

  const fetchUser = async () => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`);
      if (response.ok) {
        const user = await response.json();
        setFormData({
          name: user.name,
          email: user.email,
          role: user.role,
          avatarUrl: user.avatarUrl || '',
          newPassword: '',
          confirmPassword: '',
        });
      } else {
        setError('Usuário não encontrado');
      }
    } catch (err) {
      setError('Erro ao carregar usuário');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (resetPassword) {
      if (formData.newPassword !== formData.confirmPassword) {
        setError('As senhas não coincidem');
        return;
      }
      if (formData.newPassword.length < 6) {
        setError('A nova senha deve ter pelo menos 6 caracteres');
        return;
      }
    }

    setSaving(true);

    try {
      const payload: any = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        avatarUrl: formData.avatarUrl,
      };

      if (resetPassword && formData.newPassword) {
        payload.password = formData.newPassword;
      }

      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Erro ao atualizar usuário');
        return;
      }

      router.push('/admin/usuarios');
    } catch (err) {
      setError('Erro ao atualizar usuário');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/usuarios">
              <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
            </Link>
          </Button>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <UserCog className="w-6 h-6" />
          Editar Usuário
        </h1>
        <p className="text-gray-500">Atualize os dados do usuário</p>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Dados do Usuário</CardTitle>
          <CardDescription>Modifique as informações necessárias</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex justify-center pb-4">
              <AvatarUpload
                currentUrl={formData.avatarUrl}
                onUpload={(url) => setFormData({ ...formData, avatarUrl: url })}
                size="lg"
              />
            </div>

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
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Tipo de Usuário</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Administrador</SelectItem>
                  <SelectItem value="NUTRITIONIST">Nutricionista</SelectItem>
                  <SelectItem value="PATIENT">Paciente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reset Password Section */}
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center space-x-2 mb-4">
                <Checkbox
                  id="resetPassword"
                  checked={resetPassword}
                  onCheckedChange={(checked) => setResetPassword(checked as boolean)}
                />
                <Label htmlFor="resetPassword" className="font-normal">
                  Redefinir senha do usuário
                </Label>
              </div>

              {resetPassword && (
                <div className="space-y-4 pl-6">
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
                      placeholder="Repita a nova senha"
                    />
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <Button type="button" variant="outline" asChild className="flex-1">
                <Link href="/admin/usuarios">Cancelar</Link>
              </Button>
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</>
                ) : (
                  'Salvar Alterações'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
