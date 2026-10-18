/**
 * VYDEORA — Server-side AI Voice Generation Service (Text-to-Speech)
 * Supports ElevenLabs API (primary for ultra-realistic voices)
 * and OpenAI TTS API (alternative), with demo/test mode.
 */

const fs = require('fs');
const path = require('path');

const isVercel = Boolean(process.env.VERCEL);
const AUDIO_DIR = isVercel ? path.join('/tmp', 'audio') : path.join(__dirname, '..', 'uploads', 'audio');

// Ensure audio directory exists
try {
  if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
  }
} catch (err) {
  console.warn('Audio directory init warning:', err.message);
}

// Voice Catalog
const VOICES = {
  thomas: {
    id: 'thomas',
    name: 'Thomas',
    lang: 'Français (France)',
    tone: 'Énergique & Captivant',
    desc: 'Idéal pour le storytelling dynamique, TikTok, Shorts et Reels.',
    elevenVoiceId: 'ErXwobaYiN019PkySvjV', // Antoni
    openAiVoice: 'onyx',
    avatarInitials: 'TH',
    avatarColor: 'linear-gradient(135deg, #10B981, #059669)',
    sampleText: 'Bienvenue sur VYDEORA ! Prêt à transformer vos idées en vidéos virales ?'
  },
  sarah: {
    id: 'sarah',
    name: 'Sarah',
    lang: 'Français (France)',
    tone: 'Chaleureuse & Storytelling',
    desc: 'Parfaite pour les récits captivants, les tutoriels et vidéos de formation.',
    elevenVoiceId: '21m00Tcm4TlvDq8ikWAM', // Rachel
    openAiVoice: 'nova',
    avatarInitials: 'SA',
    avatarColor: 'linear-gradient(135deg, #EC4899, #8B5CF6)',
    sampleText: 'Aujourd\'hui, découvrez comment capter l\'attention dès les premières secondes.'
  },
  lucas: {
    id: 'lucas',
    name: 'Lucas',
    lang: 'Français (Canada)',
    tone: 'Posé & Professionnel',
    desc: 'Adapté aux vidéos business, finance, tech et présentations d\'entreprises.',
    elevenVoiceId: 'pNInz6obpgDQGcFmaJgB', // Adam
    openAiVoice: 'echo',
    avatarInitials: 'LU',
    avatarColor: 'linear-gradient(135deg, #F59E0B, #D97706)',
    sampleText: 'Optimisez vos résultats avec des contenus visuels percutants et clairs.'
  },
  emma: {
    id: 'emma',
    name: 'Emma',
    lang: 'Français (France)',
    tone: 'Dynamique & Vente',
    desc: 'Optimale pour l\'e-commerce, les annonces publicitaires et l\'affiliation.',
    elevenVoiceId: 'EXAVITQu4vr4xnSDxMaL', // Bella
    openAiVoice: 'shimmer',
    avatarInitials: 'EM',
    avatarColor: 'linear-gradient(135deg, #6366F1, #3B82F6)',
    sampleText: 'Voici le secret que personne ne vous a jamais révélé sur les algorithmes !'
  }
};

/**
 * Generate a valid playable WAV audio buffer (sine wave tone) for demo / test mode
 */
function generateDemoAudioBuffer(durationSeconds = 3) {
  const sampleRate = 22050;
  const numSamples = Math.floor(sampleRate * durationSeconds);
  const dataSize = numSamples * 2; // 16-bit mono
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF chunk descriptor
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt sub-chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);      // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20);       // AudioFormat (1 = PCM)
  buffer.writeUInt16LE(1, 22);       // NumChannels (1 = mono)
  buffer.writeUInt32LE(sampleRate, 24); // SampleRate
  buffer.writeUInt32LE(sampleRate * 2, 28); // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
  buffer.writeUInt16LE(2, 32);       // BlockAlign
  buffer.writeUInt16LE(16, 34);      // BitsPerSample

  // data sub-chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Fill with a smooth pleasant harmonic chord (440Hz A4)
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Envelope for soft start and end
    const envelope = Math.sin((Math.PI * i) / numSamples);
    const sample = Math.sin(2 * Math.PI * 440 * t) * 0.3 * envelope * 32767;
    buffer.writeInt16LE(Math.floor(sample), 44 + i * 2);
  }

  return buffer;
}

/**
 * Call ElevenLabs Text-to-Speech API
 */
async function callElevenLabsTTS(apiKey, voiceId, text, speed = 1.0) {
  const voice = VOICES[voiceId] || VOICES.thomas;
  const elevenVoiceId = voice.elevenVoiceId;
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${elevenVoiceId}`;

  const payload = {
    text: text,
    model_id: 'eleven_multilingual_v2',
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0.0,
      use_speaker_boost: true
    }
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 35000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey.trim(),
        'Accept': 'audio/mpeg'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text();
      let errorMsg = `ElevenLabs API error (${res.status})`;
      try {
        const parsed = JSON.parse(errText);
        errorMsg = parsed.detail?.message || parsed.message || errorMsg;
      } catch (e) {}
      throw new Error(errorMsg);
    }

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Call OpenAI Text-to-Speech API
 */
async function callOpenAiTTS(apiKey, voiceId, text, speed = 1.0) {
  const voice = VOICES[voiceId] || VOICES.thomas;
  const url = 'https://api.openai.com/v1/audio/speech';

  const payload = {
    model: 'tts-1',
    input: text,
    voice: voice.openAiVoice || 'onyx',
    speed: Math.min(Math.max(parseFloat(speed) || 1.0, 0.25), 4.0),
    response_format: 'mp3'
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 35000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text();
      let errorMsg = `OpenAI TTS error (${res.status})`;
      try {
        const parsed = JSON.parse(errText);
        errorMsg = parsed.error?.message || errorMsg;
      } catch (e) {}
      throw new Error(errorMsg);
    }

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Main TTS Generator function
 */
async function generateVoiceOver({ text, voiceId = 'thomas', speed = 1.0, projectId = 'demo', isDemo = false }) {
  if (!text || typeof text !== 'string' || text.trim().length < 3) {
    const err = new Error('Le texte de narration doit comporter au moins 3 caractères.');
    err.status = 400;
    throw err;
  }

  const cleanText = text.trim();
  const selectedVoice = VOICES[voiceId] || VOICES.thomas;

  const elevenKey = process.env.ELEVENLABS_API_KEY ? process.env.ELEVENLABS_API_KEY.trim() : null;
  const openAiKey = process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.trim() : null;

  let audioBuffer = null;
  let fileExt = 'mp3';
  let providerUsed = 'mock';

  // 1. Try ElevenLabs if configured
  if (elevenKey && !isDemo) {
    try {
      audioBuffer = await callElevenLabsTTS(elevenKey, voiceId, cleanText, speed);
      providerUsed = 'elevenlabs';
      fileExt = 'mp3';
    } catch (err) {
      console.warn('ElevenLabs failed, checking OpenAI fallback:', err.message);
    }
  }

  // 2. Try OpenAI TTS if ElevenLabs was not used or failed
  if (!audioBuffer && openAiKey && !isDemo) {
    try {
      audioBuffer = await callOpenAiTTS(openAiKey, voiceId, cleanText, speed);
      providerUsed = 'openai';
      fileExt = 'mp3';
    } catch (err) {
      console.warn('OpenAI TTS failed:', err.message);
    }
  }

  // 3. Fallback / Test / Demo handling
  if (!audioBuffer) {
    const isTestMode = process.env.NODE_ENV === 'test' || isDemo;
    if (isTestMode) {
      // Approximate duration based on word count: ~130 words per minute
      const wordCount = cleanText.split(/\s+/).length;
      const estimatedSecs = Math.max(3, Math.min(60, Math.ceil((wordCount / 130) * 60)));
      audioBuffer = generateDemoAudioBuffer(estimatedSecs);
      fileExt = 'wav';
      providerUsed = 'demo_synthesizer';
    } else {
      const err = new Error('Clé API de voix non configurée. Veuillez ajouter votre clé ELEVENLABS_API_KEY ou OPENAI_API_KEY dans vos variables d\'environnement pour générer la voix off réelle.');
      err.code = 'MISSING_API_KEY';
      err.status = 503;
      throw err;
    }
  }

  // Save audio file
  const filename = `voice-${projectId || 'sample'}-${Date.now()}.${fileExt}`;
  const filePath = path.join(AUDIO_DIR, filename);
  fs.writeFileSync(filePath, audioBuffer);

  const publicUrl = `/uploads/audio/${filename}`;
  const wordCount = cleanText.split(/\s+/).length;
  const estimatedDurationSeconds = Math.max(3, Math.ceil((wordCount / 130) * 60));

  return {
    success: true,
    audioUrl: publicUrl,
    filename: filename,
    voice: selectedVoice,
    wordCount: wordCount,
    durationSeconds: estimatedDurationSeconds,
    provider: providerUsed
  };
}

module.exports = {
  VOICES,
  generateVoiceOver,
  generateDemoAudioBuffer
};
