import Set "mo:core/Set";

module {
  public type OldActor = { secondaryAdminEmails : Set.Set<Text> };
  public type NewActor = { secondaryAdminEmails : Set.Set<Text> };

  public func run(old : OldActor) : NewActor {
    let newAdminEmailsSet = Set.fromArray([
      "sahilgarments16@gmail.com",
      "pawankumarindia0091@gmail.com",
    ]);
    { old with secondaryAdminEmails = newAdminEmailsSet };
  };
};
