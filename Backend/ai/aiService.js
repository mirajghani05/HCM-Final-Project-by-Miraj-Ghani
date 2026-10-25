const axios = require('axios');
const User = require('../models/User');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const LeaveBalance = require('../models/LeaveBalance');
const PayrollRun = require('../models/PayrollRun');
const AiLog = require('../models/AiLog');

// Tools
const tools = [
  {
    type: 'function',
    function: {
      name: 'get_headcount',
      description: 'Get total number of active employees, optionally filtered by department',
      parameters: {
        type: 'object',
        properties: {
          departmentId: { type: 'string', description: 'Department ID to filter' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_attendance_summary',
      description: 'Get attendance summary for a date range',
      parameters: {
        type: 'object',
        properties: {
          startDate: { type: 'string' },
          endDate: { type: 'string' }
        },
        required: ['startDate', 'endDate']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_late_comers',
      description: 'Get employees who came late this month',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_leave_summary',
      description: 'Get leave summary',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_my_leave_balance',
      description: 'Get my leave balance for current year',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_payroll_summary',
      description: 'Get payroll summary',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_employees',
      description: 'Search employees by name or email',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' }
        },
        required: ['query']
      }
    }
  }
];

const executeTool = async (toolName, args, user) => {
  if (user.role === 'employee' && !['get_my_leave_balance', 'get_attendance_summary'].includes(toolName) && toolName !== 'get_late_comers') {
    // Restrict employee tools
    if (toolName === 'search_employees') {
      // Only allow searching self? Or be restrictive
    }
  }

  switch (toolName) {
    case 'get_headcount':
      const countQuery = { status: { $in: ['active', 'probation'] } };
      if (args.departmentId) countQuery.department = args.departmentId;
      const count = await Employee.countDocuments(countQuery);
      return { count, scope: user.role };

    case 'get_attendance_summary':
      const start = new Date(args.startDate);
      const end = new Date(args.endDate);
      const attQuery = { date: { $gte: start, $lte: end } };
      if (user.role === 'employee') {
        attQuery.employee = user.employeeId;
      }
      const attendance = await Attendance.find(attQuery);
      const present = attendance.filter(a => ['present', 'late', 'half_day'].includes(a.status)).length;
      return { total: attendance.length, present, late: attendance.filter(a => a.status === 'late').length, halfDay: attendance.filter(a => a.status === 'half_day').length };

    case 'get_late_comers':
      const today = new Date();
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const lateQuery = { status: 'late', date: { $gte: monthStart } };
      if (user.role === 'employee') {
        // Employee can't see others
        return { error: 'Not authorized to view other employees' };
      }
      const late = await Attendance.find(lateQuery).populate('employee').limit(10);
      return { lateComers: late.map(l => ({ name: l.employee?.firstName + ' ' + l.employee?.lastName, date: l.date })) };

    case 'get_leave_summary':
      if (user.role === 'employee') return { error: 'Not authorized' };
      const pending = await LeaveRequest.countDocuments({ status: 'pending' });
      const approved = await LeaveRequest.countDocuments({ status: 'approved' });
      return { pending, approved };

    case 'get_my_leave_balance':
      if (!user.employeeId) return { error: 'No employee record' };
      const year = new Date().getFullYear();
      const balances = await LeaveBalance.find({ employee: user.employeeId, year }).populate('leaveType');
      return { balances: balances.map(b => ({ type: b.leaveType?.name, quota: b.quota, used: b.used, remaining: b.remaining })) };

    case 'get_payroll_summary':
      if (user.role === 'employee') return { error: 'Not authorized' };
      const runs = await PayrollRun.find().sort({ year: -1, month: -1 }).limit(3);
      return { recentRuns: runs.map(r => ({ month: r.month, year: r.year, status: r.status, totalNet: r.totalNet })) };

    case 'search_employees':
      if (user.role === 'employee') return { error: 'Not authorized' };
      const emps = await Employee.find({
        $or: [
          { firstName: { $regex: args.query, $options: 'i' } },
          { lastName: { $regex: args.query, $options: 'i' } },
          { email: { $regex: args.query, $options: 'i' } }
        ]
      }).limit(5);
      return { employees: emps.map(e => ({ name: e.firstName + ' ' + e.lastName, email: e.email, employeeId: e.employeeId })) };

    default:
      return { error: 'Unknown tool' };
  }
};

exports.chat = async (req, res) => {
  const startTime = Date.now();
  try {
    const { message, history = [] } = req.body;
    const user = await User.findById(req.user.id).populate('employeeId');
    
    const systemPrompt = `You are an AI assistant for HCM Lite HR system. You must ONLY answer using tools and data from the system. NEVER guess or make up data.
You understand English and Roman Urdu/Hindi mix. If user writes in Roman Urdu (e.g., "kitne employees hain", "mujhe batao"), respond naturally in Roman Urdu or English as appropriate.
Rules: Office hours 09:00, grace 15 min, late after 09:15, half day under 5 hours. 
Leave quotas: Annual 14, Sick 8, Casual 10, Unpaid unlimited. Working days exclude weekends (Sat-Sun) and holidays.
You must respect role-based access strictly. 
If an employee asks about another employee's salary, compensation, or private financial data - politely refuse and say you can only share their own information.
If asked for data you don't have tools for or not authorized - say so politely.
Always use tools when asked for company/HR data. Answer concisely.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: message }
    ];

    if (!process.env.AI_API_KEY) {
      return res.status(200).json({ response: "AI assistant is not configured. Please set AI_API_KEY in environment.", toolsUsed: [] });
    }

    // First call - decide tools
    const response = await axios.post(process.env.AI_BASE_URL, {
      model: process.env.AI_MODEL || 'google/gemini-2.5-flash',
      messages,
      tools,
      tool_choice: 'auto',
      max_tokens: 500
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.AI_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:5173',
        'X-Title': 'HCM Lite'
      },
      timeout: 15000
    });

    let assistantMessage = response.data.choices[0].message;
    const toolsUsed = [];
    let toolResults = [];

    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      for (let toolCall of assistantMessage.tool_calls) {
        const toolName = toolCall.function.name;
        try {
          const args = JSON.parse(toolCall.function.arguments || '{}');
          toolsUsed.push(toolName);
          const result = await executeTool(toolName, args, user);
          toolResults.push({ tool: toolName, result });
        } catch (e) {
          toolResults.push({ tool: toolCall.function.name, result: { error: 'Invalid tool arguments' } });
        }
      }

      // Second call with results
      messages.push(assistantMessage);
      for (let tr of toolResults) {
        messages.push({
          role: 'tool',
          tool_call_id: assistantMessage.tool_calls[toolResults.indexOf(tr)].id,
          content: JSON.stringify(tr.result)
        });
      }

      const response2 = await axios.post(process.env.AI_BASE_URL, {
        model: process.env.AI_MODEL || 'google/gemini-2.5-flash',
        messages,
        max_tokens: 500
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.AI_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:5173',
          'X-Title': 'HCM Lite'
        },
        timeout: 15000
      });

      assistantMessage = response2.data.choices[0].message;
    }

    const duration = Date.now() - startTime;
    await AiLog.create({
      user: user._id,
      userRole: user.role,
      query: message,
      toolsUsed,
      response: assistantMessage.content,
      duration
    });

    res.json({ response: assistantMessage.content, toolsUsed, aiGenerated: true });
  } catch (error) {
    console.error('AI error:', error.response?.data || error.message);
    res.json({ response: "I'm having trouble processing that right now. Please try again or use the dashboard.", toolsUsed: [], aiGenerated: true });
  }
};

exports.smartLeave = async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!process.env.AI_API_KEY) {
      return res.json({ type: 'casual', startDate: '', endDate: '', reason: text });
    }

    const callAI = async () => {
      const response = await axios.post(process.env.AI_BASE_URL, {
        model: process.env.AI_MODEL || 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Extract leave details from natural language. Return ONLY valid JSON with keys: type (annual/sick/casual/unpaid), startDate (YYYY-MM-DD), endDate (YYYY-MM-DD), reason. Use current year context if dates mentioned. Do not include any other text.' },
          { role: 'user', content: text }
        ],
        max_tokens: 200
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.AI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      return response.data.choices[0].message.content;
    };

    try {
      let content = await callAI();
      try {
        const json = JSON.parse(content.replace(/```json|```/g, '').trim());
        if (json.type && json.startDate && json.endDate) {
          return res.json(json);
        }
        throw new Error('Invalid');
      } catch {
        content = await callAI();
        const json = JSON.parse(content.replace(/```json|```/g, '').trim());
        return res.json(json);
      }
    } catch {
      res.json({ type: 'casual', startDate: '', endDate: '', reason: text });
    }
  } catch (error) {
    res.json({ type: 'casual', startDate: '', endDate: '', reason: req.body.text });
  }
};

exports.summarize = async (req, res) => {
  try {
    const { kpis } = req.body;
    if (!process.env.AI_API_KEY) {
      return res.json({ summary: ['Dashboard data loaded successfully'] });
    }

    const callAI = async () => {
      const response = await axios.post(process.env.AI_BASE_URL, {
        model: process.env.AI_MODEL || 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a data analyst. Summarize dashboard KPIs in 3-5 bullet points. Use only the numbers provided. Label context as AI-generated insights.' },
          { role: 'user', content: JSON.stringify(kpis) }
        ],
        max_tokens: 200
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.AI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      return response.data.choices[0].message.content;
    };

    try {
      let content = await callAI();
      let bullets = content.split('\n').filter(l => l.trim().match(/^[-*•]\s+/)).map(l => l.replace(/^[-*•]\s+/, '').trim());
      if (bullets.length === 0) {
        content = await callAI();
        bullets = content.split('\n').filter(l => l.trim().match(/^[-*•]\s+/)).map(l => l.replace(/^[-*•]\s+/, '').trim());
      }
      res.json({ summary: bullets.length ? bullets : [content.trim()] });
    } catch {
      res.json({ summary: ['Unable to generate summary'] });
    }
  } catch (error) {
    res.json({ summary: ['Unable to generate summary'] });
  }
};
