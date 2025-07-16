import { useEffect, useState, useContext } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AuthContext } from "@/App";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function AdminUsersPage() {
  const { user } = useContext(AuthContext);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteUser, setDeleteUser] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [resetUser, setResetUser] = useState<any>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "client",
    firstName: "",
    lastName: "",
    phone: ""
  });
  const [createLoading, setCreateLoading] = useState(false);

  // Fetch all users
  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  // Edit user mutation
  const editUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update user");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "User updated", description: "User info updated successfully." });
      setEditingUser(null);
      setEditForm(null);
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (err: any) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete user");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "User deleted", description: "User has been removed." });
      setDeleteUser(null);
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (err: any) => {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    },
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: number; newPassword: string }) => {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, newPassword }),
      });
      if (!res.ok) throw new Error("Failed to reset password");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Password reset", description: "User password has been updated." });
      setResetUser(null);
      setResetPassword("");
    },
    onError: (err: any) => {
      toast({ title: "Reset failed", description: err.message, variant: "destructive" });
    },
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create user");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "User created", description: "New user has been added." });
      setCreateOpen(false);
      setCreateForm({ username: "", email: "", password: "", role: "client", firstName: "", lastName: "", phone: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (err: any) => {
      toast({ title: "Create failed", description: err.message, variant: "destructive" });
    },
  });

  // Restrict access to admins only
  if (!user || user.role !== "admin") {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p className="text-gray-600">You must be an admin to view this page.</p>
      </div>
    );
  }

  // Filter users by search and role
  const filteredUsers = users.filter((u: any) => {
    const matchesSearch =
      !search ||
      u.username?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.firstName?.toLowerCase().includes(search.toLowerCase()) ||
      u.lastName?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Admin User Management</CardTitle>
            <Button onClick={() => setCreateOpen(true)} variant="primary">Create New User</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <Input
              placeholder="Search by name, username, or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full sm:w-64"
            />
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="staff">Staff</option>
              <option value="client">Client</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border text-sm">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-800">
                  <th className="p-2 border">Username</th>
                  <th className="p-2 border">Email</th>
                  <th className="p-2 border">Role</th>
                  <th className="p-2 border">First Name</th>
                  <th className="p-2 border">Last Name</th>
                  <th className="p-2 border">Phone</th>
                  <th className="p-2 border">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} className="text-center p-4">Loading users...</td></tr>
                ) : filteredUsers.length === 0 ? (
                  <tr><td colSpan={7} className="text-center p-4">No users found.</td></tr>
                ) : (
                  filteredUsers.map((u: any) => (
                    <tr key={u.id} className="border-b">
                      <td className="p-2 border">{u.username}</td>
                      <td className="p-2 border">{u.email}</td>
                      <td className="p-2 border">{u.role}</td>
                      <td className="p-2 border">{u.firstName}</td>
                      <td className="p-2 border">{u.lastName}</td>
                      <td className="p-2 border">{u.phone}</td>
                      <td className="p-2 border">
                        <Button size="sm" variant="outline" className="mr-1" onClick={() => { setEditingUser(u); setEditForm({ ...u }); }}>Edit</Button>
                        <Button size="sm" variant="destructive" className="mr-1" onClick={() => setDeleteUser(u)} disabled={u.id === user.id}>Delete</Button>
                        <Button size="sm" variant="secondary" className="mr-1" onClick={() => { setResetUser(u); setResetPassword(""); }}>Reset Password</Button>
                        <Button size="sm" variant="ghost">Change Role</Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={open => { if (!open) { setEditingUser(null); setEditForm(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          {editForm && (
            <form
              onSubmit={e => {
                e.preventDefault();
                setEditLoading(true);
                editUserMutation.mutate({ id: editingUser.id, data: editForm });
                setEditLoading(false);
              }}
              className="space-y-3"
            >
              <div>
                <Label>Username</Label>
                <Input value={editForm.username} onChange={e => setEditForm((f: any) => ({ ...f, username: e.target.value }))} required />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={editForm.email} onChange={e => setEditForm((f: any) => ({ ...f, email: e.target.value }))} required />
              </div>
              <div>
                <Label>Role</Label>
                <select value={editForm.role} onChange={e => setEditForm((f: any) => ({ ...f, role: e.target.value }))} className="border rounded px-2 py-1 w-full">
                  <option value="admin">Admin</option>
                  <option value="staff">Staff</option>
                  <option value="client">Client</option>
                </select>
              </div>
              <div>
                <Label>First Name</Label>
                <Input value={editForm.firstName} onChange={e => setEditForm((f: any) => ({ ...f, firstName: e.target.value }))} />
              </div>
              <div>
                <Label>Last Name</Label>
                <Input value={editForm.lastName} onChange={e => setEditForm((f: any) => ({ ...f, lastName: e.target.value }))} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={editForm.phone} onChange={e => setEditForm((f: any) => ({ ...f, phone: e.target.value }))} />
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => { setEditingUser(null); setEditForm(null); }}>Cancel</Button>
                <Button type="submit" disabled={editLoading}>Save</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
      {/* Delete User Dialog */}
      <Dialog open={!!deleteUser} onOpenChange={open => { if (!open) setDeleteUser(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
          </DialogHeader>
          {deleteUser && (
            <div>
              <p>Are you sure you want to delete user <b>{deleteUser.username}</b> ({deleteUser.email})?</p>
              <p className="text-red-600 mt-2">This action cannot be undone.</p>
              <DialogFooter className="mt-4">
                <Button type="button" variant="ghost" onClick={() => setDeleteUser(null)}>Cancel</Button>
                <Button type="button" variant="destructive" disabled={deleteLoading} onClick={() => {
                  setDeleteLoading(true);
                  deleteUserMutation.mutate(deleteUser.id);
                  setDeleteLoading(false);
                }}>Delete</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Reset Password Dialog */}
      <Dialog open={!!resetUser} onOpenChange={open => { if (!open) { setResetUser(null); setResetPassword(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          {resetUser && (
            <form
              onSubmit={e => {
                e.preventDefault();
                setResetLoading(true);
                resetPasswordMutation.mutate({ userId: resetUser.id, newPassword: resetPassword });
                setResetLoading(false);
              }}
              className="space-y-4"
            >
              <div>
                <Label>New Password for <b>{resetUser.username}</b></Label>
                <Input
                  type="password"
                  value={resetPassword}
                  onChange={e => setResetPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Enter new password"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => { setResetUser(null); setResetPassword(""); }}>Cancel</Button>
                <Button type="submit" disabled={resetLoading || resetPassword.length < 6}>Reset</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
      {/* Create User Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={e => {
              e.preventDefault();
              setCreateLoading(true);
              createUserMutation.mutate(createForm);
              setCreateLoading(false);
            }}
            className="space-y-3"
          >
            <div>
              <Label>Username</Label>
              <Input value={createForm.username} onChange={e => setCreateForm(f => ({ ...f, username: e.target.value }))} required />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" value={createForm.password} onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))} required minLength={6} />
            </div>
            <div>
              <Label>Role</Label>
              <select value={createForm.role} onChange={e => setCreateForm(f => ({ ...f, role: e.target.value }))} className="border rounded px-2 py-1 w-full">
                <option value="admin">Admin</option>
                <option value="staff">Staff</option>
                <option value="client">Client</option>
              </select>
            </div>
            <div>
              <Label>First Name</Label>
              <Input value={createForm.firstName} onChange={e => setCreateForm(f => ({ ...f, firstName: e.target.value }))} />
            </div>
            <div>
              <Label>Last Name</Label>
              <Input value={createForm.lastName} onChange={e => setCreateForm(f => ({ ...f, lastName: e.target.value }))} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={createForm.phone} onChange={e => setCreateForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createLoading || !createForm.username || !createForm.email || !createForm.password || createForm.password.length < 6}>Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 