# Sahil Garments ERP

## Current State
Full-stack ERP with inventory, orders, invoices, customers, user approval, reports, and barcode modules. Two admin tiers: primary admin and secondary admin. Secondary admin allowlist is managed via the backend. The `Admin Allowlist` module in the frontend currently shows to any admin (including secondary admins) and uses `bootstrapData.isAdmin` to gate access — which is incorrect since secondary admins also have `isAdmin = true`.

## Requested Changes (Diff)

### Add
- `pawankumarindia0091@gmail.com` to the default `secondaryAdminEmails` set in the backend (alongside existing `sahilgarments16@gmail.com`).

### Modify
- Backend: Add `pawankumarindia0091@gmail.com` to the default secondary admin emails set.
- Frontend `SecondaryAdminAllowlistModule`: Replace `bootstrapData.isAdmin` check with the `useIsSuperAdmin()` hook so only true primary admins can access the module.
- Frontend `Sidebar`: Add `superAdminOnly` flag to the `Admin Allowlist` menu item and use `useIsSuperAdmin()` to filter it — hiding it from secondary admins.
- Frontend `Dashboard.canAccessModule`: Restrict the `secondary-admin` module case to `isSuperAdmin === true` instead of `isAdminRole`.

### Remove
- Nothing removed.

## Implementation Plan
1. Update `secondaryAdminEmails` default set in `main.mo` to include `pawankumarindia0091@gmail.com`.
2. Update `SecondaryAdminAllowlistModule` to use `useIsSuperAdmin()` hook (already done in frontend).
3. Update `Sidebar` with `superAdminOnly` flag and `isSuperAdmin` check (already done in frontend).
4. Update `Dashboard.canAccessModule` to use `isSuperAdmin` for the `secondary-admin` case (already done in frontend).
5. Deploy.
