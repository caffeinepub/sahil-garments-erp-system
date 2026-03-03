import { useState, useRef, useEffect } from 'react';
import { useListProducts } from '../../hooks/useQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, FileDown, Package, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Product } from '../../backend';

export default function InventoryReportModule() {
  const { data: products = [], isLoading } = useListProducts();
  const [generatingBarcodes, setGeneratingBarcodes] = useState(false);
  const [barcodeCanvases, setBarcodeCanvases] = useState<Map<number, HTMLCanvasElement>>(new Map());
  const [failedProducts, setFailedProducts] = useState<Set<number>>(new Set());
  const [librariesLoaded, setLibrariesLoaded] = useState(false);
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());

  useEffect(() => {
    if (products.length > 0 && !generatingBarcodes && !librariesLoaded) {
      generateAllBarcodes();
    }
  }, [products]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      barcodeCanvases.forEach((canvas) => {
        canvas.remove();
      });
    };
  }, []);

  const validateProduct = (product: Product): { valid: boolean; error?: string } => {
    if (!product.productId || product.productId === BigInt(0)) {
      return { valid: false, error: 'Invalid product ID' };
    }
    if (!product.barcode || product.barcode.trim() === '') {
      return { valid: false, error: 'Missing barcode data' };
    }
    if (!product.name || product.name.trim() === '') {
      return { valid: false, error: 'Missing product name' };
    }
    // Validate barcode format for Code128
    if (product.barcode.length < 1 || product.barcode.length > 80) {
      return { valid: false, error: 'Invalid barcode length' };
    }
    return { valid: true };
  };

  const loadJsBarcode = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.JsBarcode) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js';
      script.onload = () => {
        if (window.JsBarcode) {
          resolve();
        } else {
          reject(new Error('JsBarcode library failed to initialize'));
        }
      };
      script.onerror = () => reject(new Error('Failed to load JsBarcode library'));
      document.head.appendChild(script);
    });
  };

  const loadJsPDF = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.jspdf) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
      script.onload = () => {
        if (window.jspdf) {
          resolve();
        } else {
          reject(new Error('jsPDF library failed to initialize'));
        }
      };
      script.onerror = () => reject(new Error('Failed to load jsPDF library'));
      document.head.appendChild(script);
    });
  };

  const generateBarcodeForProduct = (product: Product): HTMLCanvasElement | null => {
    try {
      // Validate product data
      const validation = validateProduct(product);
      if (!validation.valid) {
        console.error(`Product ${product.name} validation failed:`, validation.error);
        return null;
      }

      // Create canvas element
      const canvas = document.createElement('canvas');
      
      // Validate canvas context
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error(`Failed to get 2D context for product ${product.name}`);
        return null;
      }

      // Generate barcode
      if (!window.JsBarcode) {
        console.error('JsBarcode library not loaded');
        return null;
      }

      try {
        window.JsBarcode(canvas, product.barcode, {
          format: 'CODE128',
          width: 2,
          height: 60,
          displayValue: true,
          fontSize: 12,
          margin: 5,
          valid: (valid: boolean) => {
            if (!valid) {
              console.error(`Invalid barcode format for product ${product.name}: ${product.barcode}`);
            }
          },
        });

        // Verify canvas has content
        if (canvas.width === 0 || canvas.height === 0) {
          console.error(`Canvas has zero dimensions for product ${product.name}`);
          return null;
        }

        return canvas;
      } catch (barcodeError) {
        console.error(`JsBarcode generation failed for product ${product.name}:`, barcodeError);
        return null;
      }
    } catch (error) {
      console.error(`Error generating barcode for product ${product.name}:`, error);
      return null;
    }
  };

  const generateAllBarcodes = async () => {
    setGeneratingBarcodes(true);
    setFailedProducts(new Set());
    
    try {
      await loadJsBarcode();
      setLibrariesLoaded(true);
      
      const newCanvases = new Map<number, HTMLCanvasElement>();
      const failed = new Set<number>();

      products.forEach((product) => {
        const canvas = generateBarcodeForProduct(product);
        if (canvas) {
          newCanvases.set(Number(product.productId), canvas);
        } else {
          failed.add(Number(product.productId));
        }
      });

      setBarcodeCanvases(newCanvases);
      setFailedProducts(failed);

      if (failed.size > 0) {
        toast.warning(`Generated ${newCanvases.size} barcodes. ${failed.size} failed.`);
      } else {
        toast.success(`Successfully generated ${newCanvases.size} barcodes`);
      }
    } catch (error) {
      console.error('Error loading barcode library:', error);
      toast.error('Failed to load barcode generation library. Please refresh the page.');
    } finally {
      setGeneratingBarcodes(false);
    }
  };

  const retryFailedBarcodes = async () => {
    if (failedProducts.size === 0) return;

    setGeneratingBarcodes(true);
    const newCanvases = new Map(barcodeCanvases);
    const stillFailed = new Set<number>();

    failedProducts.forEach((productId) => {
      const product = products.find((p) => Number(p.productId) === productId);
      if (product) {
        const canvas = generateBarcodeForProduct(product);
        if (canvas) {
          newCanvases.set(productId, canvas);
        } else {
          stillFailed.add(productId);
        }
      }
    });

    setBarcodeCanvases(newCanvases);
    setFailedProducts(stillFailed);
    setGeneratingBarcodes(false);

    if (stillFailed.size === 0) {
      toast.success('All barcodes generated successfully');
    } else {
      toast.warning(`${stillFailed.size} barcodes still failed to generate`);
    }
  };

  const exportIndividualBarcodePNG = (product: Product) => {
    const canvas = barcodeCanvases.get(Number(product.productId));
    if (!canvas) {
      toast.error('Barcode not available. Please try regenerating.');
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
        link.download = `${product.name.replace(/[^a-z0-9]/gi, '_')}-${product.barcode}-barcode.png`;
        link.click();
        
        // Cleanup
        setTimeout(() => URL.revokeObjectURL(url), 100);
        toast.success(`Barcode PNG downloaded for ${product.name}`);
      }, 'image/png');
    } catch (error) {
      console.error('Error exporting PNG:', error);
      toast.error('Failed to export barcode as PNG');
    }
  };

  const exportIndividualBarcodePDF = async (product: Product) => {
    const canvas = barcodeCanvases.get(Number(product.productId));
    if (!canvas) {
      toast.error('Barcode not available. Please try regenerating.');
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
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Add Sahil Garments branding header
      pdf.setFillColor(218, 165, 32); // Gold color
      pdf.rect(0, 0, pageWidth, 25, 'F');
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Sahil Garments', pageWidth / 2, 12, { align: 'center' });
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Wholesale & Retail Clothing Store', pageWidth / 2, 19, { align: 'center' });

      // Add barcode
      const imgWidth = 120;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const x = (pageWidth - imgWidth) / 2;
      const y = 40;
      pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);

      // Add product details
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      const detailsY = y + imgHeight + 15;
      pdf.text(`Product: ${product.name}`, 20, detailsY);
      pdf.text(`SKU/Barcode: ${product.barcode}`, 20, detailsY + 8);
      pdf.text(`Stock Level: ${Number(product.stockLevel)} units`, 20, detailsY + 16);
      pdf.text(`Location: ${product.warehouse} - ${product.rack} - ${product.shelf}`, 20, detailsY + 24);
      pdf.text(`Size: ${product.size || 'N/A'} | Color: ${product.color || 'N/A'}`, 20, detailsY + 32);

      // Add footer
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text('© 2025 Sahil Garments. All rights reserved.', pageWidth / 2, pageHeight - 10, { align: 'center' });

      pdf.save(`${product.name.replace(/[^a-z0-9]/gi, '_')}-${product.barcode}-barcode.pdf`);
      toast.success(`Barcode PDF downloaded for ${product.name}`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF. Please try again.');
    }
  };

  const exportAllBarcodesPDF = async () => {
    if (products.length === 0) {
      toast.error('No products available to export');
      return;
    }

    const validProducts = products.filter((p) => barcodeCanvases.has(Number(p.productId)));
    if (validProducts.length === 0) {
      toast.error('No valid barcodes available to export');
      return;
    }

    try {
      toast.info('Generating PDF with all barcodes...');
      await loadJsPDF();
      
      const pdf = new window.jspdf.jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let currentY = 30;
      let isFirstPage = true;

      validProducts.forEach((product, index) => {
        const canvas = barcodeCanvases.get(Number(product.productId));
        if (!canvas) return;

        try {
          // Add new page if needed
          if (!isFirstPage && currentY > pageHeight - 60) {
            pdf.addPage();
            currentY = 30;
            isFirstPage = false;
          }

          // Add header on first page
          if (isFirstPage && index === 0) {
            pdf.setFillColor(218, 165, 32);
            pdf.rect(0, 0, pageWidth, 20, 'F');
            pdf.setTextColor(0, 0, 0);
            pdf.setFontSize(16);
            pdf.setFont('helvetica', 'bold');
            pdf.text('Sahil Garments - Inventory Barcodes', pageWidth / 2, 12, { align: 'center' });
            currentY = 30;
          }

          // Add barcode
          const imgData = canvas.toDataURL('image/png');
          if (imgData && imgData !== 'data:,') {
            const imgWidth = 80;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            const x = (pageWidth - imgWidth) / 2;
            pdf.addImage(imgData, 'PNG', x, currentY, imgWidth, imgHeight);

            // Add product details
            pdf.setFontSize(9);
            pdf.setTextColor(0, 0, 0);
            const detailsY = currentY + imgHeight + 5;
            pdf.text(`${product.name} | SKU: ${product.barcode}`, pageWidth / 2, detailsY, { align: 'center' });
            pdf.text(`Stock: ${Number(product.stockLevel)} | Location: ${product.warehouse}-${product.rack}-${product.shelf}`, pageWidth / 2, detailsY + 5, { align: 'center' });

            currentY = detailsY + 15;
            isFirstPage = false;
          }
        } catch (error) {
          console.error(`Error adding product ${product.name} to PDF:`, error);
        }
      });

      // Add footer on last page
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text('© 2025 Sahil Garments. All rights reserved.', pageWidth / 2, pageHeight - 10, { align: 'center' });

      pdf.save('sahil-garments-all-barcodes.pdf');
      toast.success(`All barcodes exported as PDF (${validProducts.length} products)`);
    } catch (error) {
      console.error('Error generating batch PDF:', error);
      toast.error('Failed to generate batch PDF. Please try again.');
    }
  };

  const exportAllBarcodesPNG = async () => {
    if (products.length === 0) {
      toast.error('No products available to export');
      return;
    }

    const validProducts = products.filter((p) => barcodeCanvases.has(Number(p.productId)));
    if (validProducts.length === 0) {
      toast.error('No valid barcodes available to export');
      return;
    }

    toast.info(`Downloading ${validProducts.length} barcode PNG files...`);
    
    let successCount = 0;
    validProducts.forEach((product, index) => {
      const canvas = barcodeCanvases.get(Number(product.productId));
      if (!canvas) return;

      try {
        // Stagger downloads to avoid browser blocking
        setTimeout(() => {
          canvas.toBlob((blob) => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${product.name.replace(/[^a-z0-9]/gi, '_')}-${product.barcode}-barcode.png`;
            link.click();
            
            // Cleanup
            setTimeout(() => URL.revokeObjectURL(url), 100);
            successCount++;
          }, 'image/png');
        }, index * 100);
      } catch (error) {
        console.error(`Error exporting PNG for product ${product.name}:`, error);
      }
    });

    setTimeout(() => {
      toast.success(`${validProducts.length} barcode PNG files downloaded`);
    }, validProducts.length * 100 + 500);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Inventory Report with Barcodes
            </CardTitle>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={exportAllBarcodesPDF} 
                disabled={generatingBarcodes || products.length === 0 || barcodeCanvases.size === 0}
              >
                <FileDown className="h-4 w-4 mr-2" />
                Export All as PDF
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={exportAllBarcodesPNG} 
                disabled={generatingBarcodes || products.length === 0 || barcodeCanvases.size === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export All as PNG
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {failedProducts.size > 0 && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>
                  {failedProducts.size} barcode{failedProducts.size > 1 ? 's' : ''} failed to generate. 
                  This may be due to invalid barcode data or missing product information.
                </span>
                <Button size="sm" variant="outline" onClick={retryFailedBarcodes} disabled={generatingBarcodes}>
                  Retry Failed
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {isLoading || generatingBarcodes ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>No products available in inventory</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product Name</TableHead>
                    <TableHead>SKU/Barcode</TableHead>
                    <TableHead>Barcode</TableHead>
                    <TableHead>Stock Level</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => {
                    const canvas = barcodeCanvases.get(Number(product.productId));
                    const hasFailed = failedProducts.has(Number(product.productId));
                    
                    return (
                      <TableRow key={Number(product.productId)}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">
                            {product.barcode}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center bg-white p-2 rounded border min-w-[200px]">
                            {hasFailed ? (
                              <div className="flex items-center gap-2 text-destructive text-sm">
                                <AlertCircle className="h-4 w-4" />
                                <span>Generation failed</span>
                              </div>
                            ) : canvas ? (
                              <img
                                src={canvas.toDataURL()}
                                alt={`Barcode for ${product.name}`}
                                className="max-w-full h-auto"
                              />
                            ) : (
                              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Generating...</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={Number(product.stockLevel) < 5 ? 'text-amber-600 font-semibold' : 'font-medium'}>
                            {Number(product.stockLevel)} units
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">
                          {product.warehouse} - {product.rack} - {product.shelf}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              product.inventoryStatus === 'inStock'
                                ? 'default'
                                : product.inventoryStatus === 'low'
                                  ? 'secondary'
                                  : 'destructive'
                            }
                            className="capitalize"
                          >
                            {product.inventoryStatus === 'inStock' ? 'In Stock' : product.inventoryStatus === 'low' ? 'Low' : 'Out of Stock'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => exportIndividualBarcodePNG(product)}
                              disabled={!canvas || hasFailed}
                              title="Export PNG"
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => exportIndividualBarcodePDF(product)}
                              disabled={!canvas || hasFailed}
                              title="Export PDF"
                            >
                              <FileDown className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

declare global {
  interface Window {
    JsBarcode: any;
    jspdf: any;
  }
}
