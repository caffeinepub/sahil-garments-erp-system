import { useState } from 'react';
import { useListCustomers, useListProducts, useCreateInvoice, useStockAdjustInvoice, useGetInvoice } from '../../hooks/useQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Receipt, Plus, Loader2, AlertCircle } from 'lucide-react';
import { UserProfile, T as InvoiceStatus } from '../../backend';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import InvoiceGenerator from '../InvoiceGenerator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { parseStockError } from '../../utils/stockErrors';

interface InvoiceModuleProps {
  userProfile: UserProfile;
}

interface InvoiceItem {
  productId: bigint;
  quantity: number;
  price: number;
}

export default function InvoiceModule({ userProfile }: InvoiceModuleProps) {
  const { data: customers = [], isLoading: customersLoading } = useListCustomers();
  const { data: products = [], isLoading: productsLoading } = useListProducts();
  const createInvoice = useCreateInvoice();
  const stockAdjustInvoice = useStockAdjustInvoice();

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [currentProductId, setCurrentProductId] = useState<string>('');
  const [currentQuantity, setCurrentQuantity] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);
  const [createdInvoiceId, setCreatedInvoiceId] = useState<bigint | null>(null);

  const { data: createdInvoice } = useGetInvoice(createdInvoiceId);

  const GST_RATE = 0.18;

  const handleAddItem = () => {
    if (!currentProductId || !currentQuantity) {
      toast.error('Please select a product and enter quantity');
      return;
    }

    const product = products.find((p) => p.productId.toString() === currentProductId);
    if (!product) {
      toast.error('Product not found');
      return;
    }

    const quantity = parseInt(currentQuantity);
    if (quantity <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }

    if (quantity > Number(product.stockLevel)) {
      toast.error(`Insufficient stock. Available: ${product.stockLevel}`);
      return;
    }

    setInvoiceItems([
      ...invoiceItems,
      {
        productId: product.productId,
        quantity,
        price: Number(product.price),
      },
    ]);

    setCurrentProductId('');
    setCurrentQuantity('');
  };

  const handleRemoveItem = (index: number) => {
    setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    const subtotal = invoiceItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tax = subtotal * GST_RATE;
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const handleCreateInvoice = async () => {
    if (!selectedCustomerId) {
      toast.error('Please select a customer');
      return;
    }

    if (invoiceItems.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    try {
      const { subtotal, tax, total } = calculateTotals();

      const firstItem = invoiceItems[0];
      const invoiceId = await createInvoice.mutateAsync({
        customerId: BigInt(selectedCustomerId),
        productId: firstItem.productId,
        quantity: BigInt(firstItem.quantity),
        price: BigInt(firstItem.price),
        tax: BigInt(Math.round(tax)),
        total: BigInt(Math.round(total)),
        status: InvoiceStatus.sent,
      });

      setCreatedInvoiceId(invoiceId);

      try {
        await stockAdjustInvoice.mutateAsync(invoiceId);
        toast.success('Invoice created and stock adjusted successfully!');
      } catch (stockError: any) {
        const errorResult = parseStockError(stockError);
        toast.error(errorResult.message);
        console.error('Stock adjustment error:', stockError);
      }

      setShowPreview(true);
    } catch (error: any) {
      const errorResult = parseStockError(error);
      toast.error(errorResult.message);
      console.error('Invoice creation error:', error);
    }
  };

  const handleReset = () => {
    setSelectedCustomerId('');
    setInvoiceItems([]);
    setCurrentProductId('');
    setCurrentQuantity('');
    setShowPreview(false);
    setCreatedInvoiceId(null);
  };

  const { subtotal, tax, total } = calculateTotals();

  const selectedCustomer = customers.find((c) => c.id.toString() === selectedCustomerId);

  if (showPreview && createdInvoice && selectedCustomer) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Receipt className="h-8 w-8" />
              Invoice Preview
            </h1>
            <p className="text-muted-foreground mt-1">Review and download your invoice</p>
          </div>
          <Button onClick={handleReset}>Create New Invoice</Button>
        </div>

        <InvoiceGenerator
          invoice={createdInvoice}
          customer={selectedCustomer}
          products={products}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Receipt className="h-8 w-8" />
          Create Invoice
        </h1>
        <p className="text-muted-foreground mt-1">Generate invoices for customers with automatic stock adjustment</p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Stock will be automatically adjusted when the invoice is created. Make sure to verify quantities before proceeding.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {customersLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <div className="space-y-2">
                <Label htmlFor="customer">Select Customer</Label>
                <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                  <SelectTrigger id="customer">
                    <SelectValue placeholder="Choose a customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id.toString()} value={customer.id.toString()}>
                        {customer.name} - {customer.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedCustomer && (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p className="text-sm">
                  <span className="font-semibold">Name:</span> {selectedCustomer.name}
                </p>
                <p className="text-sm">
                  <span className="font-semibold">Email:</span> {selectedCustomer.email}
                </p>
                <p className="text-sm">
                  <span className="font-semibold">Phone:</span> {selectedCustomer.phone}
                </p>
                <p className="text-sm">
                  <span className="font-semibold">Address:</span> {selectedCustomer.address}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add Products</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {productsLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="product">Select Product</Label>
                  <Select value={currentProductId} onValueChange={setCurrentProductId}>
                    <SelectTrigger id="product">
                      <SelectValue placeholder="Choose a product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.productId.toString()} value={product.productId.toString()}>
                          {product.name} - ₹{Number(product.price)} (Stock: {Number(product.stockLevel)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={currentQuantity}
                    onChange={(e) => setCurrentQuantity(e.target.value)}
                    placeholder="Enter quantity"
                  />
                </div>

                <Button onClick={handleAddItem} className="w-full gap-2">
                  <Plus className="h-4 w-4" />
                  Add Item
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Items</CardTitle>
        </CardHeader>
        <CardContent>
          {invoiceItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No items added yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                {invoiceItems.map((item, index) => {
                  const product = products.find((p) => p.productId === item.productId);
                  return (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">{product?.name || 'Unknown Product'}</p>
                        <p className="text-sm text-muted-foreground">
                          Quantity: {item.quantity} × ₹{item.price} = ₹{item.quantity * item.price}
                        </p>
                      </div>
                      <Button variant="destructive" size="sm" onClick={() => handleRemoveItem(index)}>
                        Remove
                      </Button>
                    </div>
                  );
                })}
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>GST (18%):</span>
                  <span>₹{tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>
              </div>

              <Button
                onClick={handleCreateInvoice}
                disabled={createInvoice.isPending || stockAdjustInvoice.isPending}
                className="w-full gap-2"
              >
                {createInvoice.isPending || stockAdjustInvoice.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating Invoice...
                  </>
                ) : (
                  <>
                    <Receipt className="h-4 w-4" />
                    Create Invoice
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
