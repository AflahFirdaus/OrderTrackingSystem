"use client";

import { AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: "error" | "warning" | "info";
}

export function AlertModal({
  isOpen,
  onClose,
  title,
  message,
  type = "error",
}: AlertModalProps) {
  if (!isOpen) return null;

  const bgColor =
    type === "error"
      ? "bg-destructive/10 border-destructive/20"
      : type === "warning"
      ? "bg-yellow-500/10 border-yellow-500/20"
      : "bg-blue-500/10 border-blue-500/20";

  const textColor =
    type === "error"
      ? "text-destructive"
      : type === "warning"
      ? "text-yellow-600 dark:text-yellow-400"
      : "text-blue-600 dark:text-blue-400";

  const iconColor =
    type === "error"
      ? "text-destructive"
      : type === "warning"
      ? "text-yellow-600 dark:text-yellow-400"
      : "text-blue-600 dark:text-blue-400";

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
              <div className={`flex h-12 w-12 items-center justify-center rounded-full ${bgColor}`}>
                <AlertCircle className={`h-6 w-6 ${iconColor}`} />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <CardTitle className={`text-xl ${textColor}`}>{title}</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-6 w-6"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={`rounded-lg ${bgColor} border p-4`}>
            <p className={`text-sm ${textColor} font-medium leading-relaxed`}>{message}</p>
          </div>
          <div className="flex justify-end pt-2">
            <Button
              onClick={onClose}
              variant={type === "error" ? "destructive" : type === "warning" ? "default" : "default"}
              className="min-w-[100px]"
            >
              Tutup
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
