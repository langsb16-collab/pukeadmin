-- 기존 테이블 수정: users 테이블에 필요한 칼럼 추가
-- 기존 users 테이블은 id TEXT이므로 새로 만들 수 없음 (호환 위해 ALTER 사용)
-- users 테이블이 이미 있으므로 chips, status 칼럼 추가
ALTER TABLE users ADD COLUMN chips INTEGER DEFAULT 10000;
ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active';
ALTER TABLE users ADD COLUMN password TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN current_card TEXT;

-- games 테이블은 구조 다름 - 새 테이블 추가
CREATE TABLE IF NOT EXISTS poker_games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT NOT NULL,
  pot INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active'
);

-- 회원입출금 테이블
CREATE TABLE IF NOT EXISTS user_finance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 업체(파트너) 테이블
CREATE TABLE IF NOT EXISTS partners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  balance INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 업체입출금 테이블
CREATE TABLE IF NOT EXISTS partner_finance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  partner_name TEXT NOT NULL,
  type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 봇 테이블
CREATE TABLE IF NOT EXISTS bots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  difficulty TEXT DEFAULT 'medium',
  style TEXT DEFAULT 'balanced',
  chips INTEGER DEFAULT 5000,
  status TEXT DEFAULT 'idle',
  assigned_room TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 게임이력 테이블
CREATE TABLE IF NOT EXISTS game_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT NOT NULL,
  winner TEXT NOT NULL,
  pot INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 공지사항 테이블
CREATE TABLE IF NOT EXISTS notices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 설정 테이블
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- 테스트 데이터 삽입
INSERT OR IGNORE INTO poker_games (table_name, pot, status) VALUES 
  ('VIP 테이블 1', 50000, 'active'),
  ('일반 테이블 A', 10000, 'active'),
  ('토너먼트 룸', 100000, 'active');

INSERT OR IGNORE INTO partners (name, balance, status) VALUES 
  ('강남 지점', 5000000, 'active'),
  ('부산 파트너', 3200000, 'active');

INSERT OR IGNORE INTO bots (name, difficulty, style, chips, status) VALUES 
  ('Bot-Alpha', 'hard', 'aggressive', 50000, 'idle'),
  ('Bot-Beta', 'medium', 'conservative', 30000, 'idle'),
  ('Bot-Gamma', 'easy', 'balanced', 20000, 'idle');

INSERT OR IGNORE INTO notices (title, content) VALUES 
  ('시스템 점검 안내', '2026-08-05 새벽 2시 ~ 4시 점검 예정'),
  ('신규 기능 업데이트', '봇 관리 기능이 추가되었습니다');

INSERT OR IGNORE INTO settings (key, value) VALUES 
  ('max_bet', '1000000'),
  ('min_bet', '1000'),
  ('rake_percent', '5'),
  ('max_players_per_table', '9');
