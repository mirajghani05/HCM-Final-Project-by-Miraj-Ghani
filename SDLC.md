# SDLC Plan - HCM Lite (4 Hours)
**Timeline:** Aggressive but achievable with parallel work

## Phase 1: Planning & Setup (0-30 min)
- [x] Read and understand brief
- [x] Create PRD
- [ ] Create architecture doc
- [ ] Setup project structure (backend + frontend)
- [ ] Install dependencies
- [ ] Configure env

## Phase 2: Backend Core (30-90 min)
**Priority: Foundation**
- [ ] Project setup (Express, Mongoose, JWT, bcrypt, cors, dotenv)
- [ ] DB connection
- [ ] Models: User, Employee, CompanySettings, Department, etc.
- [ ] Auth & RBAC middleware
- [ ] First-run setup endpoint
- [ ] Auth routes (login, change password)
- [ ] Organization setup CRUD
- [ ] Error handling, validation

## Phase 3: HR Core Flows (90-150 min)
**Priority: Must-have for demo**
- [ ] Employee management (register, list, 360, CSV import/export)
- [ ] Attendance (check-in/out, rules, corrections)
- [ ] Leave (apply, approve, balances, working days calc)
- [ ] Payroll (salary structure, run, tax calc, PDF, finalize)

## Phase 4: Frontend (90-180 min) - Parallel with backend
**Priority: UI for all flows**
- [ ] Setup routing (react-router-dom)
- [ ] Auth context, protected routes by role
- [ ] First-run setup page
- [ ] Login page
- [ ] Layouts per role (Admin/HR/Employee)
- [ ] Dashboards
- [ ] Employee management UI
- [ ] Attendance UI
- [ ] Leave UI
- [ ] Payroll UI
- [ ] Settings/Org setup UI

## Phase 5: AI Assistant + Dashboards + Comms (150-210 min)
- [ ] AI service with tool calling
- [ ] AI routes and tools (all 7 tools)
- [ ] Dashboard aggregations
- [ ] Announcements, notifications
- [ ] Audit logging
- [ ] Smart leave parsing

## Phase 6: Integration, Testing & Polish (210-240 min)
- [ ] End-to-end testing of demo flow
- [ ] Fix bugs
- [ ] RBAC verification
- [ ] Add loading/error states
- [ ] Create .env.example
- [ ] Write comprehensive README
- [ ] Final checks

## Tech Stack Decision
**Backend:** Node.js + Express.js + Mongoose (MongoDB) - Fast to build, flexible schema
**Frontend:** React 19 + Vite + React Router + Axios + Tailwind CSS
**Auth:** JWT + bcryptjs
**AI:** OpenRouter/OpenAI compatible API (free tier)
**PDF:** pdfkit or puppeteer (pdfkit lighter)
**Utils:** date-fns, lodash

## Architecture
```
backend/
├── config/ (db, env)
├── models/ (all schemas)
├── middleware/ (auth, rbac, audit)
├── services/ (business logic - rules)
├── controllers/ (route handlers)
├── routes/ (API routes)
├── utils/ (helpers, calc)
└── ai/ (tools, service)

frontend/
├── src/
│   ├── components/ (ui, layout)
│   ├── contexts/ (auth)
│   ├── pages/ (role-based)
│   ├── services/ (api)
│   ├── utils/ (helpers)
│   └── App.jsx
```

## Team Split Recommendation
- **Backend Dev 1:** Auth, Org, Employees, AI service
- **Backend Dev 2:** Attendance, Leave, Payroll, Dashboards, Audit
- **Frontend Dev 1:** Auth, Layouts, Dashboards, Employees, AI chat
- **Frontend Dev 2:** Attendance, Leave, Payroll, Settings, Comms

## Risk Mitigation
- Start with minimal working versions, iterate
- Use simple UI over fancy
- Focus on demo-critical path first
- Test RBAC early
- Keep calculations in services (testable)
