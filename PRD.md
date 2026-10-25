# HCM Lite - Product Requirements Document (PRD)
**Project:** Saylani Hackathon HCM Lite  
**Date:** 24 October 2026  
**Target:** 4 hours implementation  
**Team:** 4 people (2 backend, 2 frontend)

## 1. Overview
HCM Lite is an AI-assisted Human Capital Management web system for Admin, HR and Employees with:
- Three roles with strict server-side RBAC
- Core HR flows (employees, attendance, leave, payroll)
- AI assistant with tool calling
- Analytics dashboards
- Starts empty - no dummy data

## 2. Goals
- Ship a working web app with all 25 core functionalities
- Implement AI assistant with role-scoped tools
- Proper RBAC, validation, audit logging
- Clean architecture, production-lean
- Demo-ready in 5 minutes

## 3. User Roles
| Role | Scope | Key Permissions |
|------|-------|-----------------|
| **Admin** | Company-wide | Company setup, manage HR/users, finalize payroll, audit log, all data access |
| **HR** | People operations | Register employees, manage attendance/leave, create payroll drafts, HR dashboard |
| **Employee** | Self-service | Own profile/attendance/leave/payslips, AI on own data, personal dashboard |

## 4. Modules (M1-M9)
1. **M1 Auth & Access** - JWT auth, 3 roles, guards, first-run setup
2. **M2 Organization Setup** - Departments, designations, leave types/quotas, holidays, settings
3. **M3 Employees** - Directory, Employee 360, CSV import/export
4. **M4 Attendance** - Web check-in/out, rules, corrections, (optional camera+location)
5. **M5 Leave** - Apply/cancel, balances, overlap/holiday checks, approvals
6. **M6 Payroll Lite** - Salary structure, monthly run, tax slabs, payslip PDF
7. **M7 Dashboards & Analytics** - Role-based KPIs, trends, insights
8. **M8 AI Assistant** - Chat with tools, summaries, smart leave, policy Q&A
9. **M9 Comms & Audit** - Announcements, notifications, audit log

## 5. Core Business Rules
### Attendance (M4)
- Server timestamps
- One record per employee per day (409 on duplicate)
- Late if check-in after 09:15 (grace 15 min from 09:00 start)
- Half day if < 5 hours worked
- Absent if no record and no approved leave
- Missing checkout if checked in but no checkout

### Leave (M5)
- Working days only (skip weekends Sat-Sun, holidays)
- Quotas: Annual 14, Sick 8, Casual 10, Unpaid unlimited
- Overlap or over-balance → 422
- Balance calculated from approved leaves

### Payroll (M6)
- Gross = 1.5 × basic (HRA 40%, medical 10% of basic implied)
- Per day = gross ÷ working days in month
- Deductions: absent days + unpaid leave days + 0.5 × half days
- Net = gross - tax
- Tax slabs (annual gross): 0-600k (0%), 600k-1.2M (5%), 1.2M-2.4M (30k+15%), 2.4M-3.6M (210k+25%), >3.6M (510k+35%)
- Admin finalizes (locks) - cannot edit after

### Settings (M2)
- Office hours start 09:00, grace 15 min
- Weekend Sat-Sun
- Half day threshold 5 hours
- Office location + radius for optional camera attendance

## 6. AI Assistant Requirements (M8)
- Use any hosted LLM with tool calling
- API key only in backend env (AI_API_KEY), never exposed to browser
- Tools: get_headcount, get_attendance_summary, get_late_comers, get_leave_summary, get_my_leave_balance, get_payroll_summary, search_employees
- All tools enforce same RBAC as REST
- Dashboard summary for Admin/HR from KPI JSON
- Smart leave: parse natural language → {type, startDate, endDate, reason}
- Policy Q&A from system prompt rules
- 15s timeout, ~20 req/user/hour, log in ai_logs
- Label answers as "AI-generated"
- Validate JSON outputs, retry once on failure
- Never save data directly, only through tools/services

## 7. First-Run Flow
1. Fresh install → check if Admin exists
2. If no Admin → show setup form (company name, admin email/password)
3. Admin sets up company settings, departments, leave types, holidays
4. Admin creates HR logins
5. HR registers employees (creates login with temp password, must change on first login)

## 8. API Design (Core Endpoints)
```
Auth: POST /auth/setup, /auth/login, /auth/change-password
Users: GET/POST/PUT /users, /users/:id/reset
Org: GET/PUT /settings, /departments, /designations, /leave-types, /holidays
Employees: GET/POST/PUT /employees, GET /employees/:id/360, POST /employees/import, GET /employees/export
Attendance: POST /attendance/check-in, /attendance/check-out, GET /attendance, POST /attendance/corrections
Leave: POST /leave/apply, GET /leave, PUT /leave/:id/approve, /leave/:id/reject, GET /leave/balances
Payroll: POST /payroll/run, GET /payroll, GET /payroll/:id/payslip.pdf, PUT /payroll/:id/finalize
Dashboards: GET /dashboard/admin, /dashboard/hr, /dashboard/employee
AI: POST /ai/chat, POST /ai/summarize, POST /ai/smart-leave
Comms: GET/POST /announcements, GET /notifications, GET /audit-logs
```

## 9. Data Models (High-Level)
- User (email, passwordHash, role, employeeId, mustChangePassword)
- CompanySettings (name, officeStart, graceMin, weekendDays, lat/lng, radius)
- Department, Designation
- Employee (personal, job, salary, status)
- Attendance (employeeId, date, checkIn, checkOut, status, hours)
- LeaveRequest (employeeId, type, dates, workingDays, status, approver)
- LeaveBalance (employeeId, year, type, quota, used, remaining)
- SalaryStructure (employeeId, basic, allowances, effectiveDate)
- PayrollRun (month/year, status, items[], finalizedBy, finalizedAt)
- Payslip (payrollRunId, employeeId, earnings/deductions/net)
- Announcement, Notification, AuditLog, AiLog
- Holiday, LeaveType

## 10. Success Criteria (Must Pass)
- [ ] All 25 checklist items functional with correct RBAC
- [ ] Data computed server-side, matches between modules
- [ ] AI answers scoped correctly, tools used
- [ ] First-run setup works from empty DB
- [ ] Payroll calculations correct per rules
- [ ] Leave balance/overlap/working days correct
- [ ] Audit log captures key actions
- [ ] Demo flows work end-to-end
- [ ] README with run instructions + env setup
- [ ] .env.example only (no secrets)
