require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./config/db');

const app = express();

// Connect DB
connectDB();

// Middleware
app.use(helmet());
app.use(cors({
  origin: [process.env.CLIENT_URL, 'http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/departments', require('./routes/departments'));
app.use('/api/designations', require('./routes/designations'));
app.use('/api/leave-types', require('./routes/leaveTypes'));
app.use('/api/holidays', require('./routes/holidays'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/employees/import', require('./routes/employeeImport'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/attendance-corrections', require('./routes/attendanceCorrections'));
app.use('/api/leave', require('./routes/leave'));
app.use('/api/payroll', require('./routes/payroll'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/audit-logs', require('./routes/auditLogs'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'HCM Lite API running' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
