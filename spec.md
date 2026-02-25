# Specification

## Summary
**Goal:** Fix the Request Management module so that approval requests load and display correctly for admin users.

**Planned changes:**
- Investigate and fix the backend `getApprovalRequests` (or equivalent) function to ensure it correctly returns all stored approval requests without silent empty results or runtime traps
- Fix data fetching in the frontend Request Management module so pending, approved, and rejected requests render correctly
- Add proper loading spinner while requests are being fetched
- Add error state with a retry option if the fetch fails
- Add appropriate empty state message when no requests exist
- Ensure approving or rejecting a request updates the list immediately without a page refresh

**User-visible outcome:** Admin users can open the Request Management module and see all approval requests (pending, approved, rejected) with correct user details, along with proper loading, empty, and error states.
