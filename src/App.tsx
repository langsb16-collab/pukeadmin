import { useState, useEffect, useCallback, useRef } from "react";
import {
  Users, Gamepad2, LogOut, ShieldCheck, Search, UserMinus, RefreshCw,
  Coins, Activity, LayoutDashboard, ChevronRight, Globe, ChevronDown,
  Wallet, Building2, CreditCard, Bot, History, Bell, Settings, X,
  CheckCircle, XCircle, PlusCircle, MinusCircle, UserCheck, Trash2,
  TrendingUp, AlertCircle, Edit3, Save
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import axios from "axios";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { translations, type Language } from "./translations";

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

const API = "";  // 같은 Origin – 상대경로

// ─── 설정키 다국어 레이블 맵 ───────────────────────────────────────
const SETTING_LABELS: Record<string, { ko: string; en: string; desc?: string }> = {
  announcement_ko:       { ko: "공지 (한국어)",        en: "Announcement (KO)",       desc: "한국어 공지사항 텍스트" },
  announcement_en:       { ko: "공지 (영어)",          en: "Announcement (EN)",       desc: "영어 공지사항 텍스트" },
  announcement_zh:       { ko: "공지 (중국어)",        en: "Announcement (ZH)",       desc: "중국어 공지사항 텍스트" },
  free_game_limit:       { ko: "무료게임 한도",         en: "Free Game Limit",          desc: "신규 가입 시 제공 무료 게임 수" },
  gem_rate:              { ko: "젬 환율",              en: "Gem Rate",                 desc: "KRW 1원 = N 젬" },
  maintenance:           { ko: "점검 모드",             en: "Maintenance Mode",         desc: "true 설정 시 게임사이트 점검 처리" },
  max_bet:               { ko: "최대 베팅",             en: "Max Bet",                  desc: "1회 최대 베팅 금액" },
  max_players_per_table: { ko: "테이블 최대 인원",     en: "Max Players/Table",        desc: "테이블당 최대 플레이어" },
  min_bet:               { ko: "최소 베팅",             en: "Min Bet",                  desc: "1회 최소 베팅 금액" },
  min_exchange:          { ko: "최소 환전금액",         en: "Min Exchange (gems)",      desc: "교환 신청 최소 젬 수량" },
  min_recharge:          { ko: "최소 충전금액",         en: "Min Recharge (KRW)",       desc: "충전 신청 최소 원화" },
  rake_percent:          { ko: "수수료율 (%)",           en: "Rake (%)",                 desc: "게임 판당 수수료 퍼센트" },
};

// ─── Types ───────────────────────────────────────
interface GameUser {
  id:string; phone:string; nickname:string; gems:number;
  free_game_limit:number; free_game_used:number; status:string; created_at:string;
  // game_sessions JOIN
  room_id?:string|null; room_name?:string|null; room_type?:string|null;
  table_no?:number|null; seat_no?:number|null;
  play_status?:string|null; hand_status?:string|null;
  current_cards?:string|null; play_start?:string|null;
}
interface AuditLog { id:number; admin_id:string; action:string; target_user:string; room_id:string; before_data:string; after_data:string; reason:string; created_at:string; }
interface GameRoom { id:string; name:string; type:string; buy_in_gems:number; max_players:number; blinds:string; status:string; visibility:string; created_by:string; created_at:string; }
interface GameHistory { id:number; table_name:string; winner:string; pot:number; created_at:string; }
interface RechargeReq { id:number; user_id:string; phone:string; nickname:string; amount:number; gems:number; payment_method:string; status:string; admin_memo:string; created_at:string; }
interface ExchangeReq { id:number; user_id:string; phone:string; nickname:string; gems:number; amount:number; account_info:string; status:string; admin_memo:string; created_at:string; }
interface Bot2 { id:number; name:string; difficulty:string; style:string; chips:number; status:string; assigned_room:string|null; }
interface Notice { id:number; title:string; content:string; created_at:string; }
interface Setting { key:string; value:string; }
interface Partner { id:number; name:string; balance:number; status:string; created_at:string; }
interface PartnerFinance { id:number; partner_name:string; type:string; amount:number; status:string; created_at:string; }
interface Stats { total_users:number; active_rooms:number; pending_recharge_count:number; pending_recharge_total:number; pending_exchange_count:number; pending_exchange_total:number; }

const SidebarItem = ({ icon:Icon,label,active,onClick,badge }:{icon:any,label:string,active:boolean,onClick:()=>void,badge?:number}) => (
  <button onClick={onClick} className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
    active?"bg-emerald-500/10 text-emerald-400 border border-emerald-500/20":"text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200")}>
    <Icon size={20} className={cn(active?"text-emerald-400":"text-zinc-500 group-hover:text-zinc-300")} />
    <span className="font-medium flex-1 text-left">{label}</span>
    {badge!=null && badge>0 && <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{badge}</span>}
    {active && <motion.div layoutId="active-pill" className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
  </button>
);

const StatCard = ({ icon:Icon,label,value,sub,color,urgent,waitingLabel }:{icon:any,label:string,value:string,sub?:string,color:string,urgent?:boolean,waitingLabel?:string}) => (
  <div className={cn("bg-zinc-900/50 border p-6 rounded-2xl",urgent?"border-red-500/40":"border-zinc-800")}>
    <div className="flex justify-between items-start mb-4">
      <div className={cn("p-2.5 rounded-xl",color)}><Icon size={24} className={color.replace("bg-","text-").replace("/10","")} /></div>
      {urgent && <span className="text-xs font-bold text-red-400 bg-red-400/10 px-2 py-1 rounded-full animate-pulse">{waitingLabel||"대기중"}</span>}
    </div>
    <p className="text-zinc-400 text-sm font-medium">{label}</p>
    <p className="text-2xl font-bold tracking-tight mt-1">{value}</p>
    {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
  </div>
);

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [adminRole, setAdminRole] = useState("");
  const [adminDisplayName, setAdminDisplayName] = useState("");
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem("app_lang") as Language)||"ko");
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Data states
  const [stats, setStats] = useState<Stats|null>(null);
  const [gameUsers, setGameUsers] = useState<GameUser[]>([]);
  const [gameRooms, setGameRooms] = useState<GameRoom[]>([]);
  const [rechargeReqs, setRechargeReqs] = useState<RechargeReq[]>([]);
  const [exchangeReqs, setExchangeReqs] = useState<ExchangeReq[]>([]);
  const [bots, setBots] = useState<Bot2[]>([]);
  const [gameHistory, setGameHistory] = useState<GameHistory[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [partnerFinance, setPartnerFinance] = useState<PartnerFinance[]>([]);

  // 알림음 관련
  const prevPendingRecharge = useRef(-1);  // -1 = 초기 미로드 상태
  const prevPendingExchange = useRef(-1);
  const alertIntervalRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext|null>(null);
  const [alertBanner, setAlertBanner] = useState<string|null>(null);

  // 파트너 모달
  const [partnerModal, setPartnerModal] = useState<{partner:Partner,mode:'charge'|'deduct'}|null>(null);
  const [partnerAmount, setPartnerAmount] = useState("");

  // 게임 제어 모달
  const [gameControlModal, setGameControlModal] = useState<GameUser|null>(null);
  const [forceAction, setForceAction] = useState<{action:string,reason:string,amount:string}>({action:'',reason:'',amount:''});
  const [cardSwap, setCardSwap] = useState<{new_cards:string,reason:string}>({new_cards:'',reason:''});
  const [selectedCards, setSelectedCards] = useState<string[]>([]);  // 비주얼 피커 선택카드
  const [cardFilter, setCardFilter] = useState<string>('all');        // suit 필터: all/s/h/d/c
  const [showOnlyRemaining, setShowOnlyRemaining] = useState(false);  // 남은 카드만 보기
  const [cardConfirmStep, setCardConfirmStep] = useState(false);       // 교체 확인창
  const [gcTab, setGcTab] = useState<'info'|'cards'|'action'|'endroom'>('info');
  const [gcLoading, setGcLoading] = useState(false);
  const [gcMsg, setGcMsg] = useState<string|null>(null);

  // Modal states
  const [gemModal, setGemModal] = useState<{user:GameUser,mode:'give'|'deduct'}|null>(null);
  const [gemAmount, setGemAmount] = useState("");
  const [gemMemo, setGemMemo] = useState("");
  const [noticeModal, setNoticeModal] = useState<'add'|'edit'|false>(false);
  const [noticeForm, setNoticeForm] = useState({title:"",content:""});
  const [editingNoticeId, setEditingNoticeId] = useState<number|null>(null);
  const [assigningBot, setAssigningBot] = useState<number|null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string>("");
  const [botAddModal, setBotAddModal] = useState(false);
  const [botForm, setBotForm] = useState({name:"",difficulty:"medium",style:"balanced",chips:"50000",room:""});
  // 파트너파이낸스 액션 모달
  const [pfModal, setPfModal] = useState<{record:PartnerFinance,mode:'charge'|'exchange'}|null>(null);
  const [pfAmount, setPfAmount] = useState("");
  const [roomAddModal, setRoomAddModal] = useState(false);
  const [roomForm, setRoomForm] = useState({name:"",type:"tournament",buy_in_gems:"100000",max_players:"9",blinds:"100/200",visibility:"public",password:""});
  const [rejectModal, setRejectModal] = useState<{type:'recharge'|'exchange',id:number}|null>(null);
  const [rejectMemo, setRejectMemo] = useState("");
  const [editSetting, setEditSetting] = useState<{key:string,value:string}|null>(null);

  const t = translations[language];

  useEffect(() => { localStorage.setItem("app_lang",language); }, [language]);
  useEffect(() => {
    if (localStorage.getItem("admin_token")) {
      setIsLoggedIn(true);
      setAdminRole(localStorage.getItem("admin_role")||"admin");
      setAdminDisplayName(localStorage.getItem("admin_display_name")||"관리자");
    }
  }, []);

  // AudioContext 초기화 (로그인 클릭 시 호출 → 브라우저 autoplay 정책 해제)
  const initAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  }, []);

  // 띵동 사운드 재생 (Web Audio API)
  const playDingDong = useCallback(() => {
    try {
      const ctx = audioCtxRef.current || new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = ctx;
      if (ctx.state === 'suspended') { ctx.resume(); }
      const playTone = (freq:number, start:number, dur:number) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.frequency.value = freq;
        o.type = 'sine';
        g.gain.setValueAtTime(0.4, ctx.currentTime+start);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+start+dur);
        o.start(ctx.currentTime+start);
        o.stop(ctx.currentTime+start+dur);
      };
      playTone(880, 0, 0.3);
      playTone(660, 0.35, 0.3);
    } catch(e){}
  }, []);

  const fetchAll = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const [statsR,usersR,roomsR,rechargeR,exchangeR,botsR,noticesR,settingsR,histR,partnersR,pfR] = await Promise.all([
        axios.get(`${API}/api/admin/stats`),
        axios.get(`${API}/api/admin/users`),
        axios.get(`${API}/api/admin/games`),
        axios.get(`${API}/api/admin/recharge-requests`),
        axios.get(`${API}/api/admin/exchange-requests`),
        axios.get(`${API}/api/admin/bots`),
        axios.get(`${API}/api/admin/notices`),
        axios.get(`${API}/api/admin/settings`),
        axios.get(`${API}/api/admin/history`),
        axios.get(`${API}/api/admin/partners`),
        axios.get(`${API}/api/admin/partner-finance`),
      ]);
      setStats(statsR.data);
      setGameUsers(usersR.data);
      setGameRooms(roomsR.data);
      const newRecharge = rechargeR.data.filter((r:any)=>r.status==='pending').length;
      const newExchange = exchangeR.data.filter((r:any)=>r.status==='pending').length;
      const hasPending = newRecharge > 0 || newExchange > 0;
      // 새 대기 발생(또는 첫 로드에 이미 pending 있음) → 즉시 띵동
      const isFirstLoad = prevPendingRecharge.current === -1;
      const isNewAlert = newRecharge > prevPendingRecharge.current || newExchange > prevPendingExchange.current;
      // 첫 로드 포함 pending 있으면 즉시 소리
      if (hasPending && (isFirstLoad || isNewAlert)) {
        playDingDong();
      }
      // pending 있으면 배너 갱신 + 5분 반복 interval 유지
      if (hasPending) {
        const msg: string[] = [];
        if (newRecharge > 0) msg.push(`충전 ${newRecharge}건`);
        if (newExchange > 0) msg.push(`환전 ${newExchange}건`);
        setAlertBanner(`⚠️ 미처리 대기: ${msg.join(' / ')}`);
        // interval 없을 때만 새로 생성 (X 닫아도 interval 유지)
        if (!alertIntervalRef.current) {
          alertIntervalRef.current = setInterval(() => {
            playDingDong();
          }, 5 * 60 * 1000);
        }
      }
      // 모두 처리 완료 시 알림 완전 중지
      if (!hasPending) {
        if (alertIntervalRef.current) { clearInterval(alertIntervalRef.current); alertIntervalRef.current = null; }
        setAlertBanner(null);
      }
      prevPendingRecharge.current = newRecharge;
      prevPendingExchange.current = newExchange;
      setRechargeReqs(rechargeR.data);
      setExchangeReqs(exchangeR.data);
      setBots(botsR.data);
      setNotices(noticesR.data);
      setSettings(settingsR.data);
      setGameHistory(histR.data);
      setPartners(partnersR.data);
      setPartnerFinance(pfR.data);
    } catch(e){ console.error(e); }
  }, [isLoggedIn, playDingDong]);

  useEffect(() => {
    if (isLoggedIn) { fetchAll(); const i=setInterval(fetchAll,8000); return ()=>clearInterval(i); }
  }, [isLoggedIn,fetchAll]);

  const handleLogin = async (e:any) => {
    e.preventDefault(); setLoading(true); setLoginError("");
    initAudioCtx(); // 사용자 클릭 시점에 AudioContext 활성화
    try {
      const res = await axios.post(`${API}/api/admin/login`,{username,password});
      if (res.data.success) {
        localStorage.setItem("admin_token", res.data.token);
        localStorage.setItem("admin_role", res.data.role||"admin");
        localStorage.setItem("admin_display_name", res.data.display_name||res.data.username||"관리자");
        setAdminRole(res.data.role||"admin");
        setAdminDisplayName(res.data.display_name||res.data.username||"관리자");
        setIsLoggedIn(true);
      }
    } catch(e:any){ setLoginError(e.response?.data?.message||"아이디 또는 비밀번호가 올바르지 않습니다."); }
    finally { setLoading(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_role");
    localStorage.removeItem("admin_display_name");
    setIsLoggedIn(false);
    setAdminRole("");
    setAdminDisplayName("");
  };

  // ── 회원 강퇴/해제
  const handleKick = async (userId:string, current:string) => {
    const next = current==='kicked'||current==='banned' ? 'unban' : 'kick';
    await axios.post(`${API}/api/admin/${next}`,{userId}); fetchAll();
  };

  // ── 젬 지급/차감
  const handleGemAction = async () => {
    if (!gemModal||!gemAmount) return;
    const endpoint = gemModal.mode==='give' ? 'give-gems' : 'deduct-gems';
    await axios.post(`${API}/api/admin/${endpoint}`,{userId:gemModal.user.id,gems:parseInt(gemAmount),memo:gemMemo});
    setGemModal(null); setGemAmount(""); setGemMemo(""); fetchAll();
  };

  // ── 충전 승인/거절
  const handleRechargeApprove = async (id:number) => {
    await axios.post(`${API}/api/admin/recharge/approve`,{id}); fetchAll();
  };
  const handleRechargeReject = async () => {
    if (!rejectModal) return;
    await axios.post(`${API}/api/admin/recharge/reject`,{id:rejectModal.id,memo:rejectMemo});
    setRejectModal(null); setRejectMemo(""); fetchAll();
  };

  // ── 환전 승인/거절
  const handleExchangeApprove = async (id:number) => {
    await axios.post(`${API}/api/admin/exchange/approve`,{id}); fetchAll();
  };
  const handleExchangeReject = async () => {
    if (!rejectModal) return;
    await axios.post(`${API}/api/admin/exchange/reject`,{id:rejectModal.id,memo:rejectMemo});
    setRejectModal(null); setRejectMemo(""); fetchAll();
  };

  // ── 봇 추가
  // ── 파트너파이낸스 액션 핸들러
  const handlePfCharge = async () => {
    if (!pfModal||!pfAmount) return;
    const amt = parseInt(pfAmount.replace(/,/g,''))||0;
    if (amt<=0) return;
    // 파트너 이름으로 파트너 목록에서 id 찾기
    const partner = partners.find(p=>p.name===pfModal.record.partner_name);
    if (!partner) { alert('파트너를 찾을 수 없습니다'); return; }
    await axios.post(`${API}/api/admin/partners/charge`,{id:partner.id,amount:amt});
    setPfModal(null); setPfAmount(""); fetchAll();
  };
  const handlePfExchange = async () => {
    if (!pfModal||!pfAmount) return;
    const amt = parseInt(pfAmount.replace(/,/g,''))||0;
    if (amt<=0) return;
    const partner = partners.find(p=>p.name===pfModal.record.partner_name);
    if (!partner) { alert('파트너를 찾을 수 없습니다'); return; }
    await axios.post(`${API}/api/admin/partners/deduct`,{id:partner.id,amount:amt});
    setPfModal(null); setPfAmount(""); fetchAll();
  };
  const handlePfDelete = async (record:PartnerFinance) => {
    if (!window.confirm(t.pfConfirmDelete)) return;
    try {
      await axios.delete(`${API}/api/admin/partner-finance/${record.id}`);
    } catch(_){
      // API 없을 시 로컬에서만 제거
      setPartnerFinance(prev=>prev.filter(f=>f.id!==record.id));
      return;
    }
    fetchAll();
  };

  const handleAddBot = async () => {
    if (!botForm.name) return;
    await axios.post(`${API}/api/admin/bots`,{...botForm,chips:parseInt(botForm.chips)||50000,room:botForm.room||undefined});
    // room이 지정된 경우 자동으로 배정
    if (botForm.room) {
      try {
        const botsRes = await axios.get(`${API}/api/admin/bots`);
        const newBot = botsRes.data?.find?.((b:any)=>b.name===botForm.name);
        if (newBot) {
          await axios.post(`${API}/api/admin/bot/assign`,{botId:newBot.id,gameId:botForm.room});
        }
      } catch(_){}
    }
    setBotAddModal(false); setBotForm({name:"",difficulty:"medium",style:"balanced",chips:"50000",room:""}); fetchAll();
  };
  // ── 봇 삭제
  const handleDeleteBot = async (botId:number) => {
    if (!window.confirm('이 로봇을 삭제할까요?')) return;
    await axios.delete(`${API}/api/admin/bots/${botId}`); fetchAll();
  };
  // ── 봇 배정
  const handleAssignBot = async (botId:number) => {
    if (!selectedRoom) return;
    await axios.post(`${API}/api/admin/bot/assign`,{botId,gameId:selectedRoom});
    setAssigningBot(null); setSelectedRoom(""); fetchAll();
  };
  const handleRemoveBot = async (botId:number) => {
    await axios.post(`${API}/api/admin/bot/remove`,{botId}); fetchAll();
  };

  // ── 공지 등록
  const handleAddNotice = async () => {
    if (!noticeForm.title) return;
    await axios.post(`${API}/api/admin/notices`,noticeForm);
    setNoticeModal(false); setNoticeForm({title:"",content:""}); setEditingNoticeId(null); fetchAll();
  };
  // ── 공지 수정
  const handleEditNotice = async () => {
    if (!noticeForm.title || editingNoticeId == null) return;
    await axios.put(`${API}/api/admin/notices/${editingNoticeId}`, noticeForm);
    setNoticeModal(false); setNoticeForm({title:"",content:""}); setEditingNoticeId(null); fetchAll();
  };
  const handleDeleteNotice = async (id:number) => {
    if (!window.confirm('이 공지사항을 삭제할까요?')) return;
    await axios.delete(`${API}/api/admin/notices/${id}`); fetchAll();
  };

  // ── 설정 저장
  const handleSaveSetting = async () => {
    if (!editSetting) return;
    await axios.post(`${API}/api/admin/settings`,editSetting);
    setEditSetting(null); fetchAll();
  };

  // ── 게임방 생성
  const handleCreateRoom = async () => {
    if (!roomForm.name) return;
    // admin이 방 생성 시 gems 차감 없이 직접 DB 삽입
    await axios.post(`${API}/api/admin/rooms/create`, {...roomForm, buy_in_gems:parseInt(roomForm.buy_in_gems)||100000, max_players:parseInt(roomForm.max_players)||9});
    setRoomAddModal(false); setRoomForm({name:"",type:"tournament",buy_in_gems:"100000",max_players:"9",blinds:"100/200",visibility:"public",password:""}); fetchAll();
  };
  // ── 게임방 닫기
  const handleCloseRoom = async (id:string) => {
    await axios.post(`${API}/api/admin/games/delete`,{id}); fetchAll();
  };

  // ── 파트너 충전/삭감
  const handlePartnerAction = async () => {
    if (!partnerModal||!partnerAmount) return;
    const ep = partnerModal.mode==='charge' ? 'charge' : 'deduct';
    await axios.post(`${API}/api/admin/partners/${ep}`,{id:partnerModal.partner.id,amount:parseInt(partnerAmount)});
    setPartnerModal(null); setPartnerAmount(""); fetchAll();
  };
  // ── 파트너 삭제
  const handleDeletePartner = async (id:number) => {
    if (!window.confirm('이 파트너를 삭제할까요?')) return;
    await axios.delete(`${API}/api/admin/partners/${id}`); fetchAll();
  };

  const pendingRecharge = rechargeReqs.filter(r=>r.status==='pending').length;
  const pendingExchange = exchangeReqs.filter(r=>r.status==='pending').length;

  // ── 검색 필터
  const filteredUsers = gameUsers.filter(u=>
    !searchQuery || u.nickname?.includes(searchQuery) || u.phone?.includes(searchQuery)
  );

  // ══════════════════════════════════════════════
  // LOGIN PAGE
  // ══════════════════════════════════════════════
  if (!isLoggedIn) return (
    <div className="min-h-screen bg-[#0a0a0c] flex text-white relative overflow-hidden">
      {/* 배경 그라디언트 */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/20 via-transparent to-blue-950/20 pointer-events-none"/>
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"/>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"/>

      {/* 좌측 — 브랜딩 패널 */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] p-12 border-r border-zinc-800/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <ShieldCheck size={22} className="text-zinc-950"/>
          </div>
          <span className="text-xl font-bold tracking-tight">{t.brandName}</span>
        </div>
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-semibold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"/>
            {t.adminSystemBadge}
          </div>
          <h1 className="text-5xl font-extrabold leading-tight tracking-tight">
            {t.loginFeatureTitle1}<br/>
            <span className="text-emerald-400">{t.loginFeatureTitle2}</span>
          </h1>
          <p className="text-zinc-400 text-lg leading-relaxed max-w-sm">
            {t.loginFeatureDesc.split('\n')[0]}<br/>
            {t.loginFeatureDesc.split('\n')[1]}
          </p>
          <div className="grid grid-cols-2 gap-4 max-w-sm">
            {[
              {icon:'👥',label:t.loginFeat1},
              {icon:'🎮',label:t.loginFeat2},
              {icon:'💰',label:t.loginFeat3},
              {icon:'🔒',label:t.loginFeat4},
            ].map(({icon,label})=>(
              <div key={label} className="flex items-center gap-3 px-4 py-3.5 bg-zinc-900/60 border border-zinc-800 rounded-xl">
                <span className="text-xl">{icon}</span>
                <span className="text-base font-bold text-zinc-200">{label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="text-zinc-700 text-xs">{t.brandCopyright}</div>
      </div>

      {/* 우측 — 로그인 폼 */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12">
        {/* 언어 선택 */}
        <div className="absolute top-6 right-6">
          <div className="relative">
            <button onClick={()=>setShowLangMenu(!showLangMenu)}
              className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-xl text-zinc-400 hover:text-zinc-200 transition-all text-sm">
              <Globe size={15}/><span className="uppercase">{language}</span>
              <ChevronDown size={12} className={cn("transition-transform",showLangMenu&&"rotate-180")}/>
            </button>
            <AnimatePresence>{showLangMenu&&(
              <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:8}}
                className="absolute right-0 mt-2 w-28 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-50">
                {(["ko","en","zh"] as Language[]).map(lang=>(
                  <button key={lang} onClick={()=>{setLanguage(lang);setShowLangMenu(false);}}
                    className={cn("w-full px-4 py-2.5 text-left text-sm hover:bg-zinc-800",language===lang?"text-emerald-400":"text-zinc-400")}>
                    {lang==="ko"?"한국어":lang==="en"?"English":"中文"}
                  </button>
                ))}
              </motion.div>
            )}</AnimatePresence>
          </div>
        </div>

        <motion.div initial={{opacity:0,y:24}} animate={{opacity:1,y:0}} transition={{duration:0.4}}
          className="w-full max-w-sm">

          {/* 모바일 로고 */}
          <div className="flex lg:hidden items-center gap-2 justify-center mb-8">
            <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center">
              <ShieldCheck size={20} className="text-zinc-950"/>
            </div>
            <span className="text-lg font-bold">{t.brandAdmin}</span>
          </div>

          {/* 카드 */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-8 shadow-2xl backdrop-blur-sm">
            {/* 헤더 */}
            <div className="mb-7">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 bg-emerald-500/15 rounded-lg flex items-center justify-center border border-emerald-500/20">
                  <ShieldCheck size={16} className="text-emerald-400"/>
                </div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">{t.loginBadgeLabel}</span>
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight mt-2">{t.loginPageTitle}</h2>
              <p className="text-zinc-500 text-sm mt-1">{t.loginPageDesc}</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
              {/* 아이디 */}
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 ml-0.5">{t.username}</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600">
                    <Users size={16}/>
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={e=>setUsername(e.target.value)}
                    className="w-full bg-zinc-800/80 border border-zinc-700 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all placeholder:text-zinc-600"
                    placeholder="admin"
                    required
                    autoComplete="off"
                  />
                </div>
              </div>

              {/* 비밀번호 */}
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 ml-0.5">{t.password}</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600">
                    <ShieldCheck size={16}/>
                  </span>
                  <input
                    type={showPw?"text":"password"}
                    value={password}
                    onChange={e=>setPassword(e.target.value)}
                    className="w-full bg-zinc-800/80 border border-zinc-700 rounded-xl pl-10 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all placeholder:text-zinc-600"
                    placeholder="••••••••"
                    required
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={()=>setShowPw(p=>!p)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors text-xs font-medium">
                    {showPw?t.hidePw:t.showPw}
                  </button>
                </div>
              </div>

              {/* 오류 메시지 */}
              {loginError&&(
                <motion.div initial={{opacity:0,y:-4}} animate={{opacity:1,y:0}}
                  className="flex items-center gap-2 px-3 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                  <span>⚠</span><span>{loginError}</span>
                </motion.div>
              )}

              {/* 로그인 버튼 */}
              <button type="submit" disabled={loading||!username||!password}
                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-zinc-950 font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 text-sm mt-2">
                {loading?(
                  <><span className="w-4 h-4 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin"/>{t.authenticating}</>
                ):(
                  <><ShieldCheck size={16}/>{t.signIn}</>
                )}
              </button>
            </form>

            {/* 구분선 + 안내 */}
            <div className="mt-6 pt-5 border-t border-zinc-800">
              <div className="flex items-start gap-2.5 text-xs text-zinc-600">
                <span className="mt-0.5 shrink-0">🔒</span>
                <span>{t.loginSecurityNote}</span>
              </div>
            </div>
          </div>

          {/* 하단 */}
          <p className="text-center text-zinc-700 text-xs mt-6">{t.brandConsole}</p>
        </motion.div>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════
  // MAIN DASHBOARD
  // ══════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#0c0c0e] flex text-white">
      {/* ── 알림 배너 ── */}
      <AnimatePresence>
        {alertBanner && (
          <motion.div initial={{opacity:0,y:-40}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-40}}
            className="fixed top-0 left-0 right-0 z-[200] bg-amber-500 text-zinc-950 px-6 py-3 flex items-center justify-between shadow-2xl">
            <div className="flex items-center gap-3 font-bold">
              <Bell size={20} className="animate-bounce"/>
              <span>{alertBanner} {t.alertBannerSuffix}</span>
            </div>
            <button onClick={()=>setAlertBanner(null)} title={t.alertBannerClose} className="text-zinc-950 hover:text-zinc-700 p-1 rounded-lg hover:bg-amber-400 transition-colors"><X size={20}/></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-800 p-4 flex flex-col hidden md:flex shrink-0 h-screen sticky top-0">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
            <ShieldCheck size={24} className="text-zinc-950"/>
          </div>
          <span className="font-bold text-xl tracking-tight">{t.brandName}</span>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto pr-1 mt-4 mb-2">
          <SidebarItem icon={LayoutDashboard} label={t.dashboard} active={activeTab==="dashboard"} onClick={()=>setActiveTab("dashboard")}/>
          <SidebarItem icon={Users} label={t.users} active={activeTab==="users"} onClick={()=>setActiveTab("users")}/>
          <SidebarItem icon={Wallet} label={t.userFinance} active={activeTab==="userFinance"} onClick={()=>setActiveTab("userFinance")} badge={pendingRecharge+pendingExchange}/>
          <SidebarItem icon={Building2} label={t.partners} active={activeTab==="partners"} onClick={()=>setActiveTab("partners")}/>
          <SidebarItem icon={CreditCard} label={t.partnerFinance} active={activeTab==="partnerFinance"} onClick={()=>setActiveTab("partnerFinance")}/>
          <SidebarItem icon={Bot} label={t.bots} active={activeTab==="bots"} onClick={()=>setActiveTab("bots")}/>
          <SidebarItem icon={Gamepad2} label={t.games} active={activeTab==="games"} onClick={()=>setActiveTab("games")}/>
          <SidebarItem icon={History} label={t.history} active={activeTab==="history"} onClick={()=>setActiveTab("history")}/>
          <SidebarItem icon={Bell} label={t.notice} active={activeTab==="notice"} onClick={()=>setActiveTab("notice")}/>
          <SidebarItem icon={Settings} label={t.settings} active={activeTab==="settings"} onClick={()=>setActiveTab("settings")}/>
        </nav>
        {/* 관리자 정보 + 로그아웃 */}
        <div className="border-t border-zinc-800/60 pt-4 space-y-2">
          <div className="px-3 py-2.5 bg-zinc-800/40 rounded-xl">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center shrink-0">
                <ShieldCheck size={14} className="text-emerald-400"/>
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-white truncate">{adminDisplayName||'관리자'}</div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded">
                    {adminRole==='superAdmin'?'SUPER ADMIN':adminRole==='admin'?'ADMIN':adminRole.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all">
            <LogOut size={18}/><span className="font-medium text-sm">{t.logout}</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-6 md:p-8 overflow-auto min-w-0">
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight capitalize">{t[activeTab as keyof typeof t] as string}</h2>
            <p className="text-zinc-500 text-sm">{t.monitoring}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16}/>
              <input type="text" placeholder={t.search} value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-full pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 w-44"/>
            </div>
            <div className="relative">
              <button onClick={()=>setShowLangMenu(!showLangMenu)} className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-full hover:bg-zinc-800 text-zinc-400">
                <Globe size={18}/>
              </button>
              <AnimatePresence>{showLangMenu&&(
                <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:8}}
                  className="absolute right-0 mt-2 w-28 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-50">
                  {(["ko","en","zh"] as Language[]).map(lang=>(
                    <button key={lang} onClick={()=>{setLanguage(lang);setShowLangMenu(false);}}
                      className={cn("w-full px-3 py-2 text-left text-sm hover:bg-zinc-800",language===lang?"text-emerald-400":"text-zinc-400")}>
                      {lang==="ko"?"한국어":lang==="en"?"English":"中文"}
                    </button>
                  ))}
                </motion.div>
              )}</AnimatePresence>
            </div>
            <button onClick={fetchAll} className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-full hover:bg-zinc-800">
              <RefreshCw size={18} className="text-zinc-400"/>
            </button>
            {/* 상단 로그아웃 버튼 */}
            <button onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-full hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 text-zinc-400 transition-all text-sm font-medium"
              title="로그아웃">
              <LogOut size={16}/>
              <span className="hidden sm:inline">로그아웃</span>
            </button>
          </div>
        </header>

        <AnimatePresence mode="wait">

          {/* ── DASHBOARD ── */}
          {activeTab==="dashboard" && (
            <motion.div key="dashboard" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}} className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <StatCard icon={Users} label={t.statTotalUsers} value={String(stats?.total_users||0)} color="bg-emerald-500/10"/>
                <StatCard icon={Gamepad2} label={t.statActiveRooms} value={String(stats?.active_rooms||0)} color="bg-blue-500/10"/>
                <StatCard icon={TrendingUp} label={t.statPendingRecharge} value={`${stats?.pending_recharge_count||0}${t.statUnit}`} sub={`${(stats?.pending_recharge_total||0).toLocaleString()}${t.wonUnit}`} color="bg-amber-500/10" urgent={!!stats?.pending_recharge_count} waitingLabel={t.statWaiting}/>
                <StatCard icon={Coins} label={t.statPendingExchange} value={`${stats?.pending_exchange_count||0}${t.statUnit}`} sub={`${(stats?.pending_exchange_total||0).toLocaleString()}${t.wonUnit}`} color="bg-purple-500/10" urgent={!!stats?.pending_exchange_count} waitingLabel={t.statWaiting}/>
                <StatCard icon={Bot} label={t.statBots} value={String(bots.length)} color="bg-cyan-500/10"/>
                <StatCard icon={Bell} label={t.statNotices} value={String(notices.length)} color="bg-rose-500/10"/>
              </div>
              {/* 최근 충전대기 */}
              {pendingRecharge>0 && (
                <div className="bg-amber-500/5 border border-amber-500/30 rounded-2xl p-6">
                  <h3 className="font-bold text-amber-400 mb-4 flex items-center gap-2"><AlertCircle size={18}/>{t.pendingRechargeTitle} {pendingRecharge}{t.statUnit}</h3>
                  <div className="space-y-2">
                    {rechargeReqs.filter(r=>r.status==='pending').slice(0,5).map(r=>(
                      <div key={r.id} className="flex items-center justify-between bg-zinc-900/50 p-3 rounded-xl">
                        <div>
                          <p className="font-medium">{r.nickname} <span className="text-zinc-500 text-sm">({r.phone})</span></p>
                          <p className="text-sm text-amber-400">{r.amount.toLocaleString()}원 → {r.gems.toLocaleString()}젬 ({r.payment_method})</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={()=>handleRechargeApprove(r.id)} className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-bold hover:bg-emerald-500/30 flex items-center gap-1"><CheckCircle size={14}/>승인</button>
                          <button onClick={()=>{setRejectModal({type:'recharge',id:r.id});setRejectMemo("");}} className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-xs font-bold hover:bg-red-500/30 flex items-center gap-1"><XCircle size={14}/>거절</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* 최근 환전대기 */}
              {pendingExchange>0 && (
                <div className="bg-purple-500/5 border border-purple-500/30 rounded-2xl p-6">
                  <h3 className="font-bold text-purple-400 mb-4 flex items-center gap-2"><AlertCircle size={18}/>{t.pendingExchangeTitle} {pendingExchange}{t.statUnit}</h3>
                  <div className="space-y-2">
                    {exchangeReqs.filter(r=>r.status==='pending').slice(0,5).map(r=>(
                      <div key={r.id} className="flex items-center justify-between bg-zinc-900/50 p-3 rounded-xl">
                        <div>
                          <p className="font-medium">{r.nickname} <span className="text-zinc-500 text-sm">({r.phone})</span></p>
                          <p className="text-sm text-purple-400">{r.gems.toLocaleString()}젬 → {r.amount.toLocaleString()}원 <span className="text-zinc-500">{r.account_info}</span></p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={()=>handleExchangeApprove(r.id)} className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-bold hover:bg-emerald-500/30 flex items-center gap-1"><CheckCircle size={14}/>승인</button>
                          <button onClick={()=>{setRejectModal({type:'exchange',id:r.id});setRejectMemo("");}} className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-xs font-bold hover:bg-red-500/30 flex items-center gap-1"><XCircle size={14}/>거절</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* 최근 가입 */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                <h3 className="font-bold text-lg mb-4">{t.recentMembers}</h3>
                <div className="space-y-3">
                  {gameUsers.slice(0,6).map(u=>(
                    <div key={u.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-zinc-800/30">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-zinc-400">{u.nickname?.[0]?.toUpperCase()||'?'}</div>
                        <div>
                          <p className="font-medium">{u.nickname}</p>
                          <p className="text-xs text-zinc-500">{u.phone} · {u.gems.toLocaleString()}젬</p>
                        </div>
                      </div>
                      <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold",u.status==='active'?"bg-emerald-400/10 text-emerald-400":"bg-red-400/10 text-red-400")}>{u.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── USERS ── */}
          {activeTab==="users" && (
            <motion.div key="users" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}}>
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1100px]">
                  <thead>
                    <tr className="bg-zinc-800/50 border-b border-zinc-800">
                      {[t.colNickname,t.colPhone,t.colCurrentRoom,t.colTableSeat,t.colGameStatus,t.colHandStatus,t.colPlayTime,t.colGems,t.colStatus,t.colGemControl,t.colManage].map(h=>(
                        <th key={h} className="px-3 py-3 text-xs font-bold uppercase tracking-wider text-zinc-500 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u=>{
                      const ps = u.play_status||'offline';
                      const playBadge:{[k:string]:{color:string,label:string}} = {
                        playing:{color:'bg-emerald-400/15 text-emerald-400 border border-emerald-400/30',label:'Playing'},
                        waiting:{color:'bg-blue-400/15 text-blue-400 border border-blue-400/30',label:'Waiting'},
                        observer:{color:'bg-purple-400/15 text-purple-400 border border-purple-400/30',label:'Observer'},
                        offline:{color:'bg-zinc-600/30 text-zinc-400 border border-zinc-600/30',label:'Offline'},
                        disconnected:{color:'bg-zinc-500/20 text-zinc-500 border border-zinc-500/20',label:'Disconnected'},
                        finished:{color:'bg-orange-400/15 text-orange-400 border border-orange-400/30',label:'Finished'},
                      };
                      const badge = playBadge[ps]||playBadge['offline'];
                      const playMins = u.play_start ? Math.floor((Date.now()-new Date(u.play_start).getTime())/60000) : null;
                      const handLabels:{[k:string]:string} = {betting:t.handBetting,waiting_turn:t.handWaitingTurn,folded:t.handFolded,idle:t.handIdle,timeout:t.handTimeout};
                      return (
                        <tr key={u.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
                          <td className="px-3 py-3 font-medium whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className={cn("w-2 h-2 rounded-full shrink-0", ps==='playing'?'bg-emerald-400 animate-pulse':ps==='offline'?'bg-zinc-600':'bg-blue-400')}/>
                              {u.nickname}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-zinc-400 text-sm">{u.phone}</td>
                          <td className="px-3 py-3">
                            {u.room_name ? (
                              <button onClick={()=>{setGameControlModal(u);setGcTab('info');setGcMsg(null);setSelectedCards([]);setCardConfirmStep(false);}}
                                className="text-blue-400 hover:text-blue-300 text-sm font-medium underline underline-offset-2 text-left whitespace-nowrap">
                                {u.room_type==='tournament'?'🏆':u.room_type==='cash'?'💰':'🔒'} {u.room_name}
                              </button>
                            ) : (
                              <span className="text-zinc-600 text-sm">{ps==='offline'?t.offline:t.waiting}</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-sm text-zinc-400">
                            {u.table_no&&u.seat_no ? `T${u.table_no} / S${u.seat_no}` : '—'}
                          </td>
                          <td className="px-3 py-3">
                            <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap", badge.color)}>{badge.label}</span>
                          </td>
                          <td className="px-3 py-3 text-xs text-zinc-400">{u.hand_status ? handLabels[u.hand_status]||u.hand_status : '—'}</td>
                          <td className="px-3 py-3 text-xs text-zinc-400">{playMins!==null ? `${playMins}${t.timeUnit}` : '—'}</td>
                          <td className="px-3 py-3"><span className="text-amber-400 font-mono text-sm">{u.gems.toLocaleString()}</span></td>
                          <td className="px-3 py-3">
                            <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold",u.status==='active'?"bg-emerald-400/10 text-emerald-400":"bg-red-400/10 text-red-400")}>{u.status}</span>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex gap-1">
                              <button onClick={()=>{setGemModal({user:u,mode:'give'});setGemAmount("");setGemMemo("");}}
                                className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30" title={t.gemTooltipGive}><PlusCircle size={14}/></button>
                              <button onClick={()=>{setGemModal({user:u,mode:'deduct'});setGemAmount("");setGemMemo("");}}
                                className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30" title={t.gemTooltipDeduct}><MinusCircle size={14}/></button>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex gap-1">
                              <button onClick={()=>{setGameControlModal(u);setGcTab('info');setGcMsg(null);setSelectedCards([]);setCardConfirmStep(false);}}
                                className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 text-xs font-bold" title="게임 제어">🎮</button>
                              <button onClick={()=>handleKick(u.id,u.status)}
                                className={cn("p-1.5 rounded-lg transition-all",u.status==='active'?"text-zinc-500 hover:text-red-400 hover:bg-red-400/10":"text-emerald-400 bg-emerald-400/10")}
                                title={u.status==='active'?'강퇴':'정지해제'}>
                                {u.status==='active'?<UserMinus size={14}/>:<UserCheck size={14}/>}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredUsers.length===0&&(
                      <tr><td colSpan={11} className="text-center py-12 text-zinc-600">{t.noMembers}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* ── USER FINANCE (충전+환전) ── */}
          {activeTab==="userFinance" && (
            <motion.div key="userFinance" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}} className="space-y-6">
              {/* 충전 */}
              <div>
                <h3 className="font-bold text-lg mb-3 text-amber-400 flex items-center gap-2"><TrendingUp size={18}/>충전 요청</h3>
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead><tr className="bg-zinc-800/50 border-b border-zinc-800">
                      {[t.colNickname,t.colPhone,t.colAmount,t.colGem,t.colPayMethod,t.colStatus,t.colAction].map(h=>(                        <th key={h} className="px-4 py-3 text-xs font-bold uppercase text-zinc-500">{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {rechargeReqs.slice(0,50).map(r=>(
                        <tr key={r.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20">
                          <td className="px-4 py-3">{r.nickname}</td>
                          <td className="px-4 py-3 text-zinc-400 text-sm">{r.phone}</td>
                          <td className="px-4 py-3 font-mono text-sm">{r.amount.toLocaleString()}원</td>
                          <td className="px-4 py-3 text-amber-400 font-mono">{r.gems.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-zinc-400">{r.payment_method}</td>
                          <td className="px-4 py-3">
                            <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold",
                              r.status==='approved'?"bg-emerald-400/10 text-emerald-400":r.status==='rejected'?"bg-red-400/10 text-red-400":"bg-amber-400/10 text-amber-400")}>
                              {r.status==='approved'?t.statusApproved:r.status==='rejected'?t.statusRejected:t.statusPending}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {r.status==='pending'?(
                              <div className="flex gap-1">
                                <button onClick={()=>handleRechargeApprove(r.id)} className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs font-bold hover:bg-emerald-500/30 flex items-center gap-1"><CheckCircle size={12}/>{t.approve}</button>
                                <button onClick={()=>{setRejectModal({type:'recharge',id:r.id});setRejectMemo("");}} className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs font-bold hover:bg-red-500/30 flex items-center gap-1"><XCircle size={12}/>{t.reject}</button>
                              </div>
                            ):<span className="text-zinc-600 text-xs">{r.admin_memo||'-'}</span>}
                          </td>
                        </tr>
                      ))}
                      {rechargeReqs.length===0&&<tr><td colSpan={7} className="text-center py-8 text-zinc-600">{t.noRecharge}</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
              {/* 환전 */}
              <div>
                <h3 className="font-bold text-lg mb-3 text-purple-400 flex items-center gap-2"><Coins size={18}/>환전 요청</h3>
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead><tr className="bg-zinc-800/50 border-b border-zinc-800">
                      {[t.colNickname,t.colPhone,t.colGem,t.colExchangeAmount,t.colAccountInfo,t.colStatus,t.colAction].map(h=>(                        <th key={h} className="px-4 py-3 text-xs font-bold uppercase text-zinc-500">{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {exchangeReqs.slice(0,50).map(r=>(
                        <tr key={r.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20">
                          <td className="px-4 py-3">{r.nickname}</td>
                          <td className="px-4 py-3 text-zinc-400 text-sm">{r.phone}</td>
                          <td className="px-4 py-3 text-amber-400 font-mono">{r.gems.toLocaleString()}</td>
                          <td className="px-4 py-3 font-mono text-sm">{r.amount.toLocaleString()}원</td>
                          <td className="px-4 py-3 text-zinc-400 text-sm max-w-[120px] truncate">{r.account_info||'-'}</td>
                          <td className="px-4 py-3">
                            <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold",
                              r.status==='approved'?"bg-emerald-400/10 text-emerald-400":r.status==='rejected'?"bg-red-400/10 text-red-400":"bg-purple-400/10 text-purple-400")}>
                              {r.status==='approved'?t.statusApproved:r.status==='rejected'?t.statusRejected:t.statusPending}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {r.status==='pending'?(
                              <div className="flex gap-1">
                                <button onClick={()=>handleExchangeApprove(r.id)} className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs font-bold hover:bg-emerald-500/30 flex items-center gap-1"><CheckCircle size={12}/>{t.approve}</button>
                                <button onClick={()=>{setRejectModal({type:'exchange',id:r.id});setRejectMemo("");}} className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs font-bold hover:bg-red-500/30 flex items-center gap-1"><XCircle size={12}/>{t.reject}</button>
                              </div>
                            ):<span className="text-zinc-600 text-xs">{r.admin_memo||'-'}</span>}
                          </td>
                        </tr>
                      ))}
                      {exchangeReqs.length===0&&<tr><td colSpan={7} className="text-center py-8 text-zinc-600">{t.noExchange}</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── GAMES (게임방) ── */}
          {activeTab==="games" && (
            <motion.div key="games" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}} className="space-y-4">
              <div className="flex justify-end">
                <button onClick={()=>setRoomAddModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl text-sm">
                  <PlusCircle size={16}/>{t.createRoom}
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {gameRooms.filter(r=>r.status==='open').map(r=>(
                  <div key={r.id} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 hover:border-emerald-500/30 transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-11 h-11 bg-zinc-800 rounded-xl flex items-center justify-center"><Gamepad2 size={22} className="text-zinc-500"/></div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400/10 text-emerald-400">open</span>
                    </div>
                    <h3 className="font-bold mb-1">{r.name}</h3>
                    <p className="text-xs text-zinc-500 mb-3">{r.type} · {r.blinds} · 최대{r.max_players}명 · {r.visibility}</p>
                    <div className="flex justify-between items-center pt-3 border-t border-zinc-800">
                      <p className="text-amber-400 font-mono text-sm">{r.buy_in_gems.toLocaleString()}젬</p>
                      <button onClick={()=>handleCloseRoom(r.id)} className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-xs font-bold hover:bg-red-500/30 flex items-center gap-1">
                        <X size={12}/>{t.closeRoom}
                      </button>
                    </div>
                  </div>
                ))}
                {gameRooms.filter(r=>r.status==='open').length===0&&<div className="col-span-3 text-center py-16 text-zinc-600">{t.noActiveRoom}</div>}
              </div>
            </motion.div>
          )}

          {/* ── BOTS ── */}
          {activeTab==="bots" && (
            <motion.div key="bots" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}} className="space-y-4">
              <div className="flex justify-end">
                <button onClick={()=>{ setBotAddModal(true); setBotForm({name:"",difficulty:"medium",style:"balanced",chips:"50000",room:""}); }}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl text-sm">
                  <PlusCircle size={16}/>{t.addBot}
                </button>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead><tr className="bg-zinc-800/50 border-b border-zinc-800">
                    {[t.colName,t.colDifficulty,t.colStyle,t.colChips,t.colAssignedRoom,t.colStatus,t.colActions].map(h=>(
                      <th key={h} className="px-4 py-3 text-xs font-bold uppercase text-zinc-500">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {bots.map(b=>(
                      <tr key={b.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20">
                        <td className="px-4 py-3 font-bold">{b.name}</td>
                        <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-400">{b.difficulty}</span></td>
                        <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-400">{b.style}</span></td>
                        <td className="px-4 py-3 font-mono text-sm">{b.chips.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm">{b.assigned_room||<span className="text-zinc-600 italic">{t.unassigned}</span>}</td>
                        <td className="px-4 py-3">
                          <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold",b.status==='playing'?"bg-emerald-400/10 text-emerald-400":"bg-zinc-800 text-zinc-500")}>
                            {b.status==='playing'?t.playing:t.idle}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {assigningBot===b.id?(
                              <>
                                <select value={selectedRoom} onChange={e=>setSelectedRoom(e.target.value)}
                                  className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-emerald-500">
                                  <option value="">{t.selectRoomPlaceholder}</option>
                                  {gameRooms.filter(r=>r.status==='open').map(r=>(
                                    <option key={r.id} value={r.id}>{r.name}</option>
                                  ))}
                                </select>
                                <button onClick={()=>handleAssignBot(b.id)} disabled={!selectedRoom} className="p-1 bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30 disabled:opacity-30"><CheckCircle size={14}/></button>
                                <button onClick={()=>setAssigningBot(null)} className="p-1 bg-zinc-800 text-zinc-400 rounded hover:bg-zinc-700"><X size={14}/></button>
                              </>
                            ):(
                              b.status==='idle'
                                ?<button onClick={()=>setAssigningBot(b.id)} className="text-xs font-bold text-emerald-400 hover:text-emerald-300">{t.assignBot}</button>
                                :<button onClick={()=>handleRemoveBot(b.id)} className="text-xs font-bold text-red-400 hover:text-red-300">{t.removeBot}</button>
                            )}
                            <button onClick={()=>handleDeleteBot(b.id)}
                              className="ml-1 flex items-center gap-1 px-2 py-1 text-xs font-bold text-red-400 bg-red-400/10 hover:bg-red-400/20 rounded-lg transition-all">
                              <Trash2 size={12}/>{t.deleteBot}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {bots.length===0&&<tr><td colSpan={7} className="text-center py-12 text-zinc-600">{t.noBots}</td></tr>}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* ── NOTICE ── */}
          {activeTab==="notice" && (
            <motion.div key="notice" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}} className="space-y-4">
              <div className="flex justify-end">
                <button onClick={()=>{ setNoticeModal('add'); setNoticeForm({title:"",content:""}); setEditingNoticeId(null); }}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl text-sm">
                  <PlusCircle size={16}/>{t.addNotice}
                </button>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead><tr className="bg-zinc-800/50 border-b border-zinc-800">
                    <th className="px-5 py-3 text-xs font-bold uppercase text-zinc-500">제목</th>
                    <th className="px-5 py-3 text-xs font-bold uppercase text-zinc-500 hidden md:table-cell">내용</th>
                    <th className="px-5 py-3 text-xs font-bold uppercase text-zinc-500">날짜</th>
                    <th className="px-5 py-3 text-xs font-bold uppercase text-zinc-500 text-right">액션</th>
                  </tr></thead>
                  <tbody>
                    {notices.map(n=>(
                      <tr key={n.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20">
                        <td className="px-5 py-3 font-bold">{n.title}</td>
                        <td className="px-5 py-3 text-zinc-400 text-sm max-w-[260px] truncate hidden md:table-cell">{n.content}</td>
                        <td className="px-5 py-3 text-zinc-500 text-sm whitespace-nowrap">{new Date(n.created_at).toLocaleString('ko-KR',{year:'2-digit',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})}</td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={()=>{ setEditingNoticeId(n.id); setNoticeForm({title:n.title,content:n.content}); setNoticeModal('edit'); }}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-sky-400 bg-sky-400/10 hover:bg-sky-400/20 rounded-lg transition-all">
                              <Edit3 size={13}/>수정
                            </button>
                            <button
                              onClick={()=>handleDeleteNotice(n.id)}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-red-400 bg-red-400/10 hover:bg-red-400/20 rounded-lg transition-all">
                              <Trash2 size={13}/>삭제
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {notices.length===0&&<tr><td colSpan={4} className="text-center py-10 text-zinc-600">{t.noNotice}</td></tr>}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* ── SETTINGS ── */}
          {activeTab==="settings" && (
            <motion.div key="settings" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}}>
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead><tr className="bg-zinc-800/50 border-b border-zinc-800">
                    <th className="px-5 py-3 text-xs font-bold uppercase text-zinc-500">설정 항목</th>
                    <th className="px-5 py-3 text-xs font-bold uppercase text-zinc-500 hidden sm:table-cell">설명</th>
                    <th className="px-5 py-3 text-xs font-bold uppercase text-zinc-500">설정값</th>
                    <th className="px-5 py-3 text-xs font-bold uppercase text-zinc-500 text-right">편집</th>
                  </tr></thead>
                  <tbody>
                    {settings.map(s=>{
                      const lbl = SETTING_LABELS[s.key];
                      const displayLabel = lbl ? (language==='ko' ? lbl.ko : lbl.en) : s.key;
                      const desc = lbl?.desc;
                      return (
                        <tr key={s.key} className="border-b border-zinc-800/50 hover:bg-zinc-800/20">
                          <td className="px-5 py-3">
                            <div className="font-semibold text-sm text-white">{displayLabel}</div>
                            <div className="font-mono text-[10px] text-zinc-600 mt-0.5">{s.key}</div>
                          </td>
                          <td className="px-5 py-3 text-zinc-500 text-xs hidden sm:table-cell">{desc||'-'}</td>
                          <td className="px-5 py-3">
                            {editSetting?.key===s.key
                              ?<input autoFocus value={editSetting.value} onChange={e=>setEditSetting({key:s.key,value:e.target.value})}
                                onKeyDown={e=>{ if(e.key==='Enter') handleSaveSetting(); if(e.key==='Escape') setEditSetting(null); }}
                                className="bg-zinc-800 border border-emerald-500/50 rounded px-3 py-1.5 text-sm w-full max-w-xs focus:ring-1 focus:ring-emerald-500 outline-none"/>
                              :<span className={cn("text-sm", s.value ? "text-white" : "text-zinc-600 italic")}>{s.value || t.emptyValue}</span>}
                          </td>
                          <td className="px-5 py-3 text-right">
                            {editSetting?.key===s.key
                              ?<div className="flex justify-end gap-2">
                                <button onClick={handleSaveSetting} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20 rounded-lg"><Save size={13}/>{t.save}</button>
                                <button onClick={()=>setEditSetting(null)} className="px-2.5 py-1.5 text-xs font-bold text-zinc-500 bg-zinc-800 hover:bg-zinc-700 rounded-lg"><X size={13}/></button>
                              </div>
                              :<button onClick={()=>setEditSetting({key:s.key,value:s.value})} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-zinc-500 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-all"><Edit3 size={13}/>{t.colEdit}</button>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* ── HISTORY (게임이력) ── */}
          {activeTab==="history" && (
            <motion.div key="history" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}}>
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead><tr className="bg-zinc-800/50 border-b border-zinc-800">
                    {[t.colTable,t.colWinner,t.colPot,t.colDate].map(h=><th key={h} className="px-5 py-3 text-xs font-bold uppercase text-zinc-500">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {gameHistory.map(h=>(
                      <tr key={h.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20">
                        <td className="px-5 py-3 font-medium">{h.table_name}</td>
                        <td className="px-5 py-3 text-emerald-400 font-bold">{h.winner}</td>
                        <td className="px-5 py-3 text-amber-400 font-mono">{h.pot.toLocaleString()}젬</td>
                        <td className="px-5 py-3 text-zinc-500 text-sm">{new Date(h.created_at).toLocaleString('ko-KR',{year:'2-digit',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})}</td>
                      </tr>
                    ))}
                    {gameHistory.length===0&&<tr><td colSpan={4} className="text-center py-12 text-zinc-600">{t.noHistory}</td></tr>}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* ── PARTNERS (업체관리) ── */}
          {activeTab==="partners" && (
            <motion.div key="partners" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}}>
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead><tr className="bg-zinc-800/50 border-b border-zinc-800">
                    {["이름","잔액","상태","가입일","조작"].map(h=><th key={h} className="px-5 py-3 text-xs font-bold uppercase text-zinc-500">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {partners.map(p=>(
                      <tr key={p.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20">
                        <td className="px-5 py-3 font-bold">{p.name}</td>
                        <td className="px-5 py-3 text-amber-400 font-mono text-sm">{p.balance.toLocaleString()}원</td>
                        <td className="px-5 py-3"><span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold",p.status==='active'?"bg-emerald-400/10 text-emerald-400":"bg-zinc-700 text-zinc-500")}>{p.status}</span></td>
                        <td className="px-5 py-3 text-zinc-500 text-sm">{new Date(p.created_at).toLocaleDateString('ko-KR')}</td>
                        <td className="px-5 py-3">
                          <div className="flex gap-1.5">
                            <button onClick={()=>{setPartnerModal({partner:p,mode:'charge'});setPartnerAmount("");}} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20 rounded-lg"><PlusCircle size={13}/>+충전</button>
                            <button onClick={()=>{setPartnerModal({partner:p,mode:'deduct'});setPartnerAmount("");}} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-amber-400 bg-amber-400/10 hover:bg-amber-400/20 rounded-lg"><MinusCircle size={13}/>-삭감</button>
                            <button onClick={()=>handleDeletePartner(p.id)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-red-400 bg-red-400/10 hover:bg-red-400/20 rounded-lg"><Trash2 size={13}/>삭제</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {partners.length===0&&<tr><td colSpan={5} className="text-center py-12 text-zinc-600">{t.noPartners}</td></tr>}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* ── PARTNER FINANCE (업체입출금관리) ── */}
          {activeTab==="partnerFinance" && (
            <motion.div key="partnerFinance" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}}>
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead><tr className="bg-zinc-800/50 border-b border-zinc-800">
                    {[t.colPartner,t.colType,t.colAmount,t.colStatus,t.colDate,t.colPFAction].map(h=><th key={h} className="px-5 py-3 text-xs font-bold uppercase text-zinc-500">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {partnerFinance.map(f=>(
                      <tr key={f.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20">
                        <td className="px-5 py-3 font-medium">{f.partner_name}</td>
                        <td className="px-5 py-3"><span className={cn("px-2 py-0.5 rounded text-[10px] font-bold",f.type==='deposit'?"bg-emerald-400/10 text-emerald-400":"bg-amber-400/10 text-amber-400")}>{f.type==='deposit'?t.typeDeposit:t.typeWithdraw}</span></td>
                        <td className="px-5 py-3 font-mono text-sm">{f.type==='deposit'?'+':'-'}{f.amount.toLocaleString()}{t.wonUnit}</td>
                        <td className="px-5 py-3"><span className={cn("px-2 py-0.5 rounded text-[10px] font-bold",f.status==='approved'?"bg-emerald-400/10 text-emerald-400":"bg-amber-400/10 text-amber-400")}>{f.status==='approved'?t.statusCompleted:t.statusPending}</span></td>
                        <td className="px-5 py-3 text-zinc-500 text-sm">{new Date(f.created_at).toLocaleString('ko-KR',{year:'2-digit',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1.5">
                            <button onClick={()=>{setPfModal({record:f,mode:'charge'});setPfAmount("");}}
                              className="px-2.5 py-1 text-[11px] font-bold bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/30 rounded-lg transition-all whitespace-nowrap">
                              {t.pfChargeBtn}
                            </button>
                            <button onClick={()=>{setPfModal({record:f,mode:'exchange'});setPfAmount("");}}
                              className="px-2.5 py-1 text-[11px] font-bold bg-amber-500/15 text-amber-400 hover:bg-amber-500/30 rounded-lg transition-all whitespace-nowrap">
                              {t.pfExchangeBtn}
                            </button>
                            <button onClick={()=>handlePfDelete(f)}
                              className="px-2.5 py-1 text-[11px] font-bold bg-red-500/15 text-red-400 hover:bg-red-500/30 rounded-lg transition-all whitespace-nowrap">
                              {t.pfDeleteBtn}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {partnerFinance.length===0&&<tr><td colSpan={6} className="text-center py-12 text-zinc-600">{t.noPartnerFinance}</td></tr>}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* ── 게임 제어 모달 ── */}
      <AnimatePresence>
        {gameControlModal && (()=>{
          const u = gameControlModal;
          const ps = u.play_status||'offline';
          const isPlaying = ps==='playing';
          const handleForceAction = async()=>{
            if(!forceAction.action||!forceAction.reason){setGcMsg('액션과 사유를 입력하세요');return;}
            setGcLoading(true);setGcMsg(null);
            try{
              await axios.post(`${API}/api/admin/users/${u.id}/force-action`,{...forceAction,admin_id:'admin'});
              setGcMsg('✅ 강제 액션 처리 완료');await fetchAll();
              setForceAction({action:'',reason:'',amount:''});
            }catch(e:any){setGcMsg('❌ '+e.message);}finally{setGcLoading(false);}
          };
          const handleCardSwap = async()=>{
            if(!cardSwap.new_cards||!cardSwap.reason){setGcMsg('카드와 사유를 입력하세요');return;}
            setGcLoading(true);setGcMsg(null);
            try{
              await axios.post(`${API}/api/admin/users/${u.id}/swap-cards`,{...cardSwap,admin_id:'admin'});
              setGcMsg('✅ 카드 교체 완료 (Audit 기록됨)');await fetchAll();
              setCardSwap({new_cards:'',reason:''});
            }catch(e:any){setGcMsg('❌ '+e.message);}finally{setGcLoading(false);}
          };
          const handleForceEndRoom = async()=>{
            if(!forceAction.reason){setGcMsg('종료 사유를 입력하세요');return;}
            if(!confirm('정말 게임방을 강제 종료하시겠습니까?'))return;
            setGcLoading(true);setGcMsg(null);
            try{
              await axios.post(`${API}/api/admin/rooms/${u.room_id}/force-end`,{reason:forceAction.reason,admin_id:'admin'});
              setGcMsg('✅ 게임방 강제 종료됨');await fetchAll();
            }catch(e:any){setGcMsg('❌ '+e.message);}finally{setGcLoading(false);}
          };
          const tabBtn=(id:'info'|'cards'|'action'|'endroom',label:string,icon:string)=>(
            <button onClick={()=>{setGcTab(id);setGcMsg(null);}}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all",gcTab===id?"bg-blue-500 text-white":"bg-zinc-800 text-zinc-400 hover:bg-zinc-700")}>
              {icon} {label}
            </button>
          );
          return(
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.9}}
              className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-xl shadow-2xl">
              {/* 헤더 */}
              <div className="flex items-center justify-between p-5 border-b border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center text-lg">🎮</div>
                  <div>
                    <div className="font-bold text-base">{u.nickname} <span className="text-zinc-500 text-sm font-normal">({u.phone})</span></div>
                    <div className="text-xs text-zinc-500">실시간 게임 제어 콘솔</div>
                  </div>
                </div>
                <button onClick={()=>setGameControlModal(null)} className="text-zinc-500 hover:text-white"><X size={20}/></button>
              </div>
              {/* 탭 */}
              <div className="flex gap-2 px-5 pt-4">
                {tabBtn('info','게임 정보','📊')}
                {tabBtn('cards','카드 교체','🃏')}
                {tabBtn('action','강제 액션','⚡')}
                {tabBtn('endroom','방 종료','🚫')}
              </div>
              {/* 내용 */}
              <div className="p-5 space-y-3 min-h-[220px] max-h-[75vh] overflow-y-auto">
                {gcMsg&&<div className={cn("px-3 py-2 rounded-lg text-sm font-medium",gcMsg.startsWith('✅')?"bg-emerald-500/10 text-emerald-400":"bg-red-500/10 text-red-400")}>{gcMsg}</div>}

                {gcTab==='info'&&(
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {[
                      ['현재 게임방', u.room_name||'없음'],
                      ['방 유형', u.room_type||'—'],
                      ['테이블/좌석', u.table_no?`T${u.table_no}/S${u.seat_no}`:'—'],
                      ['게임 상태', u.play_status||'offline'],
                      ['핸드 상태', u.hand_status||'idle'],
                      ['현재 카드', u.current_cards||'—'],
                      ['플레이 시간', u.play_start?`${Math.floor((Date.now()-new Date(u.play_start).getTime())/60000)}분`:'—'],
                      ['젬 잔액', u.gems.toLocaleString()+'젬'],
                    ].map(([k,v])=>(
                      <div key={k} className="bg-zinc-800/50 rounded-xl px-3 py-2">
                        <div className="text-zinc-500 text-xs mb-0.5">{k}</div>
                        <div className="font-medium text-white">{v}</div>
                      </div>
                    ))}
                    <div className="col-span-2 flex gap-2 pt-1">
                      <button onClick={()=>{setGcTab('action');setForceAction({action:'kick_from_room',reason:'',amount:''});}}
                        className="flex-1 py-2 bg-amber-500/20 text-amber-400 rounded-xl text-sm font-bold hover:bg-amber-500/30">⬅ 강제 퇴장</button>
                      <button onClick={()=>setGcTab('action')}
                        className="flex-1 py-2 bg-blue-500/20 text-blue-400 rounded-xl text-sm font-bold hover:bg-blue-500/30">{t.gcSpectate}</button>
                    </div>
                  </div>
                )}

                {gcTab==='cards'&&(()=>{
                  // ── 52장 카드 데이터 정의
                  const SUITS = [
                    {key:'s', sym:'♠', label:'스페이드', color:'text-white'},
                    {key:'h', sym:'♥', label:'하트',     color:'text-red-400'},
                    {key:'d', sym:'♦', label:'다이아',   color:'text-red-400'},
                    {key:'c', sym:'♣', label:'클럽',     color:'text-white'},
                  ];
                  const RANKS = ['A','K','Q','J','10','9','8','7','6','5','4','3','2'];
                  const ALL_CARDS = SUITS.flatMap(s=>RANKS.map(r=>({id:`${r}${s.key}`,rank:r,suit:s.key,sym:s.sym,color:s.color})));

                  // 이미 사용중인 카드 (현재 플레이어 카드)
                  const usedCards = (u.current_cards||'').split('|').map(c=>c.trim()).filter(Boolean);

                  // 필터 적용
                  const visibleCards = ALL_CARDS.filter(card=>{
                    if(cardFilter!=='all' && card.suit!==cardFilter) return false;
                    if(showOnlyRemaining && usedCards.includes(card.id)) return false;
                    return true;
                  });

                  const toggleCard = (cardId:string) => {
                    if(usedCards.includes(cardId)) return; // 사용중 카드 선택 불가
                    setSelectedCards(prev=>{
                      if(prev.includes(cardId)) return prev.filter(c=>c!==cardId);
                      if(prev.length>=2) return [...prev.slice(1),cardId]; // 최대 2장
                      return [...prev,cardId];
                    });
                  };

                  const handleRandomPick = () => {
                    const available = ALL_CARDS.filter(c=>!usedCards.includes(c.id) && !selectedCards.includes(c.id));
                    const shuffled = available.sort(()=>Math.random()-0.5);
                    const picks = shuffled.slice(0,2).map(c=>c.id);
                    setSelectedCards(picks);
                  };

                  const handleCardSwapVisual = async()=>{
                    if(selectedCards.length!==2||!cardSwap.reason){setGcMsg('카드 2장 선택과 사유는 필수입니다');return;}
                    if(!cardConfirmStep){setCardConfirmStep(true);return;}
                    setGcLoading(true);setGcMsg(null);setCardConfirmStep(false);
                    try{
                      const newCards = selectedCards.join('|');
                      await axios.post(`${API}/api/admin/users/${u.id}/swap-cards`,{new_cards:newCards,reason:cardSwap.reason,admin_id:'admin'});
                      setGcMsg('✅ 카드 교체 완료 (Audit 기록됨)');
                      setSelectedCards([]);
                      setCardSwap(p=>({...p,new_cards:''}));
                      await fetchAll();
                    }catch(e:any){setGcMsg('❌ '+e.message);}finally{setGcLoading(false);}
                  };

                  // 카드 한글 표기 헬퍼
                  const cardLabel = (id:string) => {
                    const c = ALL_CARDS.find(x=>x.id===id);
                    return c ? `${c.sym}${c.rank}` : id;
                  };

                  return (
                  <div className="space-y-3">
                    {/* 현재 카드 표시 */}
                    <div className="flex items-center gap-3 bg-zinc-800/60 rounded-xl p-3">
                      <span className="text-xs text-zinc-500 shrink-0">현재 카드:</span>
                      <div className="flex gap-2">
                        {usedCards.length>0 ? usedCards.map(cid=>{
                          const c=ALL_CARDS.find(x=>x.id===cid);
                          return c?(
                            <div key={cid} className={cn(
                              "w-10 h-14 rounded-lg border-2 border-zinc-600 bg-white flex flex-col items-center justify-center shadow-md",
                              c.suit==='h'||c.suit==='d'?"text-red-500":"text-zinc-900"
                            )}>
                              <span className="text-[10px] font-black leading-none">{c.rank}</span>
                              <span className="text-base leading-none">{c.sym}</span>
                            </div>
                          ):null;
                        }) : <span className="text-zinc-600 text-sm">없음</span>}
                      </div>
                      {selectedCards.length===2&&(
                        <>
                          <span className="text-zinc-500 text-sm">→</span>
                          <div className="flex gap-2">
                            {selectedCards.map(cid=>{
                              const c=ALL_CARDS.find(x=>x.id===cid);
                              return c?(
                                <div key={cid} className={cn(
                                  "w-10 h-14 rounded-lg border-2 border-amber-400 bg-white flex flex-col items-center justify-center shadow-lg ring-2 ring-amber-400/40",
                                  c.suit==='h'||c.suit==='d'?"text-red-500":"text-zinc-900"
                                )}>
                                  <span className="text-[10px] font-black leading-none">{c.rank}</span>
                                  <span className="text-base leading-none">{c.sym}</span>
                                </div>
                              ):null;
                            })}
                          </div>
                        </>
                      )}
                    </div>

                    {/* 필터 툴바 */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {[{k:'all',l:'전체'},
                        {k:'s',l:'♠'},
                        {k:'h',l:'♥'},
                        {k:'d',l:'♦'},
                        {k:'c',l:'♣'},
                      ].map(({k,l})=>(
                        <button key={k} onClick={()=>setCardFilter(k)}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-xs font-bold transition-all border",
                            cardFilter===k
                              ?"bg-blue-500 border-blue-400 text-white"
                              :"bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600",
                            (k==='h'||k==='d')&&cardFilter===k?"text-white":"",
                            (k==='h'||k==='d')&&cardFilter!==k?"text-red-400":""
                          )}>{l}</button>
                      ))}
                      <label className="flex items-center gap-1.5 ml-auto text-xs text-zinc-400 cursor-pointer">
                        <input type="checkbox" checked={showOnlyRemaining} onChange={e=>setShowOnlyRemaining(e.target.checked)} className="accent-blue-500"/>
                        남은 카드만
                      </label>
                      <button onClick={handleRandomPick}
                        className="px-2.5 py-1 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg text-xs font-bold hover:bg-purple-500/30">
                        🎲 랜덤
                      </button>
                    </div>

                    {/* 52장 카드 그리드 */}
                    <div className="bg-zinc-900 rounded-xl p-2 max-h-48 overflow-y-auto">
                      {SUITS.filter(s=>cardFilter==='all'||s.key===cardFilter).map(suit=>(
                        <div key={suit.key} className="mb-2 last:mb-0">
                          <div className={cn("text-[10px] font-bold mb-1 px-1",suit.color)}>{suit.sym} {suit.label}</div>
                          <div className="flex flex-wrap gap-1">
                            {RANKS.map(rank=>{
                              const cardId=`${rank}${suit.key}`;
                              const isUsed=usedCards.includes(cardId);
                              const isSelected=selectedCards.includes(cardId);
                              return (
                                <button key={cardId}
                                  onClick={()=>toggleCard(cardId)}
                                  disabled={isUsed}
                                  title={isUsed?'이미 사용중':'클릭하여 선택'}
                                  className={cn(
                                    "w-8 h-11 rounded border flex flex-col items-center justify-center transition-all duration-150 text-[9px] font-black leading-none relative",
                                    isUsed
                                      ?"bg-zinc-800/30 border-zinc-800 opacity-30 cursor-not-allowed"
                                      :isSelected
                                        ?"bg-white border-amber-400 border-2 ring-2 ring-amber-400/50 scale-110 shadow-lg shadow-amber-400/20 z-10"
                                        :"bg-white border-zinc-300 hover:border-blue-400 hover:scale-105 hover:shadow-md cursor-pointer",
                                    (suit.key==='h'||suit.key==='d')&&!isUsed?"text-red-500":"",
                                    (suit.key==='s'||suit.key==='c')&&!isUsed?"text-zinc-900":"",
                                  )}>
                                  <span className="leading-none">{rank}</span>
                                  <span className="text-sm leading-none">{suit.sym}</span>
                                  {isSelected&&(
                                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-400 rounded-full text-[8px] text-zinc-900 flex items-center justify-center font-black">
                                      {selectedCards.indexOf(cardId)+1}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 선택된 카드 표시 */}
                    <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800/40 rounded-xl text-sm">
                      <span className="text-zinc-500 text-xs shrink-0">선택:</span>
                      {selectedCards.length===0
                        ?<span className="text-zinc-600 text-xs">카드를 클릭하여 2장 선택 (순서대로)</span>
                        :<div className="flex gap-2 items-center">
                          {selectedCards.map((cid,i)=>(
                            <span key={cid} className="flex items-center gap-1">
                              <span className="text-xs text-zinc-500">{i+1}.</span>
                              <span className={cn("font-bold text-sm",
                                ALL_CARDS.find(x=>x.id===cid)?.suit==='h'||ALL_CARDS.find(x=>x.id===cid)?.suit==='d'
                                  ?"text-red-400":"text-white"
                              )}>{cardLabel(cid)}</span>
                              <button onClick={()=>setSelectedCards(p=>p.filter(c=>c!==cid))} className="text-zinc-600 hover:text-red-400 text-xs ml-0.5">✕</button>
                            </span>
                          ))}
                          {selectedCards.length===2&&<span className="ml-1 text-emerald-400 text-xs">✓ 2장 선택 완료</span>}
                        </div>
                      }
                    </div>

                    {/* 사유 입력 */}
                    <input value={cardSwap.reason} onChange={e=>setCardSwap(p=>({...p,reason:e.target.value}))}
                      placeholder="교체 사유 *필수 입력 (감사로그 영구 기록)" 
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500"/>

                    {/* 확인창 */}
                    {cardConfirmStep&&selectedCards.length===2&&(
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-sm space-y-2">
                        <div className="font-bold text-amber-400">⚠️ 정말 교체하시겠습니까?</div>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-zinc-400">기존:</span>
                          <span className="font-bold text-white">{usedCards.map(c=>cardLabel(c)).join(' ')||'없음'}</span>
                          <span className="text-zinc-500">→</span>
                          <span className="text-zinc-400">변경:</span>
                          <span className="font-bold text-amber-400">{selectedCards.map(c=>cardLabel(c)).join(' ')}</span>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={handleCardSwapVisual} disabled={gcLoading}
                            className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-sm disabled:opacity-40">
                            {gcLoading?'처리중...':'✅ YES — 교체 확정'}
                          </button>
                          <button onClick={()=>setCardConfirmStep(false)}
                            className="flex-1 py-2 bg-zinc-700 hover:bg-zinc-600 text-white font-bold rounded-xl text-sm">
                            ❌ NO — 취소
                          </button>
                        </div>
                      </div>
                    )}

                    {/* 교체 버튼 */}
                    {!cardConfirmStep&&(
                      <button onClick={handleCardSwapVisual}
                        disabled={gcLoading||selectedCards.length!==2||!cardSwap.reason}
                        className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-sm disabled:opacity-40 transition-all">
                        {gcLoading?'처리중...':`🃏 카드 교체 확정 (${selectedCards.map(c=>cardLabel(c)).join(' + ')||'카드 2장 선택 필요'})`}
                      </button>
                    )}
                    <div className="text-xs text-zinc-600 text-center">⚠ ROOT/SUPER_ADMIN 전용 · Audit Log 영구 기록</div>
                  </div>
                  );
                })()}

                {gcTab==='action'&&(
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        {a:'fold',label:'Fold',color:'bg-red-500/20 text-red-400'},
                        {a:'check',label:'Check',color:'bg-blue-500/20 text-blue-400'},
                        {a:'call',label:'Call',color:'bg-emerald-500/20 text-emerald-400'},
                        {a:'raise',label:'Raise',color:'bg-purple-500/20 text-purple-400'},
                        {a:'allin',label:'All-in',color:'bg-orange-500/20 text-orange-400'},
                        {a:'disconnect',label:'Disconnect',color:'bg-zinc-500/30 text-zinc-400'},
                        {a:'timeout',label:'Timeout',color:'bg-yellow-500/20 text-yellow-400'},
                        {a:'kick_from_room',label:'강제퇴장',color:'bg-red-500/20 text-red-400'},
                      ].map(({a,label,color})=>(
                        <button key={a} onClick={()=>setForceAction(p=>({...p,action:a}))}
                          className={cn("py-2 rounded-xl text-xs font-bold border-2 transition-all",
                            forceAction.action===a?'border-white':'border-transparent',color)}>
                          {label}
                        </button>
                      ))}
                    </div>
                    <input value={forceAction.reason} onChange={e=>setForceAction(p=>({...p,reason:e.target.value}))}
                      placeholder="강제 액션 사유 *필수 입력" className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"/>
                    <button onClick={handleForceAction} disabled={gcLoading||!forceAction.action||!forceAction.reason}
                      className="w-full py-2.5 bg-red-500 hover:bg-red-400 text-white font-bold rounded-xl text-sm disabled:opacity-40 transition-all">
                      {gcLoading?'처리중...':`⚡ ${forceAction.action||'액션 선택'} 강제 실행`}
                    </button>
                  </div>
                )}

                {gcTab==='endroom'&&(
                  <div className="space-y-3">
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-400">
                      ⚠️ <strong>게임방 강제 종료</strong> — 해당 방의 모든 플레이어가 퇴장됩니다.
                    </div>
                    <div className="bg-zinc-800/50 rounded-xl p-3 text-sm">
                      <span className="text-zinc-500">대상 방: </span>
                      <span className="font-bold">{u.room_name||'—'}</span>
                    </div>
                    <input value={forceAction.reason} onChange={e=>setForceAction(p=>({...p,reason:e.target.value}))}
                      placeholder="종료 사유 *필수 입력 (영구 기록됨)" className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-red-500"/>
                    <button onClick={handleForceEndRoom} disabled={gcLoading||!forceAction.reason||!u.room_id}
                      className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-sm disabled:opacity-40 transition-all">
                      {gcLoading?t.gcProcessing:t.gcEndRoomBtn}
                    </button>
                    {!u.room_id&&<div className="text-xs text-zinc-600 text-center">현재 방에 없는 사용자입니다</div>}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
          );
        })()}
      </AnimatePresence>

      {/* ── 파트너 충전/삭감 모달 ── */}
      <AnimatePresence>
        {partnerModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.9}}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
              <h3 className="font-bold text-lg mb-1">{partnerModal.mode==='charge'?t.partnerCharge:t.partnerDeduct}</h3>
              <p className="text-zinc-400 text-sm mb-4">{partnerModal.partner.name} · 현재 {partnerModal.partner.balance.toLocaleString()}원</p>
              <input type="number" placeholder={t.partnerAmountPlaceholder} value={partnerAmount} onChange={e=>setPartnerAmount(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500/50 outline-none mb-4"/>
              <div className="flex gap-3">
                <button onClick={handlePartnerAction} disabled={!partnerAmount}
                  className={cn("flex-1 font-bold py-3 rounded-xl transition-all disabled:opacity-30",partnerModal.mode==='charge'?"bg-emerald-500 hover:bg-emerald-400 text-zinc-950":"bg-amber-500 hover:bg-amber-400 text-zinc-950")}>
                  {partnerModal.mode==='charge'?t.partnerChargeConfirm:t.partnerDeductConfirm}
                </button>
                <button onClick={()=>setPartnerModal(null)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 font-bold py-3 rounded-xl">{t.cancel}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 젬 지급/차감 모달 ── */}
      <AnimatePresence>
        {gemModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.9}}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
              <h3 className="font-bold text-lg mb-1">{gemModal.mode==='give'?t.gemGive:t.gemDeduct}</h3>
              <p className="text-zinc-400 text-sm mb-4">{gemModal.user.nickname} ({gemModal.user.phone}) · 현재 {gemModal.user.gems.toLocaleString()}젬</p>
              <div className="space-y-3">
                <input type="number" placeholder={t.gemAmountPlaceholder} value={gemAmount} onChange={e=>setGemAmount(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500/50 outline-none"/>
                <input type="text" placeholder={t.gemMemoPlaceholder} value={gemMemo} onChange={e=>setGemMemo(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500/50 outline-none"/>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={handleGemAction} disabled={!gemAmount}
                  className={cn("flex-1 font-bold py-3 rounded-xl transition-all disabled:opacity-30",gemModal.mode==='give'?"bg-emerald-500 hover:bg-emerald-400 text-zinc-950":"bg-amber-500 hover:bg-amber-400 text-zinc-950")}>
                  {gemModal.mode==='give'?t.gemGiveBtn:t.gemDeductBtn}
                </button>
                <button onClick={()=>setGemModal(null)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 font-bold py-3 rounded-xl">{t.cancel}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 거절 메모 모달 ── */}
      <AnimatePresence>
        {rejectModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.9}}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
              <h3 className="font-bold text-lg mb-4 text-red-400">{t.rejectTitle}</h3>
              <textarea value={rejectMemo} onChange={e=>setRejectMemo(e.target.value)} placeholder={t.rejectReasonPlaceholder} rows={3}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500/50 outline-none resize-none"/>
              <div className="flex gap-3 mt-4">
                <button onClick={rejectModal.type==='recharge'?handleRechargeReject:handleExchangeReject}
                  className="flex-1 bg-red-500 hover:bg-red-400 text-white font-bold py-3 rounded-xl">{t.rejectConfirm}</button>
                <button onClick={()=>setRejectModal(null)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 font-bold py-3 rounded-xl">{t.cancel}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 게임방 생성 모달 ── */}
      <AnimatePresence>
        {roomAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.9}}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-lg flex items-center gap-2"><Gamepad2 size={18} className="text-emerald-400"/>{t.roomCreateTitle}</h3>
                <button onClick={()=>setRoomAddModal(false)} className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg"><X size={18}/></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-zinc-400 mb-1.5 block uppercase tracking-wider">{t.roomNameLabel}</label>
                  <input type="text" placeholder={t.roomNamePlaceholder} value={roomForm.name}
                    onChange={e=>setRoomForm(p=>({...p,name:e.target.value}))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500/50 outline-none text-sm"/>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-zinc-400 mb-1.5 block uppercase tracking-wider">{t.roomTypeLabel}</label>
                    <select value={roomForm.type} onChange={e=>setRoomForm(p=>({...p,type:e.target.value}))}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-3 outline-none text-sm">
                      <option value="tournament">tournament</option>
                      <option value="cash">cash</option>
                      <option value="private">private</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-400 mb-1.5 block uppercase tracking-wider">{t.roomVisibilityLabel}</label>
                    <select value={roomForm.visibility} onChange={e=>setRoomForm(p=>({...p,visibility:e.target.value}))}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-3 outline-none text-sm">
                      <option value="public">public</option>
                      <option value="private">private</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-zinc-400 mb-1.5 block uppercase tracking-wider">{t.roomBuyInLabel}</label>
                    <input type="number" value={roomForm.buy_in_gems} onChange={e=>setRoomForm(p=>({...p,buy_in_gems:e.target.value}))}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-3 outline-none text-sm"/>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-400 mb-1.5 block uppercase tracking-wider">{t.roomMaxPlayersLabel}</label>
                    <input type="number" value={roomForm.max_players} onChange={e=>setRoomForm(p=>({...p,max_players:e.target.value}))}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-3 outline-none text-sm"/>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-400 mb-1.5 block uppercase tracking-wider">{t.roomBlindsLabel}</label>
                  <input type="text" placeholder="100/200" value={roomForm.blinds} onChange={e=>setRoomForm(p=>({...p,blinds:e.target.value}))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none text-sm"/>
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={handleCreateRoom} disabled={!roomForm.name}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold py-3 rounded-xl disabled:opacity-30 transition-all">
                  <PlusCircle size={16}/>{t.roomCreateBtn}
                </button>
                <button onClick={()=>setRoomAddModal(false)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 font-bold py-3 rounded-xl">{t.cancel}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 파트너파이낸스 충전/환전 모달 ── */}
      <AnimatePresence>
        {pfModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.9}}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  {pfModal.mode==='charge'
                    ? <><span className="text-emerald-400 text-xl">+</span>{t.pfChargeModalTitle}</>
                    : <><span className="text-amber-400 text-xl">-</span>{t.pfExchangeModalTitle}</>}
                </h3>
                <button onClick={()=>setPfModal(null)} className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg"><X size={18}/></button>
              </div>
              <div className="mb-4 p-3 bg-zinc-800/50 rounded-xl text-sm text-zinc-400">
                <span className="font-bold text-zinc-200">{pfModal.record.partner_name}</span>
                <span className="mx-2">·</span>
                <span className={pfModal.record.type==='deposit'?"text-emerald-400":"text-amber-400"}>
                  {pfModal.record.type==='deposit'?t.typeDeposit:t.typeWithdraw}
                </span>
                <span className="mx-2">·</span>
                <span className="font-mono">{pfModal.record.amount.toLocaleString()}{t.wonUnit}</span>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-zinc-400 mb-1.5 block uppercase tracking-wider">{t.pfAmountLabel}</label>
                  <input type="number" placeholder={t.pfAmountPlaceholder} value={pfAmount}
                    onChange={e=>setPfAmount(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500/50 outline-none text-sm"
                    autoFocus/>
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                {pfModal.mode==='charge'
                  ? <button onClick={handlePfCharge} disabled={!pfAmount||parseInt(pfAmount)<=0}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold py-3 rounded-xl disabled:opacity-30 transition-all">
                      {t.pfConfirmCharge}
                    </button>
                  : <button onClick={handlePfExchange} disabled={!pfAmount||parseInt(pfAmount)<=0}
                      className="flex-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold py-3 rounded-xl disabled:opacity-30 transition-all">
                      {t.pfConfirmExchange}
                    </button>
                }
                <button onClick={()=>setPfModal(null)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 font-bold py-3 rounded-xl">{t.cancel}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 로봇 추가 모달 ── */}
      <AnimatePresence>
        {botAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.9}}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-lg flex items-center gap-2"><Bot size={18} className="text-emerald-400"/>{t.botAddTitle}</h3>
                <button onClick={()=>setBotAddModal(false)} className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg"><X size={18}/></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-zinc-400 mb-1.5 block uppercase tracking-wider">{t.botNameLabel}</label>
                  <input type="text" placeholder={t.botNamePlaceholder} value={botForm.name}
                    onChange={e=>setBotForm(p=>({...p,name:e.target.value}))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500/50 outline-none text-sm"/>
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-400 mb-1.5 block uppercase tracking-wider">{t.botDifficultyLabel}</label>
                  <select value={botForm.difficulty} onChange={e=>setBotForm(p=>({...p,difficulty:e.target.value}))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none text-sm">
                    <option value="easy">{t.botDiffEasy}</option>
                    <option value="medium">{t.botDiffMedium}</option>
                    <option value="hard">{t.botDiffHard}</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-400 mb-1.5 block uppercase tracking-wider">{t.botStyleLabel}</label>
                  <select value={botForm.style} onChange={e=>setBotForm(p=>({...p,style:e.target.value}))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none text-sm">
                    <option value="balanced">{t.botStyleBalanced}</option>
                    <option value="aggressive">{t.botStyleAggressive}</option>
                    <option value="conservative">{t.botStyleConservative}</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-400 mb-1.5 block uppercase tracking-wider">{t.botChipsLabel}</label>
                  <input type="number" placeholder="50000" value={botForm.chips}
                    onChange={e=>setBotForm(p=>({...p,chips:e.target.value}))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500/50 outline-none text-sm"/>
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-400 mb-1.5 block uppercase tracking-wider">{t.botRoomLabel}</label>
                  <select value={botForm.room} onChange={e=>setBotForm(p=>({...p,room:e.target.value}))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none text-sm text-zinc-300">
                    <option value="">{t.botRoomPlaceholder}</option>
                    {gameRooms.filter(r=>r.status==='open').map(r=>(
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={handleAddBot} disabled={!botForm.name}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold py-3 rounded-xl disabled:opacity-30 transition-all">
                  <PlusCircle size={16}/>{t.botAddBtn}
                </button>
                <button onClick={()=>setBotAddModal(false)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 font-bold py-3 rounded-xl">{t.cancel}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 공지 등록 / 수정 모달 ── */}
      <AnimatePresence>
        {noticeModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.9}}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
              {/* 헤더 */}
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  {noticeModal==='edit'
                    ? <><Edit3 size={18} className="text-sky-400"/>{t.noticeEditTitle}</>
                    : <><PlusCircle size={18} className="text-emerald-400"/>{t.noticeAddTitle}</>}
                </h3>
                <button onClick={()=>{setNoticeModal(false);setEditingNoticeId(null);}} className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg"><X size={18}/></button>
              </div>
              {/* 폼 */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-zinc-400 mb-1.5 block uppercase tracking-wider">{t.noticeTitleLabel}</label>
                  <input type="text" placeholder={t.noticeTitlePlaceholder} value={noticeForm.title}
                    onChange={e=>setNoticeForm(p=>({...p,title:e.target.value}))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500/50 outline-none text-sm placeholder-zinc-600"/>
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-400 mb-1.5 block uppercase tracking-wider">{t.noticeContentLabel}</label>
                  <textarea placeholder={t.noticeContentPlaceholder} value={noticeForm.content}
                    onChange={e=>setNoticeForm(p=>({...p,content:e.target.value}))} rows={5}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500/50 outline-none resize-none text-sm placeholder-zinc-600"/>
                </div>
              </div>
              {/* 버튼 */}
              <div className="flex gap-3 mt-5">
                {noticeModal==='edit'
                  ? <button onClick={handleEditNotice} disabled={!noticeForm.title}
                      className="flex-1 flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold py-3 rounded-xl disabled:opacity-30 transition-all">
                      <Save size={16}/>{t.noticeSaveBtn}
                    </button>
                  : <button onClick={handleAddNotice} disabled={!noticeForm.title}
                      className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold py-3 rounded-xl disabled:opacity-30 transition-all">
                      <PlusCircle size={16}/>{t.noticeAddBtn}
                    </button>}
                <button onClick={()=>{setNoticeModal(false);setEditingNoticeId(null);}}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 font-bold py-3 rounded-xl transition-all">{t.cancel}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
