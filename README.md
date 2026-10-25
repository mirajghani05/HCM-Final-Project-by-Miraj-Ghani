# HCM Lite - AI Assisted Human Capital Management

A complete web-based HR management system built for the Saylani Hackathon with AI integration.

## 🚀 Features

### Core Modules
- **Authentication & RBAC** - JWT-based auth with 3 roles (Admin, HR, Employee)
- **Organization Setup** - Company settings, departments, designations, leave types, holidays
- **Employee Management** - Directory, Employee 360, search, filters
- **Attendance** - Web check-in/out with rules, corrections
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
**AI:** OpenRouter API (Gemini 2.5 Flash)

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
AI_API_KEY=your_openrouter_key
AI_MODEL=google/gemini-2.5-flash
```

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

### First Run
1. Open http://localhost:5173
2. You'll be redirected to setup page
3. Enter company name and create admin account
4. Login and configure departments, leave types, create HR users
5. HR can register employees

## 🎯 Demo Flow (5 Minutes)
1. **Setup** - First-run setup, create admin
2. **Configure** - Admin sets up departments, leave types
3. **Users** - Create HR user
4. **Employees** - HR registers 2-3 employees
5. **Attendance** - Employee checks in
6. **Leave** - Employee uses smart leave or applies manually, HR approves
7. **Payroll** - HR creates payroll run, Admin finalizes
8. **Payslip** - Employee downloads payslip
9. **AI** - Show AI assistant answering questions, dashboard summary
10. **Audit** - Admin views audit log

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
