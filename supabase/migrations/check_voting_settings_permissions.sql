-- voting_settingsテーブルの権限を確認
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
  AND table_name = 'voting_settings'
  AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;

-- 現在のvoting_settingsの内容を確認
SELECT * FROM voting_settings;

-- 必要に応じて権限を付与
-- GRANT SELECT, UPDATE ON voting_settings TO anon;
-- GRANT ALL PRIVILEGES ON voting_settings TO authenticated;