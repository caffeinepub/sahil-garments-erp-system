// Invoice document utilities and constants for Sahil Garments template

export const INVOICE_COLORS = {
  gold: '#D4AF37',
  black: '#000000',
  gray: '#666666',
  lightGray: '#F5F5F5',
  white: '#FFFFFF',
  tableRowBg: '#F9F9F9',
};

export const INVOICE_LAYOUT = {
  canvasWidth: 800,
  canvasHeight: 1000,
  padding: 60,
  headerHeight: 150,
  tableTop: 330,
  tableHeaderHeight: 40,
  tableRowHeight: 40,
};

export interface InvoiceLineItem {
  srNo: number;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export function formatCurrency(amount: bigint | number): string {
  const num = typeof amount === 'bigint' ? Number(amount) : amount;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatDate(timestamp: bigint): string {
  const date = new Date(Number(timestamp) / 1000000);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function buildLineItems(
  invoice: any,
  products: any[]
): InvoiceLineItem[] {
  // If invoice has productIds array, use it for multiple items
  if (invoice.productIds && invoice.productIds.length > 0) {
    return invoice.productIds.map((productId: bigint, index: number) => {
      const product = products.find((p) => p.productId === productId);
      const quantity = Number(invoice.quantity) || 1;
      const unitPrice = product ? Number(product.price) : Number(invoice.price);
      return {
        srNo: index + 1,
        description: product?.name || 'Unknown Product',
        quantity,
        unitPrice,
        total: quantity * unitPrice,
      };
    });
  }

  // Fallback to single product
  const product = products.find((p) => p.productId === invoice.productId);
  const quantity = Number(invoice.quantity);
  const unitPrice = Number(invoice.price);
  return [
    {
      srNo: 1,
      description: product?.name || 'Unknown Product',
      quantity,
      unitPrice,
      total: quantity * unitPrice,
    },
  ];
}

export function calculateTotals(lineItems: InvoiceLineItem[], invoice: any) {
  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const tax = Number(invoice.tax);
  const grandTotal = subtotal + tax;
  const gstPercentage = subtotal > 0 ? ((tax / subtotal) * 100).toFixed(0) : '0';

  return {
    subtotal,
    tax,
    grandTotal,
    gstPercentage,
  };
}
