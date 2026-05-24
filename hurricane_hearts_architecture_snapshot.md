# Hurricane Hearts — Architecture Snapshot

## Purpose

Hurricane Hearts is a community assistance coordination app for Arlington Ridge. It supports resident account access, profile management, request assistance workflows, volunteer/helper claims, event activation, event-specific request tracking, history, reporting, notifications, document links, directory lookup, and NWS weather alert display.

This document is intended to preserve the current project state so future development can continue from a clean reference point.

---

# 1. Current Application Concept

## Core Operating Model

When no emergency/event is active:

- Residents may request account access.
- Approved users may log in.
- Users may edit their profile.
- Users may search the resident/helper directory.
- Admins may manage users and prepare the system.
- Request assistance functionality is disabled.

When an emergency/event is active:

- An admin activates the event with an event name and date.
- Request assistance opens for the active event.
- All requests are associated with the active event ID.
- Helpers may claim requests.
- Admins may submit requests or claims on behalf of others.
- Request history and event history are recorded.
- When the event is deactivated, the request module closes.
- A new event starts with an empty request list because requests are filtered by active event ID.

---

# 2. Major Feature Areas

## Authentication and Access

- Supports Google login.
- Supports access request mode.
- Requires users to accept Terms and Conditions before requesting access.
- New access requests create a user profile with:
  - `approved: false`
  - `active: true`
  - `role: resident`
- Existing users must be active, approved, and have accepted terms.
- Primary admin account must remain:
  - approved
  - active
  - admin
- Admins can manage users.
- Admins can delete user profile records, except protected primary admin.

## User Profiles

Profiles include:

- name
- email
- phone
- address
- role
- approved status
- active status
- service categories the resident is willing to help with

Phone numbers are standardized using U.S. formatting.

## Event Management

Admins can:

- activate an event
- deactivate an event
- record activation and deactivation history

Each active event has:

- event ID
- event name
- event date
- activated timestamp
- activated by
- deactivated timestamp when ended
- deactivated by when ended

## Requests

Users can submit assistance requests only during an active event.

Admins can submit requests on behalf of residents who cannot use the app.

Requests include:

- event ID
- event name
- event date
- resident/requestor info
- categories
- urgency
- need/request description
- number of people needed
- people committed
- people remaining
- status
- claim commitments

Statuses include:

- Open
- Assigned
- Completed
- Cancelled

## Claims

Helpers can claim requests.

Admins can claim requests on behalf of helpers.

Claims include:

- helper UID
- helper name
- helper email
- helper phone
- number of people provided
- comment
- timestamp
- whether admin claimed on behalf of someone else

Claiming uses a dropdown for number of people instead of a text prompt.

## History

History is event-centered.

The History page should list events first, with columns:

- Event Title
- Date/Time Activation
- Activated By
- Date/Time Termination
- Terminated By
- History button

Clicking the history button displays request activity for that event.

Request history records include:

- request ID
- event ID
- action
- details
- by UID
- by name
- timestamp

Event history records include:

- event ID
- event name
- event date
- action activated/deactivated
- details
- by UID
- by name
- timestamp

## Directory

The resident directory shows users in a compact row/table format.

Columns include:

- name
- phone
- abbreviated request/helper category headings
- check marks for categories selected by each user
- details button

Directory includes:

- search box
- clear button
- clickable sortable column headers
- compact spacing to fit the page width
- details view with printable profile information

## Dashboard

Current desired dashboard structure:

- Header contains user name, role, Edit Profile button, and Logout button.
- Navigation uses a dropdown menu, not a sidebar.
- Request Summary should be a single compact row.
- Red Request Assistance button should be first item in the Request Summary row.
- Quick Actions block should be removed.
- My Claims list should display in the lower dashboard area.
- My Requests list should display under My Claims.

Dashboard summary links should take the user to the Requests page filtered to only the selected category:

- Open
- Assigned
- Partially Claimed
- Completed
- Cancelled
- My Requests
- My Claims

## Requests Page

Requests page design goals:

- compact layout
- filter buttons in a row above search box
- search box and clear button below filter buttons
- shared table header
- request rows below table header
- reduced column spacing
- no email under name
- no Contact column
- no Need column
- Details button opens full printable request information

Request list columns currently intended:

- Name
- Category
- Urgency
- People
- Status
- Actions

People column uses legend:

- `N` = # People Needed
- `C` = Committed
- `R` = Remaining

Legend should be on the right side of the request list header area.

## Notifications

Notification system exists for user-facing updates such as:

- request claimed
- request completed
- request cancelled
- request edited

Notifications are stored in Firestore and displayed for the signed-in user.

## Documents

Document library stores links only, not uploaded files, to preserve Firebase free-tier usage.

Document library supports:

- title
- description
- URL
- category
- created by
- created timestamp

## Reports

Reports page exists for admin use.

Purpose:

- summarize requests
- summarize statuses
- summarize event/request activity
- support admin oversight

## Weather/NWS Alerts

National Weather Service alert ticker was added.

Components:

- `useNwsAlerts.js`
- `WeatherTicker.jsx`

Default point is near Arlington Ridge / Leesburg, FL.

Weather ticker appears below the header and displays:

- active NWS alerts
- no active alerts message
- unavailable/error state

Refresh interval: 10 minutes.

---

# 3. Current Module Inventory

## Hooks

### `src/hooks/useAuthUser.js`

Handles Firebase authentication state, account profile lookup, access request creation, approval checks, active status checks, and terms acceptance checks.

Current responsibilities:

- listen to Firebase auth state
- block login if user profile does not exist and auth mode is login
- create pending user profile if auth mode is request access
- enforce terms acceptance
- enforce active/approved status
- load role from claims or Firestore user profile

### `src/hooks/useActiveEvent.js`

Listens to `system/activeEvent` Firestore document.

Returns active event data only when `active: true`.

### `src/hooks/useEventHistory.js`

Listens to `eventHistory` collection ordered by `createdAt desc`.

Used by History page.

### `src/hooks/useDocuments.js`

Listens to `documents` collection ordered by `createdAt desc`.

Used by Document Library.

### `src/hooks/useRequests.js`

Listens to `requests` collection ordered by `createdAt desc`.

Filters requests by the current active event ID so each event has its own request list.

### `src/hooks/useRequestHistory.js`

Listens to `requestHistory` collection ordered by `createdAt desc`.

### `src/hooks/useNotifications.js`

Listens to notifications assigned to current user UID.

Sorts notifications newest first.

### `src/hooks/useNwsAlerts.js`

Fetches NWS active alerts for configured latitude/longitude.

Returns:

- alerts
- loading
- error

Refreshes every 10 minutes.

### `src/hooks/useUsers.js`

Listens to all user profiles in Firestore `users` collection.

Used by admin, directory, request-on-behalf, and claim-on-behalf flows.

---

# 4. Component Inventory

## `src/components/Navbar.jsx`

Header/navigation branding component.

Current/desired features:

- logo from `/hurricane-hearts-logo.jpg`
- title `Hurricane HeARts`, with `AR` in red
- subtitle `Arlington Ridge Community`
- user name and role
- Edit Profile button
- Logout button
- active event banner
- NWS weather ticker

Props:

- `user`
- `activeEvent`
- `onEditProfile`

## `src/components/WeatherTicker.jsx`

Displays NWS alerts below header.

Uses `useNwsAlerts`.

Shows:

- loading state
- error/unavailable state
- no active alerts state
- active alert scrolling ticker

Requires `@keyframes marquee` in `src/index.css`.

## `src/components/StatCard.jsx`

Compact reusable stat card. May be less central now since dashboard summary was converted to a single row.

## `src/components/RequestModal.jsx`

Used to create and edit requests.

Responsibilities:

- select request categories
- describe need
- set urgency
- set people needed
- admin submit request on behalf of another resident
- create Firestore request
- update Firestore request
- add request history
- send notifications when appropriate

Important props:

- `open`
- `onClose`
- `user`
- `editingRequest`
- `activeEvent`
- `users`

Known state:

- `form.categories`
- `form.need`
- `form.urgency`
- `form.peopleNeeded`
- `form.requestorUid`

## `src/components/RequestCard.jsx`

Displays a single request row in the Requests table.

Responsibilities:

- compact row display
- Details modal via React portal
- Claim modal via React portal
- claim request
- admin claim request on behalf of another helper
- complete request
- cancel request
- add history
- send notifications

Known important behavior:

- Details and Claim modals must use `createPortal` so they do not render inside `<tbody>`.
- Number of people when claiming is selected from dropdown.
- Admins can select helper when claiming on behalf of another user.

## `src/components/UserDirectory.jsx`

Displays compact resident directory table.

Features:

- search
- clear search
- sortable headers
- abbreviated category headers
- compact checkmark columns
- details button
- printable profile details

Known issue previously fixed:

- `categoryAbbreviations` must be in scope.
- component signature should be `export default function UserDirectory({ users = [] })`.

## `src/components/EventAdminPanel.jsx`

Admin panel for activating/deactivating events.

Responsibilities:

- create/set active event
- deactivate active event
- add event history records

## `src/components/DocumentLibrary.jsx`

Document link library component.

Likely supports:

- list documents
- add document link
- admin document management

## `src/components/NotificationCenter.jsx`

Displays notifications.

## `src/components/AdminPanel.jsx`

Admin user management.

Capabilities:

- approve users
- activate/deactivate users
- edit profiles
- delete user profile records
- protect primary admin
- force primary admin to remain approved, active, and admin

## `src/components/ProfileEditor.jsx`

Edit user profile.

Used by:

- current user editing own profile
- admin editing user profiles

Important behavior:

- primary admin role/approval/active protection
- request/helper category checkboxes
- phone formatting
- save/cancel buttons placed together

---

# 5. Page Inventory

## `src/pages/LoginScreen.jsx`

Login/access request page.

Current desired details:

- title `Hurricane Hearts`
- subtitle `Arlington Ridge Community`
- login button text: `Login with Google`
- request access mode with terms acceptance
- logo should display if available

## `src/pages/Dashboard.jsx`

Main application layout and routing controller.

Responsibilities:

- render `Navbar`
- render dropdown page navigation
- center page content
- manage current active page
- manage request filter state
- open request modal
- open edit request modal
- open profile editor
- pass users/requests/activeEvent to pages

Current desired nav behavior:

- menu dropdown slightly smaller width
- label `Menu:` next to dropdown
- helper label `Use the menu to move between Hurricane Hearts pages` should appear under the menu dropdown, not under page title

## `src/pages/HomePage.jsx`

Dashboard home content.

Current desired structure:

- no Quick Actions block
- single-row Request Summary with red Request Assistance button at start
- My Claims list
- My Requests list under My Claims

## `src/pages/RequestsPage.jsx`

Request list page.

Current desired structure:

- filter buttons row above search box
- search box with clear button
- New Request button
- compact request list table
- legend on right side of request list header
- filters support:
  - All
  - Open
  - Assigned
  - Completed
  - Cancelled
  - Partially Claimed
  - My Requests
  - My Claims

Important prop structure:

- `user`
- `users`
- `requests`
- `onNewRequest`
- `onEditRequest`
- `activeEvent`
- `requestFilter`
- `onRequestFilterChange`

## `src/pages/DirectoryPage.jsx`

Displays `UserDirectory`.

## `src/pages/DocumentsPage.jsx`

Displays document library.

## `src/pages/HistoryPage.jsx`

Event-centered history page.

Current desired structure:

- should NOT show dashboard Quick Actions
- should NOT show dashboard Request Summary
- should list events first
- each event has button to view request history for that event
- event list is table/list format

## `src/pages/AdminPage.jsx`

Admin area.

Includes event admin panel and user/admin management.

## `src/pages/ReportsPage.jsx`

Admin reporting.

## `src/pages/NotificationsPage.jsx`

Displays notifications.

---

# 6. Firebase / Firestore Collections

## `users`

User profile records.

Common fields:

- uid
- name
- email
- phone
- address
- serviceCategories
- role
- approved
- active
- profileComplete
- authProvider
- termsAccepted
- termsAcceptedAt
- termsVersion
- accessRequestedAt
- createdAt

## `system/activeEvent`

Singleton document containing current active event.

Fields:

- active
- eventId
- eventName
- eventDate
- activatedAt
- activatedByUid
- activatedByName
- deactivatedAt
- deactivatedByUid
- deactivatedByName

## `requests`

Assistance requests.

Fields:

- eventId
- eventName
- eventDate
- categories
- need
- urgency
- peopleNeeded
- peopleCommitted
- peopleRemaining
- claimCommitments
- residentName
- residentEmail
- residentPhone
- residentAddress
- residentUid
- status
- assignedHelper
- assignedHelperUid
- assignedHelperPhone
- assignedHelperEmail
- createdAt
- updatedAt
- cancelledAt
- completedAt

## `requestHistory`

Request activity history records.

Fields:

- requestId
- eventId
- action
- details
- byUid
- byName
- byEmail
- createdAt

## `eventHistory`

Event activation/deactivation records.

Fields:

- eventId
- eventName
- eventDate
- action
- details
- byUid
- byName
- createdAt

## `notifications`

User notifications.

Fields:

- toUid
- type
- title
- message
- requestId
- eventId
- read
- createdAt

## `documents`

Document link records.

Fields likely include:

- title
- description
- url
- category
- createdByUid
- createdByName
- createdAt

---

# 7. UI / Styling Notes

## Branding

- App title: `Hurricane HeARts`
- `AR` should appear red.
- Subtitle: `Arlington Ridge Community`
- Logo file expected at:

```text
public/hurricane-hearts-logo.jpg
```

Logo is referenced as:

```js
/hurricane-hearts-logo.jpg
```

## Favicon

Current desired favicon file:

```text
public/favicon.jpg
```

Vite `index.html` should use:

```html
<link rel="icon" type="image/jpeg" href="/favicon.jpg" />
```

Do not use `/public/favicon.jpg` in Vite.

## Tailwind

Tailwind is used heavily.

For Tailwind v3:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

For Tailwind v4:

```css
@import "tailwindcss";
```

## NWS Ticker Animation

`src/index.css` should include:

```css
@keyframes marquee {
  0% {
    transform: translateX(100%);
  }

  100% {
    transform: translateX(-100%);
  }
}
```

---

# 8. Current Known Issues / Risk Areas

## Canvas Stability

The active canvas became very large and difficult to patch reliably with pattern-based edits.

Recommended going forward:

- Keep this snapshot as source reference.
- Use smaller targeted canvases for major modules.
- Prefer full module replacement when changing a component.
- Copy stable versions into local VS Code files.
- Use Git to preserve stable working states.

## History Page Layout

User requested:

- remove Quick Actions block from History page
- remove Request Summary block from History page

This should be verified in `src/pages/HistoryPage.jsx`.

## Dashboard Menu Helper Label

User requested:

- move `Use the menu to move between Hurricane Hearts pages` label to under the menu dropdown.

This should be verified in `src/pages/Dashboard.jsx`.

## My Claims on Dashboard

My Claims matching must support:

- direct claim UID
- assignedHelperUid
- admin-claimed-on-behalf UID
- email match

## Requests Page Filtering

Dashboard summary buttons should filter Requests page to ONLY selected category.

Verify filters:

- Open
- Assigned
- Partially Claimed
- Completed
- Cancelled
- My Requests
- My Claims

## RequestCard Modals

Details and claim modals should use `createPortal` to avoid invalid HTML nesting inside `<tbody>`.

## RequestModal On-Behalf Support

Admins can submit requests on behalf of residents.

Verify the request record stores the selected resident as:

- residentUid
- residentName
- residentEmail
- residentPhone
- residentAddress

## Firestore Rules

Rules should allow admin-created requests for another resident.

Rules should protect primary admin where possible through app logic. Firestore rules may also need additional admin protections depending on security model.

---

# 9. Recommended Next Steps

## Immediate Cleanup

1. Move the canvas code into local project files.
2. Run:

```bash
npm run build
```

3. Fix compiler errors one at a time.
4. Commit stable code:

```bash
git add .
git commit -m "Stable Hurricane Hearts architecture snapshot"
```

## Recommended Refactor

Break the large canvas/project into smaller modules:

- `DashboardNavigation.jsx`
- `RequestSummaryRow.jsx`
- `MyClaimsTable.jsx`
- `MyRequestsTable.jsx`
- `RequestDetailsModal.jsx`
- `ClaimRequestModal.jsx`
- `EventHistoryTable.jsx`

This will reduce future syntax errors and make changes safer.

## Mobile Improvements

Add mobile-specific card layouts for:

- Requests
- Directory
- History
- Admin User Management

Pattern:

```jsx
<div className="hidden md:block">
  Desktop table
</div>

<div className="md:hidden space-y-2">
  Mobile cards
</div>
```

## Deployment Preparation

Before deployment:

- verify Firebase config
- verify Firestore rules
- verify auth providers
- verify primary admin account
- verify logo and favicon paths
- verify Tailwind build
- verify NWS API behavior
- verify mobile layout

---

# 10. Suggested Prompt for New Conversation

Use this prompt when starting a new ChatGPT conversation:

```text
Continue development of my Hurricane Hearts React/Vite/Firebase app from the uploaded architecture snapshot. Treat the snapshot as the source of truth. Help me update one module at a time and provide full replacement code for the affected module rather than patching the entire architecture document.
```

Then upload or paste this snapshot.

---

# 11. Project State Summary

Hurricane Hearts is now a moderately complex React/Vite/Firebase community emergency support app. The main architecture is in place, including authentication, event activation, event-specific request filtering, request/claim workflows, admin actions, history, directory, document links, notifications, weather alerts, and dashboard navigation.

The project has outgrown a single large canvas workflow. Future work should move toward local source files, Git versioning, and smaller module-by-module replacements.

The highest-priority stabilization work is:

1. ensure `Dashboard.jsx` has correct dropdown navigation and helper label placement
2. ensure `HistoryPage.jsx` does not contain dashboard summary/quick action blocks
3. verify `RequestModal.jsx` admin-on-behalf behavior
4. verify `RequestCard.jsx` modals use portals and compile cleanly
5. verify `HomePage.jsx` dashboard summary row, My Claims, and My Requests lists
6. verify `RequestsPage.jsx` filters and search behavior
7. verify build compiles with `npm run build`

