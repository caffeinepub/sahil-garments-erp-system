# Specification

## Summary
**Goal:** Fix the approval request flow so administrators receive and can view pending user approval requests.

**Planned changes:**
- Verify backend correctly stores approval requests when ProfileSetup submits them
- Ensure UserManagementModule fetches and displays all pending approval requests
- Add debug logging throughout the approval request lifecycle (submission, storage, retrieval)
- Verify role-based access control allows administrators to access pending approvals

**User-visible outcome:** Administrators will see pending approval requests in the UserManagementModule and can approve or reject new user registrations.
