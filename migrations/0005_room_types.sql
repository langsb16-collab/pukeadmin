-- 0005: 게임방 유형 확장 (club / mtt / sng / omaha / short_deck)

-- 기존 type 컬럼: tournament|cash|private → club|mtt|sng|omaha|short_deck 추가 지원 (TEXT라 자동 호환)

-- 클럽 전용
ALTER TABLE game_rooms ADD COLUMN club_description TEXT DEFAULT '';
ALTER TABLE game_rooms ADD COLUMN club_members_limit INTEGER DEFAULT 50;

-- MTT 전용
ALTER TABLE game_rooms ADD COLUMN mtt_max_tables INTEGER DEFAULT 4;
ALTER TABLE game_rooms ADD COLUMN mtt_start_time TEXT DEFAULT '';
ALTER TABLE game_rooms ADD COLUMN mtt_rebuy_allowed INTEGER DEFAULT 0;

-- SNG 전용
ALTER TABLE game_rooms ADD COLUMN sng_start_players INTEGER DEFAULT 6;
ALTER TABLE game_rooms ADD COLUMN sng_prize_structure TEXT DEFAULT '50/30/20';

-- Omaha 전용
ALTER TABLE game_rooms ADD COLUMN omaha_variant TEXT DEFAULT 'PLO';   -- PLO|PLO8|5cardPLO

-- Short Deck 전용
ALTER TABLE game_rooms ADD COLUMN short_deck_ante INTEGER DEFAULT 100;
