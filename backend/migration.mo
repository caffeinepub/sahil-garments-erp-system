import Map "mo:core/Map";
import Set "mo:core/Set";
import Principal "mo:core/Principal";

module {
  type State = {
    #pending;
    #processing;
    #fulfilled;
    #cancelled;
  };

  type InvoiceStatus = {
    #draft;
    #sent;
    #paid;
    #overdue;
  };

  type AppRole = {
    #admin;
    #sales;
    #inventoryManager;
    #accountant;
  };

  type UserApprovalStatus = {
    #approved;
    #rejected;
    #pending;
  };

  type Product = {
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
    images : [Blob];
    inventoryStatus : InventoryStatus;
  };

  type InventoryStatus = {
    #inStock;
    #low;
    #outOfStock;
  };

  type EntityHistory = {
    actions : [Action];
    created : ?Int;
    lastModified : ?Int;
  };

  type Action = {
    actionId : Nat;
    timestamp : Int;
    status : State;
  };

  type Customer = {
    id : Nat;
    name : Text;
    email : Text;
    phone : Text;
    address : Text;
    created : Int;
    modified : Int;
  };

  type InventoryRecord = {
    id : Nat;
    productId : Nat;
    quantity : Nat;
    batch : Text;
    supplierId : Nat;
    created : Int;
    modified : Int;
  };

  type OrderRecord = {
    id : Nat;
    customerId : Nat;
    productId : Nat;
    quantity : Nat;
    status : Text;
    created : Int;
    modified : Int;
    totalPrice : Nat;
  };

  type DataEntry = {
    id : Nat;
    entityType : Text;
    entryId : Nat;
    created : Int;
    modified : Int;
    amount : Nat;
    quantity : Nat;
  };

  type Stats = {
    totalCustomers : Nat;
    totalInventory : Nat;
    totalOrders : Nat;
    totalRevenue : Nat;
  };

  type UserProfile = {
    name : Text;
    email : Text;
    appRole : AppRole;
    department : Text;
  };

  type UserAccount = {
    id : Principal;
    profile : UserProfile;
    approvalStatus : UserApprovalStatus;
  };

  type ReportDateRange = {
    startDate : Int;
    endDate : Int;
  };

  type ProfitLossReport = {
    revenue : Nat;
    cogs : Nat;
    grossProfit : Nat;
    expenses : Nat;
    netProfit : Nat;
    reportDateRange : ReportDateRange;
  };

  type NewActor = {
    products : Map.Map<Nat, Product>;
    customers : Map.Map<Nat, Customer>;
    inventory : Map.Map<Nat, InventoryRecord>;
    orders : Map.Map<Nat, OrderRecord>;
    dataEntries : Map.Map<Nat, DataEntry>;
    entityHistory : Map.Map<Nat, EntityHistory>;
    userProfiles : Map.Map<Principal, UserProfile>;
    userAppRoles : Map.Map<Principal, AppRole>;
    userAccounts : Map.Map<Principal, UserAccount>;
    adminPrincipals : Set.Set<Principal>;
    previousRejectedUsers : Set.Set<Principal>;
    secondaryAdminEmails : Set.Set<Text>;
    secondaryAdminPrincipals : Set.Set<Principal>;
    nextProductId : Nat;
    nextCustomerId : Nat;
    nextInventoryId : Nat;
    nextOrderId : Nat;
    nextDataEntryId : Nat;
  };

  public func run(old : NewActor) : NewActor { old };
};

