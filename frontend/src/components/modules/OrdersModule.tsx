import { useState } from 'react';
import { useListOrders, useListCustomers, useDeleteAllOrders, useCreateOrder, useListProducts } from '../../hooks/useQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Plus, Search, Loader2, Filter, Trash2, AlertTriangle, Package, CheckCircle } from 'lucide-react';
import { UserProfile } from '../../backend';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { parseStockError } from '../../utils/stockErrors';

interface OrdersModuleProps {
  userProfile: UserProfile;
}

export default function OrdersModule({ userProfile }: OrdersModuleProps) {
  const { data: orders = [], isLoading } = useListOrders();
  const { data: customers = [] } = useListCustomers();
  const { data: products = [] } = useListProducts();
  const createOrder = useCreateOrder();
  const deleteAllOrders = useDeleteAllOrders();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [formData, setFormData] = useState({
    customerId: '',
    productId: '',
    quantity: '',
  });

  const isAdmin = userProfile.appRole === 'admin';
  const canCreate = isAdmin || userProfile.appRole === 'sales';
  const canAccessFinancial = isAdmin || userProfile.appRole === 'accountant';

  const filteredOrders = orders.filter((order) => {
    const matchesSearch = 
      order.id.toString().includes(searchQuery) ||
      order.customerId.toString().includes(searchQuery) ||
      order.productId.toString().includes(searchQuery);
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const selectedProduct = products.find(p => p.productId === BigInt(formData.productId || 0));
  const availableStock = selectedProduct ? Number(selectedProduct.stockLevel) : 0;
  const requestedQuantity = Number(formData.quantity) || 0;
  const hasInsufficientStock = requestedQuantity > availableStock;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customerId || !formData.productId || !formData.quantity) {
      toast.error('Please fill in all fields');
      return;
    }

    if (hasInsufficientStock) {
      toast.error(`Insufficient stock! Only ${availableStock} units available.`);
      return;
    }

    try {
      const product = products.find(p => p.productId === BigInt(formData.productId));
      const totalPrice = product ? product.price * BigInt(formData.quantity) : BigInt(0);

      await createOrder.mutateAsync({
        customerId: BigInt(formData.customerId),
        productId: BigInt(formData.productId),
        quantity: BigInt(formData.quantity),
        status: 'confirmed',
        totalPrice,
      });
      
      toast.success(
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle className="h-4 w-4" />
            Order placed successfully!
          </div>
          <div className="text-xs text-muted-foreground">
            • Order created and confirmed<br/>
            • Inventory automatically updated<br/>
            • Dashboard updated in real-time
          </div>
        </div>
      );
      
      setDialogOpen(false);
      setFormData({ customerId: '', productId: '', quantity: '' });
    } catch (error: any) {
      const stockError = parseStockError(error);
      
      if (stockError.isInsufficientStock) {
        toast.error(
          <div className="flex flex-col gap-1">
            <div className="font-semibold">Insufficient Stock</div>
            <div className="text-xs">{stockError.message}</div>
          </div>
        );
      } else {
        toast.error(stockError.message || 'Failed to place order');
      }
      console.error(error);
    }
  };

  const handleDeleteAllOrders = async () => {
    try {
      await deleteAllOrders.mutateAsync();
      toast.success('All orders deleted successfully!');
    } catch (error) {
      toast.error('Failed to delete orders');
      console.error(error);
    }
  };

  const formatDate = (timestamp: bigint) => {
    return new Date(Number(timestamp) / 1000000).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: bigint) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(Number(amount));
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'fulfilled':
      case 'confirmed':
        return 'default';
      case 'cancelled':
        return 'destructive';
      case 'processing':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ShoppingCart className="h-8 w-8" />
            Orders
          </h1>
          <p className="text-muted-foreground mt-1">Track and manage all orders with automatic inventory updates</p>
        </div>

        <div className="flex gap-2">
          {isAdmin && orders.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  Delete All Orders
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Are you absolutely sure?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete all order data from the system.
                    <br />
                    <br />
                    <strong className="text-destructive">Warning:</strong> This is an admin-only operation that will remove all {orders.length} order(s) from the database.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAllOrders}
                    disabled={deleteAllOrders.isPending}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    {deleteAllOrders.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      'Delete All Orders'
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {canCreate && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                  <Plus className="h-4 w-4" />
                  Place Order
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Place New Order</DialogTitle>
                  <DialogDescription>
                    Create an order with automatic stock reduction and invoice generation
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                  <div className="grid gap-4 py-4">
                    <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                      <Package className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-xs">
                        <strong>Automatic workflow:</strong> Stock will be reduced and invoice generated when you confirm this order.
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                      <Label htmlFor="customerId">Customer</Label>
                      <Select value={formData.customerId} onValueChange={(value) => setFormData({ ...formData, customerId: value })}>
                        <SelectTrigger id="customerId">
                          <SelectValue placeholder="Select customer" />
                        </SelectTrigger>
                        <SelectContent>
                          {customers.map((customer) => (
                            <SelectItem key={Number(customer.id)} value={customer.id.toString()}>
                              {customer.name} (ID: {Number(customer.id)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="productId">Product</Label>
                      <Select value={formData.productId} onValueChange={(value) => setFormData({ ...formData, productId: value })}>
                        <SelectTrigger id="productId">
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={Number(product.productId)} value={product.productId.toString()}>
                              {product.name} - Stock: {Number(product.stockLevel)} ({product.inventoryStatus})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedProduct && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Available: {availableStock} units • Price: {formatCurrency(selectedProduct.price)}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantity</Label>
                      <Input
                        id="quantity"
                        type="number"
                        placeholder="Enter quantity"
                        value={formData.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                        required
                        min="1"
                      />
                      {hasInsufficientStock && formData.quantity && (
                        <Alert variant="destructive" className="mt-2">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription className="text-xs">
                            Insufficient stock! Only {availableStock} units available.
                          </AlertDescription>
                        </Alert>
                      )}
                      {selectedProduct && requestedQuantity > 0 && !hasInsufficientStock && (
                        <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                          ✓ Stock available • Total: {formatCurrency(selectedProduct.price * BigInt(requestedQuantity))}
                        </div>
                      )}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={createOrder.isPending || hasInsufficientStock}>
                      {createOrder.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="mr-2 h-4 w-4" />
                          Place Order
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <CardTitle>Order Management</CardTitle>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="fulfilled">Fulfilled</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
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
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium">No orders found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Place your first order to get started'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer ID</TableHead>
                    <TableHead>Product ID</TableHead>
                    <TableHead>Quantity</TableHead>
                    {canAccessFinancial && <TableHead>Total Price</TableHead>}
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={Number(order.id)}>
                      <TableCell className="font-medium">#{Number(order.id)}</TableCell>
                      <TableCell>#{Number(order.customerId)}</TableCell>
                      <TableCell>#{Number(order.productId)}</TableCell>
                      <TableCell>{Number(order.quantity)}</TableCell>
                      {canAccessFinancial && (
                        <TableCell className="font-medium">{formatCurrency(order.totalPrice)}</TableCell>
                      )}
                      <TableCell>
                        <Badge variant={getStatusVariant(order.status)} className="capitalize">
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(order.created)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
