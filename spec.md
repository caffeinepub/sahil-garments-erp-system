# Specification

## Summary
**Goal:** Fix the "Complete Your Profile" setup flow so that submitting the profile form successfully saves the data and navigates the user to the correct next screen.

**Planned changes:**
- Fix the ProfileSetup form submission so it correctly saves name, email, department, and role without leaving the user stuck on the setup screen
- Fix App.tsx onboarding routing to invalidate and re-fetch bootstrap data after profile save, then transition to either the ApprovalPending screen or Dashboard based on updated state
- Audit and fix the backend `saveProfile` endpoint in main.mo to ensure it persists profile data for the caller's principal and returns a proper success/error response that is reflected in subsequent bootstrap/getProfile calls
- Display clear error messages if profile submission fails

**User-visible outcome:** Users can complete the profile setup form and are automatically moved to either the approval pending screen or the dashboard, without being stuck on the setup screen.
