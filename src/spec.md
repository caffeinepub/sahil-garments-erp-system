# Specification

## Summary
**Goal:** Make user approval/rejection changes persist reliably in the backend and automatically refresh in the UI, including automatic approval-status rechecks for pending users.

**Planned changes:**
- Backend: Update `setApproval(user, status)` so it always results in a consistent `UserAccount` approval status, creating a `UserAccount` from the existing `UserProfile` when missing (and returning a clear error if no `UserProfile` exists).
- Backend: Ensure `getAllUserAccounts()` reflects the updated approval status immediately after a successful approval/rejection.
- Frontend (User Management): Auto-refresh the users list after approve/reject so the row status and available actions update without manual page refresh; show English toast errors based on backend error messages (authorization vs missing profile setup).
- Frontend (Approval gating): On the ApprovalPending screen, periodically re-check approval status and auto-redirect to the dashboard when approved; show an English rejected-state message with a logout button when rejected; stop periodic checks after routing or logout.

**User-visible outcome:** Admins see approve/reject updates reflected automatically in User Management, and end users on the pending screen are automatically routed when approved or shown a clear rejected message with a logout option when rejected.
