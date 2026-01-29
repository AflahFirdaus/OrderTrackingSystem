"use client";

import { useState, useEffect, useMemo } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { PlatformPenjualan } from "@/types/database";
import { PLATFORMS, EXPEDISI_OPTIONS } from "@/lib/constants";

interface InitialData {
  orderForm?: {
    order_id_marketplace?: string;
    nama_pembeli?: string;
    platform_penjualan?: PlatformPenjualan;
    tanggal_pemesanan?: string;
    total_harga?: string;
    resi?: string;
    keterangan?: string;
    expedisi?: string;
    order_items?: Array<{ nama_produk: string; qty: string; harga_satuan: string }>;
  };
  userForm?: {
    nama?: string;
    username?: string;
    password?: string;
    role?: "admin" | "gudang" | "packing";
  };
}

interface SidebarFormProps {
  isOpen: boolean;
  onClose: () => void;
  type: "order" | "user";
  onSubmit: (data: unknown) => Promise<void>;
  loading?: boolean;
  initialData?: InitialData;
}

export function SidebarForm({
  isOpen,
  onClose,
  type,
  onSubmit,
  loading = false,
  initialData,
}: SidebarFormProps) {
  const [orderForm, setOrderForm] = useState(() => {
    const baseForm = {
      order_id_marketplace: "",
      nama_pembeli: "",
      platform_penjualan: "Shopee" as PlatformPenjualan,
      tanggal_pemesanan: new Date().toISOString().split("T")[0],
      total_harga: "",
      resi: "",
      keterangan: "",
      expedisi: "Reguler",
      order_items: [{ nama_produk: "", qty: "", harga_satuan: "" }],
    };
    
    if (initialData?.orderForm) {
      return {
        ...baseForm,
        ...initialData.orderForm,
        // Ensure expedisi always has a valid value (override if empty from initialData)
        expedisi: (initialData.orderForm.expedisi && initialData.orderForm.expedisi.trim()) 
          ? initialData.orderForm.expedisi 
          : "Reguler",
      };
    }
    
    return baseForm;
  });

  // Update form when initialData changes (for edit mode)
  useEffect(() => {
    if (type === "order" && initialData?.orderForm) {
      setOrderForm({
        order_id_marketplace: initialData.orderForm.order_id_marketplace || "",
        nama_pembeli: initialData.orderForm.nama_pembeli || "",
        platform_penjualan: initialData.orderForm.platform_penjualan || "Shopee",
        tanggal_pemesanan: initialData.orderForm.tanggal_pemesanan || new Date().toISOString().split("T")[0],
        total_harga: initialData.orderForm.total_harga || "",
        resi: initialData.orderForm.resi || "",
        keterangan: initialData.orderForm.keterangan || "",
        expedisi: (initialData.orderForm.expedisi && initialData.orderForm.expedisi.trim()) 
          ? initialData.orderForm.expedisi 
          : "Reguler",
        order_items: initialData.orderForm.order_items && initialData.orderForm.order_items.length > 0
          ? initialData.orderForm.order_items
          : [{ nama_produk: "", qty: "", harga_satuan: "" }],
      });
      setIsTotalManuallyEdited(false);
    } else if (type === "order" && !initialData?.orderForm) {
      // Reset to empty form when not editing
      setOrderForm({
        order_id_marketplace: "",
        nama_pembeli: "",
        platform_penjualan: "Shopee",
        tanggal_pemesanan: new Date().toISOString().split("T")[0],
        total_harga: "",
        resi: "",
        keterangan: "",
        expedisi: "Reguler",
        order_items: [{ nama_produk: "", qty: "", harga_satuan: "" }],
      });
      setIsTotalManuallyEdited(false);
    }
  }, [initialData, type]);

  const [userForm, setUserForm] = useState({
    nama: "",
    username: "",
    password: "",
    role: "gudang" as "admin" | "gudang" | "packing",
    ...(initialData?.userForm || {}),
  });

  // Calculate subtotal from order_items
  const subtotalItems = useMemo(() => {
    if (type !== "order") return 0;
    
    type OrderItemForm = { nama_produk: string; qty: string; harga_satuan: string };
    
    return orderForm.order_items
      .filter((item: OrderItemForm) => item.nama_produk && item.qty && item.harga_satuan)
      .reduce((total: number, item: OrderItemForm) => {
        const qty = parseInt(item.qty) || 0;
        const hargaSatuan = parseFloat(item.harga_satuan) || 0;
        return total + (qty * hargaSatuan);
      }, 0);
  }, [orderForm.order_items, type]);

  // Calculate total: subtotal (no ongkir anymore, total is just subtotal)
  const calculatedTotal = useMemo(() => {
    if (type !== "order") return 0;
    return subtotalItems;
  }, [subtotalItems, type]);

  // Auto-update total_harga when calculatedTotal changes (only if user hasn't manually edited)
  const [isTotalManuallyEdited, setIsTotalManuallyEdited] = useState(false);

  // Reset isTotalManuallyEdited when initialData changes
  useEffect(() => {
    if (type === "order" && initialData?.orderForm) {
      setIsTotalManuallyEdited(false);
    }
  }, [initialData, type]);

  useEffect(() => {
    if (type === "order" && !isTotalManuallyEdited) {
      setOrderForm((prev: typeof orderForm) => ({
        ...prev,
        total_harga: calculatedTotal > 0 ? calculatedTotal.toString() : "",
      }));
    }
  }, [calculatedTotal, type, isTotalManuallyEdited]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (type === "order") {
      type OrderItemForm = { nama_produk: string; qty: string; harga_satuan: string };
      
      const orderItems = orderForm.order_items
        .filter((item: OrderItemForm) => item.nama_produk && item.qty && item.harga_satuan)
        .map((item: OrderItemForm) => ({
          nama_produk: item.nama_produk,
          qty: parseInt(item.qty),
          harga_satuan: parseFloat(item.harga_satuan),
        }));

      // Use manual total if edited, otherwise use calculated total
      const finalTotal = isTotalManuallyEdited && orderForm.total_harga
        ? parseFloat(orderForm.total_harga)
        : calculatedTotal;

      await onSubmit({
        ...orderForm,
        total_harga: finalTotal,
        order_items: orderItems,
      });
    } else {
      await onSubmit(userForm);
    }
  };

  const handleClose = () => {
    // Reset form
    if (type === "order") {
      setOrderForm({
        order_id_marketplace: "",
        nama_pembeli: "",
        platform_penjualan: "Shopee",
        tanggal_pemesanan: new Date().toISOString().split("T")[0],
        total_harga: "",
        resi: "",
        keterangan: "",
        expedisi: "Reguler",
        order_items: [{ nama_produk: "", qty: "", harga_satuan: "" }],
      });
      setIsTotalManuallyEdited(false);
    } else {
      setUserForm({
        nama: "",
        username: "",
        password: "",
        role: "gudang",
      });
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={handleClose}
      />
      
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed right-0 top-0 z-50 h-full w-full max-w-md border-l border-border bg-background shadow-lg transition-transform duration-300 ease-in-out laptop:max-w-lg overflow-y-auto"
        )}
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0)" }}
      >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-lg font-semibold">
            {type === "order" 
              ? (initialData?.orderForm ? "Edit Order" : "Tambah Order")
              : (initialData ? "Edit User" : "Tambah User")
            }
          </h2>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {type === "order" ? (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Order ID Marketplace *</label>
                  <Input
                    value={orderForm.order_id_marketplace}
                    onChange={(e) =>
                      setOrderForm({ ...orderForm, order_id_marketplace: e.target.value })
                    }
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Platform *</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={orderForm.platform_penjualan}
                    onChange={(e) =>
                      setOrderForm({
                        ...orderForm,
                        platform_penjualan: e.target.value as PlatformPenjualan,
                      })
                    }
                    required
                    disabled={loading}
                  >
                    {PLATFORMS.map((platform) => (
                      <option key={platform} value={platform}>
                        {platform}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nama Pembeli *</label>
                  <Input
                    value={orderForm.nama_pembeli}
                    onChange={(e) =>
                      setOrderForm({ ...orderForm, nama_pembeli: e.target.value })
                    }
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tanggal Pemesanan *</label>
                  <Input
                    type="date"
                    value={orderForm.tanggal_pemesanan}
                    onChange={(e) =>
                      setOrderForm({ ...orderForm, tanggal_pemesanan: e.target.value })
                    }
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Total Harga</label>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground mb-1">
                      Subtotal Item: Rp {subtotalItems.toLocaleString("id-ID")}
                    </div>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={orderForm.total_harga}
                      onChange={(e) => {
                        setOrderForm({ ...orderForm, total_harga: e.target.value });
                        setIsTotalManuallyEdited(true);
                      }}
                      onBlur={() => {
                        // If user clears the field, reset to calculated
                        if (!orderForm.total_harga || parseFloat(orderForm.total_harga) === 0) {
                          setIsTotalManuallyEdited(false);
                        }
                      }}
                      disabled={loading}
                      className="font-semibold"
                    />
                    <p className="text-xs text-muted-foreground">
                      {isTotalManuallyEdited 
                        ? "Total harga diubah manual. Kosongkan untuk kembali ke kalkulasi otomatis."
                        : "Total harga dihitung otomatis dari subtotal item. Bisa diedit manual jika perlu."}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Resi (Opsional)</label>
                  <Input
                    value={orderForm.resi}
                    onChange={(e) =>
                      setOrderForm({ ...orderForm, resi: e.target.value })
                    }
                    placeholder="Nomor resi pengiriman"
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Nomor resi dapat diisi nanti atau di-scan melalui halaman Packing
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Ekspedisi *</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={orderForm.expedisi || "Reguler"}
                    onChange={(e) =>
                      setOrderForm({ ...orderForm, expedisi: e.target.value })
                    }
                    required
                    disabled={loading}
                  >
                    {EXPEDISI_OPTIONS.map((expedisi) => (
                      <option key={expedisi} value={expedisi}>
                        {expedisi}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Keterangan</label>
                  <Input
                    value={orderForm.keterangan}
                    onChange={(e) =>
                      setOrderForm({ ...orderForm, keterangan: e.target.value })
                    }
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Item Order</label>
                  {orderForm.order_items.map((item: { nama_produk: string; qty: string; harga_satuan: string }, index: number) => {
                    const qty = parseInt(item.qty) || 0;
                    const hargaSatuan = parseFloat(item.harga_satuan) || 0;
                    const subtotal = qty * hargaSatuan;
                    
                    return (
                      <div key={index} className="space-y-2 p-3 border rounded-md">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Nama Produk"
                            value={item.nama_produk}
                            onChange={(e) => {
                              const newItems = [...orderForm.order_items];
                              newItems[index].nama_produk = e.target.value;
                              setOrderForm({ ...orderForm, order_items: newItems });
                            }}
                            disabled={loading}
                            className="flex-1"
                          />
                          <Input
                            placeholder="Qty"
                            type="number"
                            min="1"
                            value={item.qty}
                            onChange={(e) => {
                              const newItems = [...orderForm.order_items];
                              newItems[index].qty = e.target.value;
                              setOrderForm({ ...orderForm, order_items: newItems });
                            }}
                            disabled={loading}
                            className="w-20"
                          />
                          <Input
                            placeholder="Harga Satuan"
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.harga_satuan}
                            onChange={(e) => {
                              const newItems = [...orderForm.order_items];
                              newItems[index].harga_satuan = e.target.value;
                              setOrderForm({ ...orderForm, order_items: newItems });
                            }}
                            disabled={loading}
                            className="w-32"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            onClick={() => {
                              const newItems = orderForm.order_items.filter((_: { nama_produk: string; qty: string; harga_satuan: string }, i: number) => i !== index);
                              setOrderForm({ ...orderForm, order_items: newItems });
                            }}
                            disabled={loading || orderForm.order_items.length === 1}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        {item.nama_produk && item.qty && item.harga_satuan && (
                          <div className="text-xs text-muted-foreground pl-1">
                            Subtotal: Rp {subtotal.toLocaleString("id-ID")}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setOrderForm({
                        ...orderForm,
                        order_items: [
                          ...orderForm.order_items,
                          { nama_produk: "", qty: "", harga_satuan: "" },
                        ],
                      });
                    }}
                    disabled={loading}
                  >
                    Tambah Item
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nama *</label>
                  <Input
                    value={userForm.nama}
                    onChange={(e) => setUserForm({ ...userForm, nama: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Username *</label>
                  <Input
                    value={userForm.username}
                    onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Password {initialData ? "(kosongkan jika tidak diubah)" : "*"}
                  </label>
                  <Input
                    type="password"
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    required={!initialData}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Role *</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={userForm.role}
                    onChange={(e) =>
                      setUserForm({
                        ...userForm,
                        role: e.target.value as "admin" | "gudang" | "packing",
                      })
                    }
                    required
                    disabled={loading}
                  >
                    <option value="admin">Admin</option>
                    <option value="gudang">Gudang</option>
                    <option value="packing">Packing</option>
                  </select>
                </div>
              </>
            )}

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading 
                  ? "Menyimpan..." 
                  : type === "order" 
                    ? (initialData?.orderForm ? "Update Order" : "Simpan Order")
                    : (initialData ? "Update User" : "Simpan User")
                }
              </Button>
              <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
                Batal
              </Button>
            </div>
          </form>
        </div>
      </div>
    </aside>
    </>
  );
}
