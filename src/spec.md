# Specification

## Summary
**Goal:** Fix the approval request workflow so that users selecting privileged roles (admin, inventoryManager, accountant) during profile setup can successfully submit approval requests and be redirected to the ApprovalPending screen.

**Planned changes:**
- Fix ProfileSetup component to properly submit approval requests when privileged roles are selected
- Verify backend requestApproval function correctly processes and stores approval requests
- Add comprehensive error logging to capture failures during approval request submission
- Ensure successful redirection to ApprovalPending screen after approval request submission

**User-visible outcome:** Users selecting privileged roles during profile creation will successfully submit approval requests, see their request appear in the admin's UserManagementModule, and be redirected to the ApprovalPending screen without errors.
