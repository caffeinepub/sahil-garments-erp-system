import { useRef, useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, FileDown, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Product } from '../backend';

interface BarcodeGeneratorProps {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function BarcodeGenerator({ product, open, onOpenChange }: BarcodeGeneratorProps) {
  const code128CanvasRef = useRef<HTMLCanvasElement>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const [activeTab, setActiveTab] = useState<'code128' | 'qr'>('code128');
  const [isGenerating, setIsGenerating] = useState(false);
  const [code128Error, setCode128Error] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const [librariesLoaded, setLibrariesLoaded] = useState({ jsBarcode: false, qrCode: false, jsPDF: false });

  useEffect(() => {
    if (open && product) {
      generateBarcodes();
    }
  }, [open, product]);

  const validateProduct = (): { valid: boolean; error?: string } => {
    if (!product.productId || product.productId === BigInt(0)) {
      return { valid: false, error: 'Invalid product ID' };
    }
    if (!product.barcode || product.barcode.trim() === '') {
      return { valid: false, error: 'Missing barcode data' };
    }
    if (!product.name || product.name.trim() === '') {
      return { valid: false, error: 'Missing product name' };
    }
    if (product.barcode.length < 1 || product.barcode.length > 80) {
      return { valid: false, error: 'Invalid barcode length (must be 1-80 characters)' };
    }
    return { valid: true };
  };

  const generateBarcodes = async () => {
    setIsGenerating(true);
    setCode128Error(null);
    setQrError(null);

    // Validate product data first
    const validation = validateProduct();
    if (!validation.valid) {
      setCode128Error(validation.error || 'Invalid product data');
      setQrError(validation.error || 'Invalid product data');
      setIsGenerating(false);
      toast.error(validation.error || 'Invalid product data');
      return;
    }

    try {
      // Generate Code128 barcode
      await generateCode128();
      
      // Generate QR code
      await generateQRCode();
    } catch (error) {
      console.error('Error generating barcodes:', error);
      toast.error('Failed to generate barcodes');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateCode128 = async () => {
    try {
      await loadJsBarcode();
      
      if (!code128CanvasRef.current) {
        setCode128Error('Canvas element not available');
        return;
      }

      const ctx = code128CanvasRef.current.getContext('2d');
      if (!ctx) {
        setCode128Error('Failed to get canvas rendering context');
        return;
      }

      if (!window.JsBarcode) {
        setCode128Error('JsBarcode library not loaded');
        return;
      }

      try {
        window.JsBarcode(code128CanvasRef.current, product.barcode, {
          format: 'CODE128',
          width: 2,
          height: 100,
          displayValue: true,
          fontSize: 14,
          margin: 10,
          valid: (valid: boolean) => {
            if (!valid) {
              setCode128Error('Invalid barcode format for Code128');
            }
          },
        });

        // Verify canvas has content
        if (code128CanvasRef.current.width === 0 || code128CanvasRef.current.height === 0) {
          setCode128Error('Failed to generate barcode image');
        }
      } catch (barcodeError: any) {
        setCode128Error(barcodeError.message || 'Failed to generate Code128 barcode');
        console.error('JsBarcode generation error:', barcodeError);
      }
    } catch (error: any) {
      setCode128Error(error.message || 'Failed to load barcode library');
      console.error('Code128 generation error:', error);
    }
  };

  const generateQRCode = async () => {
    try {
      await loadQRCode();
      
      if (!qrCanvasRef.current) {
        setQrError('Canvas element not available');
        return;
      }

      const ctx = qrCanvasRef.current.getContext('2d');
      if (!ctx) {
        setQrError('Failed to get canvas rendering context');
        return;
      }

      if (!window.QRCode) {
        setQrError('QRCode library not loaded');
        return;
      }

      try {
        await window.QRCode.toCanvas(qrCanvasRef.current, product.barcode, {
          width: 256,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        });

        // Verify canvas has content
        if (qrCanvasRef.current.width === 0 || qrCanvasRef.current.height === 0) {
          setQrError('Failed to generate QR code image');
        }
      } catch (qrError: any) {
        setQrError(qrError.message || 'Failed to generate QR code');
        console.error('QRCode generation error:', qrError);
      }
    } catch (error: any) {
      setQrError(error.message || 'Failed to load QR code library');
      console.error('QR code generation error:', error);
    }
  };

  const loadJsBarcode = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.JsBarcode) {
        setLibrariesLoaded((prev) => ({ ...prev, jsBarcode: true }));
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js';
      script.onload = () => {
        if (window.JsBarcode) {
          setLibrariesLoaded((prev) => ({ ...prev, jsBarcode: true }));
          resolve();
        } else {
          reject(new Error('JsBarcode library failed to initialize'));
        }
      };
      script.onerror = () => reject(new Error('Failed to load JsBarcode library from CDN'));
      document.head.appendChild(script);
    });
  };

  const loadQRCode = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.QRCode) {
        setLibrariesLoaded((prev) => ({ ...prev, qrCode: true }));
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js';
      script.onload = () => {
        if (window.QRCode) {
          setLibrariesLoaded((prev) => ({ ...prev, qrCode: true }));
          resolve();
        } else {
          reject(new Error('QRCode library failed to initialize'));
        }
      };
      script.onerror = () => reject(new Error('Failed to load QRCode library from CDN'));
      document.head.appendChild(script);
    });
  };

  const downloadImage = (format: 'code128' | 'qr') => {
    const canvas = format === 'code128' ? code128CanvasRef.current : qrCanvasRef.current;
    const error = format === 'code128' ? code128Error : qrError;
    
    if (!canvas) {
      toast.error('Canvas not available');
      return;
    }

    if (error) {
      toast.error('Cannot download - barcode generation failed');
      return;
    }

    try {
      canvas.toBlob((blob) => {
        if (!blob) {
          toast.error('Failed to create image file');
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${product.name.replace(/[^a-z0-9]/gi, '_')}-${format}-${product.barcode}.png`;
        link.click();
        
        // Cleanup
        setTimeout(() => URL.revokeObjectURL(url), 100);
        toast.success('Barcode image downloaded!');
      }, 'image/png');
    } catch (error) {
      console.error('Error downloading image:', error);
      toast.error('Failed to download image');
    }
  };

  const downloadPDF = async (format: 'code128' | 'qr') => {
    const canvas = format === 'code128' ? code128CanvasRef.current : qrCanvasRef.current;
    const error = format === 'code128' ? code128Error : qrError;
    
    if (!canvas) {
      toast.error('Canvas not available');
      return;
    }

    if (error) {
      toast.error('Cannot download - barcode generation failed');
      return;
    }

    try {
      await loadJsPDF();
      
      const imgData = canvas.toDataURL('image/png');
      if (!imgData || imgData === 'data:,') {
        toast.error('Failed to convert barcode to image');
        return;
      }

      const pdf = new window.jspdf.jsPDF({
        orientation: format === 'code128' ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = format === 'code128' ? 150 : 80;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const x = (pageWidth - imgWidth) / 2;
      const y = (pageHeight - imgHeight) / 2;

      pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
      
      // Add product information
      pdf.setFontSize(12);
      pdf.text(`Product: ${product.name}`, 10, 10);
      pdf.text(`Barcode: ${product.barcode}`, 10, 20);
      pdf.text(`Size: ${product.size || 'N/A'} | Color: ${product.color || 'N/A'}`, 10, 30);

      pdf.save(`${product.name.replace(/[^a-z0-9]/gi, '_')}-${format}-${product.barcode}.pdf`);
      toast.success('Barcode PDF downloaded!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF. Please try again.');
    }
  };

  const loadJsPDF = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.jspdf) {
        setLibrariesLoaded((prev) => ({ ...prev, jsPDF: true }));
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
      script.onload = () => {
        if (window.jspdf) {
          setLibrariesLoaded((prev) => ({ ...prev, jsPDF: true }));
          resolve();
        } else {
          reject(new Error('jsPDF library failed to initialize'));
        }
      };
      script.onerror = () => reject(new Error('Failed to load jsPDF library from CDN'));
      document.head.appendChild(script);
    });
  };

  const retryGeneration = async () => {
    await generateBarcodes();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Barcode Generator</DialogTitle>
          <DialogDescription>
            Generate and download barcodes for {product.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 rounded-lg border bg-muted/50">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Product:</span>
                <p className="font-medium">{product.name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Barcode:</span>
                <p className="font-medium font-mono">{product.barcode}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Size:</span>
                <p className="font-medium">{product.size || 'N/A'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Color:</span>
                <p className="font-medium">{product.color || 'N/A'}</p>
              </div>
            </div>
          </div>

          {(code128Error || qrError) && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>
                  {code128Error && qrError 
                    ? 'Both barcodes failed to generate' 
                    : code128Error 
                      ? 'Code128 barcode failed to generate' 
                      : 'QR code failed to generate'}
                </span>
                <Button size="sm" variant="outline" onClick={retryGeneration} disabled={isGenerating}>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'code128' | 'qr')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="code128">Code128</TabsTrigger>
              <TabsTrigger value="qr">QR Code</TabsTrigger>
            </TabsList>

            <TabsContent value="code128" className="space-y-4">
              <div className="flex items-center justify-center p-8 bg-white rounded-lg border min-h-[200px]">
                {isGenerating ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>Generating barcode...</span>
                  </div>
                ) : code128Error ? (
                  <div className="flex flex-col items-center gap-2 text-destructive text-center">
                    <AlertCircle className="h-8 w-8" />
                    <span className="text-sm">{code128Error}</span>
                  </div>
                ) : (
                  <canvas ref={code128CanvasRef} />
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => downloadImage('code128')}
                  disabled={isGenerating || !!code128Error}
                  className="flex-1"
                  variant="outline"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download PNG
                </Button>
                <Button
                  onClick={() => downloadPDF('code128')}
                  disabled={isGenerating || !!code128Error}
                  className="flex-1"
                  variant="outline"
                >
                  <FileDown className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="qr" className="space-y-4">
              <div className="flex items-center justify-center p-8 bg-white rounded-lg border min-h-[200px]">
                {isGenerating ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>Generating QR code...</span>
                  </div>
                ) : qrError ? (
                  <div className="flex flex-col items-center gap-2 text-destructive text-center">
                    <AlertCircle className="h-8 w-8" />
                    <span className="text-sm">{qrError}</span>
                  </div>
                ) : (
                  <canvas ref={qrCanvasRef} />
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => downloadImage('qr')}
                  disabled={isGenerating || !!qrError}
                  className="flex-1"
                  variant="outline"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download PNG
                </Button>
                <Button
                  onClick={() => downloadPDF('qr')}
                  disabled={isGenerating || !!qrError}
                  className="flex-1"
                  variant="outline"
                >
                  <FileDown className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Type declarations for external libraries
declare global {
  interface Window {
    JsBarcode: any;
    QRCode: any;
    jspdf: any;
  }
}
