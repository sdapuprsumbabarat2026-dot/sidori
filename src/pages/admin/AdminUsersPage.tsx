import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { UserPlus, Loader2, Trash2, Pencil, KeyRound } from "lucide-react";
import type { User } from "../../types";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [formNip, setFormNip] = useState("");
  const [formName, setFormName] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState("user");
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("user");
  const [newPassword, setNewPassword] = useState("");

  const loadUsers = async () => {
    const { data } = await supabase.rpc("admin_list_users");
    if (data) setUsers(data);
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, []);

  const resetForm = () => { setFormNip(""); setFormName(""); setFormPassword(""); setFormRole("user") };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await supabase.rpc("admin_create_user", { p_nip: formNip, p_name: formName, p_password: formPassword, p_role: formRole });
    setSubmitting(false);
    resetForm();
    setCreateOpen(false);
    loadUsers();
  };

  const openEdit = (u: User) => {
    setEditUser(u);
    setEditName(u.name);
    setEditRole(u.role);
    setNewPassword("");
    setEditOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setSubmitting(true);
    await supabase.rpc("admin_update_user", { p_user_id: editUser.id, p_name: editName, p_role: editRole });
    if (newPassword) {
      await supabase.rpc("admin_change_password", { p_user_id: editUser.id, p_new_password: newPassword });
    }
    setSubmitting(false);
    setEditOpen(false);
    loadUsers();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus pengguna ini?")) return;
    await supabase.rpc("admin_delete_user", { p_user_id: id });
    loadUsers();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pengguna</h1>
          <p className="text-muted-foreground">Kelola pengguna sistem.</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" /> Tambah
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah Pengguna</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>NIP</Label>
                <Input value={formNip} onChange={(e) => setFormNip(e.target.value)} required placeholder="Nomor Induk Pegawai" />
              </div>
              <div className="space-y-2">
                <Label>Nama</Label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={formRole} onValueChange={setFormRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Simpan
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Belum ada pengguna</div>
            ) : (
              users.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{u.name}</p>
                      <p className="text-sm text-muted-foreground">{u.nip}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      u.role === "super_admin"
                        ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
                        : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                    }`}>
                      {u.role === "super_admin" ? "Super Admin" : "User"}
                    </span>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(u)} title="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {u.role !== "super_admin" && (
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(u.id)} title="Hapus">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Pengguna</DialogTitle>
          </DialogHeader>
          {editUser && (
            <Tabs defaultValue="data">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="data"><Pencil className="h-4 w-4 mr-2" />Data</TabsTrigger>
                <TabsTrigger value="password"><KeyRound className="h-4 w-4 mr-2" />Password</TabsTrigger>
              </TabsList>
              <form onSubmit={handleUpdate}>
                <TabsContent value="data" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>NIP</Label>
                    <Input value={editUser.nip} disabled className="bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <Label>Nama</Label>
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select value={editRole} onValueChange={setEditRole}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" disabled={submitting} className="w-full">
                    {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Simpan Perubahan
                  </Button>
                </TabsContent>
                <TabsContent value="password" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Password Baru</Label>
                    <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required placeholder="Minimal 6 karakter" minLength={6} />
                  </div>
                  <Button type="submit" disabled={submitting} className="w-full">
                    {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Ubah Password
                  </Button>
                </TabsContent>
              </form>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
