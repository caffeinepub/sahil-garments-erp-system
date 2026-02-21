# Specification

## Summary
**Goal:** Enable primary admins to permanently remove user accounts from the system.

**Planned changes:**
- Add backend method for primary admins to remove users by principal ID
- Add "Remove User" button with confirmation dialog to each user row in the management table
- Create React Query mutation hook to handle user removal and refresh the user list
- Prevent admins from removing their own account

**User-visible outcome:** Primary admins can permanently delete user accounts through the user management interface with a confirmation step, improving account management capabilities.
