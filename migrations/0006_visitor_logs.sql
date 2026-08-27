-- 0006: 방문자 통계 테이블
CREATE TABLE IF NOT EXISTS visitor_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  visitor_id  TEXT NOT NULL,
  visit_date  TEXT NOT NULL,          -- 'YYYY-MM-DD' (Asia/Seoul 기준)
  device_type TEXT NOT NULL DEFAULT 'pc',  -- 'pc' | 'mobile' | 'tablet'
  referrer    TEXT DEFAULT '',
  source      TEXT DEFAULT 'direct',  -- 'direct'|'google'|'naver'|'daum'|'bing'|'facebook'|'instagram'|'youtube'|'other'
  page        TEXT DEFAULT '/',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_visitor_logs_date     ON visitor_logs(visit_date);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_visitor  ON visitor_logs(visitor_id, visit_date);
