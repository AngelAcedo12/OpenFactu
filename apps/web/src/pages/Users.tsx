import React, { useEffect, useState } from 'react';
import { Table, Card, Button, Input, Badge, Loader, useToast } from '@openfactu/ui';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Mail, Building, Edit2, Trash2 } from 'lucide-react';

export const Users: React.FC = () => {
  const { token } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const toast = useToast();
  
  // Estado del formulario
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('USER');
  const [tenantId, setTenantId] = useState('');
  const [tenants, setTenants] = useState<{id: string, name: string}[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error('Error fetching users', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTenants = async () => {
    try {
      const res = await fetch('/api/auth/tenants');
      const data = await res.json();
      if (Array.isArray(data)) setTenants(data);
    } catch (err) {
      console.error('Error fetching tenants', err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchTenants();
  }, []);

  const resetForm = () => {
    setShowForm(false);
    setEditingUser(null);
    setUsername('');
    setEmail('');
    setPassword('');
    setRole('USER');
    setTenantId('');
  };

  const startEdit = (user: any) => {
    setEditingUser(user);
    setUsername(user.username);
    setEmail(user.email);
    setPassword(''); // No cargamos la pass por seguridad
    setRole(user.role);
    setTenantId(user.tenantId || '');
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PATCH' : 'POST';
      
      const payload: any = { username, email, role, tenantId: tenantId || null };
      if (password) payload.password = password;

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        resetForm();
        fetchUsers();
        toast.success(editingUser ? 'Usuario actualizado' : 'Usuario creado');
      } else {
        const error = await res.json();
        toast.error(error.error || 'Fallo en la operación');
      }
    } catch (err) {
      toast.error('Error de conexión');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchUsers();
        toast.success('Usuario eliminado');
      }
    } catch (err) {
      toast.error('Fallo al eliminar');
    }
  };

  const columns = [
    { header: 'Usuario', accessor: 'username' },
    { header: 'Email', accessor: 'email' },
    { 
      header: 'Rol', 
      accessor: (u: any) => (
        <Badge variant={u.role === 'SUPERUSER' ? 'warning' : (u.role === 'ADMIN' ? 'info' : 'neutral')}>
          {u.role === 'SUPERUSER' ? 'Global Admin' : u.role}
        </Badge>
      )
    },
    { header: 'Empresa', accessor: (u: any) => u.tenant?.name || 'Sistema (Global)' },
    { 
      header: 'Acciones', 
      accessor: (u: any) => (
        <div className="flex gap-2">
          <button onClick={() => startEdit(u)} className="p-1 hover:text-blue-600 transition-colors">
            <Edit2 size={16} />
          </button>
          {u.role !== 'SUPERUSER' && (
            <button onClick={() => handleDelete(u.id)} className="p-1 hover:text-red-600 transition-colors">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestión de Usuarios</h1>
          <p className="text-slate-500 text-sm">Administra los accesos y roles de tu equipo.</p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
            <UserPlus size={18} />
            Nuevo Usuario
          </Button>
        )}
      </div>

      {showForm && (
        <Card title={editingUser ? `Editando: ${editingUser.username}` : "Crear Nuevo Usuario"}>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Nombre de Usuario</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                    <Building size={16} />
                  </div>
                  <Input 
                    type="text" 
                    placeholder="admin, jdoe, etc."
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                    <Mail size={16} />
                  </div>
                  <Input 
                    type="email" 
                    placeholder="ejemplo@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">
                  {editingUser ? 'Nueva Contraseña (dejar vacío para no cambiar)' : 'Contraseña'}
                </label>
                <div className="relative">
                  <Input 
                    type="password" 
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required={!editingUser}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Rol</label>
                <select 
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  required
                >
                  <option value="USER">Usuario (Consulta)</option>
                  <option value="ADMIN">Administrador (Control Total)</option>
                  <option value="SUPERUSER">Súper Usuario (Global)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Empresa de Acceso</label>
                <select 
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="">Sin Empresa (Acceso Global)</option>
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
              <Button variant="secondary" onClick={resetForm}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader size="sm" variant="white" className="mr-2" /> : null}
                {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        <Table columns={columns} data={users} isLoading={loading} />
      </Card>
    </div>
  );
};
