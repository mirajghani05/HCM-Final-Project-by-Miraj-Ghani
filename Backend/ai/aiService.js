const axios = require('axios');
const User = require('../models/User');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const LeaveBalance = require('../models/LeaveBalance');
const PayrollRun = require('../models/PayrollRun');
const AiLog = require('../models/AiLog');

const DEFAULT_GEMINI_MODEL = 'gemini-3.1-flash-lite';
const DEFAULT_GEMINI_FALLBACK_MODEL = 'gemini-2.5-flash-lite';
const GOOGLE_OPENAI_BASE = 'https://generativelanguage.googleapis.com/v1beta/openai';

const normalizeBaseUrl = (value) => String(value || '').trim().replace(/\/+$/, '');

const getBaseHost = (value) => {
  try {
    return new URL(value).host;
  } catch {
    return '';
  }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getAIConfig = () => {
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const apiKey = geminiKey || process.env.AI_API_KEY?.trim();

  if (!apiKey) return null;

  const rawBaseUrl = normalizeBaseUrl(process.env.AI_BASE_URL);
  const baseHost = getBaseHost(rawBaseUrl);
  const rawModel = String(process.env.AI_MODEL || '').trim();
  const rawFallbackModel =
    String(process.env.AI_MODEL_FALLBACK || process.env.GEMINI_MODEL_FALLBACK || '').trim();
  const usesGoogleHost =
    baseHost === 'aistudio.google.com' ||
    baseHost === 'generativelanguage.googleapis.com';
  const usingGemini =
    Boolean(geminiKey) ||
    usesGoogleHost ||
    (!rawBaseUrl && rawModel.toLowerCase().startsWith('gemini'));

  const baseUrl = normalizeBaseUrl(
    usingGemini
      ? process.env.GEMINI_BASE_URL || GOOGLE_OPENAI_BASE
      : rawBaseUrl || 'https://openrouter.ai/api/v1'
  );
  const endpoint = baseUrl.endsWith('/chat/completions')
    ? baseUrl
    : `${baseUrl}/chat/completions`;

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  };

  if (!usingGemini) {
    headers['HTTP-Referer'] = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173';
    headers['X-Title'] = 'HCM Lite';
  }

  const primaryModel = rawModel || (usingGemini ? DEFAULT_GEMINI_MODEL : 'google/gemini-2.5-flash');
  let fallbackModel = rawFallbackModel;
  if (!fallbackModel) {
    if (usingGemini) {
      fallbackModel = primaryModel === DEFAULT_GEMINI_FALLBACK_MODEL ? DEFAULT_GEMINI_MODEL : DEFAULT_GEMINI_FALLBACK_MODEL;
    } else {
      fallbackModel = 'google/gemini-2.5-flash-lite';
    }
  }

  return {
    endpoint,
    headers,
    provider: usingGemini ? 'gemini' : 'openai-compatible',
    model: primaryModel,
    fallbackModel,
    timeout: Number(process.env.AI_TIMEOUT_MS) || 30000,
    maxRetries: Math.max(0, Number(process.env.AI_MAX_RETRIES) || 2)
  };
};

const isRetryableError = (error) => {
  const status = error.response?.status;
  if (status === 429 || status === 503 || status === 502 || status === 504) {
    return true;
  }
  const detail = JSON.stringify(error.response?.data || error.message || '').toLowerCase();
  if (detail.includes('high demand') || detail.includes('unavailable') || detail.includes('rate limit') || detail.includes('overloaded')) {
    return true;
  }
  return false;
};

const isModelUnavailableError = (error) => {
  const detail = JSON.stringify(error.response?.data || error.message || '').toLowerCase();
  return /model/.test(detail) && /(not found|not supported|invalid|does not exist|unknown)/.test(detail);
};

const requestAI = async (config, payload, timeout = config.timeout) => {
  const primaryModel = payload.model || config.model;
  const fallbackModel = config.fallbackModel;
  const maxRetries = typeof config.maxRetries === 'number' ? config.maxRetries : 2;

  const send = (model) =>
    axios.post(
      config.endpoint,
      { ...payload, model },
      { headers: config.headers, timeout }
    );

  const tryWithRetries = async (model) => {
    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await send(model);
      } catch (error) {
        lastError = error;
        if (isRetryableError(error) && attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 4000);
          await sleep(delay);
          continue;
        }
        throw error;
      }
    }
    throw lastError;
  };

  try {
    try {
      return await tryWithRetries(primaryModel);
    } catch (error) {
      if (config.provider === 'gemini') {
        if (isModelUnavailableError(error) && primaryModel !== DEFAULT_GEMINI_MODEL) {
          try {
            return await tryWithRetries(DEFAULT_GEMINI_MODEL);
          } catch (e2) {
            if (fallbackModel && fallbackModel !== DEFAULT_GEMINI_MODEL && fallbackModel !== primaryModel) {
              return await tryWithRetries(fallbackModel);
            }
            throw e2;
          }
        }
        if ((isRetryableError(error) || isModelUnavailableError(error)) && fallbackModel && fallbackModel !== primaryModel) {
          try {
            return await tryWithRetries(fallbackModel);
          } catch (e2) {
            throw e2;
          }
        }
      } else if (fallbackModel && fallbackModel !== primaryModel) {
        if (isRetryableError(error) || isModelUnavailableError(error)) {
          try {
            return await tryWithRetries(fallbackModel);
          } catch (e2) {
            throw e2;
          }
        }
      }
      throw error;
    }
  } catch (error) {
    throw error;
  }
};

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

    const aiConfig = getAIConfig();
    if (!aiConfig) {
      return res.status(200).json({ response: "AI assistant is not configured. Set GEMINI_API_KEY (or AI_API_KEY and AI_BASE_URL) in the backend environment.", toolsUsed: [] });
    }

    // First call - decide tools
    const response = await requestAI(aiConfig, {
      model: aiConfig.model,
      messages,
      tools,
      tool_choice: 'auto',
      max_tokens: 1200
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

      const response2 = await requestAI(aiConfig, {
        model: aiConfig.model,
        messages,
        max_tokens: 1200
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
    if (process.env.NODE_ENV !== 'production') {
      console.error('AI error');
    }
    res.json({ response: "I'm having trouble processing that right now. Please try again or use the dashboard.", toolsUsed: [], aiGenerated: true });
  }
};

const WEEKDAY_INDEX = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6
};

const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const inferLeaveType = (text) => {
  const value = text.toLowerCase();
  if (/\b(sick|ill|fever|medical|doctor|hospital)\b/.test(value)) return 'sick';
  if (/\b(unpaid|without pay)\b/.test(value)) return 'unpaid';
  if (/\b(annual|vacation|holiday|pto)\b/.test(value)) return 'annual';
  return 'casual';
};

const parseSmartLeaveDates = (text, today = new Date()) => {
  const value = text.toLowerCase();
  const explicitDates = [...value.matchAll(/\b(\d{4}-\d{2}-\d{2})\b/g)].map((match) => match[1]);
  if (explicitDates.length > 0) {
    return { startDate: explicitDates[0], endDate: explicitDates[1] || explicitDates[0] };
  }

  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (/\btomorrow\b/.test(value)) {
    base.setDate(base.getDate() + 1);
    const date = formatLocalDate(base);
    return { startDate: date, endDate: date };
  }
  if (/\btoday\b/.test(value)) {
    const date = formatLocalDate(base);
    return { startDate: date, endDate: date };
  }

  const weekdays = [...value.matchAll(/\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/g)]
    .map((match) => WEEKDAY_INDEX[match[1]]);
  if (weekdays.length === 0) {
    return { startDate: '', endDate: '' };
  }

  const nextWeek = /\bnext\b/.test(value);
  let cursor = new Date(base);
  const dates = [];

  weekdays.forEach((targetDay, index) => {
    let delta = (targetDay - cursor.getDay() + 7) % 7;
    if (delta === 0 && (index === 0 ? nextWeek : true)) delta = 7;
    cursor.setDate(cursor.getDate() + delta);
    dates.push(formatLocalDate(cursor));
  });

  return { startDate: dates[0], endDate: dates[dates.length - 1] };
};

const buildSmartLeaveFallback = (text) => {
  const dates = parseSmartLeaveDates(text);
  return {
    type: inferLeaveType(text),
    startDate: dates.startDate,
    endDate: dates.endDate,
    reason: text
  };
};

const normalizeSmartLeaveResult = (result, fallback) => {
  const value = result && typeof result === 'object' ? result : {};
  const type = ['annual', 'sick', 'casual', 'unpaid'].includes(value.type) ? value.type : fallback.type;
  const startDate = /^\d{4}-\d{2}-\d{2}$/.test(value.startDate || '') ? value.startDate : fallback.startDate;
  const endDate = /^\d{4}-\d{2}-\d{2}$/.test(value.endDate || '') ? value.endDate : fallback.endDate;
  const reason = typeof value.reason === 'string' && value.reason.trim() ? value.reason.trim() : fallback.reason;

  return { type, startDate, endDate: endDate || startDate, reason };
};

exports.smartLeave = async (req, res) => {
  try {
    const text = String(req.body?.text || '').trim();
    const aiConfig = getAIConfig();
    const fallback = buildSmartLeaveFallback(text);
    
    if (!aiConfig) {
      return res.json(fallback);
    }

    const today = new Date();
    const todayIso = formatLocalDate(today);
    const todayName = today.toLocaleDateString('en-US', { weekday: 'long' });

    const callAI = async () => {
      const response = await requestAI(aiConfig, {
        model: aiConfig.model,
        messages: [
          {
            role: 'system',
            content:
              `You extract leave requests. Today is ${todayIso} (${todayName}). Return ONLY minified JSON matching {"type":"annual|sick|casual|unpaid","startDate":"YYYY-MM-DD","endDate":"YYYY-MM-DD","reason":"string"}. No markdown and no other text.`
          },
          { role: 'user', content: text }
        ],
        max_tokens: 1500,
        temperature: 0
      }, aiConfig.timeout);
      return response.data.choices[0].message.content;
    };

    try {
      let content = await callAI();
      try {
        const json = JSON.parse(content.replace(/```json|```/g, '').trim());
        if (json.type && json.startDate && json.endDate) {
          return res.json(normalizeSmartLeaveResult(json, fallback));
        }
        throw new Error('Invalid');
      } catch {
        content = await callAI();
        const json = JSON.parse(content.replace(/```json|```/g, '').trim());
        return res.json(normalizeSmartLeaveResult(json, fallback));
      }
    } catch {
      res.json(fallback);
    }
  } catch (error) {
    res.json(buildSmartLeaveFallback(String(req.body?.text || '')));
  }
};

exports.summarize = async (req, res) => {
  try {
    const { kpis } = req.body;
    const aiConfig = getAIConfig();
    if (!aiConfig) {
      return res.json({ summary: ['Dashboard data loaded successfully'] });
    }

    const callAI = async () => {
      const response = await requestAI(aiConfig, {
        model: aiConfig.model,
        messages: [
          {
            role: 'system',
            content:
              'You are a data analyst. Summarize the supplied dashboard KPIs. Return one concise bullet per metric. Use only the numbers provided. Each line must start with "- ". Do not include a heading, bold text, or extra commentary.'
          },
          { role: 'user', content: JSON.stringify(kpis) }
        ],
        max_tokens: 1200
      }, aiConfig.timeout);
      return response.data.choices[0].message.content;
    };

    try {
      const parseBullets = (content) =>
        String(content || '')
          .replace(/\r/g, '')
          .replace(/\*\*/g, '')
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => line.replace(/^[-*•]\s+/, '').replace(/^\d+[.)]\s+/, '').trim())
          .filter(
            (line) =>
              line &&
              !/^ai[- ]generated insights?:?$/i.test(line) &&
              !/^(dashboard )?(insights|summary):?$/i.test(line)
          );

      let content = await callAI();
      let bullets = parseBullets(content);
      if (bullets.length === 0) {
        content = await callAI();
        bullets = parseBullets(content);
      }
      res.json({ summary: bullets.length ? bullets.slice(0, 5) : ['No notable changes in the supplied metrics.'] });
    } catch {
      res.json({ summary: ['Unable to generate summary'] });
    }
  } catch (error) {
    res.json({ summary: ['Unable to generate summary'] });
  }
};
