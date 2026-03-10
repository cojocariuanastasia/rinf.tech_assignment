const pool = require('../config/db');
const { GoogleGenerativeAI } = require('@google/generative-ai');

require('dotenv').config();
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

const toSimilarEntry = (item) => ({
  perfumeId: item?.id || null,
  label: `${item?.brand || ''} - ${item?.perfume || ''}`.trim().replace(/^\s*-\s*|\s*-\s*$/g, ''),
});

const resolveSimilarFragrances = async (rawSuggestions = []) => {
  const entries = [];

  for (const raw of rawSuggestions.slice(0, 5)) {
    if (!raw || typeof raw !== 'string') continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;

    const hasSeparator = trimmed.includes(' - ');
    const [brandPart, perfumePart] = hasSeparator
      ? trimmed.split(/\s-\s(.+)/)
      : [null, trimmed];

    try {
      const lookup = await pool.query(
        `
          SELECT id, brand, perfume
          FROM perfumes
          WHERE perfume ILIKE $1
            AND ($2::text IS NULL OR brand ILIKE $2)
          ORDER BY rating_count DESC NULLS LAST, rating_value DESC NULLS LAST
          LIMIT 1
        `,
        [perfumePart, brandPart]
      );

      if (lookup.rowCount > 0) {
        entries.push(toSimilarEntry(lookup.rows[0]));
      } else {
        entries.push({ perfumeId: null, label: trimmed });
      }
    } catch {
      entries.push({ perfumeId: null, label: trimmed });
    }
  }

  return entries;
};

// Route Handlers 

const searchPerfumes = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || !q.trim()) {
      const result = await pool.query(
        `
          SELECT *
          FROM perfumes
          ORDER BY rating_count DESC NULLS LAST,
                   rating_value DESC NULLS LAST,
                   year DESC NULLS LAST,
                   perfume ASC
          LIMIT 30
        `
      );
      return res.json(result.rows);
    }

    const terms = String(q).trim().split(/\s+/).filter(Boolean).slice(0, 8);

    const whereClauses = terms
      .map(
        (_, idx) => `
          (
            brand        ILIKE $${idx + 1}
            OR perfume   ILIKE $${idx + 1}
            OR country   ILIKE $${idx + 1}
            OR gender    ILIKE $${idx + 1}
            OR top       ILIKE $${idx + 1}
            OR middle    ILIKE $${idx + 1}
            OR base      ILIKE $${idx + 1}
            OR description ILIKE $${idx + 1}
            OR perfumer1 ILIKE $${idx + 1}
            OR perfumer2 ILIKE $${idx + 1}
            OR perfumer3 ILIKE $${idx + 1}
            OR perfumer4 ILIKE $${idx + 1}
            OR perfumer5 ILIKE $${idx + 1}
            OR perfumer6 ILIKE $${idx + 1}
          )
        `
      )
      .join(' AND ');

    const params = terms.map((term) => `%${term}%`);

    const result = await pool.query(
      `
        SELECT *
        FROM perfumes
        WHERE ${whereClauses}
        ORDER BY rating_count DESC NULLS LAST,
                 rating_value DESC NULLS LAST,
                 year DESC NULLS LAST,
                 perfume ASC
        LIMIT 50
      `,
      params
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Database error' });
  }
};

const getPerfumeById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT * FROM perfumes WHERE id = $1 LIMIT 1`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Perfume not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Database error while fetching perfume details' });
  }
};

const getAiSuggestions = async (req, res) => {
  const { id } = req.params;

  try {
    const perfumeResult = await pool.query(
      `
        SELECT id, brand, perfume, top, middle, base, gender, description
        FROM perfumes
        WHERE id = $1
        LIMIT 1
      `,
      [id]
    );

    if (perfumeResult.rowCount === 0) {
      return res.status(404).json({ error: 'Perfume not found' });
    }

    const perfume = perfumeResult.rows[0];

    const similarResult = await pool.query(
      `
        SELECT id, brand, perfume, top, middle, base
        FROM perfumes
        WHERE id <> $1
          AND (
            brand = $2
            OR top    ILIKE $3
            OR middle ILIKE $4
            OR base   ILIKE $5
          )
        ORDER BY rating_count DESC NULLS LAST, rating_value DESC NULLS LAST
        LIMIT 12
      `,
      [
        id,
        perfume.brand,
        `%${(perfume.top    || '').split(',')[0]?.trim() || ''}%`,
        `%${(perfume.middle || '').split(',')[0]?.trim() || ''}%`,
        `%${(perfume.base   || '').split(',')[0]?.trim() || ''}%`,
      ]
    );

    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        occasion: 'Versatile wear for casual outings and evening plans, depending on application.',
        season: 'Best in mild to cooler weather, with flexibility for year-round use in moderation.',
        similarFragrances: similarResult.rows.slice(0, 3).map(toSimilarEntry),
      });
    }

    const preferredModel = process.env.GEMINI_MODEL;
    const discoveredModels = await fetchAvailableGeminiModels();

    const uniqueModelCandidates = [
      ...new Set(
        [
          preferredModel,
          'gemini-2.5-flash',
          'gemini-2.5-pro',
          'gemini-2.0-flash',
          'gemini-2.0-flash-001',
          'gemini-2.0-flash-lite',
          'gemini-2.0-flash-lite-001',
          'gemini-flash-latest',
          'gemini-flash-lite-latest',
          'gemini-1.5-flash',
          'gemini-1.5-flash-8b',
          'gemini-1.5-latest',
          ...discoveredModels,
        ].filter(Boolean)
      ),
    ];

    const context = [
      `Perfume: ${perfume.brand} - ${perfume.perfume}`,
      `Top notes: ${perfume.top    || 'N/A'}`,
      `Middle notes: ${perfume.middle || 'N/A'}`,
      `Base notes: ${perfume.base   || 'N/A'}`,
      `Gender profile: ${perfume.gender || 'N/A'}`,
      `Description: ${perfume.description || 'N/A'}`,
      'Similar candidates from catalog:',
      similarResult.rows.map((p) => `${p.brand} - ${p.perfume}`).join('\n') || 'None',
    ].join('\n');

    const userPrompt = [
      'You are a fragrance stylist assistant.',
      'Based on the perfume context below, provide suggestions for:',
      '- best occasion(s) to wear it',
      '- best season(s)',
      '- 3 similar fragrances (prefer same brand or similar note profile)',
      '',
      'Return valid JSON only with this exact shape:',
      '{"occasion":"...","season":"...","similarFragrances":["\\"Brand\\" - \\"Perfume\\"","\\"Brand\\" - \\"Perfume\\"","\\"Brand\\" - \\"Perfume\\""]}',
      '',
      context,
    ].join('\n');

    let result = null;
    let lastModelError = null;

    for (const modelName of uniqueModelCandidates) {
      try {
        const model = getGenAI().getGenerativeModel({ model: modelName });
        result = await model.generateContent(userPrompt);
        break;
      } catch (modelError) {
        lastModelError = lastModelError || modelError;
        const s = modelError?.status ?? modelError?.httpStatus ?? modelError?.code;
        if (s !== 404 && s !== 429 && !String(modelError?.message || '').includes('not found')) throw modelError;
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
    const rawText = response.text();
    const parsed = extractJsonObject(rawText);

    if (!parsed) {
      return res.json({
        occasion: 'Great for social outings, dates, and evening scenarios where scent character can stand out.',
        season: 'Most suitable for transitional or cooler seasons.',
        similarFragrances: similarResult.rows.slice(0, 3).map(toSimilarEntry),
      });
    }

    const resolvedSimilar = Array.isArray(parsed.similarFragrances)
      ? await resolveSimilarFragrances(parsed.similarFragrances)
      : similarResult.rows.slice(0, 3).map(toSimilarEntry);

    res.json({
      occasion: parsed.occasion || 'Versatile for multiple occasions depending on dose and setting.',
      season: parsed.season || 'Best in moderate to cool weather.',
      similarFragrances: resolvedSimilar,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to generate AI perfume suggestions right now.' });
  }
};

module.exports = { searchPerfumes, getPerfumeById, getAiSuggestions };
