-- ============================================================================
-- VYDEORA — SCHÉMA SUPABASE OFFICIEL (V2 ULTRA-ROBUSTE & SANS ERREUR)
-- À copier-coller dans : Supabase > SQL Editor > New Query > RUN
-- ============================================================================

-- 1. EXTENSIONS UTILES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 2. TABLE DES PROFILS (public.profiles)
-- Création tolérante aux pannes : fonctionne que la table existe déjà ou non
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ajout sécurisé de chaque colonne au cas où la table profiles existait déjà
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS credits_balance INTEGER DEFAULT 100;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());

-- ============================================================================
-- 3. PERMISSIONS & SÉCURITÉ ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Suppression préalable des politiques pour éviter l'erreur "policy already exists"
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leur propre profil" ON public.profiles;
DROP POLICY IF EXISTS "Les utilisateurs peuvent modifier leur propre profil" ON public.profiles;
DROP POLICY IF EXISTS "Utilisateurs : lecture de leur profil" ON public.profiles;
DROP POLICY IF EXISTS "Utilisateurs : modification de leur profil" ON public.profiles;

-- Création des politiques RLS
CREATE POLICY "profiles_select_policy"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_policy"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "profiles_insert_policy"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Attribution des droits d'accès
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.profiles TO postgres, anon, authenticated, service_role;

-- ============================================================================
-- 4. TABLE DES PROJETS VIDÉO (public.projects)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  platform TEXT DEFAULT 'tiktok',
  duration INTEGER DEFAULT 60,
  language TEXT DEFAULT 'fr',
  tone TEXT DEFAULT 'captivant',
  status TEXT DEFAULT 'draft',
  script JSONB,
  audio_url TEXT,
  video_url TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "projects_owner_policy" ON public.projects;
DROP POLICY IF EXISTS "Les utilisateurs gèrent uniquement leurs propres projets" ON public.projects;
DROP POLICY IF EXISTS "Utilisateurs : gestion exclusive de leurs projets" ON public.projects;

CREATE POLICY "projects_owner_policy"
  ON public.projects FOR ALL
  USING (auth.uid() = user_id);

GRANT ALL ON TABLE public.projects TO postgres, anon, authenticated, service_role;

-- ============================================================================
-- 5. TABLE DES TRANSACTIONS DE CRÉDITS (public.credit_transactions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "credit_transactions_owner_policy" ON public.credit_transactions;
DROP POLICY IF EXISTS "Les utilisateurs consultent leurs propres transactions" ON public.credit_transactions;
DROP POLICY IF EXISTS "Utilisateurs : lecture de leurs crédits" ON public.credit_transactions;

CREATE POLICY "credit_transactions_owner_policy"
  ON public.credit_transactions FOR ALL
  USING (auth.uid() = user_id);

GRANT ALL ON TABLE public.credit_transactions TO postgres, anon, authenticated, service_role;

-- ============================================================================
-- 6. FONCTION TRIGGER AUTOMATIQUE (handle_new_user)
-- S'exécute dès qu'un utilisateur s'inscrit dans auth.users
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name TEXT;
  v_first_name TEXT;
  v_last_name TEXT;
  v_phone TEXT;
BEGIN
  -- 1. Récupération du nom complet
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    ''
  );

  -- 2. Récupération du prénom
  v_first_name := COALESCE(
    NEW.raw_user_meta_data->>'first_name',
    NULLIF(split_part(v_full_name, ' ', 1), ''),
    ''
  );

  -- 3. Récupération du nom de famille
  v_last_name := COALESCE(
    NEW.raw_user_meta_data->>'last_name',
    NULLIF(trim(substr(v_full_name, length(v_first_name) + 1)), ''),
    ''
  );

  -- 4. Récupération du numéro de téléphone
  v_phone := COALESCE(
    NEW.raw_user_meta_data->>'phone',
    NEW.phone::text,
    ''
  );

  -- 5. Création ou mise à jour du profil utilisateur
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
    phone = CASE WHEN EXCLUDED.phone <> '' THEN EXCLUDED.phone ELSE public.profiles.phone END,
    full_name = CASE WHEN EXCLUDED.full_name <> '' THEN EXCLUDED.full_name ELSE public.profiles.full_name END,
    updated_at = NOW();

  -- 6. Enregistrement de l'historique du bonus de 100 crédits
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
EXCEPTION
  WHEN OTHERS THEN
    -- Sécurité absolue : ne jamais bloquer l'inscription d'un utilisateur dans auth.users
    RAISE WARNING 'Erreur handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- ============================================================================
-- 7. ATTACHEMENT DU TRIGGER SUR auth.users
-- ============================================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 8. SYNCHRONISATION RÉTROACTIVE DES UTILISATEURS EXISTANTS
-- Si des utilisateurs se sont déjà inscrits avant d'exécuter ce script,
-- cette requête leur crée automatiquement un profil avec 100 crédits.
-- ============================================================================
INSERT INTO public.profiles (id, email, full_name, plan, credits_balance, created_at, updated_at)
SELECT 
  u.id, 
  u.email, 
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', ''), 
  'free', 
  100, 
  u.created_at, 
  now()
FROM auth.users u
ON CONFLICT (id) DO NOTHING;
