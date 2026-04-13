-- ============================================
-- LIMPIAR TABLAS EXISTENTES
-- ============================================
DROP TABLE IF EXISTS trabajos CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP FUNCTION IF EXISTS handle_new_user CASCADE;

-- ============================================
-- TABLA: PROFILES (conectada a auth.users)
-- ============================================
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    nombre_completo TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLA: TRABAJOS (conectada a auth.users)
-- ============================================
CREATE TABLE trabajos (
    id SERIAL PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    numero_semana INTEGER NOT NULL CHECK (numero_semana IN (1, 2, 3, 4)),
    nombre_archivo TEXT NOT NULL,
    ruta_storage TEXT NOT NULL,
    descripcion TEXT,
    estado VARCHAR(50) DEFAULT 'pendiente',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- ÍNDICES
-- ============================================
CREATE INDEX idx_trabajos_usuario ON trabajos(usuario_id);
CREATE INDEX idx_trabajos_semana ON trabajos(numero_semana);

-- ============================================
-- RLS (Row Level Security)
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trabajos ENABLE ROW LEVEL SECURITY;

-- Policies para profiles
CREATE POLICY "Usuarios ven su perfil"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Usuarios actualizan su perfil"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Admins ven todos los perfiles"
    ON profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() AND p.is_admin = TRUE
        )
    );

-- Policies para trabajos
CREATE POLICY "Usuarios ven sus trabajos"
    ON trabajos FOR SELECT
    USING (auth.uid() = usuario_id);

CREATE POLICY "Admins ven todos los trabajos"
    ON trabajos FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() AND p.is_admin = TRUE
        )
    );

CREATE POLICY "Usuarios crean trabajos"
    ON trabajos FOR INSERT
    WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuarios eliminan sus trabajos"
    ON trabajos FOR DELETE
    USING (auth.uid() = usuario_id);

-- ============================================
-- TRIGGER: Crear profile al registrarse
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, nombre_completo)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- NOTA: Para crear un admin, ejecuta:
-- UPDATE profiles SET is_admin = TRUE WHERE email = 'tu-email@ejemplo.com';
-- ============================================
