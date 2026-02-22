# Specification

## Summary
**Goal:** Fix the profile save functionality so users can successfully save their profile information.

**Planned changes:**
- Debug and fix the ProfileSetup component's save operation to ensure profiles are persisted to the backend
- Add proper error handling and loading states during profile save
- Display clear success/error messages to users
- Verify backend setUserProfile endpoint correctly handles profile creation and returns appropriate responses
- Prevent duplicate submissions while save is in progress

**User-visible outcome:** Users can successfully save their profile with name, email, department, and role, with clear feedback on success or failure.
