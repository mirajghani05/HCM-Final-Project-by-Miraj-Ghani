# Architecture Document - HCM Lite

## System Architecture
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend   │────▶│   Backend    │────▶│   MongoDB    │
│  React + Vite│     │ Express + API│     │   Database   │
└─────────────┘     └─────────────┘     └─────────────┘
                            │
                            ▼
                       ┌─────────────┐
                       │  AI Provider │
                       │ (OpenRouter) │
                       └─────────────┘
```

## Backend Structure
```
Backend/
├── config/          # DB connection
├── controllers/     # Request handlers
├── middleware/      # Auth, RBAC, Audit
├── models/          # Mongoose schemas
├── routes/          # API routes
├── services/        # Business logic
├── ai/              # AI service & tools
├── utils/           # Helpers
└── server.js        # Entry point
```

## Frontend Structure
```
Frontend/src/
├── components/      # Reusable components
├── contexts/        # Auth context
├── layouts/         # Role-based layouts
├── pages/           # Page components
├── services/        # API service
└── App.jsx          # Routes
```

## Key Design Decisions
- **RBAC**: Server-side enforcement on every route
- **Data Scoping**: Employees only see own data
- **Business Rules**: In services/controllers
- **AI Security**: API key backend only, tools use existing services
- **Audit Trail**: All critical actions logged
- **No Dummy Data**: Everything created through app
- **Calculations**: All server-side for accuracy
