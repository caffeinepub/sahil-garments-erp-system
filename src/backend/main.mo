import Map "mo:core/Map";
import Set "mo:core/Set";
import Nat "mo:core/Nat";
import Time "mo:core/Time";
import Int "mo:core/Int";
import Array "mo:core/Array";
import Order "mo:core/Order";
import Iter "mo:core/Iter";
import List "mo:core/List";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";
import UserApproval "user-approval/approval";
import Storage "blob-storage/Storage";
import MixinStorage "blob-storage/Mixin";
import Migration "migration";

(with migration = Migration.run)
actor {
  include MixinStorage();

  type UserRole = AccessControl.UserRole;

  module EntityState {
    public type T = { #pending; #processing; #fulfilled; #cancelled };
    public func compare(x : T, y : T) : Order.Order {
      switch (x, y) {
        case (#pending, #pending) { #equal };
        case (#pending, _) { #less };
        case (#processing, #pending) { #greater };
        case (#processing, #processing) { #equal };
        case (#processing, _) { #less };
        case (#fulfilled, #cancelled) { #less };
        case (#fulfilled, #fulfilled) { #equal };
        case (#fulfilled, #pending or #processing) { #greater };
        case (#cancelled, _) { #greater };
      };
    };
  };

  module InvoiceStatus {
    public type T = { #draft; #sent; #paid; #overdue };
    public func compare(x : T, y : T) : Order.Order {
      switch (x, y) {
        case (#draft, #draft) { #equal };
        case (#draft, _) { #less };
        case (#sent, #draft) { #greater };
        case (#sent, #sent) { #equal };
        case (#sent, _) { #less };
        case (#paid, #overdue) { #less };
        case (#paid, #paid) { #equal };
        case (#paid, #draft or #sent) { #greater };
        case (#overdue, _) { #greater };
      };
    };
  };

  public type AppRole = {
    #admin;
    #sales;
    #inventoryManager;
    #accountant;
  };

  public type UserApprovalStatus = {
    #approved;
    #rejected;
    #pending;
  };

  public type Product = {
    productId : Nat;
    name : Text;
    description : Text;
    price : Nat;
    stockLevel : Nat;
    supplierId : ?Nat;
    warehouse : Text;
    rack : Text;
    shelf : Text;
    size : Text;
    color : Text;
    barcode : Text;
    images : [Storage.ExternalBlob];
    inventoryStatus : InventoryStatus;
  };

  public type InventoryStatus = {
    #inStock;
    #low;
    #outOfStock;
  };

  public type InventoryLocation = {
    warehouse : Text;
    rack : Text;
    shelf : Text;
  };

  type Order = {
    orderId : Nat;
    products : [Product];
    batchId : ?Nat;
    supplierId : ?Nat;
    customerId : ?Nat;
    date : Time.Time;
    status : EntityState.T;
  };

  type Inventory = {
    inventoryId : Nat;
    batchId : ?Nat;
    supplierId : ?Nat;
    productId : ?Nat;
    stockLevel : ?Nat;
    status : EntityState.T;
  };

  public type Invoice = {
    invoiceId : Nat;
    customerId : Nat;
    productId : Nat;
    quantity : Nat;
    price : Nat;
    tax : Nat;
    total : Nat;
    status : InvoiceStatus.T;
    dueDate : ?Time.Time;
    paymentDate : ?Time.Time;
    productIds : [Nat];
    orderIds : [Nat];
    inventoryIds : [Nat];
    created : Time.Time;
    lastModified : Time.Time;
    imageUrl : ?Text;
    pdfUrl : ?Text;
    stockAdjusted : Bool;
  };

  public type InvoiceExportFormat = {
    #pdf;
    #excel;
  };

  public type InvoiceFilter = {
    customerId : ?Nat;
    invoiceDateRange : ?ReportDateRange;
    paymentStatus : ?InvoiceStatus.T;
    searchQuery : ?Text;
  };

  type Supplier = {
    supplierId : Nat;
    productIds : [Nat];
    inventoryIds : [Nat];
    orderIds : [Nat];
  };

  public type Notification = {
    notificationId : Nat;
    title : Text;
    message : Text;
    isRead : Bool;
    timestamp : Time.Time;
    userId : Principal;
  };

  public type BarcodeExportFormat = {
    #pdf;
    #png;
  };

  public type BarcodeExportRequest = {
    productId : Nat;
    exportType : BarcodeExportFormat;
  };

  public type BarcodeBatchExportRequest = {
    productIds : [Nat];
    exportType : BarcodeExportFormat;
  };

  type EntityHistory = {
    actions : [Action];
    created : ?Time.Time;
    lastModified : ?Time.Time;
  };

  type Action = {
    actionId : Nat;
    timestamp : Time.Time;
    status : EntityState.T;
  };

  public type Customer = {
    id : Nat;
    name : Text;
    email : Text;
    phone : Text;
    address : Text;
    created : Time.Time;
    modified : Time.Time;
  };

  public type InventoryRecord = {
    id : Nat;
    productId : Nat;
    quantity : Nat;
    batch : Text;
    supplierId : Nat;
    created : Time.Time;
    modified : Time.Time;
  };

  public type OrderRecord = {
    id : Nat;
    customerId : Nat;
    productId : Nat;
    quantity : Nat;
    status : Text;
    created : Time.Time;
    modified : Time.Time;
    totalPrice : Nat;
  };

  public type DataEntry = {
    id : Nat;
    entityType : Text;
    entryId : Nat;
    created : Time.Time;
    modified : Time.Time;
    amount : Nat;
    quantity : Nat;
  };

  public type Stats = {
    totalCustomers : Nat;
    totalInventory : Nat;
    totalOrders : Nat;
    totalRevenue : Nat;
  };

  public type UserProfile = {
    name : Text;
    email : Text;
    appRole : AppRole;
    department : Text;
  };

  public type UserAccount = {
    id : Principal;
    profile : UserProfile;
    approvalStatus : UserApprovalStatus;
  };

  public type ReportDateRange = {
    startDate : Time.Time;
    endDate : Time.Time;
  };

  public type ProfitLossReport = {
    revenue : Nat;
    cogs : Nat;
    grossProfit : Nat;
    expenses : Nat;
    netProfit : Nat;
    reportDateRange : ReportDateRange;
  };

  public type AppBootstrapState = {
    userProfile : ?UserProfile;
    isApproved : Bool;
    isAdmin : Bool;
  };

  // Variables
  let products = Map.empty<Nat, Product>();
  var nextProductId = 1;
  let customers = Map.empty<Nat, Customer>();
  let inventory = Map.empty<Nat, InventoryRecord>();
  let orders = Map.empty<Nat, OrderRecord>();
  let invoices = Map.empty<Nat, Invoice>();
  var nextInvoiceId = 1;
  let dataEntries = Map.empty<Nat, DataEntry>();
  let notifications = Map.empty<Nat, Notification>();
  let entityHistory = Map.empty<Nat, EntityHistory>();
  let userProfiles = Map.empty<Principal, UserProfile>();
  let userAppRoles = Map.empty<Principal, AppRole>();
  let userAccounts = Map.empty<Principal, UserAccount>();
  let inventoryLocations = Map.empty<Nat, InventoryLocation>();
  let adminPrincipals = Set.empty<Principal>();
  let previousRejectedUsers = Set.empty<Principal>();
  let userSignatures = Map.empty<Principal, Storage.ExternalBlob>();
  let secondaryAdminEmails = Set.empty<Text>();
  let secondaryAdminPrincipals = Set.empty<Principal>();
  let userEmailToPrincipal = Map.empty<Text, Principal>();

  var nextCustomerId = 1;
  var nextInventoryId = 1;
  var nextOrderId = 1;
  var nextDataEntryId = 1;
  var nextNotificationId = 1;

  let STOCK_THRESHOLD = 5;
  let SECONDARY_ADMIN_EMAIL = "sahilgarments16@gmail.com";

  // Initialize secondary admin email
  secondaryAdminEmails.add(SECONDARY_ADMIN_EMAIL);

  // Authentication and Access Control
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // Approval Management
  let approvalState = UserApproval.initState(accessControlState);

  // Helper function to check if user is secondary admin
  private func isSecondaryAdmin(caller : Principal) : Bool {
    secondaryAdminPrincipals.contains(caller);
  };

  // Helper function to check if user is primary admin (full admin with User Management access)
  private func isPrimaryAdmin(caller : Principal) : Bool {
    AccessControl.isAdmin(accessControlState, caller) and not isSecondaryAdmin(caller);
  };

  // Helper function to check if email is secondary admin email
  private func isSecondaryAdminEmail(email : Text) : Bool {
    secondaryAdminEmails.contains(email);
  };

  public query ({ caller }) func isSuperAdmin() : async Bool {
    if (AccessControl.isAdmin(accessControlState, caller)) {
      return true;
    };
    false;
  };

  public query ({ caller }) func isAdmin() : async Bool {
    AccessControl.isAdmin(accessControlState, caller);
  };

  public query ({ caller }) func isSalesManager() : async Bool {
    hasAppRole(caller, #sales);
  };

  public query ({ caller }) func isInventoryManager() : async Bool {
    hasAppRole(caller, #inventoryManager);
  };

  public query ({ caller }) func isAccountant() : async Bool {
    hasAppRole(caller, #accountant);
  };

  // Return AppBootstrapState batched endpoint for the frontend
  public query ({ caller }) func getBootstrapState() : async AppBootstrapState {
    let userProfile = userProfiles.get(caller);
    let isApproved = if (AccessControl.isAdmin(accessControlState, caller)) {
      true;
    } else {
      UserApproval.isApproved(approvalState, caller);
    };
    {
      userProfile;
      isApproved;
      isAdmin = AccessControl.isAdmin(accessControlState, caller);
    };
  };

  private func requireApprovedUser(caller : Principal) {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Authentication required");
    };

    if (not AccessControl.isAdmin(accessControlState, caller)) {
      if (not UserApproval.isApproved(approvalState, caller)) {
        Runtime.trap("Unauthorized: User approval required. Please request approval from an admin.");
      };

      if (previousRejectedUsers.contains(caller)) {
        Runtime.trap("Unauthorized: Your account has been rejected. Please contact an administrator.");
      };
    };
  };

  private func requireApprovedUserQuery(caller : Principal) {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Authentication required");
    };

    if (not AccessControl.isAdmin(accessControlState, caller)) {
      if (not UserApproval.isApproved(approvalState, caller)) {
        Runtime.trap("Unauthorized: User approval required. Please request approval from an admin.");
      };

      if (previousRejectedUsers.contains(caller)) {
        Runtime.trap("Unauthorized: Your account has been rejected. Please contact an administrator.");
      };
    };
  };

  // Require primary admin (excludes secondary admin from User Management)
  private func requirePrimaryAdmin(caller : Principal) : () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };

    if (isSecondaryAdmin(caller)) {
      Runtime.trap("Unauthorized: This operation requires primary admin privileges. Secondary admins cannot manage users.");
    };
  };

  private func createNotificationInternal(targetUser : Principal, title : Text, message : Text) : Nat {
    let notificationId = nextNotificationId;
    nextNotificationId += 1;

    let notification : Notification = {
      notificationId;
      title;
      message;
      isRead = false;
      timestamp = Time.now();
      userId = targetUser;
    };

    notifications.add(notificationId, notification);
    notificationId;
  };

  private func hasAppRole(caller : Principal, role : AppRole) : Bool {
    if (AccessControl.isAdmin(accessControlState, caller)) {
      return true;
    };
    switch (userAppRoles.get(caller)) {
      case (null) { false };
      case (?userRole) {
        switch (role, userRole) {
          case (#admin, #admin) { true };
          case (#sales, #sales) { true };
          case (#inventoryManager, #inventoryManager) { true };
          case (#accountant, #accountant) { true };
          case (_, _) { false };
        };
      };
    };
  };

  private func canAccessSales(caller : Principal) : Bool {
    AccessControl.isAdmin(accessControlState, caller) or hasAppRole(caller, #sales);
  };

  private func canAccessInventory(caller : Principal) : Bool {
    AccessControl.isAdmin(accessControlState, caller) or hasAppRole(caller, #inventoryManager);
  };

  private func canAccessFinancial(caller : Principal) : Bool {
    AccessControl.isAdmin(accessControlState, caller) or hasAppRole(caller, #accountant);
  };

  public query ({ caller }) func isCallerApproved() : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Authentication required");
    };
    AccessControl.hasPermission(accessControlState, caller, #admin) or UserApproval.isApproved(approvalState, caller);
  };

  public shared ({ caller }) func requestApproval() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Authentication required");
    };

    if (UserApproval.isApproved(approvalState, caller)) {
      Runtime.trap("User is already approved");
    };

    UserApproval.requestApproval(approvalState, caller);

    let userProfileOpt = userProfiles.get(caller);
    let userName = switch (userProfileOpt) {
      case (?profile) { profile.name };
      case (null) { caller.toText() };
    };

    for (adminPrincipal in adminPrincipals.values()) {
      ignore createNotificationInternal(
        adminPrincipal,
        "Approval Requested",
        "User " # userName # " has requested approval.",
      );
    };
  };

  // RESTRICTED: Only primary admins can approve/reject users
  public shared ({ caller }) func setApproval(user : Principal, status : UserApproval.ApprovalStatus) : async () {
    requirePrimaryAdmin(caller);

    switch (userProfiles.get(user)) {
      case (null) {
        Runtime.trap("User profile not found. User must complete profile setup first.");
      };
      case (?_) {};
    };

    switch (status) {
      case (#rejected) {
        if (previousRejectedUsers.contains(user)) {
          Runtime.trap("User has already been rejected");
        };
        previousRejectedUsers.add(user);
      };
      case (#approved) {
        if (previousRejectedUsers.contains(user)) {
          previousRejectedUsers.remove(user);
        };
      };
      case (_) {};
    };

    UserApproval.setApproval(approvalState, user, status);

    switch (userAccounts.get(user)) {
      case (null) {};
      case (?account) {
        let updatedAccount : UserAccount = {
          id = account.id;
          profile = account.profile;
          approvalStatus = convertApprovalStatus(status);
        };
        userAccounts.add(user, updatedAccount);
      };
    };

    let userProfileOpt = userProfiles.get(user);
    let userName = switch (userProfileOpt) {
      case (?profile) { profile.name };
      case (null) { user.toText() };
    };

    let userNotificationTitle = switch (status) {
      case (#approved) { "Account Approved" };
      case (#rejected) { "Account Rejected" };
      case (#pending) { "Account Status Updated" };
    };

    let userNotificationMessage = switch (status) {
      case (#approved) { "Your account has been approved. You can now access the dashboard." };
      case (#rejected) { "Your account approval request has been rejected. Please contact an administrator." };
      case (#pending) { "Your account status has been updated to pending." };
    };

    ignore createNotificationInternal(user, userNotificationTitle, userNotificationMessage);

    let adminNotificationMessage = switch (status) {
      case (#approved) { "You have approved user " # userName };
      case (#rejected) { "You have rejected user " # userName };
      case (#pending) { "You have set user " # userName # " status to pending" };
    };

    ignore createNotificationInternal(caller, "User Status Updated", adminNotificationMessage);
  };

  // RESTRICTED: Only primary admins can list approvals
  public shared ({ caller }) func listApprovals() : async [UserApproval.UserApprovalInfo] {
    requirePrimaryAdmin(caller);
    UserApproval.listApprovals(approvalState);
  };

  // RESTRICTED: Only primary admins can view all user accounts
  public shared query ({ caller }) func getAllUserAccounts() : async [UserAccount] {
    requirePrimaryAdmin(caller);

    let iter = userAccounts.values();
    iter.toArray();
  };

  private func convertApprovalStatus(status : UserApproval.ApprovalStatus) : UserApprovalStatus {
    switch (status) {
      case (#approved) { #approved };
      case (#rejected) { #rejected };
      case (#pending) { #pending };
    };
  };

  private func fromApprovalStatus(status : UserApprovalStatus) : UserApproval.ApprovalStatus {
    switch (status) {
      case (#approved) { #approved };
      case (#rejected) { #rejected };
      case (#pending) { #pending };
    };
  };

  public shared query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public shared query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Authentication required");
    };

    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };

    // Check if email is secondary admin email
    let isSecondaryAdminByEmail = isSecondaryAdminEmail(profile.email);

    // Prevent users from assigning themselves admin role unless they are secondary admin by email
    switch (profile.appRole) {
      case (#admin) {
        if (not AccessControl.isAdmin(accessControlState, caller) and not isSecondaryAdminByEmail) {
          Runtime.trap("Unauthorized: Only system admins can assign admin app role");
        };
      };
      case (_) {};
    };

    userProfiles.add(caller, profile);
    userAppRoles.add(caller, profile.appRole);
    userEmailToPrincipal.add(profile.email, caller);

    // If this is the secondary admin email, grant admin privileges but mark as secondary
    if (isSecondaryAdminByEmail) {
      AccessControl.assignRole(accessControlState, caller, caller, #admin);
      secondaryAdminPrincipals.add(caller);
      adminPrincipals.add(caller);
    };

    let userApprovalStatus = switch (
      UserApproval.isApproved(approvalState, caller),
      AccessControl.hasPermission(accessControlState, caller, #admin)
    ) {
      case (true, _) { #approved };
      case (_, true) { #approved };
      case (false, false) { #pending };
    };

    let userAccount = {
      id = caller;
      profile;
      approvalStatus = userApprovalStatus;
    };
    userAccounts.add(caller, userAccount);
  };

  // RESTRICTED: Only primary admins can assign app roles
  public shared ({ caller }) func assignAppRole(user : Principal, role : AppRole) : async () {
    requirePrimaryAdmin(caller);

    switch (userProfiles.get(user)) {
      case (null) {
        Runtime.trap("User profile not found. User must complete profile setup first.");
      };
      case (?_) {};
    };

    userAppRoles.add(user, role);

    if (AccessControl.isAdmin(accessControlState, user)) {
      adminPrincipals.add(user);
    };

    switch (userAccounts.get(user)) {
      case (null) { Runtime.trap("User account not found: " # user.toText()) };
      case (?existingAccount) {
        let updatedProfile : UserProfile = {
          name = existingAccount.profile.name;
          email = existingAccount.profile.email;
          appRole = role;
          department = existingAccount.profile.department;
        };
        let updatedAccount = {
          id = user;
          profile = updatedProfile;
          approvalStatus = existingAccount.approvalStatus;
        };
        userAccounts.add(user, updatedAccount);
        userProfiles.add(user, updatedProfile);
      };
    };
  };

  // RESTRICTED: Only primary admins can check rejection status
  public shared query ({ caller }) func isPreviouslyRejected(user : Principal) : async Bool {
    requirePrimaryAdmin(caller);
    previousRejectedUsers.contains(user);
  };

  // RESTRICTED: Only primary admins can process previously rejected users
  public shared ({ caller }) func processPreviouslyRejectedUser(user : Principal) : async () {
    requirePrimaryAdmin(caller);

    if (previousRejectedUsers.contains(user)) {
      previousRejectedUsers.remove(user);
    };
  };

  // RESTRICTED: Only primary admins can clear rejection status
  public shared ({ caller }) func clearPreviousRejection(user : Principal) : async () {
    requirePrimaryAdmin(caller);
    if (previousRejectedUsers.contains(user)) {
      previousRejectedUsers.remove(user);
    };
  };

  // Product Management
  public shared ({ caller }) func addProduct(
    name : Text,
    description : Text,
    price : Nat,
    stockLevel : Nat,
    warehouse : Text,
    rack : Text,
    shelf : Text,
    size : Text,
    color : Text,
    barcode : Text,
  ) : async Nat {
    requireApprovedUser(caller);
    if (not canAccessInventory(caller)) {
      Runtime.trap("Unauthorized: Only Inventory Managers and Admins can add products");
    };

    let productId = nextProductId;
    nextProductId += 1;

    let initialStatus = if (stockLevel < STOCK_THRESHOLD) {
      #low;
    } else {
      #inStock;
    };

    let newProduct : Product = {
      productId;
      name;
      description;
      price;
      stockLevel;
      supplierId = null;
      warehouse;
      rack;
      shelf;
      size;
      color;
      barcode;
      images = [];
      inventoryStatus = initialStatus;
    };

    products.add(productId, newProduct);
    productId;
  };

  public shared ({ caller }) func updateProduct(
    productId : Nat,
    name : Text,
    description : Text,
    price : Nat,
    stockLevel : Nat,
    warehouse : Text,
    rack : Text,
    shelf : Text,
    size : Text,
    color : Text,
    barcode : Text,
  ) : async () {
    requireApprovedUser(caller);
    if (not canAccessInventory(caller)) {
      Runtime.trap("Unauthorized: Only Inventory Managers and Admins can update products");
    };

    switch (products.get(productId)) {
      case (null) { Runtime.trap("Product not found: " # productId.toText()) };
      case (?existing) {
        let initialStatus = if (stockLevel < STOCK_THRESHOLD) {
          #low;
        } else {
          #inStock;
        };
        let updatedProduct : Product = {
          productId = existing.productId;
          name;
          description;
          price;
          stockLevel;
          supplierId = existing.supplierId;
          warehouse;
          rack;
          shelf;
          size;
          color;
          barcode;
          images = existing.images;
          inventoryStatus = initialStatus;
        };
        products.add(productId, updatedProduct);
      };
    };
  };

  public shared query ({ caller }) func getProduct(productId : Nat) : async ?Product {
    requireApprovedUserQuery(caller);
    products.get(productId);
  };

  public shared query ({ caller }) func listProducts() : async [Product] {
    requireApprovedUserQuery(caller);
    let iter = products.values();
    iter.toArray();
  };

  public shared ({ caller }) func addProductImage(productId : Nat, blob : Storage.ExternalBlob) : async () {
    requireApprovedUser(caller);
    if (not canAccessInventory(caller)) {
      Runtime.trap("Unauthorized: Only Inventory Managers and Admins can add images");
    };

    switch (products.get(productId)) {
      case (null) { Runtime.trap("Product not found: " # productId.toText()) };
      case (?product) {
        let newImages = product.images.concat([blob]);
        let updatedProduct = { product with images = newImages };
        products.add(productId, updatedProduct);
      };
    };
  };

  // RESTRICTED: Only admins can delete all inventory
  public shared ({ caller }) func deleteAllInventory() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete all inventory");
    };

    products.clear();
    inventory.clear();
    inventoryLocations.clear();
  };

  public shared ({ caller }) func setProductLocation(productId : Nat, location : InventoryLocation) : async () {
    requireApprovedUser(caller);
    if (not canAccessInventory(caller)) {
      Runtime.trap("Unauthorized: Only Inventory Managers and Admins can set inventory location");
    };

    inventoryLocations.add(productId, location);
  };

  public shared query ({ caller }) func getProductLocation(productId : Nat) : async ?InventoryLocation {
    requireApprovedUserQuery(caller);
    if (not canAccessInventory(caller)) {
      Runtime.trap("Unauthorized: Only Inventory Managers and Admins can view inventory location");
    };

    inventoryLocations.get(productId);
  };

  // Customer Management
  public shared ({ caller }) func createCustomer(name : Text, email : Text, phone : Text, address : Text) : async Nat {
    requireApprovedUser(caller);
    if (not canAccessSales(caller)) {
      Runtime.trap("Unauthorized: Only Sales staff and Admins can create customers");
    };

    let customerId = nextCustomerId;
    nextCustomerId += 1;

    let newCustomer : Customer = {
      id = customerId;
      name;
      email;
      phone;
      address;
      created = Time.now();
      modified = Time.now();
    };

    customers.add(customerId, newCustomer);
    customerId;
  };

  public shared query ({ caller }) func getCustomer(_customerId : Nat) : async ?Customer {
    requireApprovedUserQuery(caller);
    if (not canAccessSales(caller)) {
      Runtime.trap("Unauthorized: Only Sales staff and Admins can view customers");
    };
    customers.get(_customerId);
  };

  public shared query ({ caller }) func listCustomers() : async [Customer] {
    requireApprovedUserQuery(caller);
    if (not canAccessSales(caller)) {
      Runtime.trap("Unauthorized: Only Sales staff and Admins can view customers");
    };
    let iter = customers.values();
    iter.toArray();
  };

  // RESTRICTED: Only primary admins can delete customers (excludes secondary admin)
  public shared ({ caller }) func deleteCustomer(customerId : Nat) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete customers");
    };

    if (isSecondaryAdmin(caller)) {
      Runtime.trap("Unauthorized: Only primary admins can delete customers. Secondary admins cannot perform this operation.");
    };

    switch (customers.get(customerId)) {
      case (null) {
        Runtime.trap("Customer not found: " # customerId.toText());
      };
      case (?customer) {
        customers.remove(customerId);

        // Create notification for the admin who performed the deletion
        ignore createNotificationInternal(
          caller,
          "Customer Deleted",
          "Customer " # customer.name # " (ID: " # customerId.toText() # ") has been permanently deleted from the system.",
        );

        true;
      };
    };
  };

  // Inventory Management
  public shared ({ caller }) func addInventoryEntry(productId : Nat, quantity : Nat, batch : Text, supplierId : Nat) : async Nat {
    requireApprovedUser(caller);
    if (not canAccessInventory(caller)) {
      Runtime.trap("Unauthorized: Only Inventory Managers and Admins can add inventory");
    };

    let inventoryId = nextInventoryId;
    nextInventoryId += 1;

    let inventoryRecord : InventoryRecord = {
      id = inventoryId;
      productId;
      quantity;
      batch;
      supplierId;
      created = Time.now();
      modified = Time.now();
    };

    inventory.add(inventoryId, inventoryRecord);
    inventoryId;
  };

  public shared query ({ caller }) func getInventoryEntry(inventoryId : Nat) : async ?InventoryRecord {
    requireApprovedUserQuery(caller);
    if (not canAccessInventory(caller)) {
      Runtime.trap("Unauthorized: Only Inventory Managers and Admins can view inventory");
    };
    inventory.get(inventoryId);
  };

  public shared query ({ caller }) func listInventory() : async [InventoryRecord] {
    requireApprovedUserQuery(caller);
    if (not canAccessInventory(caller)) {
      Runtime.trap("Unauthorized: Only Inventory Managers and Admins can view inventory");
    };
    let iter = inventory.values();
    iter.toArray();
  };

  // Order Management
  public shared ({ caller }) func createOrder(customerId : Nat, productId : Nat, quantity : Nat, status : Text, totalPrice : Nat) : async Nat {
    requireApprovedUser(caller);
    if (not canAccessSales(caller)) {
      Runtime.trap("Unauthorized: Only Sales staff and Admins can create orders");
    };

    let orderId = nextOrderId;
    nextOrderId += 1;

    let orderRecord : OrderRecord = {
      id = orderId;
      customerId;
      productId;
      quantity;
      status;
      created = Time.now();
      modified = Time.now();
      totalPrice;
    };

    orders.add(orderId, orderRecord);
    orderId;
  };

  public shared query ({ caller }) func getOrder(orderId : Nat) : async ?OrderRecord {
    requireApprovedUserQuery(caller);
    if (not canAccessSales(caller)) {
      Runtime.trap("Unauthorized: Only Sales staff and Admins can view orders");
    };
    orders.get(orderId);
  };

  public shared query ({ caller }) func listOrders() : async [OrderRecord] {
    requireApprovedUserQuery(caller);
    if (not canAccessSales(caller)) {
      Runtime.trap("Unauthorized: Only Sales staff and Admins can view orders");
    };
    let iter = orders.values();
    iter.toArray();
  };

  // RESTRICTED: Only admins can delete all orders
  public shared ({ caller }) func deleteAllOrders() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete all orders");
    };
    orders.clear();
  };

  // Invoice Management (Core functionality - NOT Invoice History)
  public shared ({ caller }) func createInvoice(customerId : Nat, productId : Nat, quantity : Nat, price : Nat, tax : Nat, total : Nat, status : InvoiceStatus.T) : async Nat {
    requireApprovedUser(caller);
    if (not canAccessSales(caller)) {
      Runtime.trap("Unauthorized: Only Sales staff and Admins can create invoices");
    };

    let invoiceId = nextInvoiceId;
    nextInvoiceId += 1;
    let timestamp = Time.now();

    let invoice : Invoice = {
      invoiceId;
      customerId;
      productId;
      quantity;
      price;
      tax;
      total;
      status;
      dueDate = null;
      paymentDate = null;
      productIds = [];
      orderIds = [];
      inventoryIds = [];
      created = timestamp;
      lastModified = timestamp;
      imageUrl = null;
      pdfUrl = null;
      stockAdjusted = false;
    };

    invoices.add(invoiceId, invoice);
    invoiceId;
  };

  // RESTRICTED: Only Sales staff and Admins can adjust stock for invoices
  public shared ({ caller }) func stockAdjustInvoice(invoiceId : Nat) : async () {
    requireApprovedUser(caller);
    if (not canAccessSales(caller)) {
      Runtime.trap("Unauthorized: Only Sales staff and Admins can adjust stock for invoices");
    };

    let ?invoice = invoices.get(invoiceId) else {
      Runtime.trap("Couldn't find invoice: " # invoiceId.toText());
    };

    // Check idempotency - if already adjusted, do nothing
    if (invoice.stockAdjusted) {
      return;
    };

    let ?product = products.get(invoice.productId) else {
      Runtime.trap("Failed to find product: " # invoice.productId.toText());
    };

    // Enforce stock non-negativity
    if (product.stockLevel < invoice.quantity) {
      Runtime.trap("Cannot decrement product stock below zero. Current stock: " # product.stockLevel.toText() # ", requested quantity: " # invoice.quantity.toText());
    };

    let newStockLevel = product.stockLevel - invoice.quantity;

    let updatedProduct = {
      product with
      stockLevel = newStockLevel;
    };

    products.add(product.productId, updatedProduct);

    let updatedInvoice = {
      invoice with
      stockAdjusted = true
    };

    invoices.add(invoice.invoiceId, updatedInvoice);
  };

  public shared query ({ caller }) func getInvoice(invoiceId : Nat) : async ?Invoice {
    requireApprovedUserQuery(caller);
    if (not canAccessSales(caller)) {
      Runtime.trap("Unauthorized: Only Sales staff and Admins can view invoices");
    };
    invoices.get(invoiceId);
  };

  public shared query ({ caller }) func listInvoices() : async [Invoice] {
    requireApprovedUserQuery(caller);
    if (not canAccessSales(caller)) {
      Runtime.trap("Unauthorized: Only Sales staff and Admins can view invoices");
    };
    let iter = invoices.values();
    iter.toArray();
  };

  public shared ({ caller }) func updateInvoiceDocumentUrls(
    invoiceId : Nat,
    imageUrl : ?Text,
    pdfUrl : ?Text,
  ) : async Bool {
    requireApprovedUser(caller);
    if (not canAccessSales(caller)) {
      Runtime.trap("Unauthorized: Only Sales staff and Admins can update invoice documents");
    };

    switch (invoices.get(invoiceId)) {
      case (null) { false };
      case (?existing) {
        let updatedInvoice = {
          existing with
          imageUrl;
          pdfUrl;
          lastModified = Time.now();
        };
        invoices.add(invoiceId, updatedInvoice);
        true;
      };
    };
  };

  // Invoice History - RESTRICTED: Only Admins and Sales roles
  public query ({ caller }) func getInvoiceHistory(filter : ?InvoiceFilter, sortBy : ?Text, sortOrder : ?Text) : async [Invoice] {
    requireApprovedUserQuery(caller);
    if (not canAccessSales(caller)) {
      Runtime.trap("Unauthorized: Only Admins and Sales roles can access invoice history");
    };

    let iter = invoices.values();
    let invoiceList = List.fromIter<Invoice>(iter);

    let filteredList = switch (filter) {
      case (null) { invoiceList };
      case (?f) { applyFilter(invoiceList, f) };
    };

    let sortedArray = applySorting(filteredList.toArray(), sortBy, sortOrder);

    sortedArray;
  };

  public shared ({ caller }) func exportInvoiceHistory(_ : InvoiceExportFormat, _ : ?InvoiceFilter, _ : ?Text, _ : ?Text) : async Storage.ExternalBlob {
    requireApprovedUser(caller);
    if (not canAccessSales(caller)) {
      Runtime.trap("Unauthorized: Only Admins and Sales roles can export invoice history");
    };

    Runtime.trap("Invoice export should be implemented in the frontend using frontend libraries and APIs");
  };

  func applyFilter(invoices : List.List<Invoice>, filter : InvoiceFilter) : List.List<Invoice> {
    let filtered = invoices.filter(
      func(inv) {
        // Apply customer filter
        let matchesCustomer = switch (filter.customerId) {
          case (null) { true };
          case (?custId) { inv.customerId == custId };
        };

        // Apply date range filter
        let matchesDateRange = switch (filter.invoiceDateRange) {
          case (null) { true };
          case (?range) {
            inv.created >= range.startDate and inv.created <= range.endDate
          };
        };

        // Apply payment status filter
        let matchesStatus = switch (filter.paymentStatus) {
          case (null) { true };
          case (?status) { inv.status == status };
        };

        // Apply search query filter
        let matchesSearch = switch (filter.searchQuery) {
          case (null) { true };
          case (?searchQuery) {
            inv.invoiceId.toText().contains(#text searchQuery);
          };
          case (_) { true };
        };

        matchesCustomer and matchesDateRange and matchesStatus and matchesSearch;
      }
    );
    filtered;
  };

  func applySorting(invoices : [Invoice], sortBy : ?Text, sortOrder : ?Text) : [Invoice] {
    switch (sortBy) {
      case (null) { invoices };
      case (?field) {
        let sorted = invoices.sort(
          func(a, b) {
            switch (sortOrder) {
              case (null) { #equal };
              case (?"asc") { compare(a, b, field) };
              case (?"desc") { compare(b, a, field) };
            };
          }
        );
        sorted;
      };
    };
  };

  func compare(a : Invoice, b : Invoice, field : Text) : Order.Order {
    switch (field) {
      case ("invoiceNumber") {
        Nat.compare(a.invoiceId, b.invoiceId);
      };
      case ("customerName") { #equal };
      case ("invoiceDate") {
        Int.compare(a.created, b.created);
      };
      case ("dueDate") {
        switch (a.dueDate, b.dueDate) {
          case (null, null) { #equal };
          case (?d1, null) { #greater };
          case (null, ?d2) { #less };
          case (?d1, ?d2) { Int.compare(d1, d2) };
        };
      };
      case ("totalAmount") {
        Nat.compare(a.total, b.total);
      };
      case ("paymentStatus") {
        InvoiceStatus.compare(a.status, b.status);
      };
      case (_) { #equal };
    };
  };

  // User Signature Management
  public shared ({ caller }) func uploadUserSignature(signatureBlob : Storage.ExternalBlob) : async () {
    requireApprovedUser(caller);
    userSignatures.add(caller, signatureBlob);
  };

  public shared query ({ caller }) func getUserSignature() : async ?Storage.ExternalBlob {
    requireApprovedUserQuery(caller);
    userSignatures.get(caller);
  };

  public shared query ({ caller }) func getSignatureForUser(user : Principal) : async ?Storage.ExternalBlob {
    requireApprovedUserQuery(caller);
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can view other users' signatures");
    };
    userSignatures.get(user);
  };

  // Notification Management
  public shared query ({ caller }) func listNotifications() : async [Notification] {
    requireApprovedUserQuery(caller);

    let allNotifications = notifications.values().toArray();

    if (AccessControl.isAdmin(accessControlState, caller)) {
      return allNotifications;
    };

    allNotifications.filter<Notification>(func(n) { n.userId == caller });
  };

  public shared ({ caller }) func markNotificationAsRead(notificationId : Nat) : async Bool {
    requireApprovedUser(caller);

    switch (notifications.get(notificationId)) {
      case (null) { false };
      case (?notification) {
        if (notification.userId != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Can only mark your own notifications as read");
        };

        let updatedNotification = {
          notification with isRead = true
        };
        notifications.add(notificationId, updatedNotification);
        true;
      };
    };
  };

  // RESTRICTED: Only admins can create notifications
  public shared ({ caller }) func createNotification(targetUser : Principal, title : Text, message : Text) : async Nat {
    requireApprovedUser(caller);
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can create notifications");
    };

    createNotificationInternal(targetUser, title, message);
  };

  public shared ({ caller }) func deleteNotification(notificationId : Nat) : async Bool {
    requireApprovedUser(caller);

    switch (notifications.get(notificationId)) {
      case (null) { false };
      case (?notification) {
        if (notification.userId != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Only admins can delete other users' notifications");
        };

        notifications.remove(notificationId);
        true;
      };
    };
  };

  // Barcode Management (Frontend implementation)
  public shared ({ caller }) func exportProductBarcode(_ : BarcodeExportRequest) : async Storage.ExternalBlob {
    requireApprovedUser(caller);
    if (not canAccessInventory(caller)) {
      Runtime.trap("Unauthorized: Only Inventory Managers and Admins can export barcodes");
    };

    Runtime.trap("Barcode export should be implemented in the frontend using frontend libraries and APIs");
  };

  public shared ({ caller }) func batchExportBarcodes(_ : BarcodeBatchExportRequest) : async Storage.ExternalBlob {
    requireApprovedUser(caller);
    if (not canAccessInventory(caller)) {
      Runtime.trap("Unauthorized: Only Inventory Managers and Admins can batch export barcodes");
    };

    Runtime.trap("Barcode export should be implemented in the frontend using frontend libraries and APIs");
  };

  public shared query ({ caller }) func getInventoryReportBarcodes() : async [Text] {
    requireApprovedUserQuery(caller);
    if (not canAccessInventory(caller)) {
      Runtime.trap("Unauthorized: Only Inventory Managers and Admins can access inventory report barcodes");
    };

    let productsArray = products.values().toArray();
    productsArray.map(func(product) { product.barcode });
  };

  // Statistics and Reports
  public shared query ({ caller }) func getStats() : async Stats {
    requireApprovedUserQuery(caller);
    if (not (AccessControl.isAdmin(accessControlState, caller) or canAccessFinancial(caller))) {
      Runtime.trap("Unauthorized: Only Admins and Accountants can view statistics");
    };

    let totalCustomers = customers.size();
    let totalInventory = inventory.size();
    let totalOrders = orders.size();

    var totalRevenue : Nat = 0;
    for (order in orders.values()) {
      totalRevenue += order.totalPrice;
    };

    {
      totalCustomers;
      totalInventory;
      totalOrders;
      totalRevenue;
    };
  };

  // RESTRICTED: Only admins can create data entries
  public shared ({ caller }) func createDataEntry(
    entityType : Text,
    entryId : Nat,
    amount : Nat,
    quantity : Nat,
  ) : async Nat {
    requireApprovedUser(caller);
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can create data entries");
    };

    let dataEntryId = nextDataEntryId;
    nextDataEntryId += 1;
    let now = Time.now();

    let dataEntry : DataEntry = {
      id = dataEntryId;
      entityType;
      entryId;
      created = now;
      modified = now;
      amount;
      quantity;
    };

    dataEntries.add(dataEntryId, dataEntry);
    dataEntryId;
  };

  public shared query ({ caller }) func getDataEntry(dataEntryId : Nat) : async ?DataEntry {
    requireApprovedUserQuery(caller);
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can view data entries");
    };
    dataEntries.get(dataEntryId);
  };

  public shared query ({ caller }) func listDataEntries() : async [DataEntry] {
    requireApprovedUserQuery(caller);
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can view data entries");
    };
    let iter = dataEntries.values();
    iter.toArray();
  };

  // RESTRICTED: Only admins and accountants can access Profit & Loss Reports
  public shared query ({ caller }) func getProfitLossReport(startDate : Time.Time, endDate : Time.Time) : async ProfitLossReport {
    requireApprovedUserQuery(caller);
    if (not (AccessControl.isAdmin(accessControlState, caller) or canAccessFinancial(caller))) {
      Runtime.trap("Unauthorized: Only Admins and Accountants can access Profit & Loss Reports");
    };

    var totalRevenue : Nat = 0;
    for (invoice in invoices.values()) {
      if (invoice.status == #paid and invoice.created >= startDate and invoice.created <= endDate) {
        totalRevenue += invoice.total;
      };
    };

    var totalCOGS : Nat = 0;
    for (invoice in invoices.values()) {
      if (invoice.status == #paid and invoice.created >= startDate and invoice.created <= endDate) {
        switch (products.get(invoice.productId)) {
          case (null) {};
          case (?product) {
            totalCOGS += product.price * invoice.quantity;
          };
        };
      };
    };
    let grossProfit = if (totalRevenue > totalCOGS) {
      totalRevenue - totalCOGS;
    } else {
      0;
    };

    let operationalExpenses = 1000;

    let netProfit = if (grossProfit > operationalExpenses) {
      grossProfit - operationalExpenses;
    } else {
      0;
    };

    let reportDateRange : ReportDateRange = {
      startDate;
      endDate;
    };

    {
      revenue = totalRevenue;
      cogs = totalCOGS;
      grossProfit;
      expenses = operationalExpenses;
      netProfit;
      reportDateRange;
    };
  };
};

