# Specification

## Summary
**Goal:** Make the “secondary admin” role deterministic and manageable: automatically recognize designated secondary admins after profile setup, keep them restricted from primary-admin-only actions, and let primary admins manage the secondary-admin email allowlist (backend + gated frontend UI) with upgrade-safe persistence.

**Planned changes:**
- Update backend secondary-admin handling so users whose profile email is in the secondary-admin email allowlist are automatically added to the backend secondary-admin principals set after profile save/setup, and are treated as admin for normal admin checks while still failing primary-admin-only guards.
- Add backend primary-admin-only APIs to list/add/remove secondary-admin allowlist emails, with changes taking effect for future profile saves/logins, and explicitly define the behavior for already-assigned secondary-admin principals when an email is removed.
- Add a primary-admin-only frontend settings/admin UI to view/add/remove secondary-admin emails (with confirmation), using existing React Query patterns and showing loading/error states; ensure secondary admins cannot see or access this UI via routing.
- Add/adjust upgrade migration logic so the secondary-admin allowlist is preserved when already present in stable state; otherwise initialize it with the current default email, and avoid upgrade traps from missing legacy fields/state.

**User-visible outcome:** Primary admins can manage which email addresses qualify as “secondary admin” in a settings/admin screen, and designated secondary admins automatically gain admin access for standard admin areas after saving their profile, while remaining blocked from primary-admin-only actions like user management.
