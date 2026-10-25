const Employee = require('../models/Employee');
const User = require('../models/User');
const Department = require('../models/Department');
const Designation = require('../models/Designation');
const SalaryStructure = require('../models/SalaryStructure');
const LeaveBalance = require('../models/LeaveBalance');
const LeaveType = require('../models/LeaveType');
const csv = require('csv-parser');
const fs = require('fs');
const multer = require('multer');

const upload = multer({ dest: 'uploads/' });

// Dry run CSV import
exports.importDryRun = [
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
      
      const results = [];
      const errors = [];
      const departments = await Department.find();
      const deptMap = {};
      departments.forEach(d => { deptMap[d.name.toLowerCase()] = d._id; });
      
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
          for (let i = 0; i < results.length; i++) {
            const row = results[i];
            const rowNum = i + 2;
            
            if (!row.firstName || !row.lastName || !row.email || !row.joinDate) {
              errors.push({ row: rowNum, field: 'required', reason: 'Missing required fields (firstName, lastName, email, joinDate)' });
              continue;
            }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
              errors.push({ row: rowNum, field: 'email', reason: 'Invalid email format' });
              continue;
            }
            const exists = await Employee.findOne({ email: row.email });
            if (exists) {
              errors.push({ row: rowNum, field: 'email', reason: 'Email already exists' });
              continue;
            }
            if (row.department && !deptMap[row.department.toLowerCase()]) {
              errors.push({ row: rowNum, field: 'department', reason: 'Unknown department' });
              continue;
            }
            if (row.basicSalary && Number(row.basicSalary) <= 0) {
              errors.push({ row: rowNum, field: 'basicSalary', reason: 'Salary must be greater than 0' });
              continue;
            }
          }
          
          fs.unlinkSync(req.file.path);
          res.json({
            totalRows: results.length,
            validRows: results.length - errors.length,
            errors,
            preview: results.slice(0, 5)
          });
        });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
];

// Commit CSV import
exports.importCommit = [
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
      
      const results = [];
      const departments = await Department.find();
      const designations = await Designation.find();
      const deptMap = {};
      const desigMap = {};
      departments.forEach(d => { deptMap[d.name.toLowerCase()] = d._id; });
      designations.forEach(d => { desigMap[d.title.toLowerCase()] = d._id; });
      
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
          let created = 0;
          const credentials = [];
          
          for (let row of results) {
            try {
              if (!row.firstName || !row.lastName || !row.email) continue;
              const exists = await Employee.findOne({ email: row.email });
              if (exists) continue;
              
              const count = await Employee.countDocuments();
              const employeeId = `EMP${String(count + 1).padStart(5, '0')}`;
              
              const employee = await Employee.create({
                employeeId,
                firstName: row.firstName,
                lastName: row.lastName,
                email: row.email,
                phone: row.phone || '',
                department: row.department ? deptMap[row.department.toLowerCase()] : null,
                designation: row.designation ? desigMap[row.designation.toLowerCase()] : null,
                joinDate: row.joinDate ? new Date(row.joinDate) : new Date(),
                status: 'active'
              });
              
              const tempPassword = Math.random().toString(36).slice(-8);
              await User.create({
                email: row.email,
                password: tempPassword,
                role: 'employee',
                employeeId: employee._id,
                firstName: row.firstName,
                lastName: row.lastName,
                mustChangePassword: true
              });
              
              if (row.basicSalary && Number(row.basicSalary) > 0) {
                const basic = Number(row.basicSalary);
                const gross = basic * 1.5;
                await SalaryStructure.create({
                  employee: employee._id,
                  basic,
                  hra: basic * 0.4,
                  medicalAllowance: basic * 0.1,
                  gross,
                  isActive: true
                });
              }
              
              const leaveTypes = await LeaveType.find({ isActive: true });
              const year = new Date().getFullYear();
              for (let lt of leaveTypes) {
                await LeaveBalance.create({
                  employee: employee._id,
                  year,
                  leaveType: lt._id,
                  quota: lt.quota,
                  used: 0,
                  remaining: lt.quota
                });
              }
              
              created++;
              credentials.push({ email: row.email, password: tempPassword, employeeId });
            } catch (e) {
              console.error(e);
            }
          }
          
          fs.unlinkSync(req.file.path);
          res.json({ message: `${created} employees created`, credentials });
        });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
];
