# HCM Lite - AI Assisted Human Capital Management

A complete web-based HR management system built for the Saylani Hackathon with AI integration.

## 🚀 Features

### Core Modules
- **Authentication & RBAC** - JWT-based auth with 3 roles (Admin, HR, Employee)
- **Organization Setup** - Company settings, departments, designations, leave types, holidays
- **Employee Management** - Directory, Employee 360, search, filters
- **Attendance** - Web check-in/out with rules, corrections, optional face check-in and office geofencing
- **Leave Management** - Apply, approve/reject, balances, working days calculation
- **Payroll** - Salary structures, monthly runs, tax calculation, payslips
- **Dashboards** - Role-based analytics with KPIs
- **AI Assistant** - Chat with tools, smart leave parsing, dashboard summaries
- **Communications** - Announcements, notifications, audit logs

### AI Features
- **Smart Chat** - Role-scoped AI assistant using tools
- **Smart Leave** - Parse natural language to pre-fill leave forms
- **Dashboard Summary** - AI-generated insights from KPIs
- **Policy Q&A** - Answers based on HR policies
- **Tool Calling** - AI uses backend services with same permissions

## 🛠 Tech Stack

**Backend:** Node.js, Express.js, MongoDB, Mongoose, JWT, bcryptjs, Axios  
**Frontend:** React 19, Vite, Tailwind CSS 4, React Router, Lucide React, React Hot Toast  
**AI:** Gemini via Google AI Studio (OpenAI-compatible endpoint); optional OpenRouter fallback  
**Face verification:** `@vladmandic/face-api` (SSD MobileNet, 68 landmarks, 128-d descriptors) in the browser; browser geolocation

## 📋 Quick Start

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)

### Installation

1. **Clone and setup**
```bash
cd Backend
npm install
cp .env.example .env
```

2. **Configure Backend (.env)**
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/hcm-lite
JWT_SECRET=your_secret_key
GEMINI_API_KEY=your_google_ai_studio_key
AI_MODEL=gemini-3.1-flash-lite
AI_TIMEOUT_MS=30000
```

To use an OpenAI-compatible provider such as OpenRouter instead, leave `GEMINI_API_KEY` empty and set `AI_API_KEY`, `AI_BASE_URL`, and `AI_MODEL`. See `Backend/.env.example`.

3. **Start Backend**
```bash
npm run dev
```

4. **Setup Frontend**
```bash
cd Frontend
npm install
npm run dev
```

### Demo Accounts (Optional)

To skip first-run setup and create demo logins:

```bash
cd Backend
npm run seed
```

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@hcmlite.com` | `Admin@123` |
| HR | `hr@hcmlite.com` | `Hr@12345` |
| Employee | `employee@hcmlite.com` | `Employee@123` |

Re-running `npm run seed` resets only these demo accounts. It also idempotently creates default leave types (Annual 20, Sick 10, Casual 5, Unpaid 0 days) and current-year leave balances for the demo employee without deleting existing data. Change the passwords before deploying.

### First Run

To create your own Admin account instead of using the demo seed:

1. Open http://localhost:5173/setup
2. Enter the company name and create the Admin account
3. Login and configure departments, leave types, create HR users
4. HR can register employees

## 🎯 Demo Flow (5 Minutes)
1. **Setup** - First-run setup, create admin
2. **Configure** - Admin sets up departments, leave types, and office geofence in Settings
3. **Users** - Create HR user
4. **Employees** - HR registers 2-3 employees
5. **Attendance** - Employee checks in normally or uses face check-in
6. **Leave** - Employee uses smart leave or applies manually, HR approves
7. **Payroll** - HR creates payroll run, Admin finalizes
8. **Payslip** - Employee downloads payslip
9. **AI** - Show AI assistant answering questions, dashboard summary
10. **Audit** - Admin views audit log

## Face Verification, Camera Attendance and Geofencing

Employees enroll once from **Profile -> Face verification**, then use **Face check-in** and **Face check-out** on the employee dashboard. The normal web check-in/out buttons remain available.

- The browser must allow camera and location access. Use `localhost` or HTTPS.
- Face-api weights load locally from `Frontend/public/models`, so no model CDN is required at runtime.
- The browser detects faces and computes a 128-number face descriptor on-device. No photo or video is uploaded.
- Enrollment stores only the descriptor (L2-normalized) in `FaceProfile`; it is excluded from normal queries and never returned by the API.
- Camera attendance requires exactly one detected face, a head-turn liveness check, a steady face for at least 2 seconds, and GPS accuracy of 500 meters or better.
- The backend compares the descriptor to the enrolled profile. Euclidean distance must be `<= 0.5` (confidence `>= 50%`).
- The backend verifies the employee is inside the office geofence using Haversine distance.
- GPS uncertainty is added to the office radius: the allowed distance is `officeRadius + accuracy`. For example, a 300 m radius with ±275 m accuracy allows up to 575 m. Rejections report the measured distance, accuracy, and allowed distance so employees know why they were blocked.
- Office latitude, longitude, and radius are configured by an Admin or HR in **Settings**.
- Admins see check-in/check-out face confidence in the Attendance table. Raw descriptors are never shown.
- Liveness is enforced by the browser camera flow; its flags are recorded for auditing but cannot be cryptographically proven server-side.
- Seed defaults: Karachi `24.8607, 67.0011`, radius `150 m`. Existing office settings are preserved when you re-run the seed.

Camera attendance requires an office location in **Settings**. Normal web check-in/out still works without one.

For production, use HTTPS, define a biometric-data retention/re-enrollment policy, and obtain employee consent.

## 🔐 Security
- All routes protected with JWT
- Role-based access control on server
- Passwords hashed with bcrypt
- AI API key only on backend
- Audit logging for critical actions
- Input validation

## 📊 All 25 Functionalities Implemented
✅ All core HR flows, AI features, dashboards, RBAC, audit logs

## 📝 Notes
- Starts empty - no dummy data
- All calculations server-side
- AI tools respect role permissions
- Responsive design
- Ready for hackathon demo

## First-run setup and production
- First-run setup: If no users exist, go to /setup (or the login page shows Create your company account) to create the company and the first Admin. The backend rejects setup if any user already exists.
- Users: Admin can create HR users. Admin and HR can create employees with a temporary password and mustChangePassword=true.
- Seed (demo only): Backend/seed.js is for local demo data only. It refuses to run when NODE_ENV=production. In production, use first-run setup instead of seeding demo accounts.

## Deploy

### Backend on Render
1. Create a MongoDB Atlas cluster, database user, and database. Under Atlas **Network Access**, allow Render (for example `0.0.0.0/0`, or Render's static IPs).
2. In Render choose **New → Web Service** and connect this repository.
3. Set **Root Directory** to `Backend`, **Runtime** to `Node`, **Build Command** to `npm install`, **Start Command** to `npm start`, and **Health Check Path** to `/api/health`.
4. Add these environment variables (Render provides `PORT` automatically):
   - `MONGO_URI` = `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/hcm-lite`
   - `JWT_SECRET` = a long random secret
   - `JWT_EXPIRE` = `7d`
   - `NODE_ENV` = `production`
   - `CLIENT_URL` = `https://your-frontend.vercel.app` (comma-separate multiple origins, e.g. preview URLs)
   - `GEMINI_API_KEY` = your Google AI Studio key
   - `AI_MODEL` = `gemini-3.1-flash-lite`
   - `AI_TIMEOUT_MS` = `30000`
5. Deploy. Do **not** run `npm run seed` in production. On first visit, use the frontend `/setup` page to create the company and first Admin.

### Frontend on Vercel
1. In Vercel choose **Add New → Project** and import this repository.
2. Set **Root Directory** to `Frontend`, framework preset **Vite**, **Build Command** `npm run build`, **Output Directory** `dist`.
3. Add `VITE_API_URL` = `https://your-backend.onrender.com/api` for Production and Preview.
4. Deploy. `vercel.json` rewrites all routes to `/index.html` so React Router deep links work. Redeploy after changing environment variables.
5. Camera attendance requires HTTPS, which both Vercel and Render provide.
