/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), 'meetings-db.json');

// Initialize Gemini SDK
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Setup body parsers (with increased limits for audio files/payloads)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Local JSON Database Operations
function initDB() {
  if (!fs.existsSync(DB_FILE)) {
    const defaultData = {
      users: [
        {
          id: 'usr_default',
          name: 'Alex Johnson',
          email: 'alex.johnson@corp.com',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
          provider: 'email',
          createdAt: new Date().toISOString(),
        }
      ],
      meetings: [
        {
          id: 'meet_demo_1',
          userId: 'usr_default',
          title: 'Design System Alignment Sync',
          description: 'A structural alignment sync on colors, spacing, and micro-interactions for the new dark premium UI rollout.',
          type: 'Design Sync',
          language: 'English',
          status: 'completed',
          durationSec: 142,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
          transcript: [
            { startTimeSec: 0, endTimeSec: 12, speakerLabel: 'Speaker 1', text: 'Hey team, let’s go over our color palette. We want to align this with our core brand values of premium, secure, and futuristic.' },
            { startTimeSec: 13, endTimeSec: 28, speakerLabel: 'Speaker 2', text: 'Agree. The dark indigo violet gradient looks stellar. Let’s integrate glowing cyan borders for active elements to give it a neat translucent glassmorphic look.' },
            { startTimeSec: 29, endTimeSec: 45, speakerLabel: 'Speaker 1', text: 'Perfect. We must ensure the color contrast passes WCAG standards, so let’s pair the deep slate background with bright neon accents for better visibility.' },
            { startTimeSec: 46, endTimeSec: 68, speakerLabel: 'Speaker 3', text: 'I am on it. I also suggest putting an automatic beforeunload warn trigger on the record button to ensure users don’t lose active sessions.' },
            { startTimeSec: 69, endTimeSec: 85, speakerLabel: 'Speaker 2', text: 'Good idea. Let’s also add option buttons for direct Markdown export so stakeholders can read summary notes immediately.' },
            { startTimeSec: 86, endTimeSec: 110, speakerLabel: 'Speaker 1', text: 'Excellent suggestions. Let’s target wrapping up the design specifications document by next Tuesday.' }
          ],
          summary: {
            shortSummary: 'Team aligned on a high-fidelity glassmorphic dark purple visual style passing WCAG accessibility standards, with recording safeguard controls and Markdown exports.',
            detailedSummary: 'The sync focused on refining the premium dark-themed UI system. The group finalized using glowing cyan accents over translucent dark violet panels, ensuring visual hierarchy and contrast alignment. Key features such as beforeunload guards for recording sessions and immediate Markdown export were approved.',
            keywords: ['Design System', 'Glassmorphism', 'WCAG Contrast', 'Markdown Export'],
            risks: ['Potential high rendering resource usage on low-end mobile devices due to complex glass effects.']
          },
          actionItems: [
            { id: 'act_1', title: 'Verify neon cyan borders against WCAG contrast scores', assignee: 'Alex Johnson', dueDate: '2026-06-23', status: 'completed' },
            { id: 'act_2', title: 'Create secondary layout guidelines for mobile devices', assignee: 'Jane Smith', dueDate: '2026-06-25', status: 'pending' },
            { id: 'act_3', title: 'Implement recording browser unloading safety dialog', assignee: 'Developer Team', dueDate: '2026-06-24', status: 'pending' }
          ],
          decisions: [
            { id: 'dec_1', title: 'Premium Dark Violet Theme Approved', description: 'Deep slate with translucent glass violet cards and neon cyan borders selected.' },
            { id: 'dec_2', title: 'Automatic Markdown Export', description: 'Users will be able to export meeting summaries and action items in clean Markdown format.' }
          ]
        },
        {
          id: 'meet_demo_2',
          userId: 'usr_default',
          title: 'Vietnamese Coffee Brand Growth Pitch',
          description: 'Phát triển kế hoạch ra mắt chuỗi cà phê hạt mộc chất lượng cao Việt Nam.',
          type: 'Business Pitch',
          language: 'Vietnamese',
          status: 'completed',
          durationSec: 88,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
          transcript: [
            { startTimeSec: 0, endTimeSec: 15, speakerLabel: 'Lâm', text: 'Chào mọi người, dự án xuất khẩu cà phê hạt mộc của mình đang tiến triển rất tốt. Chúng ta cần làm rõ thông điệp cốt lõi.' },
            { startTimeSec: 16, endTimeSec: 32, speakerLabel: 'Vy', text: 'Em nghĩ nên tập trung vào quy trình phơi nhà màng tự nhiên và độ rang mộc chuẩn. Khách hàng Gen Z rất chuộng hạt Robusta chất lượng cao.' },
            { startTimeSec: 33, endTimeSec: 50, speakerLabel: 'Lâm', text: 'Đúng vậy. Mình sẽ xây dựng website câu chuyện thương hiệu kết nối nông hộ vùng Di Linh. Điều này tạo niềm tin bền vững.' },
            { startTimeSec: 51, endTimeSec: 68, speakerLabel: 'Minh', text: 'Em sẽ phụ trách thiết kế bao bì túi zip thân thiện môi trường từ bã mía. Dự kiến hoàn thành mẫu thử đầu tiên vào thứ sáu này.' },
            { startTimeSec: 69, endTimeSec: 88, speakerLabel: 'Lâm', text: 'Tuyệt vời. Vy chuẩn bị slide thuyết trình gửi đối tác nước ngoài nhé. Cuối tuần chúng ta sẽ hội ý lại.' }
          ],
          summary: {
            shortSummary: 'Đồng thuận truyền thông cà phê mộc Robusta chất lượng cao Di Linh, thiết kế bao bì thân thiện môi trường và hoàn thiện slide thuyết trình.',
            detailedSummary: 'Buổi họp thống nhất thông điệp thương hiệu xoay quanh giá trị bền vững và liên kết nông hộ tại Di Linh. Tập trung quảng bá hạt mộc Robusta chất lượng cao đón đầu xu hướng Gen Z. Đồng thời triển khai thiết kế túi zip bã mía tự hủy sinh học và slide thuyết trình quốc tế.',
            keywords: ['Cà phê mộc', 'Robusta Di Linh', 'Bao bì bã mía', 'Gen Z Coffee'],
            risks: ['Chi phí sản xuất bao bì bã mía ban đầu có thể cao hơn 15% so với túi nilon thông thường.']
          },
          actionItems: [
            { id: 'act_4', title: 'Thiết kế mẫu túi zip cà phê từ bã mía', assignee: 'Minh', dueDate: '2026-06-23', status: 'completed' },
            { id: 'act_5', title: 'Hoàn thiện slide thuyết trình song ngữ Anh - Việt', assignee: 'Vy', dueDate: '2026-06-26', status: 'pending' }
          ],
          decisions: [
            { id: 'dec_3', title: 'Chọn hạt Robusta Di Linh làm cốt lõi', description: 'Robusta hái chín 100% lên men tự nhiên sẽ là dòng sản phẩm chủ lực.' }
          ]
        }
      ]
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
  }
}

function readDB() {
  initDB();
  try {
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading local JSON db, resetting config...', err);
    return { users: [], meetings: [] };
  }
}

function writeDB(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing to disk db...', err);
  }
}

// REST Interface endpoints
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Auth endpoints
app.post('/api/v1/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required fields.' });
  }
  const db = readDB();
  const existingUser = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
  if (existingUser) {
    return res.status(400).json({ error: 'This email is already registered.' });
  }

  const newUser = {
    id: 'usr_' + Math.random().toString(36).substr(2, 9),
    name,
    email: email.toLowerCase(),
    avatarUrl: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(name)}`,
    provider: 'email',
    createdAt: new Date().toISOString(),
  };

  db.users.push(newUser);
  writeDB(db);

  res.status(201).json({ user: newUser });
});

app.post('/api/v1/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email parameter is required.' });
  }
  const db = readDB();
  const user = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    // If it's a demo flow, let's auto-create or log them into the default user
    if (email.toLowerCase().includes('demo') || email.toLowerCase().includes('alex')) {
      const defaultUser = db.users.find((u: any) => u.id === 'usr_default');
      return res.json({ user: defaultUser });
    }
    return res.status(401).json({ error: 'User account not found.' });
  }
  res.json({ user });
});

app.post('/api/v1/auth/mock-google', (req, res) => {
  const { name, email, avatarUrl } = req.body;
  const db = readDB();
  let user = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    user = {
      id: 'usr_' + Math.random().toString(36).substr(2, 9),
      name: name || 'Google User',
      email: email.toLowerCase(),
      avatarUrl: avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
      provider: 'google',
      createdAt: new Date().toISOString(),
    };
    db.users.push(user);
    writeDB(db);
  }
  res.json({ user });
});

// Dashboard stats endpoint
app.get('/api/v1/dashboard/stats', (req, res) => {
  const userId = (req.query.userId as string) || 'usr_default';
  const db = readDB();
  const userMeetings = db.meetings.filter((m: any) => m.userId === userId);

  const completed = userMeetings.filter((m: any) => m.status === 'completed');
  const totalMinutes = userMeetings.reduce((acc: number, curr: any) => acc + (curr.durationSec || 0), 0) / 60;

  let actionItemsPending = 0;
  userMeetings.forEach((m: any) => {
    if (m.actionItems) {
      actionItemsPending += m.actionItems.filter((act: any) => act.status === 'pending').length;
    }
  });

  res.json({
    totalMeetings: userMeetings.length,
    totalMinutes: Math.round(totalMinutes * 10) / 10,
    processingCount: userMeetings.filter((m: any) => m.status === 'processing' || m.status === 'uploading').length,
    completedCount: completed.length,
    actionItemsPending
  });
});

// Get all meetings
app.get('/api/v1/meetings', (req, res) => {
  const userId = (req.query.userId as string) || 'usr_default';
  const search = (req.query.search as string) || '';
  const filterType = (req.query.type as string) || '';
  const db = readDB();
  let userMeetings = db.meetings.filter((m: any) => m.userId === userId);

  if (search) {
    const q = search.toLowerCase();
    userMeetings = userMeetings.filter((m: any) =>
      m.title.toLowerCase().includes(q) ||
      (m.description && m.description.toLowerCase().includes(q))
    );
  }

  if (filterType && filterType !== 'all') {
    userMeetings = userMeetings.filter((m: any) => m.type === filterType);
  }

  // Sort by newest
  userMeetings.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json(userMeetings);
});

// Get single meeting
app.get('/api/v1/meetings/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const meeting = db.meetings.find((m: any) => m.id === id);
  if (!meeting) {
    return res.status(404).json({ error: 'Meeting details not found.' });
  }
  res.json(meeting);
});

// Create draft meeting
app.post('/api/v1/meetings', (req, res) => {
  const { title, description, type, language, userId } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Title field is required.' });
  }

  const db = readDB();
  const newMeeting = {
    id: 'meet_' + Math.random().toString(36).substr(2, 9),
    userId: userId || 'usr_default',
    title,
    description: description || '',
    type: type || 'General Sync',
    language: language || 'English',
    status: 'draft',
    durationSec: 0,
    createdAt: new Date().toISOString(),
  };

  db.meetings.push(newMeeting);
  writeDB(db);

  res.status(201).json(newMeeting);
});

// PATCH meeting details (e.g. title, transcript, summary, actionItems, decisions)
app.patch('/api/v1/meetings/:id', (req, res) => {
  const { id } = req.params;
  const { title, transcript, summary, actionItems, decisions } = req.body;

  const db = readDB();
  const index = db.meetings.findIndex((m: any) => m.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Meeting not found' });
  }

  const meeting = db.meetings[index];
  if (title !== undefined) meeting.title = title;
  if (transcript !== undefined) meeting.transcript = transcript;
  if (summary !== undefined) meeting.summary = summary;
  if (actionItems !== undefined) meeting.actionItems = actionItems;
  if (decisions !== undefined) meeting.decisions = decisions;

  writeDB(db);
  res.json(meeting);
});

// Toggle Action Item Status
app.patch('/api/v1/meetings/:meetingId/actions/:actionId', (req, res) => {
  const { meetingId, actionId } = req.params;
  const { status } = req.body;

  const db = readDB();
  const meeting = db.meetings.find((m: any) => m.id === meetingId);
  if (!meeting) {
    return res.status(404).json({ error: 'Meeting not found.' });
  }

  if (!meeting.actionItems) {
    meeting.actionItems = [];
  }

  const action = meeting.actionItems.find((a: any) => a.id === actionId);
  if (!action) {
    return res.status(404).json({ error: 'Action item not found in this meeting.' });
  }

  action.status = status;
  writeDB(db);

  res.json({ success: true, meeting });
});

// Delete meeting (soft/hard)
app.delete('/api/v1/meetings/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const idx = db.meetings.findIndex((m: any) => m.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Meeting not found.' });
  }

  db.meetings.splice(idx, 1);
  writeDB(db);
  res.json({ success: true, message: 'Meeting records deleted completely from cloud.' });
});

// Gemini Transcribe & Summary AI execution
app.post('/api/v1/meetings/:id/process', async (req, res) => {
  const { id } = req.params;
  const { audioBase64, durationSec } = req.body;

  if (!audioBase64) {
    return res.status(400).json({ error: 'Audio bytes payload is missing.' });
  }

  const db = readDB();
  const meetingIdx = db.meetings.findIndex((m: any) => m.id === id);
  if (meetingIdx === -1) {
    return res.status(404).json({ error: 'Meeting entry not found.' });
  }

  db.meetings[meetingIdx].status = 'processing';
  db.meetings[meetingIdx].durationSec = durationSec || 15;
  writeDB(db);

  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is not configured.');
    }

    const isVietnamese = db.meetings[meetingIdx].language === 'Vietnamese';

    // We send a beautiful prompt instructing Gemini to parse this voice audio multi-modally
    const promptInstructions = `
      You are an expert Speech-to-Text and AI Meeting Summary engine designed to process speech recordings.
      Take a listen to the provided audio file and create:
      1. An interactive, highly accurate transcripts array containing segment objects with fields: { startTimeSec, endTimeSec, speakerLabel, text }. Ensure the text perfectly transcribes what was spoken with proper punctuation. Detect speakers carefully (e.g. Speaker 1, Speaker 2).
      2. A comprehensive, beautifully detailed summary block with elements: { shortSummary, detailedSummary, keywords: string[], risks: string[] }.
      3. A list of actionable items with fields: { id, title, assignee, dueDate, status: "pending" }. Assignees should be extracted from the speakers or context, and due dates should be estimated realistically (e.g., within 3-5 days from now).
      4. Key decisions formulated as list with fields: { id, title, description }.

      Language: Please respond in the language specified: ${isVietnamese ? 'Vietnamese' : 'English'}.
      Return ONLY a clean JSON object containing these components. Provide absolutely no extra text, markdown markers, wrapper formatting, or preamble. Return fields matching exactly:
      {
        "transcript": [ { "startTimeSec": 0, "endTimeSec": 10, "speakerLabel": "Speaker 1", "text": "..." } ],
        "summary": { "shortSummary": "...", "detailedSummary": "...", "keywords": [], "risks": [] },
        "actionItems": [ { "id": "act_101", "title": "...", "assignee": "...", "dueDate": "...", "status": "pending" } ],
        "decisions": [ { "id": "dec_101", "title": "...", "description": "..." } ]
      }
    `;

    // Process using Gemini 3.5-flash
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        {
          inlineData: {
            mimeType: 'audio/webm',
            data: audioBase64,
          }
        },
        promptInstructions
      ],
      config: {
        responseMimeType: 'application/json',
      }
    });

    const outputText = response.text || '{}';
    let resData: any = {};

    try {
      resData = JSON.parse(outputText.replace(/```json/g, '').replace(/```/g, '').trim());
    } catch (parseErr) {
      console.warn('JSON parsing error on primary response, raw reply was:', outputText);
      // Let's clean it up or attempt secondary fallback if something holds markdown characters
      const cleaned = outputText.substring(outputText.indexOf('{'), outputText.lastIndexOf('}') + 1);
      resData = JSON.parse(cleaned);
    }

    // Populate record
    db.meetings[meetingIdx].transcript = resData.transcript || [
      { startTimeSec: 0, endTimeSec: durationSec, speakerLabel: 'Speaker 1', text: isVietnamese ? 'Cảm ơn mọi người đã tham gia. Cuộc họp đã hoàn tất nội dung ghi âm.' : 'Thank you everyone for attending. The meeting recording is completed.' }
    ];
    db.meetings[meetingIdx].summary = resData.summary || {
      shortSummary: isVietnamese ? 'Họp bàn trực tiếp thông tin sản phẩm và kế hoạch giao việc.' : 'Synchronized core meeting points and distributed action steps.',
      detailedSummary: isVietnamese ? 'Buổi thảo luận trao đổi sơ nét và bàn giao tiến độ.' : 'Core briefing sync regarding the project scope setup.',
      keywords: isVietnamese ? ['Họp Đồng Bộ'] : ['Status Update'],
      risks: []
    };
    db.meetings[meetingIdx].actionItems = resData.actionItems || [];
    db.meetings[meetingIdx].decisions = resData.decisions || [];
    db.meetings[meetingIdx].status = 'completed';
    writeDB(db);

    res.json(db.meetings[meetingIdx]);
  } catch (error: any) {
    console.error('Core Gemini AI execution failure:', error);
    db.meetings[meetingIdx].status = 'failed';
    db.meetings[meetingIdx].processingError = error.message || 'Unknown processing error';
    writeDB(db);
    res.status(500).json({ error: 'AI processing failed', details: error.message });
  }
});

// Regenerate AI Summary
app.post('/api/v1/meetings/:id/regenerate', async (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const meetingIdx = db.meetings.findIndex((m: any) => m.id === id);
  if (meetingIdx === -1) {
    return res.status(404).json({ error: 'Meeting not found.' });
  }

  const meeting = db.meetings[meetingIdx];
  if (!meeting.transcript || meeting.transcript.length === 0) {
    return res.status(400).json({ error: 'Cannot regenerate summary if transcript is empty.' });
  }

  try {
    const isVietnamese = meeting.language === 'Vietnamese';
    const transcriptText = meeting.transcript.map((t: any) => `${t.speakerLabel} [${t.startTimeSec}s]: ${t.text}`).join('\n');

    const promptText = `
      Based on the following meeting transcript text, please generate an updated high-fidelity summary and action schedule.
      Transcript:
      ${transcriptText}

      Please output a pristine JSON object matching this schema only (no extra markdown):
      {
        "summary": {
          "shortSummary": "A concise 1-sentence recap.",
          "detailedSummary": "A highly detailed structured overview paragraph.",
          "keywords": ["keyword1", "keyword2"],
          "risks": ["risk description if any"]
        },
        "actionItems": [
          { "id": "act_new_1", "title": "Detailed action item", "assignee": "Assignee name", "dueDate": "YYYY-MM-DD", "status": "pending" }
        ],
        "decisions": [
          { "id": "dec_new_1", "title": "Core decision", "description": "Short explanation of approved resolution." }
        ]
      }

      Language: ${isVietnamese ? 'Vietnamese' : 'English'}.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: promptText,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const rawOutput = response.text || '{}';
    const parsed = JSON.parse(rawOutput.replace(/```json/g, '').replace(/```/g, '').trim());

    db.meetings[meetingIdx].summary = parsed.summary || meeting.summary;
    db.meetings[meetingIdx].actionItems = parsed.actionItems || meeting.actionItems;
    db.meetings[meetingIdx].decisions = parsed.decisions || meeting.decisions;
    writeDB(db);

    res.json(db.meetings[meetingIdx]);
  } catch (error: any) {
    res.status(500).json({ error: 'Regeneration failed', details: error.message });
  }
});

// AI Chat Assistant for specific meeting query
app.post('/api/v1/meetings/:id/ask', async (req, res) => {
  const { id } = req.params;
  const { question } = req.body;

  if (!question || !question.trim()) {
    return res.status(400).json({ error: 'Question is required.' });
  }

  const db = readDB();
  const meeting = db.meetings.find((m: any) => m.id === id);
  if (!meeting) {
    return res.status(404).json({ error: 'Meeting not found.' });
  }

  try {
    const isVietnamese = meeting.language === 'Vietnamese';
    const transcriptText = meeting.transcript && meeting.transcript.length > 0
      ? meeting.transcript.map((t: any) => `${t.speakerLabel}: ${t.text}`).join('\n')
      : 'No transcript available.';

    const systemPrompt = `
      You are an expert AI Meeting Assistant designed to answer questions regarding a recorded meeting.
      Here are the official meeting details:
      Meeting Title: ${meeting.title}
      Description: ${meeting.description || 'N/A'}
      Summary: ${meeting.summary ? meeting.summary.shortSummary : 'N/A'}
      Detailed Outline: ${meeting.summary ? meeting.summary.detailedSummary : 'N/A'}

      Transcript of conversation:
      ${transcriptText}

      Please answer the user's query with extreme clarity, professional composure, and complete accuracy based strictly on the above details. Avoid any speculation or making up facts. If the information is not present in the meeting context, say so gracefully.

      Language: Feel free to respond in the matching tone and language. Preferred default language is ${isVietnamese ? 'Vietnamese' : 'English'}.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        { text: systemPrompt },
        { text: `Question: ${question}` }
      ]
    });

    res.json({ answer: response.text || 'Sorry, I couldn\'t formulate an answer.' });
  } catch (error: any) {
    console.error('AI Meeting Assistant failure:', error);
    res.status(500).json({ error: 'AI Assistant failed to reply.', details: error.message });
  }
});

// Download/Export Meeting Notes (Markdown or Text formats)
app.get('/api/v1/meetings/:id/export', (req, res) => {
  const { id } = req.params;
  const format = (req.query.format as string) || 'markdown';

  const db = readDB();
  const meeting = db.meetings.find((m: any) => m.id === id);
  if (!meeting) {
    return res.status(404).json({ error: 'No meeting record found to export.' });
  }

  const dateStr = new Date(meeting.createdAt).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  let content = '';

  if (format === 'markdown') {
    content += `\# ${meeting.title}\n\n`;
    content += `**Date:** ${dateStr}  \n`;
    content += `**Category:** ${meeting.type} | **Language:** ${meeting.language} | **Duration:** ${Math.floor(meeting.durationSec / 60)}m ${meeting.durationSec % 60}s\n\n`;
    
    if (meeting.description) {
      content += `> ${meeting.description}\n\n`;
    }

    if (meeting.summary) {
      content += `\## AI Executive Summary\n\n`;
      content += `**TL;DR:** ${meeting.summary.shortSummary}\n\n`;
      content += `### Detailed Overview\n${meeting.summary.detailedSummary}\n\n`;
      
      if (meeting.summary.keywords && meeting.summary.keywords.length > 0) {
        content += `**Keywords:** ${meeting.summary.keywords.join(', ')}  \n`;
      }
      if (meeting.summary.risks && meeting.summary.risks.length > 0) {
        content += `**Identified Risks:**\n${meeting.summary.risks.map((r: string) => `- ${r}`).join('\n')}\n\n`;
      }
    }

    if (meeting.decisions && meeting.decisions.length > 0) {
      content += `\## Core Decisions\n\n`;
      meeting.decisions.forEach((d: any) => {
        content += `- **${d.title}:** ${d.description}\n`;
      });
      content += `\n`;
    }

    if (meeting.actionItems && meeting.actionItems.length > 0) {
      content += `\## Action Schedule\n\n`;
      meeting.actionItems.forEach((act: any) => {
        const stateSymbol = act.status === 'completed' ? '[x]' : '[ ]';
        content += `- ${stateSymbol} **${act.title}** (Assignee: *${act.assignee}* | Due: \`${act.dueDate}\`)\n`;
      });
      content += `\n`;
    }

    if (meeting.transcript && meeting.transcript.length > 0) {
      content += `\## Full Meeting Transcript\n\n`;
      meeting.transcript.forEach((ts: any) => {
        const timeFmt = `${Math.floor(ts.startTimeSec / 60).toString().padStart(2, '0')}:${(ts.startTimeSec % 60).toString().padStart(2, '0')}`;
        content += `**[${timeFmt}] ${ts.speakerLabel}:** ${ts.text}  \n`;
      });
    }

    res.setHeader('Content-disposition', `attachment; filename="${meeting.title.replace(/\s+/g, '_')}_Notes.md"`);
    res.setHeader('Content-type', 'text/markdown; charset=utf-8');
    res.send(content);

  } else {
    // TXT format
    content += `MEETING: ${meeting.title.toUpperCase()}\n`;
    content += `DATE: ${dateStr}\n`;
    content += `INFO: ${meeting.type} (${meeting.language}) - Duration: ${Math.floor(meeting.durationSec / 60)}m ${meeting.durationSec % 60}s\n`;
    content += `========================================================\n\n`;

    if (meeting.description) {
      content += `DESCRIPTION:\n${meeting.description}\n\n`;
    }

    if (meeting.summary) {
      content += `AI EXECUTIVE SUMMARY:\n`;
      content += `Brief: ${meeting.summary.shortSummary}\n\n`;
      content += `Detailed Notes:\n${meeting.summary.detailedSummary}\n\n`;
    }

    if (meeting.decisions && meeting.decisions.length > 0) {
      content += `KEY DECISIONS:\n`;
      meeting.decisions.forEach((d: any) => {
        content += `* [DECISION] ${d.title}: ${d.description}\n`;
      });
      content += `\n`;
    }

    if (meeting.actionItems && meeting.actionItems.length > 0) {
      content += `ACTION ITEMS:\n`;
      meeting.actionItems.forEach((act: any) => {
        content += `* [${act.status === 'completed' ? 'DONE' : 'TODO'}] ${act.title} - Assignee: ${act.assignee} (Due: ${act.dueDate})\n`;
      });
      content += `\n`;
    }

    res.setHeader('Content-disposition', `attachment; filename="${meeting.title.replace(/\s+/g, '_')}_Notes.txt"`);
    res.setHeader('Content-type', 'text/plain; charset=utf-8');
    res.send(content);
  }
});

// Setup Vite Dev server or production static serving
async function startServer() {
  // Prime the JSON file
  initDB();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AI Meeting Recorder running live on port ${PORT}`);
  });
}

startServer();
