import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import type { OrderWithItems } from "@/types/database";
import { ORDER_STATUSES } from "@/lib/constants";

export async function downloadReceipt(order: OrderWithItems) {
  // Create a temporary div to render the receipt
  const receiptDiv = document.createElement("div");
  receiptDiv.style.width = "210mm";
  receiptDiv.style.padding = "20mm";
  receiptDiv.style.backgroundColor = "white";
  receiptDiv.style.color = "black";
  receiptDiv.style.fontFamily = "Arial, sans-serif";
  receiptDiv.style.position = "absolute";
  receiptDiv.style.left = "-9999px";
  receiptDiv.style.top = "0";

  // Generate Barcode image as data URL (CODE128, 10-20 char token)
  const barcodeUrl = await generateBarcodeDataURL(order.qr_token);

  receiptDiv.innerHTML = `
    <div style="text-align: center; margin-bottom: 20px;">
      <h1 style="margin: 0; font-size: 24px; font-weight: bold;">STRUK ORDER</h1>
      <p style="margin: 5px 0; font-size: 14px; color: #666;">Order Tracking System</p>
    </div>
    
    <div style="border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 15px 0; margin-bottom: 20px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
        <span style="font-weight: bold;">Order ID:</span>
        <span>${order.order_id_marketplace}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
        <span style="font-weight: bold;">Platform:</span>
        <span>${order.platform_penjualan}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
        <span style="font-weight: bold;">Status:</span>
        <span>${ORDER_STATUSES[order.status as keyof typeof ORDER_STATUSES] || order.status}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
        <span style="font-weight: bold;">Tanggal:</span>
        <span>${new Date(order.tanggal_pemesanan).toLocaleDateString("id-ID", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}</span>
      </div>
    </div>

    <div style="margin-bottom: 20px;">
      <h2 style="font-size: 18px; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">Informasi Pembeli</h2>
      <p style="margin: 5px 0;"><strong>Nama:</strong> ${order.nama_pembeli}</p>
      <p style="margin: 5px 0;"><strong>Ekspedisi:</strong> ${order.expedisi}</p>
      ${order.keterangan ? `<p style="margin: 5px 0;"><strong>Keterangan:</strong> ${order.keterangan}</p>` : ""}
    </div>

    <div style="margin-bottom: 20px;">
      <h2 style="font-size: 18px; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">Item Order</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background-color: #f5f5f5; border-bottom: 2px solid #000;">
            <th style="text-align: left; padding: 8px; border: 1px solid #ddd;">Produk</th>
            <th style="text-align: center; padding: 8px; border: 1px solid #ddd;">Qty</th>
            <th style="text-align: right; padding: 8px; border: 1px solid #ddd;">Harga Satuan</th>
            <th style="text-align: right; padding: 8px; border: 1px solid #ddd;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${order.order_items?.map(
            (item) => `
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">${item.nama_produk}</td>
              <td style="text-align: center; padding: 8px; border: 1px solid #ddd;">${item.qty}</td>
              <td style="text-align: right; padding: 8px; border: 1px solid #ddd;">Rp ${Number(item.harga_satuan).toLocaleString("id-ID", {maximumFractionDigits: 0, minimumFractionDigits: 0})}</td>
              <td style="text-align: right; padding: 8px; border: 1px solid #ddd;">Rp ${Number(item.qty * item.harga_satuan).toLocaleString("id-ID", {maximumFractionDigits: 0, minimumFractionDigits: 0})}</td>
            </tr>
          `
          ).join("") || ""}
        </tbody>
      </table>
    </div>

    <div style="margin-bottom: 20px; text-align: right;">
      <div style="display: flex; justify-content: space-between; padding: 10px 0; border-top: 2px solid #000; border-bottom: 2px solid #000;">
        <span style="font-size: 18px; font-weight: bold;">TOTAL:</span>
        <span style="font-size: 18px; font-weight: bold;">Rp ${Number(order.total_harga).toLocaleString("id-ID", {maximumFractionDigits: 0, minimumFractionDigits: 0})}</span>
      </div>
    </div>

    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #000;">
      <h2 style="font-size: 16px; margin-bottom: 15px;">Barcode untuk Tracking</h2>
      <img src="${barcodeUrl}" alt="Barcode" style="height: 52px; margin: 0 auto; display: block;" />
      <p style="margin-top: 10px; font-size: 12px; color: #666; word-break: break-all;">${order.qr_token}</p>
      <p style="margin-top: 5px; font-size: 12px; color: #666;">Scan barcode untuk tracking order</p>
    </div>

    <div style="margin-top: 30px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #ddd; padding-top: 10px;">
      <p>Dicetak pada: ${new Date().toLocaleString("id-ID")}</p>
      <p>Order Tracking System - Generated Receipt</p>
    </div>
  `;

  document.body.appendChild(receiptDiv);

  try {
    // Convert to canvas
    const canvas = await html2canvas(receiptDiv, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    });

    // Create PDF
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const imgWidth = 210;
    const pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;

    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // Download PDF
    pdf.save(`Struk-Order-${order.order_id_marketplace}-${Date.now()}.pdf`);
  } catch (error) {
    console.error("Error generating receipt:", error);
    alert("Gagal mengunduh struk. Silakan coba lagi.");
  } finally {
    // Clean up
    document.body.removeChild(receiptDiv);
  }
}

async function generateBarcodeDataURL(value: string): Promise<string> {
  try {
    const JsBarcode = (await import("jsbarcode")).default;
    const canvas = document.createElement("canvas");
    JsBarcode(canvas, value, {
      format: "CODE128",
      width: 1.2,
      height: 32,
      displayValue: false,
    });
    return canvas.toDataURL("image/png");
  } catch (error) {
    console.error("Error generating barcode:", error);
    return "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjUwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iNTAiIGZpbGw9IiNmNWY1ZjUiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSIjOTk5OTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+QmFyY29kZTwvdGV4dD48L3N2Zz4=";
  }
}
