# Specification

## Summary
**Goal:** Improve app perceived and actual performance so it opens faster and becomes usable quickly after launch/refresh, without changing existing auth/approval behavior.

**Planned changes:**
- Show an immediate authenticated app shell (header/sidebar/loading skeletons) while only waiting on the existing `getBootstrapState` call; defer all non-essential/module data work.
- Ensure module-specific data fetching (orders/inventory/invoices/analytics/reports/etc.) does not start until the Dashboard is mounted and the relevant module is active.
- Optimize polling/refetch behavior: disable polling off-Dashboard, pause when the tab is hidden, and gate refetch intervals by active module.
- Reduce unnecessary Dashboard re-renders caused by auto-refresh timestamp updates by using query metadata (e.g., `dataUpdatedAt`) or updating only when relevant queries refresh.
- Keep heavy UI modules and third-party generation libraries (PDF/barcode/QR/report) out of the initial bundle; load them only when the corresponding module/dialog is opened.
- Keep `getBootstrapState` backend response minimal (userProfile, isApproved, isAdmin) and ensure it stays O(1) with no expensive computations.

**User-visible outcome:** The app opens faster and shows a usable UI shell sooner; data loads on-demand as users enter modules, and background polling is reduced/paused when not needed, while login/profile setup/approval screens continue to behave as before.
