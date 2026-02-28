import Map "mo:core/Map";
import Set "mo:core/Set";
import Time "mo:core/Time";
import Storage "blob-storage/Storage";

module {
  type AppRole = {
    #admin;
    #sales;
    #inventoryManager;
    #accountant;
  };

  type UserApprovalStatus = { #approved; #rejected; #pending };

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

  type ApprovalRequest = {
    principal : Principal;
    status : UserApprovalStatus;
    timestamp : Time.Time;
  };

  type OldActor = {
    userProfiles : Map.Map<Principal, UserProfile>;
    userAppRoles : Map.Map<Principal, AppRole>;
    userAccounts : Map.Map<Principal, UserAccount>;
    previousRejectedUsers : Set.Set<Principal>;
    userSignatures : Map.Map<Principal, Storage.ExternalBlob>;
    approvalRequests : Map.Map<Principal, ApprovalRequest>;
  };

  type NewActor = OldActor;

  public func run(old : OldActor) : NewActor {
    let approvalRequests = old.approvalRequests.map<Principal, ApprovalRequest, ApprovalRequest>(
      func(_p, req) {
        {
          req with timestamp = Time.now();
        };
      }
    );
    {
      old with
      approvalRequests;
    };
  };
};
