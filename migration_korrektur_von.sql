-- Выполни в Supabase SQL Editor
-- Добавляет колонку для ссылки "эта запись является исправлением той"
ALTER TABLE eintraege 
ADD COLUMN IF NOT EXISTS korrektur_von TEXT;

-- Проверка:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'eintraege' AND column_name = 'korrektur_von';
