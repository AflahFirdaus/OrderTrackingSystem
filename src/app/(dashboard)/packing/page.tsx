"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Container from "@/components/container";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { ORDER_STATUSES } from "@/lib/constants";
import type { OrderWithItems } from "@/types/database";
import { Camera, PackageCheck } from "lucide-react";

export default function PackingPage() {
  const router = useRouter();
  const [resi, setResi] = useState("");
  const [order, setOrder] = useState<OrderWithItems | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    // Check if user is admin
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          router.push("/login");
          return;
        }
        const data = await res.json();
        if (data.user) {
          setCurrentUser(data.user);
          if (data.user.role !== "admin") {
            router.push("/");
            return;
          }
        } else {
          router.push("/login");
        }
      } catch (error) {
        router.push("/login");
      }
    };
    checkAuth();
  }, [router]);

  const processResi = async (resiToProcess: string) => {
    if (!resiToProcess || !resiToProcess.trim()) {
      setError("Resi tidak boleh kosong");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");
    setOrder(null);

    try {
      // First, check if order exists (GET request)
      const checkResponse = await fetch(`/api/scan/resi/${encodeURIComponent(resiToProcess.trim())}`);
      const checkData = await checkResponse.json();

      if (!checkResponse.ok) {
        throw new Error(checkData.error || "Resi tidak ditemukan");
      }

      // If order exists and can be processed, update status to PACKING (POST request)
      const updateResponse = await fetch(`/api/scan/resi/${encodeURIComponent(resiToProcess.trim())}`, {
        method: "POST",
      });
      const updateData = await updateResponse.json();

      if (!updateResponse.ok) {
        throw new Error(updateData.error || "Gagal mengupdate status order");
      }

      setOrder(updateData.order);
      setSuccess(updateData.message || "Order berhasil diproses. Status diubah menjadi PACKING.");
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  const handleScanSuccess = async (scannedResi: string) => {
    setShowScanner(false);
    setResi(scannedResi);
    await processResi(scannedResi);
  };

  const handleScan = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    if (!resi || !resi.trim()) {
      setError("Resi tidak boleh kosong");
      return;
    }
    
    await processResi(resi);
  };

  if (currentUser?.role !== "admin") {
    return (
      <Container>
        <div className="p-4 tablet:p-6">
          <p>Anda tidak memiliki akses ke halaman ini.</p>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="p-4 tablet:p-6 space-y-4 tablet:space-y-6 relative">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          Packing via Scan Resi
        </h1>
        <p className="text-muted-foreground">
          Scan barcode resi dengan kamera atau ketik nomor resi untuk mengubah status order menjadi PACKING
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Input Resi</CardTitle>
          <CardDescription>
            Buka kamera untuk scan barcode resi atau ketik manual nomor resi
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleScan} className="space-y-4">
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
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Nomor resi (scan atau ketik)"
                value={resi}
                onChange={(e) => setResi(e.target.value)}
                disabled={loading}
                className="flex-1"
                autoFocus
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowScanner(true)}
                disabled={loading}
                title="Buka Kamera untuk Scan Barcode Resi"
              >
                <Camera className="h-4 w-4" />
              </Button>
              <Button type="submit" disabled={loading || !resi.trim()}>
                {loading ? "Memproses..." : "Proses Resi"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {order && (
        <Card>
          <CardHeader>
            <CardTitle>Detail Order</CardTitle>
            <CardDescription>Order berhasil diproses - Status: PACKING</CardDescription>
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
                <p className="font-medium">
                  <span className="px-2 py-1 rounded text-sm bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                    {ORDER_STATUSES[order.status as keyof typeof ORDER_STATUSES]}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Resi</p>
                <p className="font-medium">{order.resi || "-"}</p>
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

            <div className="pt-4 border-t">
              <Button
                onClick={() => {
                  setResi("");
                  setOrder(null);
                  setError("");
                  setSuccess("");
                }}
                variant="outline"
                className="w-full"
              >
                Scan Resi Lain
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {showScanner && (
        <BarcodeScanner
          onScanSuccess={handleScanSuccess}
          onClose={() => setShowScanner(false)}
        />
      )}
      </div>
    </Container>
  );
}
