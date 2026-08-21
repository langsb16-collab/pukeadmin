PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE d1_migrations(
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		name       TEXT UNIQUE,
		applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(1,'0001_init_admin.sql','2026-03-25 01:53:13');
CREATE TABLE admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
, role TEXT DEFAULT 'admin', display_name TEXT DEFAULT '');
INSERT INTO "admins" ("id","username","password","created_at","role","display_name") VALUES(1,'admin','$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy','2026-03-25 01:53:13','superAdmin','최고 관리자');
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
, chips INTEGER DEFAULT 10000, status TEXT DEFAULT 'active', password TEXT DEFAULT '', current_card TEXT);
CREATE TABLE games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  score INTEGER NOT NULL,
  result TEXT NOT NULL,
  game_data TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE TABLE poker_games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT NOT NULL,
  pot INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active'
);
INSERT INTO "poker_games" ("id","table_name","pot","status") VALUES(1,'VIP 테이블 1',50000,'active');
INSERT INTO "poker_games" ("id","table_name","pot","status") VALUES(2,'일반 테이블 A',10000,'active');
INSERT INTO "poker_games" ("id","table_name","pot","status") VALUES(3,'토너먼트 룸',100000,'active');
CREATE TABLE user_finance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE partners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  balance INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
, commission_rate REAL DEFAULT 0, referral_code TEXT);
INSERT INTO "partners" ("id","name","balance","status","created_at","commission_rate","referral_code") VALUES(1,'강남 지점',5000000,'active','2026-08-02 00:30:55',0,NULL);
INSERT INTO "partners" ("id","name","balance","status","created_at","commission_rate","referral_code") VALUES(2,'부산 파트너',3200000,'active','2026-08-02 00:30:55',0,NULL);
INSERT INTO "partners" ("id","name","balance","status","created_at","commission_rate","referral_code") VALUES(3,'브론즈파트너C',800000,'active','2026-08-02 02:27:55',0,NULL);
CREATE TABLE partner_finance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  partner_name TEXT NOT NULL,
  type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "partner_finance" ("id","partner_name","type","amount","status","created_at") VALUES(1,'골드파트너A','deposit',1000000,'approved','2026-08-02 02:27:55');
INSERT INTO "partner_finance" ("id","partner_name","type","amount","status","created_at") VALUES(2,'실버파트너B','withdraw',500000,'approved','2026-08-02 02:27:55');
INSERT INTO "partner_finance" ("id","partner_name","type","amount","status","created_at") VALUES(3,'브론즈파트너C','deposit',300000,'pending','2026-08-02 02:27:55');
CREATE TABLE bots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  difficulty TEXT DEFAULT 'medium',
  style TEXT DEFAULT 'balanced',
  chips INTEGER DEFAULT 5000,
  status TEXT DEFAULT 'idle',
  assigned_room TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "bots" ("id","name","difficulty","style","chips","status","assigned_room","created_at") VALUES(1,'Bot-Alpha','hard','aggressive',50000,'idle',NULL,'2026-08-02 00:30:55');
INSERT INTO "bots" ("id","name","difficulty","style","chips","status","assigned_room","created_at") VALUES(2,'Bot-Beta','medium','conservative',30000,'idle',NULL,'2026-08-02 00:30:55');
INSERT INTO "bots" ("id","name","difficulty","style","chips","status","assigned_room","created_at") VALUES(3,'Bot-Gamma','easy','balanced',20000,'idle',NULL,'2026-08-02 00:30:55');
CREATE TABLE game_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT NOT NULL,
  winner TEXT NOT NULL,
  pot INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "game_history" ("id","table_name","winner","pot","created_at") VALUES(1,'VIP 토너먼트 A','김민준',850000,'2026-08-02 01:58:23');
INSERT INTO "game_history" ("id","table_name","winner","pot","created_at") VALUES(2,'캐쉬게임 일반석','이서연',320000,'2026-08-02 01:58:23');
INSERT INTO "game_history" ("id","table_name","winner","pot","created_at") VALUES(3,'프라이빗 하이롤러','박지훈',2100000,'2026-08-02 01:58:23');
CREATE TABLE notices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "notices" ("id","title","content","created_at") VALUES(1,'시스템 점검 안내','2026-08-05 새벽 2시 ~ 4시 점검 예정','2026-08-02 00:30:55');
INSERT INTO "notices" ("id","title","content","created_at") VALUES(2,'신규 기능 업데이트','봇 관리 기능이 추가되었습니다','2026-08-02 00:30:55');
INSERT INTO "notices" ("id","title","content","created_at") VALUES(3,'서비스 오픈 안내','전천기 포커에 오신 것을 환영합니다!','2026-08-02 00:47:15');
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
INSERT INTO "settings" ("key","value") VALUES('max_bet','1000000');
INSERT INTO "settings" ("key","value") VALUES('min_bet','1000');
INSERT INTO "settings" ("key","value") VALUES('rake_percent','5');
INSERT INTO "settings" ("key","value") VALUES('max_players_per_table','9');
INSERT INTO "settings" ("key","value") VALUES('gem_rate','100');
INSERT INTO "settings" ("key","value") VALUES('free_game_limit','3');
INSERT INTO "settings" ("key","value") VALUES('min_recharge','10000');
INSERT INTO "settings" ("key","value") VALUES('min_exchange','100000');
INSERT INTO "settings" ("key","value") VALUES('maintenance','false');
INSERT INTO "settings" ("key","value") VALUES('announcement_ko','');
INSERT INTO "settings" ("key","value") VALUES('announcement_en','');
INSERT INTO "settings" ("key","value") VALUES('announcement_zh','');
INSERT INTO "settings" ("key","value") VALUES('game_fee_percent','5');
CREATE TABLE game_users (
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
, referral_code TEXT DEFAULT '');
INSERT INTO "game_users" ("id","phone","password","nickname","gems","free_game_limit","free_game_used","status","kicked_at","created_at","referral_code") VALUES('u001','010-1234-5678','pw_hashed_1','킹카드',150000,10,3,'active',NULL,'2026-08-02 02:43:39','');
INSERT INTO "game_users" ("id","phone","password","nickname","gems","free_game_limit","free_game_used","status","kicked_at","created_at","referral_code") VALUES('u002','010-2345-6789','pw_hashed_2','이에이스',80000,10,1,'active',NULL,'2026-08-02 02:43:39','');
INSERT INTO "game_users" ("id","phone","password","nickname","gems","free_game_limit","free_game_used","status","kicked_at","created_at","referral_code") VALUES('u003','010-3456-7890','pw_hashed_3','박풀하우스',320000,10,5,'active',NULL,'2026-08-02 02:43:39','');
CREATE TABLE game_rooms (
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
INSERT INTO "game_rooms" ("id","name","type","buy_in_gems","min_entry_gems","max_players","blinds","visibility","password","created_by","status","created_at") VALUES('room-001','VIP 토너먼트 A','tournament',500000,500000,9,'500/1000','public','','system','open','2026-08-02 01:58:15');
INSERT INTO "game_rooms" ("id","name","type","buy_in_gems","min_entry_gems","max_players","blinds","visibility","password","created_by","status","created_at") VALUES('room-002','캐쉬게임 일반석','cash',100000,100000,6,'100/200','public','','system','open','2026-08-02 01:58:15');
INSERT INTO "game_rooms" ("id","name","type","buy_in_gems","min_entry_gems","max_players","blinds","visibility","password","created_by","status","created_at") VALUES('room-003','프라이빗 하이롤러','private',1000000,1000000,4,'1000/2000','private','vip2024','system','closed','2026-08-02 01:58:15');
CREATE TABLE recharge_requests (
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
INSERT INTO "recharge_requests" ("id","user_id","phone","nickname","amount","gems","payment_method","status","admin_memo","created_at","processed_at") VALUES(1,'user_001','010-1234-5678','홍길동',50000,50000,'계좌이체','approved','','2026-08-02 02:43:28','2026-08-02 02:44:05');
INSERT INTO "recharge_requests" ("id","user_id","phone","nickname","amount","gems","payment_method","status","admin_memo","created_at","processed_at") VALUES(2,'user_002','010-9876-5432','김철수',100000,100000,'카카오페이','approved','','2026-08-02 02:43:28','2026-08-02 02:44:07');
INSERT INTO "recharge_requests" ("id","user_id","phone","nickname","amount","gems","payment_method","status","admin_memo","created_at","processed_at") VALUES(3,'user_003','010-5555-1234','이영희',30000,30000,'계좌이체','approved','','2026-08-02 02:43:28','2026-08-02 02:44:10');
INSERT INTO "recharge_requests" ("id","user_id","phone","nickname","amount","gems","payment_method","status","admin_memo","created_at","processed_at") VALUES(4,'u001','010-1234-5678','킹카드',100000,100000,'wechat','rejected','','2026-08-02 02:43:39','2026-08-02 02:43:53');
INSERT INTO "recharge_requests" ("id","user_id","phone","nickname","amount","gems","payment_method","status","admin_memo","created_at","processed_at") VALUES(5,'u002','010-2345-6789','이에이스',50000,50000,'alipay','rejected','','2026-08-02 02:43:39','2026-08-02 02:44:01');
INSERT INTO "recharge_requests" ("id","user_id","phone","nickname","amount","gems","payment_method","status","admin_memo","created_at","processed_at") VALUES(6,'u003','010-3456-7890','박풀하우스',200000,200000,'wechat','approved','처리완료','2026-08-02 02:43:39',NULL);
INSERT INTO "recharge_requests" ("id","user_id","phone","nickname","amount","gems","payment_method","status","admin_memo","created_at","processed_at") VALUES(7,'user_test1','010-1111-2222','테스트유저A',50000,50000,'계좌이체','approved','','2026-08-02 02:45:06','2026-08-02 06:53:32');
INSERT INTO "recharge_requests" ("id","user_id","phone","nickname","amount","gems","payment_method","status","admin_memo","created_at","processed_at") VALUES(8,'user_test2','010-3333-4444','테스트유저B',100000,100000,'카카오페이','rejected','','2026-08-02 02:45:06','2026-08-02 06:53:37');
CREATE TABLE exchange_requests (
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
INSERT INTO "exchange_requests" ("id","user_id","phone","nickname","gems","amount","account_info","status","admin_memo","created_at","processed_at") VALUES(1,'user_001','010-1234-5678','홍길동',20000,20000,'국민은행 010-1234-5678 홍길동','pending','','2026-08-02 02:43:36',NULL);
INSERT INTO "exchange_requests" ("id","user_id","phone","nickname","gems","amount","account_info","status","admin_memo","created_at","processed_at") VALUES(2,'user_004','010-7777-8888','박민준',50000,50000,'신한은행 110-123-456789 박민준','pending','','2026-08-02 02:43:36',NULL);
INSERT INTO "exchange_requests" ("id","user_id","phone","nickname","gems","amount","account_info","status","admin_memo","created_at","processed_at") VALUES(3,'user_005','010-3333-4444','최지수',15000,15000,'카카오뱅크 3333-04-123456','pending','','2026-08-02 02:43:36',NULL);
INSERT INTO "exchange_requests" ("id","user_id","phone","nickname","gems","amount","account_info","status","admin_memo","created_at","processed_at") VALUES(4,'u002','010-2345-6789','이에이스',30000,30000,'국민은행 123-456-789 이에이스','pending','','2026-08-02 02:43:39',NULL);
INSERT INTO "exchange_requests" ("id","user_id","phone","nickname","gems","amount","account_info","status","admin_memo","created_at","processed_at") VALUES(5,'u003','010-3456-7890','박풀하우스',80000,80000,'신한은행 987-654-321 박씨','pending','','2026-08-02 02:43:39',NULL);
INSERT INTO "exchange_requests" ("id","user_id","phone","nickname","gems","amount","account_info","status","admin_memo","created_at","processed_at") VALUES(6,'u001','010-1234-5678','킹카드',20000,20000,'우리은행 111-222-333 김씨','rejected','본인확인 필요','2026-08-02 02:43:39',NULL);
CREATE TABLE audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_user TEXT,
  room_id INTEGER,
  before_data TEXT,
  after_data TEXT,
  reason TEXT,
  ip TEXT DEFAULT '',
  device TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE game_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  room_id TEXT,
  room_name TEXT,
  room_type TEXT DEFAULT 'cash',
  table_no INTEGER DEFAULT 1,
  seat_no INTEGER DEFAULT 1,
  play_status TEXT DEFAULT 'offline',
  hand_status TEXT DEFAULT 'idle',
  current_cards TEXT DEFAULT '',
  play_start TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "game_sessions" ("id","user_id","room_id","room_name","room_type","table_no","seat_no","play_status","hand_status","current_cards","play_start","updated_at") VALUES(1,'u001','1','VIP 토너먼트 A','tournament',1,3,'playing','betting','As|Kc','2026-08-02 02:23:52','2026-08-02 02:55:52');
INSERT INTO "game_sessions" ("id","user_id","room_id","room_name","room_type","table_no","seat_no","play_status","hand_status","current_cards","play_start","updated_at") VALUES(2,'u002','2','캐쉬게임 일반석','cash',2,5,'playing','waiting_turn','Qh|Jd','2026-08-02 02:40:52','2026-08-02 02:55:52');
INSERT INTO "game_sessions" ("id","user_id","room_id","room_name","room_type","table_no","seat_no","play_status","hand_status","current_cards","play_start","updated_at") VALUES(3,'u003',NULL,NULL,NULL,NULL,NULL,'offline','idle','',NULL,'2026-08-02 02:55:52');
DELETE FROM sqlite_sequence;
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('admins',1);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('d1_migrations',1);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('poker_games',3);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('partners',3);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('bots',3);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('notices',3);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('game_history',3);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('partner_finance',3);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('recharge_requests',8);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('exchange_requests',6);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('game_sessions',3);
CREATE INDEX idx_games_user_id ON games(user_id);
CREATE INDEX idx_games_created_at ON games(created_at);
CREATE INDEX idx_users_username ON users(username);
CREATE UNIQUE INDEX idx_partners_referral_code ON partners(referral_code) WHERE referral_code IS NOT NULL AND referral_code != '';
