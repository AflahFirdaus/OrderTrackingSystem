"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Container from "@/components/container";
import { ORDER_STATUSES, getStatusColor } from "@/lib/constants";
import type { OrderWithItems, User, OrderStatus } from "@/types/database";
import { QRCodeSVG } from "qrcode.react";
import { getQrUrl } from "@/lib/utils/qr-token";
import { downloadReceipt } from "@/lib/utils/generate-receipt";
import { SidebarForm } from "@/components/sidebar-form";
import { AlertModal } from "@/components/alert-modal";
import { Pagination } from "@/components/pagination";
import { Plus, Search, Download, X, FileText } from "lucide-react";

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({ isOpen: false, title: "", message: "" });

  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  

  // Order form state
  const [orderForm, setOrderForm] = useState({
    order_id_marketplace: "",
    nama_pembeli: "",
    platform_penjualan: "Shopee" as "Shopee" | "Tokopedia" | "Blibli",
    tanggal_pemesanan: new Date().toISOString().split("T")[0],
    total_harga: "",
    keterangan: "",
    expedisi: "Reguler",
    order_items: [{ nama_produk: "", qty: "", harga_satuan: "" }],
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
            fetchOrders();
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

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();
      
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
    } catch (error: any) {
      alert(error.message || "Terjadi kesalahan");
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

  const filteredOrders = useMemo(() => {
    if (!Array.isArray(orders)) return [];
  
    return orders.filter((order) => {
      // 🔍 Search
      const matchesSearch =
        order?.order_id_marketplace
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        order?.nama_pembeli
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase());
  
      // 📌 Status
      const matchesStatus =
        selectedStatus === "all" || order?.status === selectedStatus;
  
      // 📅 Tanggal
      const orderDate = order?.created_at
        ? new Date(order.created_at)
        : null;
  
      const matchesStartDate =
        !startDate || (orderDate && orderDate >= new Date(startDate));
  
      const matchesEndDate =
        !endDate || (orderDate && orderDate <= new Date(endDate));
  
      return (
        matchesSearch &&
        matchesStatus &&
        matchesStartDate &&
        matchesEndDate
      );
    });
  }, [orders, searchTerm, selectedStatus, startDate, endDate]);  

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
            <h1 className="text-3xl font-bold">Orders</h1>
            <p className="text-muted-foreground">Kelola semua order dari marketplace</p>
          </div>
          <Button onClick={() => setShowOrderForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Tambah Order
          </Button>
        </div>

        {/* Orders Section */}
        <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            {/* KIRI */}
            <div>
              <CardTitle>Daftar Order</CardTitle>
              <CardDescription>Kelola semua order dari marketplace</CardDescription>
            </div>

            {/* KANAN: Filter + Search */}
            <div className="flex gap-2 items-center">
              {/* Filter Status */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="all">Semua Status</option>
                {Object.entries(ORDER_STATUSES).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>

              {/* Filter Tanggal */}
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-36"
              />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-36"
              />

              {/* Search */}
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
                        <th className="p-2 text-left text-sm">Tanggal Pemesanan</th>
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
                        <td className="p-2">{new Date(order.tanggal_pemesanan).toLocaleDateString("id-ID")}</td>
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
                    <p className="text-sm text-muted-foreground">Resi</p>
                    <p className="font-medium">{selectedOrder.resi || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Harga</p>
                    <p className="font-medium">
                      Rp {selectedOrder.total_harga.toLocaleString("id-ID")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Ekspedisi</p>
                    <p className="font-medium">{selectedOrder.expedisi}</p>
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

        {/* Sidebar Form */}
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
