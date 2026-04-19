# WIT Boys Hostel Management System — PRD

## Original Problem Statement
Build a full-stack Hostel Management System for "WIT Boys Hostel" — merit-based hostel application, room allocation, fees, complaints, admin + student portals — with a modern SaaS UI and "crazy animations". User asked for JWT auth + Google/Apple social login (UI-only), default admin admin@witboys.com/Admin@123, student login post-approval via phone+auto-generated password, design-agent-decided theme, CSV exports for students/applications/payments.

## Architecture
- **Backend**: FastAPI + MongoDB (motor async), JWT auth (PyJWT + bcrypt), single server.py file
- **Frontend**: React 19 + react-router-dom 7 + Framer Motion + Tailwind + shadcn/ui + recharts + sonner toasts
- **Theme**: Swiss & High-Contrast archetype — dark-first, Outfit + Plus Jakarta Sans, #FF2A00 accent, glassmorphism nav, grain texture overlay, marquee animations, parallax hero

## User Personas
1. **Admin** — manages rooms, approves/rejects applications, manages students, tracks fees, resolves complaints.
2. **Student Applicant** (public, no auth) — applies for hostel, checks status.
3. **Student Resident** (post-approval) — views allotted room, pays fees (via admin), raises complaints.

## Core Requirements (static)
- Merit logic: percentage ≥ 80 → 2 Seater; ≥ 60 → 3 Seater; else 4 Seater. Backlogs > 2 → auto-reject.
- Room allocation: first available room of requested type; bed_number auto-assigned; occupied_beds auto-incremented.
- On student removal / rejection: free the bed (decrement occupied_beds).
- One-time fee tracking (no installments).
- 3 complaint statuses: Pending → In Progress → Resolved.

## What's been implemented (Feb 17, 2026)
### Backend (server.py)
- JWT auth (admin email/password, student phone/password)
- Admin seed on startup + 8 demo rooms seeded
- CRUD: Rooms, Students, Applications, Complaints, Payments
- Public endpoints: POST /api/applications, POST /api/applications/status
- Admin endpoints: all management + dashboard stats + CSV exports
- Student endpoints: /auth/student/login, /students/me, /complaints (submit/list own)
- Room allocation helper + auto bed assignment
- Merit scoring: percentage - backlogs*10
- 42/42 backend tests pass (testing_agent_v3)

### Frontend
- Public pages: Landing (parallax hero + marquee + bento + room tiers), Apply (3-step wizard), Check Status
- Auth: AdminLogin, StudentLogin (with Google/Apple UI buttons — "coming soon" toasts)
- Admin portal: Dashboard (charts), Rooms, Students, Applications, Fees, Complaints
- Student portal: Dashboard, Complaints, Profile
- Framer Motion animations: page transitions, staggered reveals, hover lifts, marquee, spinning rings, pulsing dots
- Dark/Light theme toggle (default dark)
- CSV exports (students/applications/payments)
- Search + filters everywhere; sort by merit/percentage/backlogs on applications; sort by availability on rooms
- data-testid attributes on all interactive elements

## Phase 3 additions (Feb 17, 2026) — Signup-first Flow
### Backend
- **POST /api/auth/student/register** — student signup with name/email/phone/password (bcrypt). Prevents duplicates. Returns JWT.
- **POST /api/auth/student/login** — now accepts `{identifier, password}` where identifier is email OR phone.
- **POST /api/applications** — now requires student auth. Body only needs academic fields (course/year/percentage/backlogs/preferred_room_type). Name/email/phone come from session. `user_id` linked.
- **GET /api/applications/me** — student sees own latest application (or null).
- **approve_application** — now reuses existing `user_id` from the application (no new password generated). Student logs in with original signup password.
- 30/30 new tests + all regression tests pass (iteration_3.json).

### Frontend
- **/signup** page — name, email, phone, password. Redirects to `/apply` after signup.
- **/student/login** — identifier field supports email OR phone.
- **/apply** — protected route. Auto-redirects to `/signup` if not logged in. Prefills "Applying as" card from user session (no name/email/phone input). 2-step: Academic → Preference → Review.
- **Student Dashboard** — three states: (1) not applied → big "Start Application" CTA, (2) applied but pending/rejected → application status card with waitlist CTA, (3) approved → room card.
- **Landing + PublicNav** Apply CTAs route to `/signup` if not logged in, to `/apply` if logged-in student.
### Backend
- **Razorpay integration**: /api/payments/config, /api/payments/fees/{create-order,verify}, /api/waitlist/{create-order,verify}. HMAC SHA256 signature verification. Stores payment_orders collection.
- **Resend email**: send_email() helper with HTML approval email template + waitlist confirmation email. Fire-and-forget via asyncio.create_task — non-blocking.
- **Emergent Google OAuth**: /api/auth/google/session exchanges session_id for session_token, auto-links to existing admin or approved student via email match. user_sessions collection with 7-day expiry.
- Updated approve_application to auto-send credentials email.
- Added priority_score field (merit_score + 50) on waitlist-paid applications.
- 22/22 new tests + all regression tests pass.

### Frontend
- **AuthCallback** component processes session_id synchronously during render (prevents race).
- **Functional Google button** redirects to auth.emergentagent.com.
- **useRazorpay hook** — loads script, orchestrates checkout for fees/waitlist.
- **Student Dashboard "Pay Online" button** — Razorpay checkout with prefill.
- **Apply submission page** now shows "Join Priority Waitlist · ₹500" banner for Pending apps.
- **CheckStatus Pending view** also exposes waitlist CTA.
- **Priority badge** shown on admin Applications list for waitlist-paid apps.

### Required env keys (user to add)
- RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET — https://dashboard.razorpay.com/app/keys
- RESEND_API_KEY — https://resend.com/api-keys
- Until keys are set: payment endpoints return 503, emails log silently, no crashes.

## Prioritized backlog
### P1 (next phase)
- Real Google OAuth integration (currently UI placeholder)
- Email notifications on approval/rejection (via Resend or SendGrid)
- Student-side fees payment via Stripe/Razorpay (currently admin-recorded only)
- Multiple complaints categories per room + image attachments
- Admin activity log / audit trail

### P2 (nice-to-have)
- Apple Sign-In (requires paid Apple Developer account)
- Bulk CSV import for rooms
- Print/PDF allotment letter
- WhatsApp notifications via Twilio
- Multi-hostel / multi-admin roles
- Occupancy forecasting charts

## Next tasks
Ask user for feedback on UI vibe; then Phase 2 priorities: real social auth or online fee payments.
