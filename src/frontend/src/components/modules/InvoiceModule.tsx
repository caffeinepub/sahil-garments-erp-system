import { useState } from 'react';
import { useListCustomers, useListProducts, useCreateInvoice, useStockAdjustInvoice } from '../../hooks/useQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Plus, Trash2, Loader2, AlertCircle, Eye, CheckCircle } from 'lucide-react';
import { UserProfile, Invoice, Customer, Product, T as InvoiceStatus } from '../../backend';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import InvoiceGenerator from '../InvoiceGenerator';
import { parseStockError } from '../../utils/stockErrors';

interface InvoiceModuleProps {
  userProfile: UserProfile;
}

interface InvoiceItem {
  productId: bigint;
  productName: string;
  quantity: number;
  price: number;
  discount: number;
}

export default function InvoiceModule({ userProfile }: InvoiceModuleProps) {
  const { data: customers = [] } = useListCustomers();
  const { data: products = [] } = useListProducts();
  const createInvoice = useCreateInvoice();
  const stockAdjustInvoice = useStockAdjustInvoice();

  const [selectedCustomer, setSelectedCustomer] = useState<bigint | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [gstRate, setGstRate] = useState(18);
  const [currentItem, setCurrentItem] = useState({
    productId: '',
    quantity: '',
    discount: '',
  });
  const [showPreview, setShowPreview] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<{
    invoice: Invoice;
    customer: Customer;
    products: Product[];
  } | null>(null);

  const canAccess = userProfile.appRole === 'admin' || userProfile.appRole === 'sales' || userProfile.appRole === 'accountant';

  if (!canAccess) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access invoices. Only Sales staff, Accountants, and Admins can use this feature.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const addItem = () => {
    if (!currentItem.productId || !currentItem.quantity) {
      toast.error('Please select a product and enter quantity');
      return;
    }

    const product = products.find((p) => p.productId === BigInt(currentItem.productId));
    if (!product) {
      toast.error('Product not found');
      return;
    }

    // Check stock availability
    if (Number(product.stockLevel) < Number(currentItem.quantity)) {
      toast.error(`Insufficient stock! Available: ${product.stockLevel}, Requested: ${currentItem.quantity}`);
      return;
    }

    const newItem: InvoiceItem = {
      productId: BigInt(currentItem.productId),
      productName: product.name,
      quantity: Number(currentItem.quantity),
      price: Number(product.price),
      discount: Number(currentItem.discount) || 0,
    };

    setInvoiceItems([...invoiceItems, newItem]);
    setCurrentItem({ productId: '', quantity: '', discount: '' });
    toast.success('Item added to invoice');
  };

  const removeItem = (index: number) => {
    setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
    toast.info('Item removed from invoice');
  };

  const calculateSubtotal = () => {
    return invoiceItems.reduce((sum, item) => {
      const itemTotal = item.quantity * item.price;
      const discountAmount = (itemTotal * item.discount) / 100;
      return sum + (itemTotal - discountAmount);
    }, 0);
  };

  const calculateGST = () => {
    return (calculateSubtotal() * gstRate) / 100;
  };

  const calculateGrandTotal = () => {
    return calculateSubtotal() + calculateGST();
  };

  const generateInvoice = async () => {
    if (!selectedCustomer) {
      toast.error('Please select a customer');
      return;
    }

    if (invoiceItems.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    try {
      // Create invoice for the first item (primary product)
      const firstItem = invoiceItems[0];
      const subtotal = calculateSubtotal();
      const tax = calculateGST();
      const total = calculateGrandTotal();

      const invoiceId = await createInvoice.mutateAsync({
        customerId: selectedCustomer,
        productId: firstItem.productId,
        quantity: BigInt(firstItem.quantity),
        price: BigInt(firstItem.price),
        tax: BigInt(Math.round(tax)),
        total: BigInt(Math.round(total)),
        status: InvoiceStatus.sent,
      });

      // Adjust stock for the invoice
      await stockAdjustInvoice.mutateAsync(invoiceId);

      toast.success(
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle className="h-4 w-4" />
            Invoice generated successfully!
          </div>
          <div className="text-xs text-muted-foreground">
            • Invoice #{invoiceId.toString()} created<br/>
            • Inventory automatically updated<br/>
            • Check Invoice History for details
          </div>
        </div>
      );

      setInvoiceItems([]);
      setSelectedCustomer(null);
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
        toast.error(stockError.message || 'Failed to generate invoice');
      }
      console.error(error);
    }
  };

  const previewInvoiceDocument = () => {
    if (!selectedCustomer || invoiceItems.length === 0) {
      toast.error('Please select a customer and add items first');
      return;
    }

    const customer = customers.find((c) => c.id === selectedCustomer);
    if (!customer) {
      toast.error('Customer not found');
      return;
    }

    // Collect all products for the invoice
    const invoiceProducts = invoiceItems
      .map((item) => products.find((p) => p.productId === item.productId))
      .filter((p): p is Product => p !== undefined);

    if (invoiceProducts.length === 0) {
      toast.error('Products not found');
      return;
    }

    const subtotal = calculateSubtotal();
    const tax = calculateGST();
    const total = calculateGrandTotal();

    // Use first item for primary product reference
    const firstItem = invoiceItems[0];

    const mockInvoice: Invoice = {
      invoiceId: BigInt(Date.now()),
      customerId: selectedCustomer,
      productId: firstItem.productId,
      quantity: BigInt(firstItem.quantity),
      price: BigInt(firstItem.price),
      tax: BigInt(Math.round(tax)),
      total: BigInt(Math.round(total)),
      status: InvoiceStatus.draft,
      dueDate: undefined,
      paymentDate: undefined,
      productIds: invoiceItems.map((i) => i.productId),
      orderIds: [],
      inventoryIds: [],
      created: BigInt(Date.now() * 1000000),
      lastModified: BigInt(Date.now() * 1000000),
      imageUrl: undefined,
      pdfUrl: undefined,
      stockAdjusted: false,
    };

    setPreviewInvoice({ invoice: mockInvoice, customer, products: invoiceProducts });
    setShowPreview(true);
  };

  const sendViaWhatsApp = () => {
    if (!selectedCustomer) {
      toast.error('Please select a customer first');
      return;
    }
    const customer = customers.find((c) => c.id === selectedCustomer);
    if (customer) {
      const message = `Invoice from Sahil Garments\nTotal: ₹${calculateGrandTotal().toFixed(2)}`;
      const whatsappUrl = `https://wa.me/${customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    }
  };

  const sendViaSMS = () => {
    toast.warning('SMS integration requires backend API configuration');
  };

  const sendViaEmail = () => {
    toast.warning('Email integration requires backend SMTP configuration');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Invoice Management
          </h1>
          <p className="text-muted-foreground mt-1">Create and manage sales invoices with automatic stock updates</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Create Invoice</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="customer">Select Customer</Label>
              <Select
                value={selectedCustomer?.toString() || ''}
                onValueChange={(value) => setSelectedCustomer(BigInt(value))}
              >
                <SelectTrigger id="customer">
                  <SelectValue placeholder="Choose a customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={Number(customer.id)} value={customer.id.toString()}>
                      {customer.name} - {customer.phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border rounded-lg p-4 space-y-4">
              <h3 className="font-semibold">Add Items</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="productId">Product</Label>
                  <Select
                    value={currentItem.productId}
                    onValueChange={(value) => setCurrentItem({ ...currentItem, productId: value })}
                  >
                    <SelectTrigger id="productId">
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={Number(product.productId)} value={product.productId.toString()}>
                          {product.name} (Stock: {Number(product.stockLevel)})
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
                    placeholder="Qty"
                    value={currentItem.quantity}
                    onChange={(e) => setCurrentItem({ ...currentItem, quantity: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discount">Discount %</Label>
                  <Input
                    id="discount"
                    type="number"
                    placeholder="0"
                    value={currentItem.discount}
                    onChange={(e) => setCurrentItem({ ...currentItem, discount: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>&nbsp;</Label>
                  <Button onClick={addItem} className="w-full">
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
              </div>
            </div>

            {invoiceItems.length > 0 && (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoiceItems.map((item, index) => {
                      const itemTotal = item.quantity * item.price;
                      const discountAmount = (itemTotal * item.discount) / 100;
                      const finalTotal = itemTotal - discountAmount;

                      return (
                        <TableRow key={index}>
                          <TableCell>{item.productName}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{formatCurrency(item.price)}</TableCell>
                          <TableCell>{item.discount}%</TableCell>
                          <TableCell className="font-medium">{formatCurrency(finalTotal)}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="ghost" onClick={() => removeItem(index)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
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

        <Card>
          <CardHeader>
            <CardTitle>Invoice Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gst">GST Rate (%)</Label>
              <Input id="gst" type="number" value={gstRate} onChange={(e) => setGstRate(Number(e.target.value))} />
            </div>

            <div className="space-y-2 pt-4 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-medium">{formatCurrency(calculateSubtotal())}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">GST ({gstRate}%):</span>
                <span className="font-medium">{formatCurrency(calculateGST())}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Grand Total:</span>
                <span style={{ color: '#D4AF37' }}>{formatCurrency(calculateGrandTotal())}</span>
              </div>
            </div>

            <div className="space-y-2 pt-4">
              <Button
                onClick={previewInvoiceDocument}
                disabled={invoiceItems.length === 0}
                variant="outline"
                className="w-full"
              >
                <Eye className="mr-2 h-4 w-4" />
                Preview Invoice
              </Button>

              <Button
                onClick={generateInvoice}
                disabled={createInvoice.isPending || stockAdjustInvoice.isPending || invoiceItems.length === 0}
                className="w-full"
                style={{ backgroundColor: '#D4AF37', color: '#000000' }}
              >
                {createInvoice.isPending || stockAdjustInvoice.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Generate Invoice
                  </>
                )}
              </Button>

              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-2">Send Invoice:</p>
                <div className="grid grid-cols-3 gap-2">
                  <Button onClick={sendViaWhatsApp} size="sm" variant="outline">
                    WhatsApp
                  </Button>
                  <Button onClick={sendViaSMS} size="sm" variant="outline">
                    SMS
                  </Button>
                  <Button onClick={sendViaEmail} size="sm" variant="outline">
                    Email
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice Preview</DialogTitle>
          </DialogHeader>
          {previewInvoice && (
            <InvoiceGenerator
              invoice={previewInvoice.invoice}
              customer={previewInvoice.customer}
              products={previewInvoice.products}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
