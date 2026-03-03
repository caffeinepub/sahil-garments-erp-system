import { useState } from 'react';
import { useQRScanner } from '../../qr-code/useQRScanner';
import { useListProducts, useUpdateProduct } from '../../hooks/useQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { QrCode, Camera, CameraOff, AlertCircle, CheckCircle2, Package, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { UserProfile, Product } from '../../backend';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface BarcodeModuleProps {
  userProfile: UserProfile;
}

export default function BarcodeModule({ userProfile }: BarcodeModuleProps) {
  const { data: products = [] } = useListProducts();
  const updateProduct = useUpdateProduct();
  const [scanMode, setScanMode] = useState<'in' | 'out'>('in');
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; product: Product | null; mode: 'in' | 'out' }>({
    open: false,
    product: null,
    mode: 'in',
  });
  
  const {
    qrResults,
    isScanning,
    isActive,
    isSupported,
    error,
    canStartScanning,
    startScanning,
    stopScanning,
    clearResults,
    videoRef,
    canvasRef,
  } = useQRScanner({
    facingMode: 'environment',
    scanInterval: 100,
    maxResults: 10,
  });

  const canAccess = userProfile.appRole === 'admin' || userProfile.appRole === 'inventoryManager';

  if (!canAccess) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access the barcode scanner. Only Inventory Managers and Admins can use this feature.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleScan = (barcodeData: string) => {
    const product = products.find((p) => p.barcode === barcodeData);
    
    if (product) {
      setConfirmDialog({
        open: true,
        product,
        mode: scanMode,
      });
    } else {
      toast.warning(`Product not found for barcode: ${barcodeData}`);
    }
  };

  const handleConfirmStockOperation = async () => {
    if (!confirmDialog.product) return;

    const product = confirmDialog.product;
    const currentStock = Number(product.stockLevel);
    const newStock = confirmDialog.mode === 'in' ? currentStock + 1 : Math.max(0, currentStock - 1);

    try {
      await updateProduct.mutateAsync({
        productId: product.productId,
        name: product.name,
        description: product.description,
        price: product.price,
        stockLevel: BigInt(newStock),
        warehouse: product.warehouse,
        rack: product.rack,
        shelf: product.shelf,
        size: product.size,
        color: product.color,
        barcode: product.barcode,
      });

      toast.success(
        <div className="space-y-1">
          <p className="font-semibold">Stock {confirmDialog.mode === 'in' ? 'IN' : 'OUT'} Confirmed</p>
          <p className="text-sm">{product.name}</p>
          <p className="text-sm">New Stock: {newStock} units</p>
        </div>,
        { duration: 3000 }
      );

      setConfirmDialog({ open: false, product: null, mode: 'in' });
    } catch (error) {
      toast.error('Failed to update stock level');
      console.error(error);
    }
  };

  if (isSupported === false) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Camera is not supported in your browser. Please use a modern browser with camera support.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <QrCode className="h-8 w-8" />
            Barcode Scanner
          </h1>
          <p className="text-muted-foreground mt-1">Scan barcodes to track stock IN/OUT operations</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error.message}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Camera Scanner</span>
              <Badge variant={isActive ? 'default' : 'secondary'}>
                {isActive ? 'Active' : 'Inactive'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 mb-4">
              <Button
                variant={scanMode === 'in' ? 'default' : 'outline'}
                onClick={() => setScanMode('in')}
                className="flex-1"
              >
                <ArrowDownCircle className="h-4 w-4 mr-2" />
                Stock IN
              </Button>
              <Button
                variant={scanMode === 'out' ? 'default' : 'outline'}
                onClick={() => setScanMode('out')}
                className="flex-1"
              >
                <ArrowUpCircle className="h-4 w-4 mr-2" />
                Stock OUT
              </Button>
            </div>

            <div className="relative aspect-video bg-slate-900 rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {!isActive && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
                  <div className="text-center text-white">
                    <Camera className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-sm">Camera preview will appear here</p>
                  </div>
                </div>
              )}

              {isActive && (
                <div className="absolute top-4 left-4 right-4">
                  <Badge variant="default" className={scanMode === 'in' ? 'bg-green-600' : 'bg-orange-600'}>
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Scanning {scanMode === 'in' ? 'IN' : 'OUT'}
                  </Badge>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              {!isActive ? (
                <Button
                  onClick={startScanning}
                  disabled={!canStartScanning}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Start Scanner
                </Button>
              ) : (
                <Button
                  onClick={stopScanning}
                  variant="destructive"
                  className="flex-1"
                >
                  <CameraOff className="mr-2 h-4 w-4" />
                  Stop Scanner
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Scan Results</span>
              {qrResults.length > 0 && (
                <Button size="sm" variant="outline" onClick={clearResults}>
                  Clear
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {qrResults.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>No scans yet</p>
                <p className="text-sm mt-1">Start scanning to see results here</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {qrResults.map((result) => {
                  const product = products.find((p) => p.barcode === result.data);

                  return (
                    <div
                      key={result.timestamp}
                      className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => handleScan(result.data)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{result.data}</p>
                          {product && (
                            <div className="space-y-1 mt-1">
                              <p className="text-sm font-medium">{product.name}</p>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className="text-xs">
                                  Stock: {Number(product.stockLevel)} units
                                </Badge>
                                {product.size && (
                                  <Badge variant="outline" className="text-xs">
                                    Size: {product.size}
                                  </Badge>
                                )}
                                {product.color && (
                                  <Badge variant="outline" className="text-xs">
                                    Color: {product.color}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(result.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                        <Badge variant={scanMode === 'in' ? 'default' : 'secondary'}>
                          {scanMode === 'in' ? 'IN' : 'OUT'}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Barcode Format & Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Sahil Garments uses Code128 barcode format with the following structure:
              </p>
              <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm">
                SG[8-digit Product ID]
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Example: SG00000123 for Product ID 123
              </p>
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>How to use:</strong>
                <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                  <li>Select Stock IN or Stock OUT mode</li>
                  <li>Start the camera scanner</li>
                  <li>Point your camera at the barcode</li>
                  <li>Confirm the operation when prompted</li>
                  <li>Stock levels will update automatically</li>
                </ol>
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false, product: null, mode: 'in' })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Confirm Stock {confirmDialog.mode === 'in' ? 'IN' : 'OUT'}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                {confirmDialog.product && (
                  <>
                    <div className="bg-muted p-4 rounded-lg space-y-2">
                      <p className="font-semibold text-foreground">{confirmDialog.product.name}</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Barcode:</span>
                          <p className="font-mono">{confirmDialog.product.barcode}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Current Stock:</span>
                          <p className="font-semibold">{Number(confirmDialog.product.stockLevel)} units</p>
                        </div>
                        {confirmDialog.product.size && (
                          <div>
                            <span className="text-muted-foreground">Size:</span>
                            <p>{confirmDialog.product.size}</p>
                          </div>
                        )}
                        {confirmDialog.product.color && (
                          <div>
                            <span className="text-muted-foreground">Color:</span>
                            <p>{confirmDialog.product.color}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-sm">
                      {confirmDialog.mode === 'in' ? (
                        <>
                          <ArrowDownCircle className="inline h-4 w-4 mr-1 text-green-600" />
                          This will <strong>increase</strong> the stock level by 1 unit.
                        </>
                      ) : (
                        <>
                          <ArrowUpCircle className="inline h-4 w-4 mr-1 text-orange-600" />
                          This will <strong>decrease</strong> the stock level by 1 unit.
                        </>
                      )}
                    </p>
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmStockOperation}
              disabled={updateProduct.isPending}
              className={confirmDialog.mode === 'in' ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'}
            >
              {updateProduct.isPending ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Confirm {confirmDialog.mode === 'in' ? 'IN' : 'OUT'}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
