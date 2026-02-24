# Specification

## Summary
**Goal:** Fix secondary admin role permissions, user role mapping bugs, and request management data flow in the Sahil Garments ERP.

**Planned changes:**
- Backend: Ensure the secondary admin role explicitly stores and enforces Login Access, View User Requests, and Approve/Reject Requests as enabled permissions
- Backend: Fix the bug where secondary admin accounts are incorrectly saved with the normal user role; validate that role is set to 'Admin' or 'Sub Admin', status is 'Active', and access modules include 'User Management' and 'Request Management' before saving
- Backend: Correct any existing secondary admin records that were saved with wrong role mappings via migration if needed
- Backend: Fix the pending user requests API to properly filter by status = Pending and return all relevant request data for Admin/Sub Admin users
- Frontend: In the User Management panel, display Role, Status, and assigned access modules columns for each user; show a warning badge on secondary admin accounts where the role is misconfigured
- Frontend: In the Request Management module, connect it to the backend API, add a filter control (All, Pending, other statuses), refresh data on mount, and show an empty state message when no requests match the filter

**User-visible outcome:** Administrators can reliably create and identify secondary admin accounts with correct roles and permissions, and can view and filter pending user requests from the admin dashboard without data being missing or incorrectly mapped.
