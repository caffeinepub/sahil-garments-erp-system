# Sahil Garments ERP

## Current State
The app currently gates access via an admin approval flow:
- New users must create a profile, then request approval
- They see an "Approval Pending" screen until an admin approves them
- User Management and Request Management modules exist in sidebar, admin-only
- App.tsx blocks unapproved users from seeing the dashboard

## Requested Changes (Diff)

### Add
- Nothing new to add

### Modify
- `App.tsx`: Remove the approval gate (step 6 — "profile exists but not approved" block). After profile setup, users go directly to the Dashboard.
- `Sidebar.tsx`: Remove "User Management" and "Request Management" menu items entirely from the sidebar for all users (including admins). Admin Allowlist stays.
- `Dashboard.tsx`: Remove `user-management` and `request-management` cases from `canAccessModule` and `renderModule`. Remove their lazy imports.

### Remove
- The approval-pending screen gate in the login/app flow (users no longer need admin approval to use the app)
- User Management and Request Management sidebar entries

## Implementation Plan
1. Edit `App.tsx` — remove the `isApproved` gate block so users go to Dashboard after profile setup
2. Edit `Sidebar.tsx` — remove user-management and request-management menu items
3. Edit `Dashboard.tsx` — remove user-management and request-management module routing and lazy imports
