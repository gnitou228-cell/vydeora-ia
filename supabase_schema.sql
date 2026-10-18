-- ============================================================================
-- VYDEORA — SCHÉMA SUPABASE OFFICIEL & TRIGGER PROFILES AUTOMATIQUE
-- À copier-coller directement dans : Supabase Dashboard > SQL Editor > New Query
-- ============================================================================

-- 1. EXTENSIONS UTILES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 2. TABLE DES PROFILS UTILISATEURS (public.profiles)
-- Liée directement au système d'authentification Supabase (auth.users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT,
  email TEXT UNIQUE,
  phone TEXT,
  avatar_url TEXT,
  plan TEXT DEFAULT 'free',                  -- 'free', 'starter', 'pro', 'enterprise'
  credits_balance INTEGER DEFAULT 100,       -- 100 crédits de démarrage offerts
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- 3. TABLE DES PROJETS VIDÉO (public.projects)
-- Stocke les scripts, voix, assets et vidéos de chaque créateur
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  platform TEXT DEFAULT 'tiktok',            -- 'tiktok', 'youtube_shorts', 'reels', 'landscape'
  duration INTEGER DEFAULT 60,               -- Durée en secondes (ex: 30, 60, 90)
  language TEXT DEFAULT 'fr',
  tone TEXT DEFAULT 'captivant',
  status TEXT DEFAULT 'draft',               -- 'draft', 'script_generated', 'audio_ready', 'completed'
  script JSONB,                              -- Structure complète du script généré par l'IA
  audio_url TEXT,                            -- Fichier voix off (ElevenLabs / OpenAI TTS)
  video_url TEXT,                            -- Rendu final MP4
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- 4. TABLE DES TRANSACTIONS DE CRÉDITS (public.credit_transactions)
-- Historique d'utilisation et d'achat de crédits pour la transparence
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL,                   -- +100 (bonus), -10 (script), -15 (voix), etc.
  reason TEXT NOT NULL,                      -- 'welcome_bonus', 'script_generation', 'voice_generation'
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- 5. FONCTION TRIGGER : CRÉATION AUTOMATIQUE DU PROFIL À L'INSCRIPTION
-- Dès qu'un utilisateur s'inscrit dans auth.users, son profil public est créé
-- avec 100 crédits offerts, son nom, prénom, numéro et email.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_full_name TEXT;
  v_first_name TEXT;
  v_last_name TEXT;
  v_phone TEXT;
BEGIN
  -- Récupération du nom complet depuis les métadonnées d'inscription
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    ''
  );

  -- Récupération du prénom
  v_first_name := COALESCE(
    NEW.raw_user_meta_data->>'first_name',
    NULLIF(split_part(v_full_name, ' ', 1), ''),
    ''
  );

  -- Récupération du nom de famille
  v_last_name := COALESCE(
    NEW.raw_user_meta_data->>'last_name',
    NULLIF(substr(v_full_name, length(v_first_name) + 2), ''),
    ''
  );

  -- Récupération du numéro de téléphone
  v_phone := COALESCE(
    NEW.raw_user_meta_data->>'phone',
    NEW.phone,
    ''
  );

  -- Insertion automatique dans public.profiles
  INSERT INTO public.profiles (
    id,
    first_name,
    last_name,
    full_name,
    email,
    phone,
    avatar_url,
    plan,
    credits_balance,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    v_first_name,
    v_last_name,
    v_full_name,
    NEW.email,
    v_phone,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    'free',
    100, -- 100 crédits de démarrage offerts
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();

  -- Enregistrement de la transaction initiale de bienvenue
  INSERT INTO public.credit_transactions (
    user_id,
    amount,
    reason,
    created_at
  )
  VALUES (
    NEW.id,
    100,
    'Bonus de bienvenue (100 crédits offerts)',
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. ATTACHEMENT DU TRIGGER SUR auth.users
-- ============================================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 7. SÉCURITÉ ROW LEVEL SECURITY (RLS)
-- Garantit l'isolation stricte des données entre tous les utilisateurs
-- ============================================================================

-- RLS sur profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leur propre profil" ON public.profiles;
CREATE POLICY "Les utilisateurs peuvent voir leur propre profil"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Les utilisateurs peuvent modifier leur propre profil" ON public.profiles;
CREATE POLICY "Les utilisateurs peuvent modifier leur propre profil"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS sur projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Les utilisateurs gèrent uniquement leurs propres projets" ON public.projects;
CREATE POLICY "Les utilisateurs gèrent uniquement leurs propres projets"
  ON public.projects FOR ALL
  USING (auth.uid() = user_id);

-- RLS sur credit_transactions
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Les utilisateurs consultent leurs propres transactions" ON public.credit_transactions;
CREATE POLICY "Les utilisateurs consultent leurs propres transactions"
  ON public.credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================================
-- 8. INDEX POUR PERFORMANCES MAXIMALES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON public.credit_transactions(user_id);
