import { useRef, useEffect, useState } from 'react';
import { Invoice, Customer, Product } from '../backend';
import { Button } from '@/components/ui/button';
import { Download, FileImage, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  INVOICE_COLORS,
  INVOICE_LAYOUT,
  formatCurrency,
  formatDate,
  buildLineItems,
  calculateTotals,
  InvoiceLineItem,
} from '../utils/invoiceDocument';

interface InvoiceGeneratorProps {
  invoice: Invoice;
  customer: Customer;
  products: Product[];
  signatureUrl?: string;
  onGenerated?: (imageUrl: string, pdfUrl: string) => void;
}

export default function InvoiceGenerator({
  invoice,
  customer,
  products,
  signatureUrl,
  onGenerated,
}: InvoiceGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const logoRef = useRef<HTMLImageElement | null>(null);

  // Preload logo
  useEffect(() => {
    const logo = new Image();
    logo.crossOrigin = 'anonymous';
    logo.onload = () => {
      logoRef.current = logo;
      setLogoLoaded(true);
    };
    logo.onerror = () => {
      console.error('Failed to load logo');
      setLogoLoaded(true); // Continue without logo
    };
    logo.src = '/assets/generated/sahil-garments-logo.dim_900x300.png';
  }, []);

  const generateInvoiceImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Set canvas size (A4 proportions)
    canvas.width = INVOICE_LAYOUT.canvasWidth;
    canvas.height = INVOICE_LAYOUT.canvasHeight;

    const { gold, black, gray, lightGray, white, tableRowBg } = INVOICE_COLORS;
    const { canvasWidth, canvasHeight, padding, headerHeight, tableTop, tableHeaderHeight, tableRowHeight } =
      INVOICE_LAYOUT;

    // Background
    ctx.fillStyle = white;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Header background
    ctx.fillStyle = lightGray;
    ctx.fillRect(0, 0, canvasWidth, headerHeight);

    // Draw logo (left side)
    if (logoRef.current) {
      const logoWidth = 180;
      const logoHeight = 60;
      ctx.drawImage(logoRef.current, padding, 40, logoWidth, logoHeight);
    }

    // Company name (fallback if logo fails)
    if (!logoRef.current) {
      ctx.fillStyle = gold;
      ctx.font = 'bold 36px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('SAHIL GARMENTS', padding, 70);
      ctx.fillStyle = gray;
      ctx.font = '14px Arial';
      ctx.fillText('Wholesale & Retail Clothing Store', padding, 95);
    }

    // Invoice title (right side)
    ctx.fillStyle = black;
    ctx.font = 'bold 42px Arial';
    ctx.textAlign = 'right';
    ctx.fillText('INVOICE', canvasWidth - padding, 85);

    // Invoice meta (right side)
    ctx.font = '14px Arial';
    ctx.fillStyle = gray;
    let metaY = 110;
    ctx.fillText(`Invoice No: SG-${invoice.invoiceId}`, canvasWidth - padding, metaY);
    metaY += 20;
    ctx.fillText(`Invoice Date: ${formatDate(invoice.created)}`, canvasWidth - padding, metaY);
    if (invoice.dueDate) {
      metaY += 20;
      ctx.fillText(`Due Date: ${formatDate(invoice.dueDate)}`, canvasWidth - padding, metaY);
    }

    // BILL TO section (left side)
    ctx.fillStyle = black;
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('BILL TO:', padding, 200);

    ctx.font = '14px Arial';
    ctx.fillStyle = gray;
    ctx.fillText(customer.name, padding, 225);
    ctx.fillText(customer.address, padding, 245);
    ctx.fillText(`${customer.phone}`, padding, 265);

    // Build line items
    const lineItems = buildLineItems(invoice, products);
    const totals = calculateTotals(lineItems, invoice);

    // Table header (gold background)
    ctx.fillStyle = gold;
    ctx.fillRect(padding, tableTop, canvasWidth - 2 * padding, tableHeaderHeight);

    // Table header text (white)
    ctx.fillStyle = white;
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Sr. No.', padding + 20, tableTop + 25);
    ctx.fillText('Description', padding + 100, tableTop + 25);
    ctx.fillText('Qty.', padding + 360, tableTop + 25);
    ctx.fillText('Unit Price', padding + 440, tableTop + 25);
    ctx.textAlign = 'right';
    ctx.fillText('Total', canvasWidth - padding - 20, tableTop + 25);

    // Table rows
    let currentRowTop = tableTop + tableHeaderHeight;
    lineItems.forEach((item, index) => {
      // Alternate row background
      if (index % 2 === 0) {
        ctx.fillStyle = tableRowBg;
        ctx.fillRect(padding, currentRowTop, canvasWidth - 2 * padding, tableRowHeight);
      }

      // Row data
      ctx.fillStyle = black;
      ctx.font = '14px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(item.srNo.toString(), padding + 20, currentRowTop + 25);
      ctx.fillText(item.description, padding + 100, currentRowTop + 25);
      ctx.fillText(item.quantity.toString(), padding + 360, currentRowTop + 25);
      ctx.fillText(formatCurrency(item.unitPrice), padding + 440, currentRowTop + 25);
      ctx.textAlign = 'right';
      ctx.fillText(formatCurrency(item.total), canvasWidth - padding - 20, currentRowTop + 25);

      currentRowTop += tableRowHeight;
    });

    // Totals section (right side)
    const totalsTop = currentRowTop + 40;
    ctx.textAlign = 'right';
    ctx.font = '14px Arial';

    // Subtotal
    ctx.fillStyle = gray;
    ctx.fillText('Subtotal:', canvasWidth - 200, totalsTop);
    ctx.fillStyle = black;
    ctx.fillText(formatCurrency(totals.subtotal), canvasWidth - padding - 20, totalsTop);

    // GST
    ctx.fillStyle = gray;
    ctx.fillText(`GST (${totals.gstPercentage}%):`, canvasWidth - 200, totalsTop + 25);
    ctx.fillStyle = black;
    ctx.fillText(formatCurrency(totals.tax), canvasWidth - padding - 20, totalsTop + 25);

    // Grand Total (gold background bar)
    ctx.fillStyle = gold;
    ctx.fillRect(canvasWidth - 320, totalsTop + 40, 260, 40);
    ctx.fillStyle = white;
    ctx.font = 'bold 18px Arial';
    ctx.fillText('Grand Total:', canvasWidth - 200, totalsTop + 65);
    ctx.fillText(formatCurrency(totals.grandTotal), canvasWidth - padding - 20, totalsTop + 65);

    // Payment Method section (left side)
    const paymentTop = totalsTop + 110;
    ctx.fillStyle = black;
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Payment Method:', padding, paymentTop);

    ctx.font = '14px Arial';
    ctx.fillStyle = gray;
    ctx.fillText('Bank Transfer', padding, paymentTop + 25);
    ctx.fillText('Account: XXXXXXX7890', padding, paymentTop + 45);

    // Thank you message (left side)
    const thankYouTop = paymentTop + 90;
    ctx.fillStyle = black;
    ctx.font = 'italic 16px Arial';
    ctx.fillText('Thank you for your business!', padding, thankYouTop);

    // Signature section (right side)
    const signatureTop = thankYouTop + 20;
    ctx.textAlign = 'right';

    // Signature line
    ctx.strokeStyle = gray;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(canvasWidth - 250, signatureTop + 40);
    ctx.lineTo(canvasWidth - padding, signatureTop + 40);
    ctx.stroke();

    // Load and draw signature if available
    if (signatureUrl) {
      try {
        const signatureImg = new Image();
        signatureImg.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          signatureImg.onload = resolve;
          signatureImg.onerror = reject;
          signatureImg.src = signatureUrl;
        });
        ctx.drawImage(signatureImg, canvasWidth - 220, signatureTop, 150, 35);
      } catch (error) {
        console.error('Failed to load signature:', error);
      }
    }

    ctx.fillStyle = black;
    ctx.font = '14px Arial';
    ctx.fillText('Authorized Signature', canvasWidth - padding, signatureTop + 60);

    // Footer line
    const footerTop = canvasHeight - 60;
    ctx.strokeStyle = gray;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, footerTop);
    ctx.lineTo(canvasWidth, footerTop);
    ctx.stroke();

    // Footer contact info (centered)
    ctx.fillStyle = gray;
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(
      'Sahil Garments | info@sahilgarments.com | +91 9876543210 | www.sahilgarments.com',
      canvasWidth / 2,
      footerTop + 30
    );

    return canvas.toDataURL('image/png');
  };

  const generatePDF = async (imageDataUrl: string) => {
    // Load jsPDF from CDN
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    document.head.appendChild(script);

    await new Promise((resolve) => {
      script.onload = resolve;
    });

    // @ts-ignore - jsPDF loaded from CDN
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Add image to PDF
    const imgWidth = 210; // A4 width in mm
    const imgHeight = 262.5; // A4 height proportional to canvas
    pdf.addImage(imageDataUrl, 'PNG', 0, 0, imgWidth, imgHeight);

    // Return PDF as blob URL
    const pdfBlob = pdf.output('blob');
    return URL.createObjectURL(pdfBlob);
  };

  const handleGenerate = async () => {
    if (!logoLoaded) {
      toast.info('Loading logo...');
      return;
    }

    setIsGenerating(true);
    try {
      const imageDataUrl = await generateInvoiceImage();
      if (!imageDataUrl) {
        throw new Error('Failed to generate invoice image');
      }

      setImageUrl(imageDataUrl);

      const pdfBlobUrl = await generatePDF(imageDataUrl);
      setPdfUrl(pdfBlobUrl);

      if (onGenerated) {
        onGenerated(imageDataUrl, pdfBlobUrl);
      }

      toast.success('Invoice documents generated successfully!');
    } catch (error) {
      console.error('Invoice generation error:', error);
      toast.error('Failed to generate invoice documents');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = () => {
    if (!imageUrl) return;
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `invoice-SG-${invoice.invoiceId}.png`;
    link.click();
    toast.success('Invoice image downloaded');
  };

  const downloadPDF = () => {
    if (!pdfUrl) return;
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `invoice-SG-${invoice.invoiceId}.pdf`;
    link.click();
    toast.success('Invoice PDF downloaded');
  };

  useEffect(() => {
    // Auto-generate on mount once logo is loaded
    if (logoLoaded) {
      handleGenerate();
    }
  }, [logoLoaded]);

  return (
    <div className="space-y-4">
      <canvas ref={canvasRef} className="hidden" />

      <div className="flex gap-2">
        <Button onClick={handleGenerate} disabled={isGenerating || !logoLoaded} variant="outline" size="sm">
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <FileText className="mr-2 h-4 w-4" />
              Regenerate
            </>
          )}
        </Button>

        {imageUrl && (
          <Button onClick={downloadImage} variant="outline" size="sm">
            <FileImage className="mr-2 h-4 w-4" />
            Download Image
          </Button>
        )}

        {pdfUrl && (
          <Button onClick={downloadPDF} variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
        )}
      </div>

      {imageUrl && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <p className="text-sm text-muted-foreground mb-2">Preview:</p>
          <img src={imageUrl} alt="Invoice Preview" className="w-full max-w-md mx-auto border rounded shadow-sm" />
        </div>
      )}
    </div>
  );
}
