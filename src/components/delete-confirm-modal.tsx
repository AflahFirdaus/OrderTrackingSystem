"use client";

import { X, AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  itemName?: string;
  loading?: boolean;
}

export function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  itemName,
  loading = false,
}: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in-0"
      onClick={handleBackdropClick}
    >
      <Card className="w-full max-w-md shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4">
        <CardHeader className="pb-4">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">{title}</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  disabled={loading}
                  className="h-6 w-6"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription className="mt-2 text-base">
                {description}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {itemName && (
            <div className="rounded-lg bg-muted/50 p-3 border border-destructive/20">
              <p className="text-sm font-medium text-foreground">{itemName}</p>
            </div>
          )}
          <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-3">
            <p className="text-sm text-destructive">
              <strong>Peringatan:</strong> Tindakan ini tidak dapat dibatalkan. Data akan dihapus secara permanen.
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Menghapus...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Hapus
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
