"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScanSuccess, onClose }: QRScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string>("");
  const [isScanning, setIsScanning] = useState(false);
  const scannerIdRef = useRef<string>(`qr-reader-${Date.now()}-${Math.random()}`);
  const onScanSuccessRef = useRef(onScanSuccess);
  const onCloseRef = useRef(onClose);
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update refs when callbacks change
  useEffect(() => {
    onScanSuccessRef.current = onScanSuccess;
    onCloseRef.current = onClose;
  }, [onScanSuccess, onClose]);

  // Handle scan success without causing re-renders
  const handleScanSuccess = useCallback((decodedText: string) => {
    // Extract token from URL if it's a full URL
    let token = decodedText;
    
    // If it's a URL like https://domain.com/scan/{token}, extract the token
    const urlMatch = decodedText.match(/\/scan\/([^\/]+)/);
    if (urlMatch) {
      token = urlMatch[1];
    }
    
    // Stop scanning before calling callback
    if (scannerRef.current) {
      try {
        scannerRef.current.clear().catch(() => {
          // Ignore errors during cleanup
        });
      } catch (e) {
        // Ignore errors
      }
      scannerRef.current = null;
    }
    
    setIsScanning(false);
    // Use ref to avoid dependency issues
    onScanSuccessRef.current(token);
  }, []);

  useEffect(() => {
    // Only initialize once when component mounts
    const container = containerRef.current;
    if (!container || scannerRef.current) {
      return;
    }

    // Clear any existing content
    container.innerHTML = "";

    // Create unique ID for this scanner instance
    const uniqueId = scannerIdRef.current;
    const scannerElement = document.createElement("div");
    scannerElement.id = uniqueId;
    container.appendChild(scannerElement);

    setIsScanning(true);
    setError("");

    let scanner: Html5QrcodeScanner | null = null;
    let isCleanedUp = false;
    let isInitialized = false;

    // Small delay to ensure DOM is ready
    const initTimeout = setTimeout(() => {
      if (isCleanedUp) return;

      try {
        scanner = new Html5QrcodeScanner(
          uniqueId,
          {
            qrbox: {
              width: 250,
              height: 250,
            },
            fps: 10,
            aspectRatio: 1.0,
          },
          false // verbose
        );

        scanner.render(
          handleScanSuccess,
          (errorMessage) => {
            // Ignore scanning errors, just keep trying
            if (errorMessage && !errorMessage.includes("NotFoundException")) {
              setError(errorMessage);
            }
          }
        );

        scannerRef.current = scanner;
        isInitialized = true;
        
        // Give video stream time to start before allowing cleanup
        setTimeout(() => {
          // Video stream should be ready now
        }, 500);
      } catch (err) {
        console.error("Error initializing scanner:", err);
        setIsScanning(false);
        if (scanner) {
          try {
            scanner.clear().catch(() => {});
          } catch (e) {
            // Ignore
          }
        }
      }
    }, 150);

    return () => {
      isCleanedUp = true;
      clearTimeout(initTimeout);

      // Clear any pending cleanup timeout
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
        cleanupTimeoutRef.current = null;
      }

      // Only cleanup if scanner was initialized and enough time has passed
      if (isInitialized && scannerRef.current) {
        // Wait longer to ensure video stream has started
        cleanupTimeoutRef.current = setTimeout(() => {
          if (scannerRef.current) {
            try {
              // Stop video stream first
              const videoElement = container?.querySelector('video');
              if (videoElement) {
                videoElement.pause();
                videoElement.srcObject = null;
              }
              
              scannerRef.current.clear().catch(() => {
                // Ignore errors during cleanup
              });
            } catch (e) {
              // Ignore errors if scanner already cleared
            }
            scannerRef.current = null;
          }
          
          // Clear container safely after scanner cleanup
          setTimeout(() => {
            const currentContainer = containerRef.current;
            if (currentContainer) {
              try {
                currentContainer.innerHTML = "";
              } catch (e) {
                // Ignore errors if container already removed
              }
            }
          }, 300);
          
          cleanupTimeoutRef.current = null;
        }, 500); // Wait 500ms to ensure video stream has started
      } else {
        // If not initialized, just clear container
        const currentContainer = containerRef.current;
        if (currentContainer) {
          try {
            currentContainer.innerHTML = "";
          } catch (e) {
            // Ignore errors
          }
        }
      }
      
      setIsScanning(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const handleClose = useCallback(() => {
    // Clean up scanner before closing
    if (scannerRef.current) {
      try {
        scannerRef.current.clear().catch(() => {
          // Ignore errors during cleanup
        });
      } catch (e) {
        // Ignore errors if scanner already cleared
      }
      scannerRef.current = null;
    }
    
    setIsScanning(false);
    // Use ref to avoid dependency issues
    onCloseRef.current();
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Scan QR Code</CardTitle>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div ref={containerRef} className="w-full min-h-[300px]"></div>
          {!isScanning && (
            <p className="text-sm text-muted-foreground mt-2 text-center">
              Memuat kamera...
            </p>
          )}
          {error && (
            <p className="text-sm text-muted-foreground mt-2 text-center">
              Arahkan kamera ke QR Code
            </p>
          )}
          <Button
            variant="outline"
            className="w-full mt-4"
            onClick={handleClose}
          >
            Tutup Kamera
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
