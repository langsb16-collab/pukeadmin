-- partners 테이블에 하부대리점 컬럼 추가
ALTER TABLE partners ADD COLUMN commission_rate REAL DEFAULT 0;
ALTER TABLE partners ADD COLUMN referral_code TEXT;

-- referral_code UNIQUE 인덱스 (NULL 허용)
CREATE UNIQUE INDEX IF NOT EXISTS idx_partners_referral_code ON partners(referral_code) WHERE referral_code IS NOT NULL AND referral_code != '';

-- game_users 테이블에 referral_code 컬럼 추가
ALTER TABLE game_users ADD COLUMN referral_code TEXT DEFAULT '';

-- settings에 game_fee_percent 추가
INSERT OR IGNORE INTO settings(key, value) VALUES ('game_fee_percent', '5');
