/**
 * VYDEORA — Server-side AI Script Generation Service
 * Supports Google Gemini API (primary) and OpenAI (alternative)
 * API keys are read strictly from server environment variables.
 */

const https = require('https');

// System prompt defining the expert scriptwriter persona and strict JSON schema
const SYSTEM_INSTRUCTION = `Tu es un scénariste expert en vidéos virales pour les réseaux sociaux (TikTok, Instagram Reels, YouTube Shorts, LinkedIn).
Ta mission est de concevoir un script vidéo original, captivant, à forte rétention et parfaitement structuré.

Tu dois impérativement renvoyer UNIQUEMENT un objet JSON valide respectant scrupuleusement la structure suivante, sans aucun texte introductif ni formatage markdown autour :
{
  "title": "Titre accrocheur et percutant de la vidéo",
  "hook": "L'accroche explosive des 3 premières secondes conçue pour stopper net le scroll",
  "scenes": [
    {
      "sceneNumber": 1,
      "title": "Nom de la scène (ex: L'Accroche)",
      "visualDescription": "Description visuelle cinématographique précise du plan (caméra, cadrage, sujet, éclairage, ambiance)",
      "narration": "Texte exact dit par la voix-off",
      "durationSeconds": 3
    }
  ],
  "conclusion": "Conclusion mémorable et appel à l'action (CTA) clair incitant à s'abonner, commenter ou visiter un lien"
}`;

/**
 * Clean potential markdown wrappers from AI responses
 */
function extractJsonFromText(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;
  let text = rawText.trim();
  if (text.startsWith('```json')) {
    text = text.substring(7);
  } else if (text.startsWith('```')) {
    text = text.substring(3);
  }
  if (text.endsWith('```')) {
    text = text.substring(0, text.length - 3);
  }
  return text.trim();
}

/**
 * Calls Google Gemini REST API using native fetch
 */
async function callGeminiApi(apiKey, userPrompt, metadata) {
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const promptText = `
${SYSTEM_INSTRUCTION}

--- PARAMÈTRES DU SCRIPT ---
- Sujet / Idée de la vidéo : "${userPrompt}"
- Langue souhaitée : ${metadata.language || 'Français'}
- Tonalité : ${metadata.tone || 'Dynamique & Captivant'}
- Plateforme cible : ${metadata.platform || 'TikTok'}
- Format visuel : ${metadata.format || '9:16'}
- Durée cible approximative : ${metadata.duration || '60s'}

Génère maintenant le script JSON complet correspondant exactement à ces paramètres.`;

  const requestBody = {
    contents: [
      {
        parts: [
          { text: promptText }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json'
    }
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text();
      let parsedErr = errText;
      try {
        const jsonErr = JSON.parse(errText);
        parsedErr = jsonErr.error?.message || errText;
      } catch (e) {}
      throw new Error(`Erreur API Gemini (${res.status}): ${parsedErr}`);
    }

    const data = await res.json();
    const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidate) {
      throw new Error('L\'API Gemini n\'a retourné aucun contenu exploitable.');
    }

    const cleanJson = extractJsonFromText(candidate);
    return JSON.parse(cleanJson);
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Délai d\'attente dépassé (timeout) lors de la génération du script avec Gemini.');
    }
    throw err;
  }
}

/**
 * Calls OpenAI API (alternative if OPENAI_API_KEY is configured)
 */
async function callOpenAiApi(apiKey, userPrompt, metadata) {
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const url = 'https://api.openai.com/v1/chat/completions';

  const userMessage = `Sujet / Idée de la vidéo : "${userPrompt}"
- Langue : ${metadata.language || 'Français'}
- Tonalité : ${metadata.tone || 'Dynamique & Captivant'}
- Plateforme : ${metadata.platform || 'TikTok'}
- Format : ${metadata.format || '9:16'}
- Durée cible : ${metadata.duration || '60s'}`;

  const requestBody = {
    model: model,
    messages: [
      { role: 'system', content: SYSTEM_INSTRUCTION },
      { role: 'user', content: userMessage }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text();
      let parsedErr = errText;
      try {
        const jsonErr = JSON.parse(errText);
        parsedErr = jsonErr.error?.message || errText;
      } catch (e) {}
      throw new Error(`Erreur API OpenAI (${res.status}): ${parsedErr}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('L\'API OpenAI n\'a retourné aucun contenu.');
    }

    const cleanJson = extractJsonFromText(content);
    return JSON.parse(cleanJson);
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Délai d\'attente dépassé (timeout) lors de la génération du script avec OpenAI.');
    }
    throw err;
  }
}

/**
 * Main AI Script Generation function
 */
async function generateVideoScript(params) {
  const { prompt, language = 'Français', tone = 'Dynamique & Captivant', platform = 'TikTok', format = '9:16', duration = '60s' } = params;

  // 1. Strict input validation
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 3) {
    const err = new Error('Veuillez décrire votre sujet de vidéo (au moins 3 caractères).');
    err.code = 'INVALID_INPUT';
    err.status = 400;
    throw err;
  }

  if (prompt.trim().length > 3000) {
    const err = new Error('Le sujet est trop long (maximum 3000 caractères).');
    err.code = 'INVALID_INPUT';
    err.status = 400;
    throw err;
  }

  // 2. Check for API keys
  const geminiKey = process.env.GEMINI_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;

  if (!geminiKey && !openAiKey) {
    const err = new Error(
      'Clé d\'API manquante côté serveur. Veuillez configurer la variable d\'environnement GEMINI_API_KEY (ou OPENAI_API_KEY) pour activer la génération automatique de scripts par IA.'
    );
    err.code = 'MISSING_API_KEY';
    err.status = 503;
    throw err;
  }

  const cleanPrompt = prompt.trim();
  const metadata = { language, tone, platform, format, duration };

  let rawScript;
  let providerUsed = '';

  if (geminiKey) {
    providerUsed = 'Google Gemini';
    rawScript = await callGeminiApi(geminiKey, cleanPrompt, metadata);
  } else {
    providerUsed = 'OpenAI';
    rawScript = await callOpenAiApi(openAiKey, cleanPrompt, metadata);
  }

  // 3. Normalization and safety checks
  if (!rawScript || typeof rawScript !== 'object') {
    throw new Error('Le format du script retourné par l\'IA est invalide.');
  }

  const normalizedScript = {
    title: rawScript.title || cleanPrompt.substring(0, 50),
    hook: rawScript.hook || 'Découvrez ce secret incroyable !',
    scenes: Array.isArray(rawScript.scenes) && rawScript.scenes.length > 0
      ? rawScript.scenes.map((scene, idx) => ({
          sceneNumber: scene.sceneNumber || idx + 1,
          title: scene.title || `Scène ${idx + 1}`,
          visualDescription: scene.visualDescription || 'Plan dynamique en rapport avec le sujet.',
          narration: scene.narration || '',
          durationSeconds: Number(scene.durationSeconds) || 5
        }))
      : [
          {
            sceneNumber: 1,
            title: 'Accroche',
            visualDescription: 'Gros plan dynamique sur le sujet principal.',
            narration: rawScript.hook || cleanPrompt,
            durationSeconds: 3
          },
          {
            sceneNumber: 2,
            title: 'Développement',
            visualDescription: 'Plans variés et rythmés illustrant les arguments clés.',
            narration: 'Voici les détails essentiels à retenir pour réussir.',
            durationSeconds: 20
          },
          {
            sceneNumber: 3,
            title: 'Conclusion',
            visualDescription: 'Plan final avec éléments graphiques et appel à l\'action.',
            narration: rawScript.conclusion || 'Abonne-toi pour plus d\'astuces !',
            durationSeconds: 7
          }
        ],
    conclusion: rawScript.conclusion || 'Abonnez-vous pour ne rien manquer !',
    meta: {
      provider: providerUsed,
      prompt: cleanPrompt,
      language,
      tone,
      platform,
      format,
      duration,
      generatedAt: new Date().toISOString()
    }
  };

  return normalizedScript;
}

module.exports = {
  generateVideoScript
};
