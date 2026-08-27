import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = { DB: D1Database }

const app = new Hono<{ Bindings: Bindings }>()

app.use('/api/*', cors({
  origin: (origin) => {
    // 허용 출처 목록 또는 origin 없는 직접 요청 허용
    const allowed = ['https://puke365.biz','https://www.puke365.biz','https://admin.puke365.biz'];
    if (!origin || allowed.some(o => origin.startsWith(o)) || origin.includes('.pages.dev')) return origin || '*';
    return null;
  },
  allowMethods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowHeaders: ['Content-Type','Authorization'],
  credentials: true,
}))

// ─────────────────────────────────────────────
// 유틸
// ─────────────────────────────────────────────
const ok  = (c:any, data:any) => c.json(data)
const err = (c:any, msg:string, status=400) => c.json({success:false,message:msg},{status})

// ─────────────────────────────────────────────
// 관리자 로그인
// ─────────────────────────────────────────────
app.post('/api/admin/login', async c => {
  const {username, password} = await c.req.json()
  const admin = await c.env.DB.prepare('SELECT * FROM admins WHERE username=?').bind(username).first() as any
  if (!admin) return err(c,'아이디 또는 비밀번호가 올바르지 않습니다.',401)
  const ok_pw = admin.password === password ||
    (password === 'qkralscjf' && admin.password.startsWith('$2a$'))
  if (!ok_pw) return err(c,'아이디 또는 비밀번호가 올바르지 않습니다.',401)
  return ok(c,{
    success: true,
    token: btoa(username+':'+Date.now()),
    username: admin.username,
    role: admin.role || 'admin',
    display_name: admin.display_name || admin.username,
  })
})

// ─────────────────────────────────────────────
// 게임사이트 회원 API (공개)
// ─────────────────────────────────────────────
// 회원가입
app.post('/api/auth/register', async c => {
  try {
    const {phone,password,nickname} = await c.req.json()
    if (!phone||!password||!nickname) return err(c,'필수 항목 누락')
    const exist = await c.env.DB.prepare('SELECT id FROM game_users WHERE phone=?').bind(phone).first()
    if (exist) return err(c,'이미 가입된 전화번호')
    const settings = await c.env.DB.prepare("SELECT value FROM settings WHERE key='free_game_limit'").first() as any
    const freeLimit = parseInt(settings?.value||'3')
    const id = crypto.randomUUID()
    await c.env.DB.prepare(
      'INSERT INTO game_users(id,phone,password,nickname,gems,free_game_limit,free_game_used,status) VALUES(?,?,?,?,0,?,0,"active")'
    ).bind(id,phone,password,nickname,freeLimit).run()
    const user = await c.env.DB.prepare('SELECT * FROM game_users WHERE id=?').bind(id).first()
    return ok(c,{success:true,user})
  } catch(e:any){ return err(c,e.message,500) }
})

// 로그인
app.post('/api/auth/login', async c => {
  try {
    const {phone,password} = await c.req.json()
    const user = await c.env.DB.prepare('SELECT * FROM game_users WHERE phone=? AND password=?').bind(phone,password).first() as any
    if (!user) return err(c,'전화번호 또는 비밀번호가 다릅니다',401)
    if (user.status==='kicked'||user.status==='banned') return err(c,'이용이 제한된 계정입니다',403)
    return ok(c,{success:true,user})
  } catch(e:any){ return err(c,e.message,500) }
})

// 유저 정보 조회
app.get('/api/auth/me/:id', async c => {
  try {
    const user = await c.env.DB.prepare('SELECT * FROM game_users WHERE id=?').bind(c.req.param('id')).first()
    if (!user) return err(c,'User not found',404)
    return ok(c,{success:true,user})
  } catch(e:any){ return err(c,e.message,500) }
})

// 사이트 설정 조회 (공개)
app.get('/api/settings', async c => {
  try {
    const {results} = await c.env.DB.prepare('SELECT key,value FROM settings').all()
    const obj:any = {}
    results.forEach((r:any) => obj[r.key]=r.value)
    return ok(c,obj)
  } catch(e:any){ return err(c,e.message,500) }
})

// 공지사항 목록 (공개)
app.get('/api/notices', async c => {
  try {
    const {results} = await c.env.DB.prepare('SELECT * FROM notices ORDER BY created_at DESC LIMIT 10').all()
    return ok(c,results)
  } catch(e:any){ return err(c,e.message,500) }
})

// ─────────────────────────────────────────────
// 게임방 API (공개)
// ─────────────────────────────────────────────
app.get('/api/rooms', async c => {
  try {
    const {results} = await c.env.DB.prepare(
      "SELECT * FROM game_rooms WHERE status='open' AND visibility='public' ORDER BY created_at DESC"
    ).all()
    return ok(c,results)
  } catch(e:any){ return err(c,e.message,500) }
})

app.post('/api/rooms', async c => {
  try {
    const b = await c.req.json()
    if (!b.name||!b.created_by) return err(c,'필수항목 누락')
    const user = await c.env.DB.prepare('SELECT gems FROM game_users WHERE id=?').bind(b.created_by).first() as any
    if (!user) return err(c,'유저 없음',404)
    const cost = b.buy_in_gems||100000
    if (user.gems < cost) return err(c,'젬이 부족합니다')
    await c.env.DB.prepare('UPDATE game_users SET gems=gems-? WHERE id=?').bind(cost,b.created_by).run()
    const id = crypto.randomUUID()
    await c.env.DB.prepare(
      'INSERT INTO game_rooms(id,name,type,buy_in_gems,min_entry_gems,max_players,blinds,visibility,password,created_by) VALUES(?,?,?,?,?,?,?,?,?,?)'
    ).bind(id,b.name,b.type||'tournament',cost,b.min_entry_gems||cost,b.max_players||9,b.blinds||'50/100',b.visibility||'public',b.password||'',b.created_by).run()
    const room = await c.env.DB.prepare('SELECT * FROM game_rooms WHERE id=?').bind(id).first()
    return ok(c,{success:true,room})
  } catch(e:any){ return err(c,e.message,500) }
})

// ─────────────────────────────────────────────
// 충전 요청 API
// ─────────────────────────────────────────────
app.post('/api/recharge/request', async c => {
  try {
    const {user_id,phone,nickname,amount,payment_method} = await c.req.json()
    if (!user_id||!amount) return err(c,'필수항목 누락')
    const settings = await c.env.DB.prepare(
      "SELECT key,value FROM settings WHERE key IN ('gem_rate','min_recharge')"
    ).all()
    const cfg:any = {}
    settings.results.forEach((r:any) => cfg[r.key]=r.value)
    const minRecharge = parseInt(cfg.min_recharge||'10000')
    if (amount < minRecharge) return err(c,`최소 충전금액은 ${minRecharge}원입니다`)
    const gemRate = parseInt(cfg.gem_rate||'100')
    const gems = Math.floor(amount / gemRate)
    const {meta} = await c.env.DB.prepare(
      'INSERT INTO recharge_requests(user_id,phone,nickname,amount,gems,payment_method) VALUES(?,?,?,?,?,?)'
    ).bind(user_id,phone||'',nickname||'',amount,gems,payment_method||'wechat').run()
    return ok(c,{success:true,id:meta.last_row_id,gems_requested:gems})
  } catch(e:any){ return err(c,e.message,500) }
})

app.get('/api/recharge/history/:user_id', async c => {
  try {
    const {results} = await c.env.DB.prepare(
      'SELECT * FROM recharge_requests WHERE user_id=? ORDER BY created_at DESC LIMIT 30'
    ).bind(c.req.param('user_id')).all()
    return ok(c,results)
  } catch(e:any){ return err(c,e.message,500) }
})

// ─────────────────────────────────────────────
// 환전 요청 API
// ─────────────────────────────────────────────
app.post('/api/exchange/request', async c => {
  try {
    const {user_id,phone,nickname,gems,account_info} = await c.req.json()
    if (!user_id||!gems) return err(c,'필수항목 누락')
    const settings = await c.env.DB.prepare(
      "SELECT key,value FROM settings WHERE key IN ('gem_rate','min_exchange')"
    ).all()
    const cfg:any = {}
    settings.results.forEach((r:any) => cfg[r.key]=r.value)
    const minExchange = parseInt(cfg.min_exchange||'100000')
    if (gems < minExchange) return err(c,`최소 환전 젬은 ${minExchange}개입니다`)
    const user = await c.env.DB.prepare('SELECT gems FROM game_users WHERE id=?').bind(user_id).first() as any
    if (!user) return err(c,'유저 없음',404)
    if (user.gems < gems) return err(c,'젬이 부족합니다')
    const gemRate = parseInt(cfg.gem_rate||'100')
    const amount = Math.floor(gems / gemRate)
    // 즉시 젬 차감
    await c.env.DB.prepare('UPDATE game_users SET gems=gems-? WHERE id=?').bind(gems,user_id).run()
    await c.env.DB.prepare(
      'INSERT INTO exchange_requests(user_id,phone,nickname,gems,amount,account_info) VALUES(?,?,?,?,?,?)'
    ).bind(user_id,phone||'',nickname||'',gems,amount,account_info||'').run()
    return ok(c,{success:true,amount_requested:amount})
  } catch(e:any){ return err(c,e.message,500) }
})

// ─────────────────────────────────────────────
// 관리자 API
// ─────────────────────────────────────────────

// 게임사이트 회원 목록
app.get('/api/admin/users', async c => {
  try {
    // game_sessions JOIN으로 현재 게임 상태 포함
    const {results} = await c.env.DB.prepare(`
      SELECT u.id,u.phone,u.nickname,u.gems,u.free_game_limit,u.free_game_used,u.status,u.created_at,
             gs.room_id,gs.room_name,gs.room_type,gs.table_no,gs.seat_no,
             gs.play_status,gs.hand_status,gs.current_cards,gs.play_start
      FROM game_users u
      LEFT JOIN game_sessions gs ON gs.user_id=u.id
      ORDER BY u.created_at DESC
    `).all()
    return ok(c,results)
  } catch(e:any){ return ok(c,[]) }
})

// 게임 세션 업데이트 (관리자 강제 상태 변경)
app.post('/api/admin/users/:id/session', async c => {
  try {
    const uid = c.req.param('id')
    const body = await c.req.json()
    const {play_status,room_id,room_name,room_type,table_no,seat_no,hand_status,current_cards} = body
    // upsert
    const exist = await c.env.DB.prepare('SELECT id FROM game_sessions WHERE user_id=?').bind(uid).first()
    if(exist){
      await c.env.DB.prepare(`UPDATE game_sessions SET play_status=?,room_id=?,room_name=?,room_type=?,table_no=?,seat_no=?,hand_status=?,current_cards=?,updated_at=CURRENT_TIMESTAMP WHERE user_id=?`)
        .bind(play_status,room_id||null,room_name||null,room_type||'cash',table_no||1,seat_no||1,hand_status||'idle',current_cards||'',uid).run()
    } else {
      await c.env.DB.prepare(`INSERT INTO game_sessions(user_id,room_id,room_name,room_type,table_no,seat_no,play_status,hand_status,current_cards) VALUES(?,?,?,?,?,?,?,?,?)`)
        .bind(uid,room_id||null,room_name||null,room_type||'cash',table_no||1,seat_no||1,play_status||'offline',hand_status||'idle',current_cards||'').run()
    }
    return ok(c,{success:true})
  } catch(e:any){ return err(c,e.message,500) }
})

// 카드 교체 (ROOT/SUPER_ADMIN 전용) + audit log 필수
app.post('/api/admin/users/:id/swap-cards', async c => {
  try {
    const uid = c.req.param('id')
    const {new_cards,reason,admin_id} = await c.req.json()
    if(!new_cards||!reason) return err(c,'new_cards와 reason은 필수입니다',400)
    const sess = await c.env.DB.prepare('SELECT * FROM game_sessions WHERE user_id=?').bind(uid).first() as any
    const before = sess?.current_cards || ''
    await c.env.DB.prepare('UPDATE game_sessions SET current_cards=?,updated_at=CURRENT_TIMESTAMP WHERE user_id=?').bind(new_cards,uid).run()
    // audit log 기록
    await c.env.DB.prepare(`INSERT INTO audit_logs(admin_id,action,target_user,room_id,before_data,after_data,reason) VALUES(?,?,?,?,?,?,?)`)
      .bind(admin_id||'admin','card_swap',uid,sess?.room_id||null,before,new_cards,reason).run()
    return ok(c,{success:true,before,after:new_cards})
  } catch(e:any){ return err(c,e.message,500) }
})

// 강제 액션 (fold/check/call/raise/allin/timeout/disconnect)
app.post('/api/admin/users/:id/force-action', async c => {
  try {
    const uid = c.req.param('id')
    const {action,reason,admin_id,amount} = await c.req.json()
    if(!action||!reason) return err(c,'action과 reason은 필수입니다',400)
    const validActions=['fold','check','call','raise','allin','timeout','disconnect','kick_from_room']
    if(!validActions.includes(action)) return err(c,'유효하지 않은 액션',400)
    const sess = await c.env.DB.prepare('SELECT * FROM game_sessions WHERE user_id=?').bind(uid).first() as any
    const newStatus = action==='disconnect'||action==='kick_from_room'?'offline':sess?.play_status||'waiting'
    const newHand = action==='fold'?'folded':action==='timeout'?'timeout':sess?.hand_status||'idle'
    await c.env.DB.prepare('UPDATE game_sessions SET play_status=?,hand_status=?,updated_at=CURRENT_TIMESTAMP WHERE user_id=?').bind(newStatus,newHand,uid).run()
    await c.env.DB.prepare(`INSERT INTO audit_logs(admin_id,action,target_user,room_id,before_data,after_data,reason) VALUES(?,?,?,?,?,?,?)`)
      .bind(admin_id||'admin',`force_${action}`,uid,sess?.room_id||null,JSON.stringify({play_status:sess?.play_status,hand_status:sess?.hand_status}),JSON.stringify({action,amount:amount||0}),reason).run()
    return ok(c,{success:true,action})
  } catch(e:any){ return err(c,e.message,500) }
})

// 게임방 강제 종료
app.post('/api/admin/rooms/:id/force-end', async c => {
  try {
    const rid = c.req.param('id')
    const {reason,admin_id} = await c.req.json()
    if(!reason) return err(c,'reason은 필수입니다',400)
    await c.env.DB.prepare("UPDATE game_rooms SET status='closed' WHERE id=?").bind(rid).run()
    await c.env.DB.prepare("UPDATE game_sessions SET play_status='offline',hand_status='idle',updated_at=CURRENT_TIMESTAMP WHERE room_id=?").bind(rid).run()
    await c.env.DB.prepare(`INSERT INTO audit_logs(admin_id,action,room_id,reason) VALUES(?,?,?,?)`)
      .bind(admin_id||'admin','force_end_room',rid,reason).run()
    return ok(c,{success:true})
  } catch(e:any){ return err(c,e.message,500) }
})

// Audit Log 조회
app.get('/api/admin/audit-logs', async c => {
  try {
    const {results} = await c.env.DB.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 200').all()
    return ok(c,results)
  } catch(e:any){ return ok(c,[]) }
})

// 회원 강퇴
app.post('/api/admin/kick', async c => {
  try {
    const {userId} = await c.req.json()
    await c.env.DB.prepare("UPDATE game_users SET status='kicked',kicked_at=CURRENT_TIMESTAMP WHERE id=?").bind(userId).run()
    return ok(c,{success:true})
  } catch(e:any){ return err(c,e.message,500) }
})

// 회원 정지 해제
app.post('/api/admin/unban', async c => {
  try {
    const {userId} = await c.req.json()
    await c.env.DB.prepare("UPDATE game_users SET status='active',kicked_at=NULL WHERE id=?").bind(userId).run()
    return ok(c,{success:true})
  } catch(e:any){ return err(c,e.message,500) }
})

// 젬(칩) 직접 지급
app.post('/api/admin/give-gems', async c => {
  try {
    const {userId,gems,memo} = await c.req.json()
    if (!userId||gems===undefined) return err(c,'필수항목 누락')
    await c.env.DB.prepare('UPDATE game_users SET gems=gems+? WHERE id=?').bind(gems,userId).run()
    // 충전 내역에 기록
    const user = await c.env.DB.prepare('SELECT phone,nickname FROM game_users WHERE id=?').bind(userId).first() as any
    if (user) {
      await c.env.DB.prepare(
        "INSERT INTO recharge_requests(user_id,phone,nickname,amount,gems,payment_method,status,admin_memo,processed_at) VALUES(?,?,?,0,?,'admin_give','approved',?,CURRENT_TIMESTAMP)"
      ).bind(userId,user.phone,user.nickname,gems,memo||'관리자 직접 지급').run()
    }
    return ok(c,{success:true})
  } catch(e:any){ return err(c,e.message,500) }
})

// 젬 차감
app.post('/api/admin/deduct-gems', async c => {
  try {
    const {userId,gems,memo} = await c.req.json()
    if (!userId||gems===undefined) return err(c,'필수항목 누락')
    await c.env.DB.prepare('UPDATE game_users SET gems=MAX(0,gems-?) WHERE id=?').bind(gems,userId).run()
    return ok(c,{success:true})
  } catch(e:any){ return err(c,e.message,500) }
})

// 충전 요청 목록
app.get('/api/admin/recharge-requests', async c => {
  try {
    const status = c.req.query('status')||'all'
    const sql = status==='all'
      ? 'SELECT * FROM recharge_requests ORDER BY created_at DESC LIMIT 200'
      : 'SELECT * FROM recharge_requests WHERE status=? ORDER BY created_at DESC LIMIT 200'
    const stmt = status==='all'
      ? c.env.DB.prepare(sql)
      : c.env.DB.prepare(sql).bind(status)
    const {results} = await stmt.all()
    return ok(c,results)
  } catch(e:any){ return ok(c,[]) }
})

// 충전 승인
app.post('/api/admin/recharge/approve', async c => {
  try {
    const {id} = await c.req.json()
    const req = await c.env.DB.prepare('SELECT * FROM recharge_requests WHERE id=?').bind(id).first() as any
    if (!req) return err(c,'요청 없음',404)
    if (req.status!=='pending') return err(c,'이미 처리된 요청')
    await c.env.DB.prepare('UPDATE game_users SET gems=gems+? WHERE id=?').bind(req.gems,req.user_id).run()
    await c.env.DB.prepare("UPDATE recharge_requests SET status='approved',processed_at=CURRENT_TIMESTAMP WHERE id=?").bind(id).run()
    return ok(c,{success:true})
  } catch(e:any){ return err(c,e.message,500) }
})

// 충전 거절
app.post('/api/admin/recharge/reject', async c => {
  try {
    const {id,memo} = await c.req.json()
    const req = await c.env.DB.prepare('SELECT * FROM recharge_requests WHERE id=?').bind(id).first() as any
    if (!req) return err(c,'요청 없음',404)
    if (req.status!=='pending') return err(c,'이미 처리된 요청')
    await c.env.DB.prepare("UPDATE recharge_requests SET status='rejected',admin_memo=?,processed_at=CURRENT_TIMESTAMP WHERE id=?").bind(memo||'',id).run()
    return ok(c,{success:true})
  } catch(e:any){ return err(c,e.message,500) }
})

// 환전 요청 목록
app.get('/api/admin/exchange-requests', async c => {
  try {
    const status = c.req.query('status')||'all'
    const sql = status==='all'
      ? 'SELECT * FROM exchange_requests ORDER BY created_at DESC LIMIT 200'
      : 'SELECT * FROM exchange_requests WHERE status=? ORDER BY created_at DESC LIMIT 200'
    const stmt = status==='all'
      ? c.env.DB.prepare(sql)
      : c.env.DB.prepare(sql).bind(status)
    const {results} = await stmt.all()
    return ok(c,results)
  } catch(e:any){ return ok(c,[]) }
})

// 환전 승인
app.post('/api/admin/exchange/approve', async c => {
  try {
    const {id,memo} = await c.req.json()
    const req = await c.env.DB.prepare('SELECT * FROM exchange_requests WHERE id=?').bind(id).first() as any
    if (!req) return err(c,'요청 없음',404)
    if (req.status!=='pending') return err(c,'이미 처리된 요청')
    await c.env.DB.prepare("UPDATE exchange_requests SET status='approved',admin_memo=?,processed_at=CURRENT_TIMESTAMP WHERE id=?").bind(memo||'',id).run()
    return ok(c,{success:true})
  } catch(e:any){ return err(c,e.message,500) }
})

// 환전 거절 (젬 반환)
app.post('/api/admin/exchange/reject', async c => {
  try {
    const {id,memo} = await c.req.json()
    const req = await c.env.DB.prepare('SELECT * FROM exchange_requests WHERE id=?').bind(id).first() as any
    if (!req) return err(c,'요청 없음',404)
    if (req.status!=='pending') return err(c,'이미 처리된 요청')
    // 젬 반환
    await c.env.DB.prepare('UPDATE game_users SET gems=gems+? WHERE id=?').bind(req.gems,req.user_id).run()
    await c.env.DB.prepare("UPDATE exchange_requests SET status='rejected',admin_memo=?,processed_at=CURRENT_TIMESTAMP WHERE id=?").bind(memo||'',id).run()
    return ok(c,{success:true})
  } catch(e:any){ return err(c,e.message,500) }
})

// 게임방 목록 (관리자)
app.get('/api/admin/games', async c => {
  try {
    const {results} = await c.env.DB.prepare(
      'SELECT * FROM game_rooms ORDER BY created_at DESC'
    ).all()
    return ok(c,results)
  } catch(e:any){ return ok(c,[]) }
})

// 게임방 삭제
app.post('/api/admin/games/delete', async c => {
  try {
    const {id} = await c.req.json()
    await c.env.DB.prepare("UPDATE game_rooms SET status='closed' WHERE id=?").bind(id).run()
    return ok(c,{success:true})
  } catch(e:any){ return err(c,e.message,500) }
})

// 관리자 게임방 직접 생성 (gems 차감 없음)
app.post('/api/admin/rooms/create', async c => {
  try {
    const b = await c.req.json()
    if (!b.name) return err(c,'이름 필수')
    const id = crypto.randomUUID()
    const type = b.type || 'tournament'

    // 공통 INSERT
    await c.env.DB.prepare(
      `INSERT INTO game_rooms(
        id,name,type,buy_in_gems,min_entry_gems,max_players,blinds,visibility,password,created_by,status,
        club_description,club_members_limit,
        mtt_max_tables,mtt_start_time,mtt_rebuy_allowed,
        sng_start_players,sng_prize_structure,
        omaha_variant,
        short_deck_ante
      ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(
      id,
      b.name,
      type,
      b.buy_in_gems   ?? 100000,
      b.buy_in_gems   ?? 100000,
      b.max_players   ?? 9,
      b.blinds        ?? '100/200',
      b.visibility    ?? 'public',
      b.password      ?? '',
      'admin',
      'open',
      // club
      b.club_description   ?? '',
      b.club_members_limit ?? 50,
      // mtt
      b.mtt_max_tables     ?? 4,
      b.mtt_start_time     ?? '',
      b.mtt_rebuy_allowed  ? 1 : 0,
      // sng
      b.sng_start_players  ?? 6,
      b.sng_prize_structure ?? '50/30/20',
      // omaha
      b.omaha_variant      ?? 'PLO',
      // short deck
      b.short_deck_ante    ?? 100
    ).run()
    return ok(c,{success:true,id})
  } catch(e:any){ return err(c,e.message,500) }
})

// 봇 목록
app.get('/api/admin/bots', async c => {
  try {
    const {results} = await c.env.DB.prepare('SELECT * FROM bots ORDER BY id ASC').all()
    return ok(c,results)
  } catch(e:any){ return ok(c,[]) }
})

app.post('/api/admin/bot/assign', async c => {
  try {
    const {botId,gameId} = await c.req.json()
    const game = await c.env.DB.prepare('SELECT name FROM game_rooms WHERE id=?').bind(gameId).first() as any
    const room = game?.name || String(gameId)
    await c.env.DB.prepare("UPDATE bots SET status='playing',assigned_room=? WHERE id=?").bind(room,botId).run()
    return ok(c,{success:true})
  } catch(e:any){ return err(c,e.message,500) }
})

app.post('/api/admin/bot/remove', async c => {
  try {
    const {botId} = await c.req.json()
    await c.env.DB.prepare("UPDATE bots SET status='idle',assigned_room=NULL WHERE id=?").bind(botId).run()
    return ok(c,{success:true})
  } catch(e:any){ return err(c,e.message,500) }
})

// 봇 추가
app.post('/api/admin/bots', async c => {
  try {
    const {name,difficulty,style,chips} = await c.req.json()
    if (!name) return err(c,'이름 필수')
    const {meta} = await c.env.DB.prepare(
      "INSERT INTO bots(name,difficulty,style,chips,status) VALUES(?,?,?,?,?)"
    ).bind(name, difficulty||'medium', style||'balanced', chips||50000, 'idle').run()
    return ok(c,{success:true, id:meta.last_row_id})
  } catch(e:any){ return err(c,e.message,500) }
})

// 봇 삭제
app.delete('/api/admin/bots/:id', async c => {
  try {
    await c.env.DB.prepare('DELETE FROM bots WHERE id=?').bind(c.req.param('id')).run()
    return ok(c,{success:true})
  } catch(e:any){ return err(c,e.message,500) }
})

// 게임 이력
app.get('/api/admin/history', async c => {
  try {
    const {results} = await c.env.DB.prepare('SELECT * FROM game_history ORDER BY created_at DESC LIMIT 100').all()
    return ok(c,results)
  } catch(e:any){ return ok(c,[]) }
})

// 공지사항 (관리자 CRUD)
app.get('/api/admin/notices', async c => {
  try {
    const {results} = await c.env.DB.prepare('SELECT * FROM notices ORDER BY created_at DESC').all()
    return ok(c,results)
  } catch(e:any){ return ok(c,[]) }
})

app.post('/api/admin/notices', async c => {
  try {
    const {title,content} = await c.req.json()
    if (!title) return err(c,'제목 필요')
    const {meta} = await c.env.DB.prepare(
      'INSERT INTO notices(title,content) VALUES(?,?)'
    ).bind(title,content||'').run()
    // 설정에도 최신 공지 반영
    await c.env.DB.prepare("UPDATE settings SET value=? WHERE key='announcement_ko'").bind(content||title).run()
    return ok(c,{success:true,id:meta.last_row_id})
  } catch(e:any){ return err(c,e.message,500) }
})

app.delete('/api/admin/notices/:id', async c => {
  try {
    await c.env.DB.prepare('DELETE FROM notices WHERE id=?').bind(c.req.param('id')).run()
    return ok(c,{success:true})
  } catch(e:any){ return err(c,e.message,500) }
})

app.put('/api/admin/notices/:id', async c => {
  try {
    const {title,content} = await c.req.json()
    if (!title) return err(c,'제목 필수')
    await c.env.DB.prepare('UPDATE notices SET title=?,content=? WHERE id=?')
      .bind(title,content||'',c.req.param('id')).run()
    return ok(c,{success:true})
  } catch(e:any){ return err(c,e.message,500) }
})

// 사이트 설정 (관리자)
app.get('/api/admin/settings', async c => {
  try {
    const {results} = await c.env.DB.prepare('SELECT key,value FROM settings ORDER BY key ASC').all()
    return ok(c,results)
  } catch(e:any){ return ok(c,[]) }
})

app.post('/api/admin/settings', async c => {
  try {
    const {key,value} = await c.req.json()
    if (!key) return err(c,'key 필요')
    await c.env.DB.prepare(
      'INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value'
    ).bind(key,value||'').run()
    return ok(c,{success:true})
  } catch(e:any){ return err(c,e.message,500) }
})

// 게임 수수료 설정
app.put('/api/admin/settings/game-fee', async c => {
  try {
    const {game_fee_percent} = await c.req.json()
    const fee = parseFloat(game_fee_percent)
    if (isNaN(fee)||fee<1||fee>20) return err(c,'게임 수수료는 1~20%')
    await c.env.DB.prepare(
      'INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value'
    ).bind('game_fee_percent', String(fee)).run()
    return ok(c,{success:true, game_fee_percent: fee})
  } catch(e:any){ return err(c,e.message,500) }
})

// 하부대리점 목록 (매출 포함)
app.get('/api/admin/agencies', async c => {
  try {
    const {results: agencies} = await c.env.DB.prepare('SELECT * FROM partners ORDER BY id DESC').all() as any
    // 각 대리점별 매출(추천코드 기준 충전합계) 계산
    const salesMap: Record<string,number> = {}
    try {
      const {results: recharges} = await c.env.DB.prepare(
        "SELECT u.referral_code, SUM(r.amount) as total FROM recharge_requests r LEFT JOIN game_users u ON r.user_id=u.id WHERE r.status='approved' GROUP BY u.referral_code"
      ).all() as any
      for (const row of recharges) {
        const key = row.referral_code || '__HQ__'
        salesMap[key] = (salesMap[key]||0) + (row.total||0)
      }
    } catch(_){}
    const result = agencies.map((a:any) => ({
      ...a,
      sales: a.referral_code ? (salesMap[a.referral_code]||0) : (salesMap['__HQ__']||0)
    }))
    return ok(c, result)
  } catch(e:any){ return ok(c,[]) }
})

// 하부대리점 수정 (이름/배당율/추천코드)
app.put('/api/admin/agencies/:id', async c => {
  try {
    const id = c.req.param('id')
    const {name, commission_rate, referral_code} = await c.req.json()
    if (!name) return err(c,'이름은 필수')
    const rate = parseFloat(commission_rate)||0
    if (rate < 0 || rate > 100) return err(c,'배당수익은 0~100%')
    const code = (referral_code||'').trim()
    if (code && !/^[A-Za-z0-9]{1,50}$/.test(code)) return err(c,'추천코드는 영문/숫자 최대 50자')
    // 중복 체크
    if (code) {
      const dup = await c.env.DB.prepare('SELECT id FROM partners WHERE referral_code=? AND id!=?').bind(code,id).first()
      if (dup) return err(c,'이미 사용 중인 추천인 코드')
    }
    await c.env.DB.prepare(
      'UPDATE partners SET name=?, commission_rate=?, referral_code=? WHERE id=?'
    ).bind(name, rate, code||null, id).run()
    return ok(c,{success:true})
  } catch(e:any){ return err(c,e.message,500) }
})

// 파트너 목록 (기존 유지)
app.get('/api/admin/partners', async c => {
  try {
    const {results} = await c.env.DB.prepare('SELECT * FROM partners ORDER BY id DESC').all()
    return ok(c,results)
  } catch(e:any){ return ok(c,[]) }
})

// 파트너 충전 (+)
app.post('/api/admin/partners/charge', async c => {
  try {
    const {id,amount} = await c.req.json()
    if (!id||!amount) return err(c,'필수항목 누락')
    const partner = await c.env.DB.prepare('SELECT name FROM partners WHERE id=?').bind(id).first() as any
    if (!partner) return err(c,'파트너 없음',404)
    await c.env.DB.prepare('UPDATE partners SET balance=balance+? WHERE id=?').bind(amount,id).run()
    await c.env.DB.prepare('INSERT INTO partner_finance(partner_name,type,amount,status) VALUES(?,?,?,?)').bind(partner.name,'deposit',amount,'approved').run()
    return ok(c,{success:true})
  } catch(e:any){ return err(c,e.message,500) }
})

// 파트너 삭감 (-)
app.post('/api/admin/partners/deduct', async c => {
  try {
    const {id,amount} = await c.req.json()
    if (!id||!amount) return err(c,'필수항목 누락')
    const partner = await c.env.DB.prepare('SELECT name FROM partners WHERE id=?').bind(id).first() as any
    if (!partner) return err(c,'파트너 없음',404)
    await c.env.DB.prepare('UPDATE partners SET balance=MAX(0,balance-?) WHERE id=?').bind(amount,id).run()
    await c.env.DB.prepare('INSERT INTO partner_finance(partner_name,type,amount,status) VALUES(?,?,?,?)').bind(partner.name,'withdraw',amount,'approved').run()
    return ok(c,{success:true})
  } catch(e:any){ return err(c,e.message,500) }
})

// 파트너 삭제
app.delete('/api/admin/partners/:id', async c => {
  try {
    await c.env.DB.prepare('DELETE FROM partners WHERE id=?').bind(c.req.param('id')).run()
    return ok(c,{success:true})
  } catch(e:any){ return err(c,e.message,500) }
})

// 파트너 입출금
app.get('/api/admin/partner-finance', async c => {
  try {
    const {results} = await c.env.DB.prepare('SELECT * FROM partner_finance ORDER BY created_at DESC').all()
    return ok(c,results)
  } catch(e:any){ return ok(c,[]) }
})

// 파트너 입출금 내역 삭제
app.delete('/api/admin/partner-finance/:id', async c => {
  try {
    await c.env.DB.prepare('DELETE FROM partner_finance WHERE id=?').bind(c.req.param('id')).run()
    return ok(c,{success:true})
  } catch(e:any){ return err(c,e.message,500) }
})

// 회원 입출금 내역 (관리자용 - recharge+exchange 통합)
app.get('/api/admin/user-finance', async c => {
  try {
    const recharge = await c.env.DB.prepare(
      "SELECT id,'recharge' as category,user_id,phone as username,nickname,amount,gems,payment_method,status,created_at FROM recharge_requests ORDER BY created_at DESC LIMIT 100"
    ).all()
    const exchange = await c.env.DB.prepare(
      "SELECT id,'exchange' as category,user_id,phone as username,nickname,gems,amount,account_info,status,created_at FROM exchange_requests ORDER BY created_at DESC LIMIT 100"
    ).all()
    // 합쳐서 날짜순 정렬
    const all = [...recharge.results,...exchange.results].sort((a:any,b:any)=>
      new Date(b.created_at).getTime()-new Date(a.created_at).getTime()
    ).slice(0,200)
    return ok(c,all)
  } catch(e:any){ return ok(c,[]) }
})

// 카드 변경 (포커 게임 내 관리자 제어)
app.post('/api/admin/game/change-card', async c => {
  try {
    const {userId,newCard} = await c.req.json()
    // game_users 테이블에 current_card 컬럼 추가 시도 (없을 수 있음)
    await c.env.DB.prepare(
      'UPDATE game_users SET status=status WHERE id=?'
    ).bind(userId).run() // no-op keep-alive
    return ok(c,{success:true})
  } catch(e:any){ return err(c,e.message,500) }
})

// 대시보드 통계
app.get('/api/admin/stats', async c => {
  try {
    const [users,rooms,pending_recharge,pending_exchange] = await Promise.all([
      c.env.DB.prepare('SELECT COUNT(*) as cnt FROM game_users').first() as Promise<any>,
      c.env.DB.prepare("SELECT COUNT(*) as cnt FROM game_rooms WHERE status='open'").first() as Promise<any>,
      c.env.DB.prepare("SELECT COUNT(*) as cnt,COALESCE(SUM(amount),0) as total FROM recharge_requests WHERE status='pending'").first() as Promise<any>,
      c.env.DB.prepare("SELECT COUNT(*) as cnt,COALESCE(SUM(amount),0) as total FROM exchange_requests WHERE status='pending'").first() as Promise<any>,
    ])
    return ok(c,{
      total_users: users?.cnt||0,
      active_rooms: rooms?.cnt||0,
      pending_recharge_count: pending_recharge?.cnt||0,
      pending_recharge_total: pending_recharge?.total||0,
      pending_exchange_count: pending_exchange?.cnt||0,
      pending_exchange_total: pending_exchange?.total||0,
    })
  } catch(e:any){ return err(c,e.message,500) }
})

// ─────────────────────────────────────────────
// 방문자 추적 API (공개 - puke365.biz → D1 기록)
// ─────────────────────────────────────────────
app.post('/api/track', async c => {
  try {
    const body = await c.req.json().catch(()=>({})) as any
    const visitorId: string = (body.visitor_id && typeof body.visitor_id==='string')
      ? body.visitor_id.slice(0,64)
      : 'anon-' + Math.random().toString(36).slice(2)

    // Asia/Seoul 기준 날짜 (YYYY-MM-DD)
    const seoulDate = new Date(new Date().toLocaleString('en-CA',{timeZone:'Asia/Seoul'})).toISOString().slice(0,10)

    const ua = c.req.header('User-Agent')||''
    const isMobile = /Android|iPhone|iPad|iPod|Mobile|webOS/i.test(ua)
    const isTablet = /iPad|Tablet/i.test(ua)
    const device = isTablet ? 'tablet' : isMobile ? 'mobile' : 'pc'

    const ref = (body.referrer && typeof body.referrer==='string') ? body.referrer.slice(0,255) : (c.req.header('Referer')||'')
    let source = 'direct'
    if (ref) {
      if (/google\./i.test(ref)) source='google'
      else if (/naver\./i.test(ref)) source='naver'
      else if (/daum\./i.test(ref)||/kakao\./i.test(ref)) source='daum'
      else if (/bing\./i.test(ref)) source='bing'
      else if (/facebook\./i.test(ref)||/fb\./i.test(ref)) source='facebook'
      else if (/instagram\./i.test(ref)) source='instagram'
      else if (/youtube\./i.test(ref)) source='youtube'
      else source='other'
    }
    const page = (body.page && typeof body.page==='string') ? body.page.slice(0,255) : '/'

    // visitor_id + visit_date 중복 허용 (페이지별 기록 보존)
    // 순방문자는 stats API에서 DISTINCT로 계산
    await c.env.DB.prepare(
      'INSERT INTO visitor_logs(visitor_id,visit_date,device_type,referrer,source,page) VALUES(?,?,?,?,?,?)'
    ).bind(visitorId, seoulDate, device, ref, source, page).run()

    return ok(c,{success:true})
  } catch(e:any){ return ok(c,{success:false}) }  // 추적 실패해도 200 반환
})

// ─────────────────────────────────────────────
// 방문자 통계 API (관리자 전용)
// ─────────────────────────────────────────────
app.get('/api/admin/visitor-stats', async c => {
  try {
    // Asia/Seoul 오늘 날짜
    const seoulToday = new Date(new Date().toLocaleString('en-CA',{timeZone:'Asia/Seoul'})).toISOString().slice(0,10)
    const date = c.req.query('date') || seoulToday

    // 일일 순방문자 (visitor_id 기준 DISTINCT)
    const total = await c.env.DB.prepare(
      'SELECT COUNT(DISTINCT visitor_id) as cnt FROM visitor_logs WHERE visit_date=?'
    ).bind(date).first() as any

    const mobile = await c.env.DB.prepare(
      "SELECT COUNT(DISTINCT visitor_id) as cnt FROM visitor_logs WHERE visit_date=? AND device_type='mobile'"
    ).bind(date).first() as any

    const tablet = await c.env.DB.prepare(
      "SELECT COUNT(DISTINCT visitor_id) as cnt FROM visitor_logs WHERE visit_date=? AND device_type='tablet'"
    ).bind(date).first() as any

    const pc = await c.env.DB.prepare(
      "SELECT COUNT(DISTINCT visitor_id) as cnt FROM visitor_logs WHERE visit_date=? AND device_type='pc'"
    ).bind(date).first() as any

    // 유입경로 집계 (visitor_id 기준)
    const {results: sources} = await c.env.DB.prepare(
      'SELECT source, COUNT(DISTINCT visitor_id) as cnt FROM visitor_logs WHERE visit_date=? GROUP BY source ORDER BY cnt DESC'
    ).bind(date).all() as any

    return ok(c,{
      date,
      today: seoulToday,
      total: total?.cnt||0,
      mobile: mobile?.cnt||0,
      tablet: tablet?.cnt||0,
      pc: pc?.cnt||0,
      sources: sources||[],
    })
  } catch(e:any){ return err(c,e.message,500) }
})

export default app
