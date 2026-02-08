import { useState } from 'react';
import { useListProducts, useAddProduct, useUpdateProduct, useListInventory, useDeleteAllInventory } from '../../hooks/useQueries';
import { useQRScanner } from '../../qr-code/useQRScanner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Package, Plus, Search, Loader2, AlertTriangle, QrCode, Camera, CameraOff, CheckCircle2, AlertCircle, Barcode, Trash2 } from 'lucide-react';
import { UserProfile, Product } from '../../backend';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import BarcodeGenerator from '../BarcodeGenerator';

interface InventoryModuleProps {
  userProfile: UserProfile;
}

export default function InventoryModule({ userProfile }: InventoryModuleProps) {
  const { data: products = [], isLoading } = useListProducts();
  const { data: inventory = [] } = useListInventory();
  const addProduct = useAddProduct();
  const updateProduct = useUpdateProduct();
  const deleteAllInventory = useDeleteAllInventory();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [barcodeGeneratorOpen, setBarcodeGeneratorOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stockLevel: '',
    warehouse: '',
    rack: '',
    shelf: '',
    size: '',
    color: '',
    barcode: '',
  });

  const {
    qrResults,
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
    maxResults: 1,
  });

  const isAdmin = userProfile.appRole === 'admin';
  const canCreate = isAdmin || userProfile.appRole === 'inventoryManager';

  const filteredProducts = products.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.barcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.size.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.color.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const lowStockProducts = products.filter((item) => Number(item.stockLevel) < 10);

  const generateBarcode = (productId?: bigint) => {
    if (productId) {
      return `SG${productId.toString().padStart(8, '0')}`;
    }
    const randomId = Math.floor(Math.random() * 100000000);
    return `SG${randomId.toString().padStart(8, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.price || !formData.stockLevel) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      const barcode = formData.barcode || generateBarcode();
      
      if (editingProduct) {
        await updateProduct.mutateAsync({
          productId: editingProduct.productId,
          name: formData.name,
          description: formData.description,
          price: BigInt(formData.price),
          stockLevel: BigInt(formData.stockLevel),
          warehouse: formData.warehouse,
          rack: formData.rack,
          shelf: formData.shelf,
          size: formData.size,
          color: formData.color,
          barcode,
        });
        toast.success('Product updated successfully!');
      } else {
        await addProduct.mutateAsync({
          name: formData.name,
          description: formData.description,
          price: BigInt(formData.price),
          stockLevel: BigInt(formData.stockLevel),
          warehouse: formData.warehouse,
          rack: formData.rack,
          shelf: formData.shelf,
          size: formData.size,
          color: formData.color,
          barcode,
        });
        toast.success('Product added successfully!');
      }
      
      setDialogOpen(false);
      setEditingProduct(null);
      setFormData({
        name: '',
        description: '',
        price: '',
        stockLevel: '',
        warehouse: '',
        rack: '',
        shelf: '',
        size: '',
        color: '',
        barcode: '',
      });
    } catch (error) {
      toast.error(editingProduct ? 'Failed to update product' : 'Failed to add product');
      console.error(error);
    }
  };

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      stockLevel: product.stockLevel.toString(),
      warehouse: product.warehouse,
      rack: product.rack,
      shelf: product.shelf,
      size: product.size,
      color: product.color,
      barcode: product.barcode,
    });
    setDialogOpen(true);
  };

  const handleGenerateBarcode = (product: Product) => {
    setSelectedProduct(product);
    setBarcodeGeneratorOpen(true);
  };

  const handleDeleteAllInventory = async () => {
    try {
      await deleteAllInventory.mutateAsync();
      toast.success('All inventory data deleted successfully!');
    } catch (error) {
      toast.error('Failed to delete inventory data');
      console.error(error);
    }
  };

  const handleScanResult = (barcode: string) => {
    const product = products.find((p) => p.barcode === barcode);
    if (product) {
      const inventoryItem = inventory.find((i) => i.productId === product.productId);
      const stockInfo = inventoryItem ? `${Number(inventoryItem.quantity)} units` : 'No inventory record';
      
      toast.success(
        <div className="space-y-1">
          <p className="font-semibold">{product.name}</p>
          <p className="text-sm">Stock: {Number(product.stockLevel)} units</p>
          <p className="text-sm">Size: {product.size} | Color: {product.color}</p>
          <p className="text-sm">Location: {product.warehouse} - {product.rack} - {product.shelf}</p>
        </div>,
        { duration: 5000 }
      );
      
      stopScanning();
      setScannerOpen(false);
      clearResults();
    } else {
      toast.warning(`Product not found for barcode: ${barcode}`);
    }
  };

  // Auto-handle scan results
  if (qrResults.length > 0 && scannerOpen) {
    const latestResult = qrResults[0];
    handleScanResult(latestResult.data);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Package className="h-8 w-8" />
            Inventory
          </h1>
          <p className="text-muted-foreground mt-1">Manage products, stock levels, and locations</p>
        </div>

        <div className="flex gap-2">
          {isAdmin && products.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  Delete All Inventory
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Are you absolutely sure?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete all inventory data including products, stock levels, and transaction history from the system.
                    <br />
                    <br />
                    <strong className="text-destructive">Warning:</strong> This is an admin-only operation that will remove all {products.length} product(s) and their associated data from the database.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAllInventory}
                    disabled={deleteAllInventory.isPending}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    {deleteAllInventory.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      'Delete All Inventory'
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          <Button
            variant="outline"
            onClick={() => setScannerOpen(true)}
            className="gap-2"
          >
            <QrCode className="h-4 w-4" />
            Scan Barcode
          </Button>
          
          {canCreate && (
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) {
                setEditingProduct(null);
                setFormData({
                  name: '',
                  description: '',
                  price: '',
                  stockLevel: '',
                  warehouse: '',
                  rack: '',
                  shelf: '',
                  size: '',
                  color: '',
                  barcode: '',
                });
              }
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                  <Plus className="h-4 w-4" />
                  Add Product
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
                  <DialogDescription>
                    {editingProduct ? 'Update product information' : 'Add a new product to the inventory'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Product Name *</Label>
                        <Input
                          id="name"
                          placeholder="e.g., Cotton Shirt"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="barcode">Barcode</Label>
                        <Input
                          id="barcode"
                          placeholder="Auto-generated if empty"
                          value={formData.barcode}
                          onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Product description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="price">Price (₹) *</Label>
                        <Input
                          id="price"
                          type="number"
                          placeholder="0"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="stockLevel">Stock Level *</Label>
                        <Input
                          id="stockLevel"
                          type="number"
                          placeholder="0"
                          value={formData.stockLevel}
                          onChange={(e) => setFormData({ ...formData, stockLevel: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="size">Size</Label>
                        <Input
                          id="size"
                          placeholder="e.g., M, L, XL"
                          value={formData.size}
                          onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="color">Color</Label>
                      <Input
                        id="color"
                        placeholder="e.g., Blue, Red, White"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="warehouse">Warehouse</Label>
                        <Input
                          id="warehouse"
                          placeholder="e.g., Main"
                          value={formData.warehouse}
                          onChange={(e) => setFormData({ ...formData, warehouse: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="rack">Rack</Label>
                        <Input
                          id="rack"
                          placeholder="e.g., A1"
                          value={formData.rack}
                          onChange={(e) => setFormData({ ...formData, rack: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="shelf">Shelf</Label>
                        <Input
                          id="shelf"
                          placeholder="e.g., S3"
                          value={formData.shelf}
                          onChange={(e) => setFormData({ ...formData, shelf: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={addProduct.isPending || updateProduct.isPending}>
                      {(addProduct.isPending || updateProduct.isPending) ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {editingProduct ? 'Updating...' : 'Adding...'}
                        </>
                      ) : (
                        editingProduct ? 'Update Product' : 'Add Product'
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {lowStockProducts.length > 0 && (
        <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
              Low Stock Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-amber-700 dark:text-amber-400">
              {lowStockProducts.length} product{lowStockProducts.length !== 1 ? 's' : ''} running low on stock (below 10 units)
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Product Catalog</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium">No products found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery ? 'Try adjusting your search' : 'Add your first product to get started'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Barcode</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => {
                    const stockLevel = Number(product.stockLevel);
                    const isLowStock = stockLevel < 10;
                    
                    return (
                      <TableRow key={Number(product.productId)}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{product.name}</p>
                            {product.description && (
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {product.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="gap-1 font-mono text-xs">
                            <QrCode className="h-3 w-3" />
                            {product.barcode}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {product.size ? (
                            <Badge variant="outline">{product.size}</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {product.color ? (
                            <Badge variant="outline">{product.color}</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">₹{Number(product.price)}</TableCell>
                        <TableCell>
                          <span className={isLowStock ? 'text-amber-600 font-semibold' : 'font-medium'}>
                            {stockLevel} units
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">
                          {product.warehouse || product.rack || product.shelf ? (
                            <div className="text-xs">
                              {product.warehouse && <div>W: {product.warehouse}</div>}
                              {product.rack && <div>R: {product.rack}</div>}
                              {product.shelf && <div>S: {product.shelf}</div>}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {isLowStock ? (
                            <Badge variant="destructive" className="gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Low Stock
                            </Badge>
                          ) : (
                            <Badge variant="default">In Stock</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleGenerateBarcode(product)}
                              title="Generate Barcode"
                            >
                              <Barcode className="h-4 w-4" />
                            </Button>
                            {canCreate && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(product)}
                              >
                                Edit
                              </Button>
                            )}
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

      {/* Barcode Scanner Dialog */}
      <Dialog open={scannerOpen} onOpenChange={(open) => {
        setScannerOpen(open);
        if (!open) {
          stopScanning();
          clearResults();
        }
      }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Scan Product Barcode</DialogTitle>
            <DialogDescription>
              Point your camera at a product barcode to look up stock information
            </DialogDescription>
          </DialogHeader>
          
          {isSupported === false ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Camera is not supported in your browser. Please use a modern browser with camera support.
              </AlertDescription>
            </Alert>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
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
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Scanning...
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
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Barcode Generator Dialog */}
      {selectedProduct && (
        <BarcodeGenerator
          product={selectedProduct}
          open={barcodeGeneratorOpen}
          onOpenChange={setBarcodeGeneratorOpen}
        />
      )}
    </div>
  );
}
