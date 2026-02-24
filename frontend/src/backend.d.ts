import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface BarcodeExportRequest {
    exportType: BarcodeExportFormat;
    productId: bigint;
}
export interface Product {
    inventoryStatus: InventoryStatus;
    name: string;
    color: string;
    rack: string;
    size: string;
    description: string;
    productId: bigint;
    shelf: string;
    barcode: string;
    stockLevel: bigint;
    price: bigint;
    warehouse: string;
    supplierId?: bigint;
    images: Array<ExternalBlob>;
}
export type Time = bigint;
export interface Stats {
    totalOrders: bigint;
    totalInventory: bigint;
    totalRevenue: bigint;
    totalCustomers: bigint;
}
export interface ReportDateRange {
    endDate: Time;
    startDate: Time;
}
export interface ProfitLossReport {
    reportDateRange: ReportDateRange;
    revenue: bigint;
    grossProfit: bigint;
    cogs: bigint;
    expenses: bigint;
    netProfit: bigint;
}
export interface DataEntry {
    id: bigint;
    created: Time;
    modified: Time;
    entryId: bigint;
    quantity: bigint;
    entityType: string;
    amount: bigint;
}
export interface BootstrapStatus {
    canisterStatus?: SystemStatus;
    backendAvailable: boolean;
    jsonSupport: boolean;
}
export interface AppBootstrapState {
    isApproved: boolean;
    isAdmin: boolean;
    userProfile?: UserProfile;
}
export interface InventoryRecord {
    id: bigint;
    created: Time;
    modified: Time;
    productId: bigint;
    quantity: bigint;
    batch: string;
    supplierId: bigint;
}
export interface InventoryLocation {
    rack: string;
    shelf: string;
    warehouse: string;
}
export interface BarcodeBatchExportRequest {
    productIds: Array<bigint>;
    exportType: BarcodeExportFormat;
}
export interface InvoiceFilter {
    paymentStatus?: T;
    customerId?: bigint;
    invoiceDateRange?: ReportDateRange;
    searchQuery?: string;
}
export interface OrderRecord {
    id: bigint;
    status: string;
    created: Time;
    modified: Time;
    productId: bigint;
    quantity: bigint;
    customerId: bigint;
    totalPrice: bigint;
}
export interface Invoice {
    tax: bigint;
    status: T;
    created: Time;
    total: bigint;
    productIds: Array<bigint>;
    stockAdjusted: boolean;
    dueDate?: Time;
    invoiceId: bigint;
    productId: bigint;
    lastModified: Time;
    imageUrl?: string;
    pdfUrl?: string;
    paymentDate?: Time;
    quantity: bigint;
    customerId: bigint;
    orderIds: Array<bigint>;
    price: bigint;
    inventoryIds: Array<bigint>;
}
export interface Customer {
    id: bigint;
    created: Time;
    modified: Time;
    name: string;
    email: string;
    address: string;
    phone: string;
}
export interface UserApprovalInfo {
    status: ApprovalStatus;
    principal: Principal;
}
export interface Notification {
    title: string;
    userId: Principal;
    isRead: boolean;
    message: string;
    timestamp: Time;
    notificationId: bigint;
}
export interface UserProfile {
    appRole: AppRole;
    name: string;
    email: string;
    department: string;
}
export enum AppRole {
    accountant = "accountant",
    admin = "admin",
    sales = "sales",
    inventoryManager = "inventoryManager"
}
export enum ApprovalStatus {
    pending = "pending",
    approved = "approved",
    rejected = "rejected"
}
export enum BarcodeExportFormat {
    pdf = "pdf",
    png = "png"
}
export enum InventoryStatus {
    low = "low",
    inStock = "inStock",
    outOfStock = "outOfStock"
}
export enum InvoiceExportFormat {
    pdf = "pdf",
    excel = "excel"
}
export enum SystemStatus {
    initialized = "initialized",
    unknown_ = "unknown"
}
export enum T {
    paid = "paid",
    sent = "sent",
    overdue = "overdue",
    draft = "draft"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addInventoryEntry(productId: bigint, quantity: bigint, batch: string, supplierId: bigint): Promise<bigint>;
    addProduct(name: string, description: string, price: bigint, stockLevel: bigint, warehouse: string, rack: string, shelf: string, size: string, color: string, barcode: string): Promise<bigint>;
    addProductImage(productId: bigint, blob: ExternalBlob): Promise<void>;
    addSecondaryAdminEmail(email: string): Promise<void>;
    approveUser(user: Principal): Promise<void>;
    assignAppRole(user: Principal, role: AppRole): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    batchExportBarcodes(arg0: BarcodeBatchExportRequest): Promise<ExternalBlob>;
    clearAllInvoices(): Promise<void>;
    clearPreviousRejection(user: Principal): Promise<void>;
    createCustomer(name: string, email: string, phone: string, address: string): Promise<bigint>;
    createDataEntry(entityType: string, entryId: bigint, amount: bigint, quantity: bigint): Promise<bigint>;
    createInvoice(customerId: bigint, productId: bigint, quantity: bigint, price: bigint, tax: bigint, total: bigint, status: T): Promise<bigint>;
    createNotification(targetUser: Principal, title: string, message: string): Promise<bigint>;
    createOrder(customerId: bigint, productId: bigint, quantity: bigint, status: string, totalPrice: bigint): Promise<bigint>;
    deleteAllInventory(): Promise<void>;
    deleteAllOrders(): Promise<void>;
    deleteCustomer(customerId: bigint): Promise<boolean>;
    deleteNotification(notificationId: bigint): Promise<boolean>;
    exportInvoiceHistory(arg0: InvoiceExportFormat, arg1: InvoiceFilter | null, arg2: string | null, arg3: string | null): Promise<ExternalBlob>;
    exportProductBarcode(arg0: BarcodeExportRequest): Promise<ExternalBlob>;
    getBootstrapState(): Promise<AppBootstrapState>;
    getBootstrapStatus(): Promise<BootstrapStatus>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCustomer(_customerId: bigint): Promise<Customer | null>;
    getDataEntry(dataEntryId: bigint): Promise<DataEntry | null>;
    getInventoryEntry(inventoryId: bigint): Promise<InventoryRecord | null>;
    getInventoryReportBarcodes(): Promise<Array<string>>;
    getInvoice(invoiceId: bigint): Promise<Invoice | null>;
    getInvoiceHistory(filter: InvoiceFilter | null, sortBy: string | null, sortOrder: string | null): Promise<Array<Invoice>>;
    getOrder(orderId: bigint): Promise<OrderRecord | null>;
    getPendingUsers(): Promise<Array<UserApprovalInfo>>;
    getProduct(productId: bigint): Promise<Product | null>;
    getProductLocation(productId: bigint): Promise<InventoryLocation | null>;
    getProfitLossReport(startDate: Time, endDate: Time): Promise<ProfitLossReport>;
    getSignatureForUser(user: Principal): Promise<ExternalBlob | null>;
    getStats(): Promise<Stats>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getUserSignature(): Promise<ExternalBlob | null>;
    isAccountant(): Promise<boolean>;
    isAdmin(): Promise<boolean>;
    isCallerAdmin(): Promise<boolean>;
    isCallerApproved(): Promise<boolean>;
    isInventoryManager(): Promise<boolean>;
    isPreviouslyRejected(user: Principal): Promise<boolean>;
    isSalesManager(): Promise<boolean>;
    isSuperAdmin(): Promise<boolean>;
    listApprovals(): Promise<Array<UserApprovalInfo>>;
    listCustomers(): Promise<Array<Customer>>;
    listDataEntries(): Promise<Array<DataEntry>>;
    listInventory(): Promise<Array<InventoryRecord>>;
    listInvoices(): Promise<Array<Invoice>>;
    listNotifications(): Promise<Array<Notification>>;
    listOrders(): Promise<Array<OrderRecord>>;
    listProducts(): Promise<Array<Product>>;
    listSecondaryAdminEmails(): Promise<Array<string>>;
    markNotificationAsRead(notificationId: bigint): Promise<boolean>;
    permanentlyRemoveUserAccount(targetUser: Principal): Promise<void>;
    processPreviouslyRejectedUser(user: Principal): Promise<void>;
    rejectUser(user: Principal): Promise<void>;
    removeSecondaryAdminEmail(email: string): Promise<void>;
    requestApproval(): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    setApproval(user: Principal, status: ApprovalStatus): Promise<void>;
    setProductLocation(productId: bigint, location: InventoryLocation): Promise<void>;
    stockAdjustInvoice(invoiceId: bigint): Promise<void>;
    updateInvoiceDocumentUrls(invoiceId: bigint, imageUrl: string | null, pdfUrl: string | null): Promise<boolean>;
    updateProduct(productId: bigint, name: string, description: string, price: bigint, stockLevel: bigint, warehouse: string, rack: string, shelf: string, size: string, color: string, barcode: string): Promise<void>;
    uploadUserSignature(signatureBlob: ExternalBlob): Promise<void>;
}
