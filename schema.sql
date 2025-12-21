DROP TABLE IF EXISTS config;
CREATE TABLE config (
  key TEXT PRIMARY KEY,
  value TEXT
);
INSERT INTO config (key, value) VALUES ('auth_code', 'admin');
INSERT INTO config (key, value) VALUES ('categories', '[{"id":"home","title":"Home","items":[{"id":"1","title":"YouTube","url":"https://youtube.com","icon":"Youtube"},{"id":"2","title":"GitHub","url":"https://github.com","icon":"Github"}]}]');
INSERT INTO config (key, value) VALUES ('background', 'radial-gradient(circle at 50% -20%, #334155, #0f172a, #020617)');
INSERT INTO config (key, value) VALUES ('prefs', '{"cardOpacity":0.1,"themeColor":"#6366f1","themeMode":"dark"}');
