"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Container from "@/components/container";
import { ORDER_STATUSES, getStatusColor } from "@/lib/constants";
import type { OrderWithItems, User, PlatformPenjualan, OrderStatus } from "@/types/database";
import { QRCodeSVG } from "qrcode.react";
import { getQrUrl } from "@/lib/utils/qr-token";
import { downloadReceipt } from "@/lib/utils/generate-receipt";
import { SidebarForm } from "@/components/sidebar-form";
import { DeleteConfirmModal } from "@/components/delete-confirm-modal";
import { AlertModal } from "@/components/alert-modal";
import { Pagination } from "@/components/pagination";
import { Plus, Search, Download, X, Edit, Trash2, Package, Users, DollarSign, ShoppingCart, FileText } from "lucide-react";

export default function DashboardPage() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    user: User | null;
  }>({ isOpen: false, user: null });
  const [deleting, setDeleting] = useState(false);
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({ isOpen: false, title: "", message: "" });
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalUsers: 0,
    totalOrderItems: 0,
    totalRevenue: 0,
  });

  // Order form state
  const [orderForm, setOrderForm] = useState({
    order_id_marketplace: "",
    nama_pembeli: "",
    platform_penjualan: "Shopee" as PlatformPenjualan,
    tanggal_pemesanan: new Date().toISOString().split("T")[0],
    total_harga: "",
    keterangan: "",
    expedisi: "Reguler",
    order_items: [{ nama_produk: "", qty: "", harga_satuan: "" }],
  });

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
          // Only fetch data if authenticated
          fetchOrders();
          fetchUsers();
          fetchStats();
        } else {
          window.location.href = "/login";
        }
      } catch (error) {
        window.location.href = "/login";
      }
    };
    checkAuthAndFetch();
  }, []);

  const _fetchCurrentUser = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.user) {
        setCurrentUser(data.user);
      }
    } catch (error) {
      console.error("Error fetching user:", error);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();
      
      // Ensure data is always an array
      if (Array.isArray(data)) {
        setOrders(data);
      } else {
        console.error("Invalid orders data:", data);
        setOrders([]);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      
      // Ensure data is always an array
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

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/stats");
      const data = await res.json();
      if (data) {
        setStats({
          totalOrders: data.totalOrders || 0,
          totalUsers: data.totalUsers || 0,
          totalOrderItems: data.totalOrderItems || 0,
          totalRevenue: data.totalRevenue || 0,
        });
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent | null, formData?: any) => {
    if (e) {
      e.preventDefault();
    }
    setLoading(true);

    try {
      const dataToSubmit = formData || {
        ...orderForm,
        total_harga: parseFloat(orderForm.total_harga),
        order_items: orderForm.order_items
          .filter((item) => item.nama_produk && item.qty && item.harga_satuan)
          .map((item) => ({
            nama_produk: item.nama_produk,
            qty: parseInt(item.qty),
            harga_satuan: parseFloat(item.harga_satuan),
          })),
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...dataToSubmit,
          created_by: currentUser?.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Handle duplicate order error with beautiful alert
        if (res.status === 409) {
          const errorMessage = data.details || `Order ID "${dataToSubmit.order_id_marketplace}" sudah terdaftar dalam sistem. Silakan gunakan Order ID yang berbeda.`;
          setAlertModal({
            isOpen: true,
            title: "Order ID Sudah Terdaftar",
            message: errorMessage,
          });
          return;
        }
        throw new Error(data.error || "Gagal membuat order");
      }

      setShowOrderForm(false);
      setOrderForm({
        order_id_marketplace: "",
        nama_pembeli: "",
        platform_penjualan: "Shopee",
        tanggal_pemesanan: new Date().toISOString().split("T")[0],
        total_harga: "",
        keterangan: "",
        expedisi: "Reguler",
        order_items: [{ nama_produk: "", qty: "", harga_satuan: "" }],
      });
      fetchOrders();
      fetchStats();
    } catch (error: any) {
      // Only show alert for non-duplicate errors
      if (!error.message?.includes("sudah terdaftar")) {
        alert(error.message || "Terjadi kesalahan");
      }
    } finally {
      setLoading(false);
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
      fetchStats();
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
      fetchStats();
    } catch (error: any) {
      alert(error.message || "Terjadi kesalahan");
    } finally {
      setDeleting(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) throw new Error("Gagal mengupdate status");
      fetchOrders();
      if (selectedOrder?.id === orderId) {
        const data = await res.json();
        setSelectedOrder(data);
      }
    } catch (error: any) {
      alert(error.message || "Terjadi kesalahan");
    }
  };

  // Filter orders based on search term
  const filteredOrders = useMemo(() => {
    return Array.isArray(orders)
      ? orders.filter(
          (order) =>
            order?.order_id_marketplace?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order?.nama_pembeli?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : [];
  }, [orders, searchTerm]);

  // Paginate filtered orders
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredOrders.slice(startIndex, endIndex);
  }, [filteredOrders, currentPage, itemsPerPage]);

  // Calculate total pages
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

  // Reset to page 1 when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

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
            <h1 className="text-3xl font-bold">Dashboard Admin</h1>
            <p className="text-muted-foreground">Kelola order dan user</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowOrderForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Order
            </Button>
            <Button onClick={() => setShowUserForm(true)} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Tambah User
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Order</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOrders}</div>
              <p className="text-xs text-muted-foreground">Semua order</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total User</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">User terdaftar</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Item</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOrderItems}</div>
              <p className="text-xs text-muted-foreground">Item order</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                Rp {stats.totalRevenue.toLocaleString("id-ID")}
              </div>
              <p className="text-xs text-muted-foreground">Total keuntungan</p>
            </CardContent>
          </Card>
        </div>

        {/* Orders Section */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Daftar Order</CardTitle>
                <CardDescription>Kelola semua order dari marketplace</CardDescription>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari order..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 w-64"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Memuat data...
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? "Tidak ada order yang sesuai dengan pencarian" : "Belum ada order"}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="p-2 text-left text-sm">Order ID</th>
                        <th className="p-2 text-left text-sm">Pembeli</th>
                        <th className="p-2 text-left text-sm">Platform</th>
                        <th className="p-2 text-left text-sm">Ekspedisi</th>
                        <th className="p-2 text-left text-sm">Status</th>
                        <th className="p-2 text-left text-sm">Total</th>
                        <th className="p-2 text-left text-sm">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedOrders.map((order) => (
                      <tr key={order.id} className="border-b hover:bg-muted/50">
                        <td className="p-2">{order.order_id_marketplace}</td>
                        <td className="p-2">{order.nama_pembeli}</td>
                        <td className="p-2">{order.platform_penjualan}</td>
                        <td className="p-2">{order.expedisi}</td>
                        <td className="p-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(order.status as OrderStatus)}`}>
                            {ORDER_STATUSES[order.status as keyof typeof ORDER_STATUSES] || order.status}
                          </span>
                        </td>
                        <td className="p-2">
                          Rp {order.total_harga.toLocaleString("id-ID")}
                        </td>
                        <td className="p-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedOrder(order)}
                          >
                            Detail
                          </Button>
                        </td>
                      </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredOrders.length > itemsPerPage && (
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    itemsPerPage={itemsPerPage}
                    totalItems={filteredOrders.length}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>

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
                        <td className="p-2">{user.role}</td>
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

        {/* Order Detail Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Detail Order</CardTitle>
                    <CardDescription>{selectedOrder.order_id_marketplace}</CardDescription>
                  </div>
                  <Button variant="ghost" onClick={() => setSelectedOrder(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Nama Pembeli</p>
                    <p className="font-medium">{selectedOrder.nama_pembeli}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Platform</p>
                    <p className="font-medium">{selectedOrder.platform_penjualan}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className="font-medium">{ORDER_STATUSES[selectedOrder.status]}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Harga</p>
                    <p className="font-medium">
                      Rp {selectedOrder.total_harga.toLocaleString("id-ID")}
                    </p>
                  </div>
                </div>

                {selectedOrder.order_items && selectedOrder.order_items.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Item Order</p>
                    <div className="border rounded-md">
                      <table className="w-full">
                        <thead className="bg-muted">
                          <tr>
                            <th className="p-2 text-left text-sm">Produk</th>
                            <th className="p-2 text-left text-sm">Qty</th>
                            <th className="p-2 text-left text-sm">Harga</th>
                            <th className="p-2 text-left text-sm">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedOrder.order_items.map((item) => (
                            <tr key={item.id} className="border-t">
                              <td className="p-2">{item.nama_produk}</td>
                              <td className="p-2">{item.qty}</td>
                              <td className="p-2">
                                Rp {item.harga_satuan.toLocaleString("id-ID")}
                              </td>
                              <td className="p-2">
                                Rp {(item.qty * item.harga_satuan).toLocaleString("id-ID")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium mb-2">QR Code</p>
                  <div className="flex items-center gap-4">
                    <QRCodeSVG value={getQrUrl(selectedOrder.qr_token)} size={200} />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-2">QR Token:</p>
                      <p className="text-sm font-mono break-all mb-4">{selectedOrder.qr_token}</p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            window.open(getQrUrl(selectedOrder.qr_token), "_blank");
                          }}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Buka Link QR
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={async () => {
                            try {
                              await downloadReceipt(selectedOrder);
                            } catch (error) {
                              console.error("Error downloading receipt:", error);
                            }
                          }}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Download Struk
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Update Status</p>
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries(ORDER_STATUSES).map(([status, label]) => (
                      <Button
                        key={status}
                        size="sm"
                        variant={
                          selectedOrder.status === status ? "default" : "outline"
                        }
                        onClick={() => handleUpdateOrderStatus(selectedOrder.id, status as OrderStatus)}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Sidebar Forms */}
        <SidebarForm
          isOpen={showOrderForm}
          onClose={() => {
            setShowOrderForm(false);
            setOrderForm({
              order_id_marketplace: "",
              nama_pembeli: "",
              platform_penjualan: "Shopee",
              tanggal_pemesanan: new Date().toISOString().split("T")[0],
              total_harga: "",
              keterangan: "",
              expedisi: "Reguler",
              order_items: [{ nama_produk: "", qty: "", harga_satuan: "" }],
            });
          }}
          type="order"
          onSubmit={async (data) => {
            await handleCreateOrder(null, data);
          }}
          loading={loading}
        />

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

        {/* Alert Modal for Duplicate Order */}
        <AlertModal
          isOpen={alertModal.isOpen}
          onClose={() => setAlertModal({ isOpen: false, title: "", message: "" })}
          title={alertModal.title}
          message={alertModal.message}
          type="error"
        />
      </div>
    </Container>
  );
}
