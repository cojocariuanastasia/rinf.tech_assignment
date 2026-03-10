const pool = require('../config/db');
const { GoogleGenerativeAI } = require('@google/generative-ai');

require('dotenv').config();
const CHAT_HISTORY_TABLE = 'user_conversations';

const getGenAI = () => new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const fetchAvailableGeminiModels = async () => {
  if (!process.env.GEMINI_API_KEY) return [];

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`
    );
    if (!response.ok) return [];

    const data = await response.json();
    const models = Array.isArray(data?.models) ? data.models : [];

    return models
      .filter((m) =>
        Array.isArray(m.supportedGenerationMethods) &&
        m.supportedGenerationMethods.includes('generateContent')
      )
      .map((m) => (m.name || '').replace('models/', ''))
      .filter((name) => {
        const normalized = name.toLowerCase();
        return (
          normalized.includes('gemini') &&
          !normalized.includes('tts') &&
          !normalized.includes('embedding') &&
          !normalized.includes('imagen') &&
          !normalized.includes('image-generation') &&
          !normalized.includes('aqa')
        );
      });
  } catch (error) {
    console.error('Failed to list Gemini models:', error?.message || error);
    return [];
  }
};

const extractJsonObject = (text) => {
  if (!text || typeof text !== 'string') return null;
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
};

const sanitizeConversationHistory = (history) => {
  if (!Array.isArray(history)) return [];

  return history
    .filter((item) => item && (item.role === 'user' || item.role === 'agent'))
    .map((item) => ({
      role: item.role,
      text: String(item.text || '').trim(),
      conversationId: String(item.conversationId || 'default-chat'),
      conversationTitle: item.conversationTitle
        ? String(item.conversationTitle).trim().slice(0, 80)
        : undefined,
    }))
    .filter((item) => item.text.length > 0)
    .slice(-40);
};

const ensureConversationTable = async () => {
  await pool.query(
    `
      CREATE TABLE IF NOT EXISTS ${CHAT_HISTORY_TABLE} (
        user_id    INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        conversations JSONB NOT NULL DEFAULT '[]'::jsonb,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `
  );
};

const getConversationHistory = async (userId) => {
  await ensureConversationTable();

  const result = await pool.query(
    `SELECT conversations FROM ${CHAT_HISTORY_TABLE} WHERE user_id = $1 LIMIT 1`,
    [userId]
  );

  if (result.rowCount === 0) return [];
  return sanitizeConversationHistory(result.rows[0].conversations);
};

const upsertConversationHistory = async (userId, history) => {
  await ensureConversationTable();

  const sanitized = sanitizeConversationHistory(history);

  await pool.query(
    `
      INSERT INTO ${CHAT_HISTORY_TABLE} (user_id, conversations)
      VALUES ($1, $2::jsonb)
      ON CONFLICT (user_id)
      DO UPDATE SET conversations = EXCLUDED.conversations
    `,
    [userId, JSON.stringify(sanitized)]
  );
};

const fallbackConversationTitle = (message) => {
  const base = String(message || '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,;:!?]+$/g, '');

  if (!base) return 'New conversation';
  return base.split(' ').slice(0, 6).join(' ');
};

const buildModelCandidates = async () => {
  const discoveredModels = await fetchAvailableGeminiModels();

  return [
    ...new Set(
      [
        process.env.GEMINI_MODEL,
        'gemini-2.5-flash',
        'gemini-2.5-pro',
        'gemini-2.0-flash',
        'gemini-2.0-flash-001',
        'gemini-2.0-flash-lite',
        'gemini-2.0-flash-lite-001',
        'gemini-flash-latest',
        'gemini-flash-lite-latest',
        'gemini-1.5-latest',
        'gemini-1.5-flash',
        'gemini-1.5-flash-8b',
        ...discoveredModels,
      ].filter(Boolean)
    ),
  ];
};

// Route Handlers 

const getConversationTitle = async (req, res) => {
  const { message } = req.body || {};

  if (!message || !String(message).trim()) {
    return res.status(400).json({ error: 'message is required.' });
  }

  const inputMessage = String(message).trim();

  if (!process.env.GEMINI_API_KEY) {
    return res.json({ title: fallbackConversationTitle(inputMessage) });
  }

  try {
    const uniqueModelCandidates = await buildModelCandidates();

    const prompt = [
      'Create a short, meaningful conversation title for this user perfume request.',
      'Rules:',
      '- 3 to 7 words',
      '- plain text only',
      '- no quotes, no punctuation at the end',
      '- capture intent or occasion',
      '',
      `Message: ${inputMessage}`,
    ].join('\n');

    let titleText = '';

    for (const modelName of uniqueModelCandidates) {
      try {
        const model = getGenAI().getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        titleText = String(response.text() || '').trim();
        if (titleText) break;
      } catch (modelError) {
        const s = modelError?.status ?? modelError?.httpStatus ?? modelError?.code;
        if (s !== 404 && s !== 429 && !String(modelError?.message || '').includes('not found')) throw modelError;
      }
    }

    if (!titleText) {
      return res.json({ title: fallbackConversationTitle(inputMessage) });
    }

    const cleanedTitle = titleText
      .split('\n')[0]
      .replace(/^['"`\s]+|['"`\s]+$/g, '')
      .replace(/[.,;:!?]+$/g, '')
      .trim();

    res.json({ title: cleanedTitle || fallbackConversationTitle(inputMessage) });
  } catch (error) {
    console.error(error);
    res.json({ title: fallbackConversationTitle(inputMessage) });
  }
};

const getHistory = async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required.' });
  }

  try {
    const history = await getConversationHistory(userId);
    res.json({ history });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to fetch conversation history.' });
  }
};

const deleteConversation = async (req, res) => {
  const { userId, conversationId } = req.params;

  if (!userId || !conversationId) {
    return res.status(400).json({ error: 'userId and conversationId are required.' });
  }

  try {
    const history = await getConversationHistory(userId);
    const nextHistory = history.filter(
      (item) => String(item.conversationId || 'default-chat') !== String(conversationId)
    );

    await upsertConversationHistory(userId, nextHistory);
    res.json({ history: nextHistory });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to delete conversation.' });
  }
};

const chat = async (req, res) => {
  const {
    userId,
    message,
    history = [],
    conversationId = 'default-chat',
    conversationTitle,
  } = req.body;

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
  }

  if (!userId || !message || !String(message).trim()) {
    return res.status(400).json({ error: 'userId and message are required.' });
  }

  try {
    const profile = await pool.query(
      'SELECT id, username, gender_pref, budget_pref, favorite_notes FROM users WHERE id = $1 LIMIT 1',
      [userId]
    );

    if (profile.rowCount === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const collection = await pool.query(
      `
        SELECT p.perfume, p.brand, p.top, p.middle, p.base, p.gender, p.year, uc.status
        FROM user_collection uc
        JOIN perfumes p ON uc.perfume_id = p.id
        WHERE uc.user_id = $1
        ORDER BY uc.added_at DESC
        LIMIT 80
      `,
      [userId]
    );

    const user = profile.rows[0];
    const favorites = Array.isArray(user.favorite_notes)
      ? user.favorite_notes.join(', ')
      : user.favorite_notes || 'None specified';

    const collectionSummary = collection.rows.length
      ? collection.rows
          .map(
            (p) =>
              `${p.brand} - ${p.perfume} (top: ${p.top || '—'}, middle: ${p.middle || '—'}, base: ${p.base || '—'})`
          )
          .join('\n')
      : 'No perfumes in collection yet.';

    const uniqueModelCandidates = await buildModelCandidates();

    const systemContext = [
      'You are Fragrance Wardrobe Advisor, a conversational perfume recommendation agent.',
      'Your goals:',
      '1) Provide guidance for occasions, seasons, mood, and budget based on user intent.',
      '2) Use the user profile and existing collection to personalize suggestions.',
      '3) Explain why each recommendation fits (notes, vibe, longevity/projection if relevant), but not in more than one or two rows.',
      '4) Avoid recommending near-duplicates of perfumes already in their collection unless the user asks.',
      '5) Keep answers practical, clear, and concise. Ask 1 short follow-up question only when needed.',
      '',
      'Response style rules (must follow):',
      'Write only in plain paragraphs. You can use new lines to separate thoughts but do not use any formatting.',
      'Do not use numbered lists (1., 2., 3.) or bullet points, unless you can separate them on different lines.',
      'Do not use markdown formatting such as **bold**, *italic*, headings, or code blocks.',
      'Use natural sentence flow with short, readable paragraphs.',
      "CRITICAL: Whenever you mention any perfume, you must format it exactly as 'Brand' - 'Perfume name'.",
      "Correct example: 'Chanel' - 'Coco Mademoiselle'.",
      'Never output perfume names without the single quotes around both brand and perfume name.',
      'Do not proactively suggest or recommend perfumes unless the user explicitly asks for suggestions/recommendations/options.',
      'If the user did not ask for suggestions, answer only what they asked and do not list perfumes.',
      'If the user asks something subjective like "What should I wear today?" or "What is good for a date?", provide one specific recommendation with explanation, then ask a follow-up question to clarify if they want more suggestions or a different vibe.',
      "If the user does not ask for suggestions but mentions an occasion, season, mood, or vibe, you can provide one relevant perfume example to illustrate your point, but do not present it as a recommendation. Instead, phrase it like: For example, 'Brand' - 'Perfume name' has a fresh citrus vibe that works well for summer days.",
      'If useful, end with a short question asking whether they want recommendations.',
      'Do not provide a separate list first and then repeat the same perfumes again with explanations.',
      'Mention each suggested perfume once, and include its explanation immediately in the same paragraph, but not over-explain.',
      '',
      'User profile:',
      `- Username: ${user.username || 'Unknown'}`,
      `- Olfactive preference: ${user.gender_pref || 'Unspecified'}`,
      `- Budget preference: ${user.budget_pref || 'Unspecified'}`,
      `- Favorite notes: ${favorites}`,
      '',
      'User collection (brand - perfume with note pyramid):',
      collectionSummary,
      '',
      'When suggesting perfumes, provide 3-5 options unless asked otherwise.',
      'If asked what to wear, pick one best option first, then a backup.',
    ].join('\n');

    const targetConversationId = String(conversationId || 'default-chat');
    const persistedHistory = await getConversationHistory(userId);
    const fallbackHistory = sanitizeConversationHistory(history);
    const mergedHistory = fallbackHistory.length > 0 ? fallbackHistory : persistedHistory;

    const sourceHistory = mergedHistory.filter(
      (item) => String(item.conversationId || 'default-chat') === targetConversationId
    );

    const historyContent = sourceHistory.slice(-12).map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }],
    }));

    let result = null;
    let lastModelError = null;

    for (const modelName of uniqueModelCandidates) {
      try {
        const model = getGenAI().getGenerativeModel({ model: modelName });
        result = await model.generateContent({
          contents: [
            { role: 'user',  parts: [{ text: systemContext }] },
            { role: 'model', parts: [{ text: 'Understood. I will act as the Fragrance Wardrobe Advisor.' }] },
            ...historyContent,
            { role: 'user',  parts: [{ text: String(message).trim() }] },
          ],
        });
        break;
      } catch (modelError) {
        lastModelError = lastModelError || modelError;
        const s = modelError?.status ?? modelError?.httpStatus ?? modelError?.code;
        const messageText = String(modelError?.message || '').toLowerCase();
        if (
          s !== 404 &&
          s !== 429 &&
          !messageText.includes('not found') &&
          !messageText.includes('multiturn chat is not enabled')
        ) {
          throw modelError;
        }
      }
    }

    if (!result) {
      const providerMessage = lastModelError?.message || 'Gemini model not found/available.';
      return res.status(502).json({
        error: providerMessage,
        triedModels: uniqueModelCandidates,
        upstreamStatus: lastModelError?.status || lastModelError?.httpStatus || 500,
      });
    }

    const response = await result.response;
    const replyText = response.text();

    const normalizedTitle = conversationTitle
      ? String(conversationTitle).trim().slice(0, 80)
      : undefined;

    const updatedHistory = [
      ...persistedHistory.filter(
        (item) => String(item.conversationId || 'default-chat') !== targetConversationId
      ),
      ...sourceHistory,
      { role: 'user',  text: String(message).trim(), conversationId: targetConversationId, conversationTitle: normalizedTitle },
      { role: 'agent', text: replyText,               conversationId: targetConversationId, conversationTitle: normalizedTitle },
    ];

    await upsertConversationHistory(userId, updatedHistory);

    res.json({ reply: replyText });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error?.message || 'The Fragrance Advisor is currently unavailable.' });
  }
};

module.exports = { getConversationTitle, getHistory, deleteConversation, chat };
