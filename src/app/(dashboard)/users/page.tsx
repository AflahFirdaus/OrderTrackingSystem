"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Container from "@/components/container";
import type { User } from "@/types/database";
import { SidebarForm } from "@/components/sidebar-form";
import { Plus, Edit, Trash2 } from "lucide-react";
import { DeleteConfirmModal } from "@/components/delete-confirm-modal";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    user: User | null;
  }>({ isOpen: false, user: null });
  const [deleting, setDeleting] = useState(false);

  // User form state
  const [userForm, setUserForm] = useState({
    nama: "",
    username: "",
    password: "",
    role: "gudang" as "admin" | "gudang" | "packing",
  });

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          window.location.href = "/login";
          return;
        }
        const data = await res.json();
        if (data.user) {
          setCurrentUser(data.user);
          if (data.user.role === "admin") {
            fetchUsers();
          } else {
            window.location.href = "/";
          }
        } else {
          window.location.href = "/login";
        }
      } catch (error) {
        window.location.href = "/login";
      }
    };
    checkAuthAndFetch();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      
      if (Array.isArray(data)) {
        setUsers(data);
      } else {
        console.error("Invalid users data:", data);
        setUsers([]);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      setUsers([]);
    }
  };

  const handleCreateUser = async (e: React.FormEvent | null, formData?: any) => {
    if (e) {
      e.preventDefault();
    }
    setLoading(true);

    try {
      const dataToSubmit = formData || userForm;
      const url = editingUser ? `/api/users/${editingUser.id}` : "/api/users";
      const method = editingUser ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSubmit),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal membuat user");
      }

      setShowUserForm(false);
      setEditingUser(null);
      setUserForm({
        nama: "",
        username: "",
        password: "",
        role: "gudang",
      });
      fetchUsers();
    } catch (error: any) {
      alert(error.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (user: User) => {
    setDeleteModal({ isOpen: true, user });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.user) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/users/${deleteModal.user.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal menghapus user");
      }
      setDeleteModal({ isOpen: false, user: null });
      fetchUsers();
    } catch (error: any) {
      alert(error.message || "Terjadi kesalahan");
    } finally {
      setDeleting(false);
    }
  };

  if (currentUser?.role !== "admin") {
    return (
      <Container>
        <div className="p-6">
          <p>Anda tidak memiliki akses ke halaman ini.</p>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="p-6 space-y-6 relative">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Users</h1>
            <p className="text-muted-foreground">Kelola user sistem</p>
          </div>
          <Button onClick={() => setShowUserForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Tambah User
          </Button>
        </div>

        {/* Users Section */}
        <Card>
          <CardHeader>
            <CardTitle>Daftar User</CardTitle>
            <CardDescription>Kelola user sistem</CardDescription>
          </CardHeader>
          <CardContent>
            {!Array.isArray(users) || users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Belum ada user
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="p-2 text-left text-sm">Nama</th>
                      <th className="p-2 text-left text-sm">Username</th>
                      <th className="p-2 text-left text-sm">Role</th>
                      <th className="p-2 text-left text-sm">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b hover:bg-muted/50">
                        <td className="p-2">{user.nama}</td>
                        <td className="p-2">{user.username}</td>
                        <td className="p-2">
                          <span className="px-2 py-1 rounded text-xs bg-muted">
                            {user.role}
                          </span>
                        </td>
                        <td className="p-2">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingUser(user);
                                setUserForm({
                                  nama: user.nama,
                                  username: user.username,
                                  password: "",
                                  role: user.role,
                                });
                                setShowUserForm(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteClick(user)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sidebar Form */}
        <SidebarForm
          isOpen={showUserForm}
          onClose={() => {
            setShowUserForm(false);
            setEditingUser(null);
            setUserForm({ nama: "", username: "", password: "", role: "gudang" });
          }}
          type="user"
          onSubmit={async (data) => {
            await handleCreateUser(null, data);
          }}
          loading={loading}
          initialData={editingUser ? { userForm } : undefined}
        />

        {/* Delete Confirm Modal */}
        <DeleteConfirmModal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false, user: null })}
          onConfirm={handleDeleteConfirm}
          title="Hapus User"
          description="Apakah Anda yakin ingin menghapus user ini?"
          itemName={deleteModal.user ? `${deleteModal.user.nama} (${deleteModal.user.username})` : undefined}
          loading={deleting}
        />
      </div>
    </Container>
  );
}
