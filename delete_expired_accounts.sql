-- Выполни это ОДИН РАЗ в Supabase SQL Editor
CREATE OR REPLACE FUNCTION delete_expired_accounts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  uid uuid;
BEGIN
  -- Находим аккаунты помеченные на удаление более 30 дней назад
  FOR uid IN
    SELECT user_id FROM user_data
    WHERE deleted_at IS NOT NULL
      AND deleted_at < NOW() - INTERVAL '30 days'
  LOOP
    -- Удаляем все данные пользователя
    DELETE FROM eintraege WHERE user_id = uid;
    DELETE FROM kunden WHERE user_id = uid;
    DELETE FROM rechnungen WHERE user_id = uid;
    DELETE FROM wiederkehrend WHERE user_id = uid;
    DELETE FROM ust_mode WHERE user_id = uid;
    DELETE FROM user_data WHERE user_id = uid;
    -- Удаляем auth пользователя (требует service role key)
    PERFORM auth.admin_delete_user(uid);
  END LOOP;
END;
$$;
