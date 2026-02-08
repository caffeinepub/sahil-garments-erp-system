# Specification

## Summary
**Goal:** Update the backend configuration so the secondary admin email is set to `sahilgarments16@gmail.com`.

**Planned changes:**
- Update `backend/main.mo` secondary-admin configuration to use exactly `sahilgarments16@gmail.com`.
- Ensure the secondary-admin email allowlist includes `sahilgarments16@gmail.com` at startup so the account is recognized as secondary admin after Profile Setup.
- Verify secondary admin permissions: treated as admin for relevant checks, but restricted from User Management actions (e.g., listApprovals/getAllUserAccounts/setApproval).

**User-visible outcome:** A user who completes Profile Setup using `sahilgarments16@gmail.com` is recognized as the secondary admin (admin where applicable) while remaining restricted from User Management capabilities.
