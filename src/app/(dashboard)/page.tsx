"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Container from "@/components/container";
import { ORDER_STATUSES, getStatusColor } from "@/lib/constants";
import type { OrderWithItems, User, PlatformPenjualan, OrderStatus } from "@/types/database";
import Barcode from "react-barcode";
import { getQrUrl } from "@/lib/utils/qr-token";
import { downloadReceipt } from "@/lib/utils/generate-receipt";
import { SidebarForm } from "@/components/sidebar-form";
import { DeleteConfirmModal } from "@/components/delete-confirm-modal";
import { AlertModal } from "@/components/alert-modal";
import { Pagination } from "@/components/pagination";
import { Plus, Search, Download, X, Edit, Trash2, Package, Users, DollarSign, ShoppingCart, FileText, ChevronUp, ChevronDown } from "lucide-react";

export default function DashboardPage() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<OrderWithItems | null>(null);
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
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc"); // desc = terbaru dulu, asc = terlama dulu

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

  const fetchOrders = async (sort?: "desc" | "asc") => {
    setLoading(true);
    try {
      const sortParam = sort ?? sortOrder;
      const res = await fetch(`/api/orders?sort=${sortParam}`);
      
      // Check if response is OK and content type is JSON
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Error fetching orders:", res.status, errorText);
        setOrders([]);
        return;
      }
      
      // Check content type
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        console.error("Invalid response type:", contentType, text.substring(0, 100));
        setOrders([]);
        return;
      }
      
      const data = await res.json();
      
      // Ensure data is always an array
      if (Array.isArray(data)) {
        setOrders(data);
      } else {
        console.error("Invalid orders data:", data);
        setOrders([]);
      }
    } catch (error: any) {
      console.error("Error fetching orders:", error);
      // If error is JSON parse error, show more helpful message
      if (error.message?.includes("JSON") || error.message?.includes("<!DOCTYPE")) {
        console.error("API returned non-JSON response. Check server logs for errors.");
      }
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (!res.ok) {
        setUsers([]);
        return;
      }
      const contentType = res.headers.get("content-type");
      if (!contentType?.includes("application/json")) {
        setUsers([]);
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setUsers(data);
      } else {
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
      setEditingOrder(null);
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

  const handleEditOrder = (order: OrderWithItems) => {
    setEditingOrder(order);
    setShowOrderForm(true);
  };

  const handleUpdateOrder = async (formData: any) => {
    if (!editingOrder) return;
    
    setLoading(true);
    try {
      const dataToSubmit = {
        ...formData,
        total_harga: parseFloat(formData.total_harga),
        order_items: formData.order_items
          .filter((item: any) => item.nama_produk && item.qty && item.harga_satuan)
          .map((item: any) => ({
            nama_produk: item.nama_produk,
            qty: parseInt(item.qty),
            harga_satuan: parseFloat(item.harga_satuan),
          })),
      };

      const res = await fetch(`/api/orders/${editingOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSubmit),
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
        throw new Error(data.error || "Gagal mengupdate order");
      }

      setShowOrderForm(false);
      setEditingOrder(null);
      fetchOrders();
      fetchStats();
      
      // Update selected order if it's the one being edited
      if (selectedOrder?.id === editingOrder.id) {
        setSelectedOrder(data);
      }
    } catch (error: any) {
      // Only show alert for non-duplicate errors
      if (!error.message?.includes("sudah terdaftar")) {
        alert(error.message || "Terjadi kesalahan");
      }
    } finally {
      setLoading(false);
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
      <div className="p-4 tablet:p-6 space-y-4 tablet:space-y-6 relative">
        {/* Header */}
        <div className="flex flex-col gap-4 tablet:flex-row tablet:justify-between tablet:items-center">
          <div>
            <h1 className="text-xl tablet:text-3xl font-bold">Dashboard Admin</h1>
            <p className="text-sm text-muted-foreground">Kelola order dan user</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setShowOrderForm(true)} size="sm" className="flex-1 tablet:flex-none min-w-0">
              <Plus className="h-4 w-4 mr-2 shrink-0" />
              Tambah Order
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-2 tablet:grid-cols-2 laptop:grid-cols-4 gap-3 tablet:gap-4">
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
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-4 tablet:flex-row tablet:justify-between tablet:items-start">
              <div>
                <CardTitle className="text-lg">Daftar Order</CardTitle>
                <CardDescription>Kelola semua order dari marketplace</CardDescription>
              </div>
              <div className="relative w-full tablet:w-auto min-w-0">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Cari order..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-full tablet:w-64"
                />
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
                <div className="overflow-x-auto -mx-4 tablet:mx-0">
                  <table className="w-full min-w-[640px]">
                    <thead>
                      <tr className="border-b">
                        <th className="p-2 text-left text-xs tablet:text-sm whitespace-nowrap">Order ID</th>
                        <th className="p-2 text-left text-xs tablet:text-sm whitespace-nowrap">Pembeli</th>
                        <th className="p-2 text-left text-xs tablet:text-sm whitespace-nowrap">Platform</th>
                        <th className="p-2 text-left text-xs tablet:text-sm whitespace-nowrap">Ekspedisi</th>
                        <th className="p-2 text-left text-xs tablet:text-sm whitespace-nowrap">
                          <span className="inline-flex items-center gap-0.5">
                            Tanggal
                            <span className="inline-flex flex-col ml-0.5">
                              <button
                                type="button"
                                onClick={() => { setSortOrder("asc"); fetchOrders("asc"); }}
                                className={`p-0.5 rounded hover:bg-muted ${sortOrder === "asc" ? "text-foreground bg-muted/50" : "text-muted-foreground"}`}
                                title="Terlama dulu"
                                aria-label="Sortir terlama dulu"
                              >
                                <ChevronUp className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => { setSortOrder("desc"); fetchOrders("desc"); }}
                                className={`p-0.5 rounded hover:bg-muted -mt-0.5 ${sortOrder === "desc" ? "text-foreground bg-muted/50" : "text-muted-foreground"}`}
                                title="Terbaru dulu"
                                aria-label="Sortir terbaru dulu"
                              >
                                <ChevronDown className="h-3.5 w-3.5" />
                              </button>
                            </span>
                          </span>
                        </th>
                        <th className="p-2 text-left text-xs tablet:text-sm whitespace-nowrap">Status</th>
                        <th className="p-2 text-left text-xs tablet:text-sm whitespace-nowrap">Total</th>
                        <th className="p-2 text-left text-xs tablet:text-sm whitespace-nowrap">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedOrders.map((order) => (
                      <tr key={order.id} className="border-b hover:bg-muted/50">
                        <td className="p-2 text-xs tablet:text-sm">{order.order_id_marketplace}</td>
                        <td className="p-2 text-xs tablet:text-sm">{order.nama_pembeli}</td>
                        <td className="p-2 text-xs tablet:text-sm">{order.platform_penjualan}</td>
                        <td className="p-2 text-xs tablet:text-sm">{order.expedisi}</td>
                        <td className="p-2 text-xs tablet:text-sm whitespace-nowrap">{new Date(order.tanggal_pemesanan).toLocaleDateString("id-ID")}</td>
                        <td className="p-2">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusColor(order.status as OrderStatus)}`}>
                            {ORDER_STATUSES[order.status as keyof typeof ORDER_STATUSES] || order.status}
                          </span>
                        </td>
                        <td className="p-2 text-xs tablet:text-sm whitespace-nowrap">Rp {Number(order.total_harga).toLocaleString("id-ID", { maximumFractionDigits: 0 })}</td>
                        <td className="p-2">
                          <div className="flex gap-1 flex-wrap">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedOrder(order)}
                              className="text-xs"
                            >
                              Detail
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditOrder(order)}
                              className="shrink-0"
                            >
                              <Edit className="h-3.5 w-3.5 tablet:h-4 tablet:w-4" />
                            </Button>
                          </div>
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

        {/* Order Detail Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 tablet:p-4 overflow-y-auto">
            <Card className="w-full max-w-4xl max-h-[95vh] overflow-y-auto my-auto">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-lg tablet:text-xl truncate">Detail Order</CardTitle>
                    <CardDescription className="truncate">{selectedOrder.order_id_marketplace}</CardDescription>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedOrder(null)} className="shrink-0">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 tablet:grid-cols-3 gap-3 tablet:gap-4">
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
                      Rp {Number(selectedOrder.total_harga).toLocaleString("id-ID", {maximumFractionDigits: 0, minimumFractionDigits: 0})}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tanggal Pemesanan</p>
                    <p className="font-medium">{new Date(selectedOrder.tanggal_pemesanan).toLocaleDateString("id-ID")}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Ekspedisi</p>
                    <p className="font-medium">{selectedOrder.expedisi}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Resi</p>
                    <p className="font-medium">{selectedOrder.resi || "-"}</p>
                  </div>
                </div>

                {selectedOrder.order_items && selectedOrder.order_items.length > 0 && (
                  <div className="overflow-x-auto">
                    <p className="text-sm font-medium mb-2">Item Order</p>
                    <div className="border rounded-md min-w-[280px]">
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
                                Rp {Number(item.harga_satuan).toLocaleString("id-ID", {maximumFractionDigits: 0, minimumFractionDigits: 0})}
                              </td>
                              <td className="p-2">
                                Rp {Number(item.qty * item.harga_satuan).toLocaleString("id-ID", {maximumFractionDigits: 0, minimumFractionDigits: 0})}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium mb-2">Barcode</p>
                  <div className="flex flex-col tablet:flex-row tablet:items-center gap-3 tablet:gap-4">
                    <div className="bg-white p-2 rounded border inline-block w-fit">
                      <Barcode value={selectedOrder.qr_token} format="CODE128" width={1} height={32} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground mb-2">Kode Barcode:</p>
                      <p className="text-sm font-mono break-all mb-4">{selectedOrder.qr_token}</p>
                      <div className="flex flex-wrap gap-2">
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

                <div className="flex flex-col tablet:flex-row tablet:justify-between tablet:items-start gap-4">
                  <div className="min-w-0 flex-1">
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
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEditOrder(selectedOrder)}
                    className="w-full tablet:w-auto shrink-0"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Order
                  </Button>
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
            setEditingOrder(null);
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
            if (editingOrder) {
              await handleUpdateOrder(data);
            } else {
              await handleCreateOrder(null, data);
            }
          }}
          loading={loading}
          initialData={editingOrder ? {
            orderForm: {
              order_id_marketplace: editingOrder.order_id_marketplace,
              nama_pembeli: editingOrder.nama_pembeli,
              platform_penjualan: editingOrder.platform_penjualan,
              tanggal_pemesanan: editingOrder.tanggal_pemesanan.split("T")[0],
              total_harga: editingOrder.total_harga.toString(),
              resi: editingOrder.resi || "",
              keterangan: editingOrder.keterangan || "",
              expedisi: editingOrder.expedisi,
              order_items: editingOrder.order_items.map(item => ({
                nama_produk: item.nama_produk,
                qty: item.qty.toString(),
                harga_satuan: item.harga_satuan.toString(),
              })),
            }
          } : undefined}
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
