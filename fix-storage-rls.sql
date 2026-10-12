-- ====================================================================
-- SOLUCIÓN PERMANENTE PARA SUPABASE STORAGE: BUCKET "vehicle-images"
-- ====================================================================
-- INSTRUCCIONES:
-- 1. Abre tu Dashboard de Supabase (https://supabase.com/dashboard)
-- 2. Ve a tu proyecto -> SQL Editor (en el menú lateral izquierdo)
-- 3. Pega este código completo y haz clic en "Run" (Ejecutar)
-- ====================================================================

-- 1. Asegurar que el bucket vehicle-images existe y es público
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'vehicle-images', 
    'vehicle-images', 
    true, 
    52428800, -- 50 MB límite para soportar videos MP4/WebM y fotos HD
    ARRAY['image/*', 'video/*']
)
ON CONFLICT (id) DO UPDATE SET 
    public = true,
    file_size_limit = 52428800;

-- 2. Eliminar políticas anteriores restrictivas si existen
DROP POLICY IF EXISTS "Public can view images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read on vehicle-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads on vehicle-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public updates on vehicle-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public delete on vehicle-images" ON storage.objects;

-- 3. Permitir lectura pública a cualquiera (para que las fotos y videos se vean en la web)
CREATE POLICY "Allow public read on vehicle-images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'vehicle-images');

-- 4. Permitir subida de archivos (INSERT) desde el panel admin
CREATE POLICY "Allow public uploads on vehicle-images"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'vehicle-images');

-- 5. Permitir actualización y reemplazo de archivos (UPDATE)
CREATE POLICY "Allow public updates on vehicle-images"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'vehicle-images');

-- 6. Permitir eliminación de archivos (DELETE)
CREATE POLICY "Allow public delete on vehicle-images"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'vehicle-images');
