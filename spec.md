# Specification

## Summary
**Goal:** Fix the User Management and Profile functionality in the Sahil Garments ERP so that new user registration, approval requests, admin management actions, and approval notifications all work correctly end-to-end.

**Planned changes:**
- Fix the ProfileSetup form to correctly save profile data (name, email, department, default 'sales' role) to the backend and create a persisted approval request entry.
- Fix the backend so that `approvalRequests` is stored in stable storage, survives canister upgrades, and is correctly retrievable by admin query functions.
- Fix the admin's Request Management Module to display newly submitted pending approval requests.
- Fix the admin's User Management Module to correctly fetch and display all registered users, and make approve, reject, role-change, and delete actions work without errors.
- Fix the ApprovalPending screen to poll the backend every 15 seconds, detect approval status changes, and redirect the user to the Dashboard upon approval.
- Ensure that approving or rejecting a user creates a notification for that user visible in the Notifications Module.

**User-visible outcome:** New users can complete profile setup and see a pending approval screen; admins can view, approve, reject, change roles, and delete users without errors; approved users are automatically redirected to the Dashboard and receive a notification about the outcome.
