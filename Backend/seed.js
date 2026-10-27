require('dotenv').config();

const mongoose = require('mongoose');
const User = require('./models/User');
const Employee = require('./models/Employee');
const Department = require('./models/Department');
const Designation = require('./models/Designation');
const CompanySettings = require('./models/CompanySettings');
const LeaveType = require('./models/LeaveType');
const LeaveBalance = require('./models/LeaveBalance');

const DEMO_EMPLOYEE_EMAIL = 'employee@hcmlite.com';

const defaultLeaveTypes = [
  {
    name: 'Annual',
    quota: 20,
    isPaid: true,
    description: 'Planned vacation and personal time off.'
  },
  {
    name: 'Sick',
    quota: 10,
    isPaid: true,
    description: 'Time off for illness, recovery, or medical appointments.'
  },
  {
    name: 'Casual',
    quota: 5,
    isPaid: true,
    description: 'Short-notice personal matters and errands.'
  },
  {
    name: 'Unpaid',
    quota: 0,
    isPaid: false,
    description: 'Leave without pay when paid balances are unavailable.'
  }
];

const demoAccounts = [
  {
    email: 'admin@hcmlite.com',
    password: 'Admin@123',
    role: 'admin',
    firstName: 'Demo',
    lastName: 'Admin'
  },
  {
    email: 'hr@hcmlite.com',
    password: 'Hr@12345',
    role: 'hr',
    firstName: 'Demo',
    lastName: 'HR'
  },
  {
    email: DEMO_EMPLOYEE_EMAIL,
    password: 'Employee@123',
    role: 'employee',
    firstName: 'Demo',
    lastName: 'Employee'
  }
];

const ensureCompanySettings = async () => {
  let settings = await CompanySettings.findOne();

  if (!settings) {
    settings = await CompanySettings.create({
      companyName: 'HCM Lite Demo',
      setupComplete: true,
      officeLat: 24.8607,
      officeLng: 67.0011,
      officeRadius: 150
    });
    return settings;
  }

  if (!settings.setupComplete) settings.setupComplete = true;
  if (settings.officeLat == null || settings.officeLng == null) {
    settings.officeLat = 24.8607;
    settings.officeLng = 67.0011;
  }
  if (!settings.officeRadius) settings.officeRadius = 150;

  await settings.save();
  return settings;
};

const ensureDemoEmployee = async () => {
  const department = await Department.findOneAndUpdate(
    { name: 'General' },
    { $setOnInsert: { description: 'Default demo department', isActive: true } },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );

  let designation = await Designation.findOne({
    title: 'Employee',
    department: department._id
  });

  if (!designation) {
    designation = await Designation.create({
      title: 'Employee',
      department: department._id,
      isActive: true
    });
  }

  let employee = await Employee.findOne({
    $or: [
      { employeeId: 'EMP001' },
      { email: DEMO_EMPLOYEE_EMAIL }
    ]
  });

  if (!employee) {
    employee = new Employee({
      employeeId: 'EMP001',
      firstName: 'Demo',
      lastName: 'Employee',
      email: DEMO_EMPLOYEE_EMAIL,
      joinDate: new Date('2025-01-01'),
      employmentType: 'full-time',
      status: 'active'
    });
  }

  employee.employeeId = 'EMP001';
  employee.firstName = 'Demo';
  employee.lastName = 'Employee';
  employee.email = DEMO_EMPLOYEE_EMAIL;
  employee.department = department._id;
  employee.designation = designation._id;
  employee.status = 'active';

  await employee.save();
  return employee;
};

const ensureLeaveTypes = async () => {
  const leaveTypes = [];

  for (const definition of defaultLeaveTypes) {
    const leaveType = await LeaveType.findOneAndUpdate(
      { name: definition.name },
      { $setOnInsert: definition },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
    leaveTypes.push(leaveType);
  }

  return leaveTypes;
};

const ensureDemoLeaveBalances = async (employee, leaveTypes) => {
  const year = new Date().getFullYear();

  for (const leaveType of leaveTypes) {
    const quota = Number(leaveType.quota) || 0;

    await LeaveBalance.findOneAndUpdate(
      { employee: employee._id, year, leaveType: leaveType._id },
      { $setOnInsert: { quota, used: 0, remaining: quota } },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
  }

  return year;
};

const ensureDemoUser = async (account, employeeId) => {
  let user = await User.findOne({ email: account.email });

  if (!user) {
    user = new User({ email: account.email });
  }

  user.email = account.email;
  user.password = account.password;
  user.role = account.role;
  user.firstName = account.firstName;
  user.lastName = account.lastName;
  user.employeeId = employeeId;
  user.isActive = true;
  user.mustChangePassword = false;

  await user.save();
  return user;
};

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/hcm-lite');
    console.log(`MongoDB connected: ${mongoose.connection.host}`);

    await ensureCompanySettings();
    const employee = await ensureDemoEmployee();
    const leaveTypes = await ensureLeaveTypes();
    const balanceYear = await ensureDemoLeaveBalances(employee, leaveTypes);

    for (const account of demoAccounts) {
      const employeeId = account.role === 'employee' ? employee._id : undefined;
      await ensureDemoUser(account, employeeId);
    }

    console.log(
      `\nLeave types ready: ${leaveTypes.map((type) => type.name).join(', ')}. ` +
      `Demo employee balances ready for ${balanceYear}.\n`
    );
    console.log('Demo accounts are ready:\n');
    console.table(
      demoAccounts.map(({ role, email, password }) => ({ role, email, password }))
    );
    console.log('These credentials are for local demos only. Change them before deploying.\n');
  } catch (error) {
    console.error(`Seed failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};





if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to run seed in production. Use the first-run setup flow to create the initial admin.');
  process.exit(1);
}
seed();
