"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertModal } from "@/components/alert-modal";
import { ORDER_STATUSES } from "@/lib/constants";
import type { OrderWithItems } from "@/types/database";

export default function ScanPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [order, setOrder] = useState<OrderWithItems | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [warning, setWarning] = useState("");
  const [user, setUser] = useState<any>(null);
  const [canProcess, setCanProcess] = useState(false);
  const [nextStatus, setNextStatus] = useState<string | null>(null);
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({ isOpen: false, title: "", message: "" });

  useEffect(() => {
    // Get user info
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
        }
      })
      .catch(() => {
        router.push("/login");
      });
  }, [router]);


  const handleProcess = async () => {
    if (!token || !canProcess) return;

    setLoading(true);
    setError("");
    setSuccess("");
    setWarning("");

    try {
      const response = await fetch(`/api/scan/${token}`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Gagal memproses order");
      }

      setSuccess(data.message || "Order berhasil diproses");
      setOrder(data.order);
      setCanProcess(false);
      setNextStatus(null);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan");
      // Show beautiful alert modal for specific gudang error
      if (err.message?.includes("Orderan telah di proses gudang") || err.message?.includes("sudah pernah diproses") || err.message?.includes("DITERIMA_GUDANG") || err.message?.includes("PACKING") || err.message?.includes("DIKIRIM") || err.message?.includes("SELESAI")) {
        setAlertModal({
          isOpen: true,
          title: "Orderan Telah Di Proses",
          message: "Orderan telah di proses gudang. Tidak dapat diproses ulang.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    if (!token) return;
    
    setLoading(true);
    setError("");
    setSuccess("");
    setWarning("");
    setOrder(null);

    try {
      const response = await fetch(`/api/scan/${token}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Gagal memproses scan");
      }

      setOrder(data.order);
      setUser(data.user);
      setCanProcess(data.canProcess);
      setNextStatus(data.nextStatus);
      
      // Show warning if order already processed
      if (data.warningMessage) {
        setWarning(data.warningMessage);
        // Show beautiful alert modal for gudang trying to scan already processed order
        if (data.user?.role === "gudang" && data.order?.status !== "DIBUAT") {
          if (data.order?.status === "DITERIMA_GUDANG" || data.order?.status === "PACKING" || data.order?.status === "DIKIRIM" || data.order?.status === "SELESAI" || data.order?.status === "DIBATALKAN") {
            setAlertModal({
              isOpen: true,
              title: "Orderan Telah Di Proses",
              message: "Orderan telah di proses gudang. Tidak dapat diproses ulang.",
            });
          }
        }
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan");
      // Show beautiful alert modal for specific gudang error
      if (err.message?.includes("Orderan telah di proses gudang") || err.message?.includes("sudah pernah diproses") || err.message?.includes("DITERIMA_GUDANG") || err.message?.includes("PACKING") || err.message?.includes("DIKIRIM") || err.message?.includes("SELESAI")) {
        setAlertModal({
          isOpen: true,
          title: "Orderan Telah Di Proses",
          message: "Orderan telah di proses gudang. Tidak dapat diproses ulang.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Scan Barcode</h1>
        <p className="text-muted-foreground">
          Scan barcode order (scanner fisik) atau ketik kode barcode untuk melihat detail dan memproses
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Input Kode Barcode</CardTitle>
          <CardDescription>
            Arahkan scanner barcode ke kolom ini lalu scan, atau ketik manual kode barcode order
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleScan} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            {warning && (
              <div className="rounded-md bg-yellow-500/10 p-3 text-sm text-yellow-600 dark:text-yellow-400 border border-yellow-500/20">
                ⚠️ {warning}
              </div>
            )}
            {success && (
              <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400">
                {success}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Kode barcode (scan atau ketik)"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                disabled={loading}
                className="flex-1"
                autoFocus
              />
              <Button type="submit" disabled={loading || !token}>
                {loading ? "Memproses..." : "Cari"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {order && (
        <Card>
          <CardHeader>
            <CardTitle>Detail Order</CardTitle>
            <CardDescription>Informasi lengkap order</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Order ID Marketplace</p>
                <p className="font-medium">{order.order_id_marketplace}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Platform</p>
                <p className="font-medium">{order.platform_penjualan}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nama Pembeli</p>
                <p className="font-medium">{order.nama_pembeli}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-medium">{ORDER_STATUSES[order.status as keyof typeof ORDER_STATUSES]}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tanggal Pemesanan</p>
                <p className="font-medium">
                  {new Date(order.tanggal_pemesanan).toLocaleDateString("id-ID")}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Harga</p>
                <p className="font-medium">
                  Rp {order.total_harga.toLocaleString("id-ID")}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ekspedisi</p>
                <p className="font-medium">{order.expedisi}</p>
              </div>
              {order.keterangan && (
                <div>
                  <p className="text-sm text-muted-foreground">Keterangan</p>
                  <p className="font-medium">{order.keterangan}</p>
                </div>
              )}
            </div>

            {order.order_items && order.order_items.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Item Order</p>
                <div className="border rounded-md">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-2 text-left text-sm">Produk</th>
                        <th className="p-2 text-left text-sm">Qty</th>
                        <th className="p-2 text-left text-sm">Harga Satuan</th>
                        <th className="p-2 text-left text-sm">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.order_items.map((item) => (
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

            {canProcess && nextStatus && (
              <div className="pt-4 border-t">
                <Button
                  onClick={handleProcess}
                  disabled={loading}
                  className="w-full"
                >
                  {loading
                    ? "Memproses..."
                    : `Proses ${user?.role === "gudang" ? "Gudang" : "Packing"}`}
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  Status akan berubah menjadi: {ORDER_STATUSES[nextStatus as keyof typeof ORDER_STATUSES]}
                </p>
              </div>
            )}

            {!canProcess && order.status !== "SELESAI" && order.status !== "DIBATALKAN" && (
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Order ini tidak dapat diproses oleh role Anda saat ini.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Alert Modal for Gudang Processed Order */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ isOpen: false, title: "", message: "" })}
        title={alertModal.title}
        message={alertModal.message}
        type="warning"
      />
    </div>
  );
}
