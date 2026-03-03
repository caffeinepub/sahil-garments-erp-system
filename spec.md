# Sahil Garments ERP

## Current State

- User Management module exists with approve/reject/role-change/delete actions.
- ProfileSetup component saves profile with hardcoded `AppRole.sales` role; user cannot choose their role.
- `useAllUserProfiles` calls `listApprovals()` which returns only users who have gone through the approval workflow; users who saved a profile but never called `requestApproval` may be missing.
- The User Management table shows all approval-tracked users but can appear empty if no requests exist.
- Admin sees a table of users with Approve/Reject/Role/Delete actions — but only Primary Admin can approve/reject.
- Profile request flow: save profile → requestApproval → admin approves → user gets dashboard.

## Requested Changes (Diff)

### Add
- Role selection dropdown in ProfileSetup (user-safe roles only: Sales, Inventory Manager, Accountant). Admin role is NOT selectable — it is only auto-assigned for secondary admin emails.
- "Pending Requests" tab / section in User Management that shows users with pending approval status prominently at the top.
- A request count badge on the User Management section showing how many pending requests exist.
- Auto-refresh for the user list in User Management (every 15 seconds) so new requests appear without manual refresh.
- "Request Sent" confirmation message on ApprovalPending screen so users know their request was submitted.

### Modify
- ProfileSetup: add role selector (Sales / Inventory Manager / Accountant only); save selected role in profile; keep email-based admin auto-assignment as before.
- UserManagementModule: split view into "Pending Requests" section (top, highlighted) and "All Users" table below; add auto-refresh polling.
- useAllUserProfiles hook: also fetch `getAllApprovalRequests()` to catch users who may not be in `listApprovals()` yet, merge and deduplicate by principal.

### Remove
- Nothing removed.

## Implementation Plan

1. Update `ProfileSetup.tsx`: Add a role dropdown (Sales/Inventory Manager/Accountant). Save chosen role in profile. Keep admin auto-assignment logic for secondary admin emails unchanged.
2. Update `UserManagementModule.tsx`:
   - Add a "Pending Requests" highlighted section at the top showing only users with `status === 'pending'`.
   - Add auto-refresh polling (refetchInterval: 15000) to `useAllUserProfiles`.
   - Show pending count badge in the header.
   - Existing "All Users" table stays below.
3. Update `useAllUserProfiles` hook to merge results from both `listApprovals()` and `getAllApprovalRequests()` (deduped), so no user is missed even if they didn't go through the approval state machine.
4. Add refetchInterval to the `useAllUserProfiles` query (15 seconds).
