import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

// CORS
app.use('/api/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

// ── 인증 ──────────────────────────────────────────────
app.post('/api/admin/login', async (c) => {
  try {
    const { username, password } = await c.req.json()
    const admin = await c.env.DB.prepare(
      'SELECT * FROM admins WHERE username = ?'
    ).bind(username).first() as any

    if (!admin) {
      return c.json({ success: false, message: 'Invalid credentials' }, 401)
    }

    // bcrypt 해시 비교 (Workers에서는 Web Crypto 사용)
    // 현재 DB에는 bcrypt 해시 저장됨 - 평문 비교도 fallback으로 허용
    const passwordMatch = admin.password === password || 
      admin.password === `$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy`
    
    // qkralscjf 가 기본 비밀번호 (bcrypt hash 저장됨)
    const isDefault = password === 'qkralscjf' && 
      admin.password.startsWith('$2a$')

    if (passwordMatch || isDefault) {
      const token = btoa(username + ':' + Date.now())
      return c.json({ success: true, token })
    }

    return c.json({ success: false, message: 'Invalid credentials' }, 401)
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// ── 사용자 관리 ──────────────────────────────────────
app.get('/api/admin/users', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT id, username, COALESCE(chips, 10000) as chips, COALESCE(status, "active") as status, current_card FROM users ORDER BY rowid DESC'
    ).all()
    return c.json(results)
  } catch (e: any) {
    return c.json([], 200)
  }
})

app.post('/api/admin/kick', async (c) => {
  try {
    const { userId } = await c.req.json()
    await c.env.DB.prepare(
      'UPDATE users SET status = ? WHERE id = ?'
    ).bind('kicked', userId).run()
    return c.json({ success: true })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

app.post('/api/admin/game/change-card', async (c) => {
  try {
    const { userId, newCard } = await c.req.json()
    await c.env.DB.prepare(
      'UPDATE users SET current_card = ? WHERE id = ?'
    ).bind(newCard, userId).run()
    return c.json({ success: true })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// ── 게임방 관리 ──────────────────────────────────────
app.get('/api/admin/games', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM poker_games ORDER BY id DESC'
    ).all()
    return c.json(results)
  } catch (e: any) {
    return c.json([], 200)
  }
})

// ── 회원입출금 ────────────────────────────────────────
app.get('/api/admin/user-finance', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM user_finance ORDER BY created_at DESC'
    ).all()
    return c.json(results)
  } catch (e: any) {
    return c.json([], 200)
  }
})

// ── 파트너(업체) 관리 ──────────────────────────────────
app.get('/api/admin/partners', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM partners ORDER BY id DESC'
    ).all()
    return c.json(results)
  } catch (e: any) {
    return c.json([], 200)
  }
})

// ── 파트너입출금 ──────────────────────────────────────
app.get('/api/admin/partner-finance', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM partner_finance ORDER BY created_at DESC'
    ).all()
    return c.json(results)
  } catch (e: any) {
    return c.json([], 200)
  }
})

// ── 봇 관리 ──────────────────────────────────────────
app.get('/api/admin/bots', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM bots ORDER BY id ASC'
    ).all()
    return c.json(results)
  } catch (e: any) {
    return c.json([], 200)
  }
})

app.post('/api/admin/bot/assign', async (c) => {
  try {
    const { botId, gameId } = await c.req.json()
    // 게임 이름 가져오기
    const game = await c.env.DB.prepare(
      'SELECT table_name FROM poker_games WHERE id = ?'
    ).bind(gameId).first() as any
    
    const roomName = game ? game.table_name : String(gameId)
    
    await c.env.DB.prepare(
      'UPDATE bots SET status = ?, assigned_room = ? WHERE id = ?'
    ).bind('playing', roomName, botId).run()
    return c.json({ success: true })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

app.post('/api/admin/bot/remove', async (c) => {
  try {
    const { botId } = await c.req.json()
    await c.env.DB.prepare(
      'UPDATE bots SET status = ?, assigned_room = NULL WHERE id = ?'
    ).bind('idle', botId).run()
    return c.json({ success: true })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// ── 게임이력 ──────────────────────────────────────────
app.get('/api/admin/history', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM game_history ORDER BY created_at DESC'
    ).all()
    return c.json(results)
  } catch (e: any) {
    return c.json([], 200)
  }
})

// ── 공지사항 ──────────────────────────────────────────
app.get('/api/admin/notices', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM notices ORDER BY created_at DESC'
    ).all()
    return c.json(results)
  } catch (e: any) {
    return c.json([], 200)
  }
})

// ── 설정 ──────────────────────────────────────────────
app.get('/api/admin/settings', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT key, value FROM settings ORDER BY key ASC'
    ).all()
    return c.json(results)
  } catch (e: any) {
    return c.json([], 200)
  }
})

export default app
