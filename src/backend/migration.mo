import Set "mo:core/Set";
import Principal "mo:core/Principal";

module {
  type OldActor = {
    adminPrincipals : Set.Set<Principal>;
    previousRejectedUsers : Set.Set<Principal>;
    secondaryAdminEmails : Set.Set<Text>;
    secondaryAdminPrincipals : Set.Set<Principal>;
  };

  type NewActor = {
    adminPrincipals : Set.Set<Principal>;
    knownAdminPrincipals : Set.Set<Principal>;
    previousRejectedUsers : Set.Set<Principal>;
    secondaryAdminEmails : Set.Set<Text>;
    secondaryAdminPrincipals : Set.Set<Principal>;
  };

  public func run(old : OldActor) : NewActor {
    {
      old with
      knownAdminPrincipals = Set.empty<Principal>();
    };
  };
};
