"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ORDER_STATUSES } from "@/lib/constants";
import type { OrderWithItems } from "@/types/database";

export default function ScanTokenPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const [order, setOrder] = useState<OrderWithItems | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [user, setUser] = useState<any>(null);
  const [canProcess, setCanProcess] = useState(false);
  const [nextStatus, setNextStatus] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      fetchOrder();
    }
  }, [token]);

  const fetchOrder = async () => {
    setLoading(true);
    setError("");
    setSuccess("");

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
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async () => {
    if (!token || !canProcess) return;

    setLoading(true);
    setError("");
    setSuccess("");

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
    } finally {
      setLoading(false);
    }
  };

  if (loading && !order) {
    return (
      <div className="container mx-auto p-6">
        <p>Memuat data order...</p>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive">{error}</p>
            <Button onClick={() => router.push("/scan")} className="mt-4">
              Kembali ke Scan
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!order) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Detail Order</CardTitle>
          <CardDescription>{order.order_id_marketplace}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400">
              {success}
            </div>
          )}

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
              <p className="font-medium">
                {ORDER_STATUSES[order.status as keyof typeof ORDER_STATUSES]}
              </p>
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
              <Button onClick={handleProcess} disabled={loading} className="w-full">
                {loading
                  ? "Memproses..."
                  : `Proses ${user?.role === "gudang" ? "Gudang" : "Packing"}`}
              </Button>
              <p className="text-sm text-muted-foreground mt-2">
                Status akan berubah menjadi:{" "}
                {ORDER_STATUSES[nextStatus as keyof typeof ORDER_STATUSES]}
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
    </div>
  );
}
