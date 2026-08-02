-- ======================================================
-- 게임 사이트 회원 테이블 (phone 기반 로그인)
-- ======================================================
CREATE TABLE IF NOT EXISTS game_users (
  id          TEXT PRIMARY KEY,           -- uuid
  phone       TEXT UNIQUE NOT NULL,
  password    TEXT NOT NULL,
  nickname    TEXT NOT NULL,
  gems        INTEGER DEFAULT 0,
  free_game_limit   INTEGER DEFAULT 3,
  free_game_used    INTEGER DEFAULT 0,
  status      TEXT DEFAULT 'active',      -- active | kicked | banned
  kicked_at   DATETIME,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ======================================================
-- 게임방 테이블
-- ======================================================
CREATE TABLE IF NOT EXISTS game_rooms (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  type          TEXT DEFAULT 'tournament',  -- tournament|cash|private
  buy_in_gems   INTEGER DEFAULT 100000,
  min_entry_gems INTEGER DEFAULT 100000,
  max_players   INTEGER DEFAULT 9,
  blinds        TEXT DEFAULT '50/100',
  visibility    TEXT DEFAULT 'public',      -- public|private
  password      TEXT DEFAULT '',
  created_by    TEXT NOT NULL,
  status        TEXT DEFAULT 'open',
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ======================================================
-- 충전 요청 테이블
-- ======================================================
CREATE TABLE IF NOT EXISTS recharge_requests (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       TEXT NOT NULL,
  phone         TEXT NOT NULL,
  nickname      TEXT NOT NULL,
  amount        INTEGER NOT NULL,
  gems          INTEGER NOT NULL,
  payment_method TEXT DEFAULT 'wechat',
  status        TEXT DEFAULT 'pending',    -- pending|approved|rejected
  admin_memo    TEXT DEFAULT '',
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  processed_at  DATETIME
);

-- ======================================================
-- 환전 요청 테이블
-- ======================================================
CREATE TABLE IF NOT EXISTS exchange_requests (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       TEXT NOT NULL,
  phone         TEXT NOT NULL,
  nickname      TEXT NOT NULL,
  gems          INTEGER NOT NULL,
  amount        INTEGER NOT NULL,
  account_info  TEXT DEFAULT '',
  status        TEXT DEFAULT 'pending',    -- pending|approved|rejected
  admin_memo    TEXT DEFAULT '',
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  processed_at  DATETIME
);

-- ======================================================
-- 사이트 설정 (관리자가 제어)
-- ======================================================
INSERT OR IGNORE INTO settings (key, value) VALUES
  ('gem_rate',        '100'),
  ('free_game_limit', '3'),
  ('min_recharge',    '10000'),
  ('min_exchange',    '100000'),
  ('maintenance',     'false'),
  ('announcement_ko', ''),
  ('announcement_en', ''),
  ('announcement_zh', '');

-- ======================================================
-- 기본 공지사항
-- ======================================================
INSERT OR IGNORE INTO notices (title, content) VALUES
  ('서비스 오픈 안내', '전천기 포커에 오신 것을 환영합니다!');
