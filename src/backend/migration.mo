import Set "mo:core/Set";
import Text "mo:core/Text";

module {
  type OldActor = {
    secondaryAdminEmails : Set.Set<Text>;
  };

  type NewActor = {
    secondaryAdminEmails : Set.Set<Text>;
  };

  public func run(old : OldActor) : NewActor {
    let emails = old.secondaryAdminEmails;
    emails.add("sahilgarments16@gmail.com");
    { old with secondaryAdminEmails = emails };
  };
};
