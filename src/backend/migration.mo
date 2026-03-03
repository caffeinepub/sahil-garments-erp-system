import Set "mo:core/Set";
import Text "mo:core/Text";

module {
  type OldActor = {
    secondaryAdminEmails : Set.Set<Text>;
    SECONDARY_ADMIN_EMAIL : Text;
  };

  type NewActor = {
    secondaryAdminEmails : Set.Set<Text>;
  };

  let defaultSecondaryEmail = "sahilgarments16@gmail.com";

  public func run(old : OldActor) : NewActor {
    if (old.SECONDARY_ADMIN_EMAIL == defaultSecondaryEmail) {
      { secondaryAdminEmails = Set.fromArray<Text>([defaultSecondaryEmail]) };
    } else {
      { secondaryAdminEmails = old.secondaryAdminEmails };
    };
  };
};
