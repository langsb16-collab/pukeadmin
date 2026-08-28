import { useState, useEffect, useCallback, useRef } from "react";
import {
  Users, Gamepad2, LogOut, ShieldCheck, Search, UserMinus, RefreshCw,
  Coins, Activity, LayoutDashboard, ChevronRight, Globe, ChevronDown,
  Wallet, Building2, CreditCard, Bot, History, Bell, Settings, X,
  CheckCircle, XCircle, PlusCircle, MinusCircle, UserCheck, Trash2,
  TrendingUp, AlertCircle, Edit3, Save, Calendar, Monitor, Smartphone
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import axios from "axios";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { translations, type Language } from "./translations";

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

const API = "";  // 같은 Origin – 상대경로

// ─── 설정키 다국어 레이블 맵 ───────────────────────────────────────
const SETTING_LABELS: Record<string, { ko: string; en: string; zh: string; desc_ko: string; desc_en: string; desc_zh: string }> = {
  announcement_ko:       { ko: "공지 (한국어)",      en: "Announcement (KO)",     zh: "公告（韩语）",       desc_ko: "한국어 공지사항 텍스트",          desc_en: "Korean announcement text",              desc_zh: "韩语公告文本" },
  announcement_en:       { ko: "공지 (영어)",        en: "Announcement (EN)",     zh: "公告（英语）",       desc_ko: "영어 공지사항 텍스트",            desc_en: "English announcement text",             desc_zh: "英语公告文本" },
  announcement_zh:       { ko: "공지 (중국어)",      en: "Announcement (ZH)",     zh: "公告（中文）",       desc_ko: "중국어 공지사항 텍스트",          desc_en: "Chinese announcement text",             desc_zh: "中文公告文本" },
  free_game_limit:       { ko: "무료게임 한도",       en: "Free Game Limit",       zh: "免费游戏限制",       desc_ko: "신규 가입 시 제공 무료 게임 수",  desc_en: "Free games given to new members",       desc_zh: "新会员赠送免费游戏次数" },
  gem_rate:              { ko: "젬 환율",            en: "Gem Rate",              zh: "筹码汇率",          desc_ko: "KRW 1원 = N 젬",               desc_en: "KRW 1 = N Gems",                        desc_zh: "韩元 1 = N 筹码" },
  maintenance:           { ko: "점검 모드",           en: "Maintenance Mode",      zh: "维护模式",          desc_ko: "true 설정 시 게임사이트 점검 처리", desc_en: "Set true to put site in maintenance",  desc_zh: "设为true时启用维护页面" },
  max_bet:               { ko: "최대 베팅",           en: "Max Bet",               zh: "最大下注",          desc_ko: "1회 최대 베팅 금액",              desc_en: "Maximum bet amount per round",           desc_zh: "每次最大下注金额" },
  max_players_per_table: { ko: "테이블 최대 인원",   en: "Max Players/Table",     zh: "桌子最大人数",      desc_ko: "테이블당 최대 플레이어",           desc_en: "Max players per table",                 desc_zh: "每桌最大玩家数" },
  min_bet:               { ko: "최소 베팅",           en: "Min Bet",               zh: "最小下注",          desc_ko: "1회 최소 베팅 금액",              desc_en: "Minimum bet amount per round",           desc_zh: "每次最小下注金额" },
  min_exchange:          { ko: "최소 환전금액",       en: "Min Exchange (gems)",   zh: "最小提现（筹码）",  desc_ko: "교환 신청 최소 젬 수량",           desc_en: "Minimum gems for exchange request",      desc_zh: "提现申请最小筹码数量" },
  min_recharge:          { ko: "최소 충전금액",       en: "Min Recharge (KRW)",    zh: "最小充值（韩元）",  desc_ko: "충전 신청 최소 원화",              desc_en: "Minimum KRW for recharge request",       desc_zh: "充值申请最小韩元金额" },
  rake_percent:          { ko: "수수료율 (%)",        en: "Rake (%)",              zh: "佣金率（%）",       desc_ko: "게임 판당 수수료 퍼센트",          desc_en: "Rake percentage per game round",         desc_zh: "每局游戏佣金百分比" },
  game_fee_percent:      { ko: "게임 수수료 (%)",     en: "Game Fee (%)",          zh: "游戏手续费（%）",   desc_ko: "게임 1판 총 베팅금액 기준 플랫폼 수수료 (1~20%)", desc_en: "Platform fee based on total bets per game (1~20%)", desc_zh: "每局总下注金额的平台手续费（1~20%）" },
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
interface Partner { id:number; name:string; balance:number; status:string; created_at:string; commission_rate?:number; referral_code?:string; sales?:number; }
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

// ─── VisitorStats 미니 대시보드 ──────────────────────────────────
interface VisitorStat { date:string; today:string; total:number; mobile:number; tablet:number; pc:number; }

// 중국 북경 기준 날짜 (UTC+8) — 모듈 레벨 헬퍼 (모바일 호환)
function getBJDate(): string {
  const d = new Date(Date.now() + 8 * 60 * 60 * 1000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function VisitorStats() {
  // nowBJ: 1분마다 갱신 → isToday 실시간 반영 + 자정 날짜 전환 감지
  const [nowBJ, setNowBJ] = useState<string>(getBJDate);
  const [selDate, setSelDate] = useState<string>(getBJDate);
  const [stat, setStat] = useState<VisitorStat|null>(null);
  const [loading, setLoading] = useState(false);
  const [showCal, setShowCal] = useState(false);
  const [calYear, setCalYear] = useState(() => parseInt(getBJDate().slice(0,4)));
  const [calMonth, setCalMonth] = useState(() => parseInt(getBJDate().slice(5,7)));
  const calRef = useRef<HTMLDivElement>(null);

  // 1분마다 북경 현재 날짜 갱신 (자정 넘으면 날짜 자동 전환)
  useEffect(()=>{
    const id = setInterval(()=> setNowBJ(getBJDate()), 60000);
    return ()=>clearInterval(id);
  },[]);

  const fetchStat = useCallback(async (date:string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/visitor-stats?date=${date}`);
      if (res.ok) { const d = await res.json(); setStat(d as VisitorStat); }
    } catch(_){}
    setLoading(false);
  },[]);

  useEffect(()=>{ fetchStat(selDate); },[selDate, fetchStat]);

  // 30초 자동 갱신 (오늘 날짜인 경우만 — 실시간 방문자 반영)
  useEffect(()=>{
    if (selDate !== nowBJ) return;
    const id = setInterval(()=>fetchStat(nowBJ), 30000);
    return ()=>clearInterval(id);
  },[selDate, nowBJ, fetchStat]);

  // 달력 외부 클릭 닫기
  useEffect(()=>{
    if (!showCal) return;
    const handler = (e:MouseEvent)=>{
      if (calRef.current && !calRef.current.contains(e.target as Node)) setShowCal(false);
    };
    document.addEventListener('mousedown', handler);
    return ()=>document.removeEventListener('mousedown', handler);
  },[showCal]);

  const fmt = (d:string) => {
    const [,m,day] = d.split('-');
    return `${parseInt(m)}.${parseInt(day)}`;
  };

  // 달력 렌더
  const daysInMonth = (y:number, m:number) => new Date(y,m,0).getDate();
  const firstDayOfWeek = (y:number, m:number) => new Date(y,m-1,1).getDay();

  const handleDateClick = (y:number, m:number, d:number) => {
    const mm = String(m).padStart(2,'0');
    const dd = String(d).padStart(2,'0');
    const dateStr = `${y}-${mm}-${dd}`;
    setSelDate(dateStr);
    setShowCal(false);
  };

  const prevMonth = () => {
    if (calMonth===1){ setCalMonth(12); setCalYear(y=>y-1); }
    else setCalMonth(m=>m-1);
  };
  const nextMonth = () => {
    if (calMonth===12){ setCalMonth(1); setCalYear(y=>y+1); }
    else setCalMonth(m=>m+1);
  };

  const isToday = selDate === nowBJ;
  const mobileTotal = stat ? stat.mobile + stat.tablet : 0;

  return (
    <div className="relative" ref={calRef}>
      {/* 미니 대시보드 카드 */}
      <div className="bg-zinc-900/70 border border-zinc-700 rounded-xl px-4 py-2.5 flex items-center gap-4 min-w-0 flex-wrap sm:flex-nowrap">
        {/* 날짜 버튼 */}
        <button
          onClick={()=>setShowCal(!showCal)}
          className="flex items-center gap-1.5 text-amber-400 hover:text-amber-300 transition-colors font-medium text-sm whitespace-nowrap"
        >
          <Calendar size={15} className="shrink-0"/>
          <span>{isToday ? `오늘 ${fmt(selDate)}` : fmt(selDate)}</span>
        </button>
        {/* 구분선 */}
        <div className="w-px h-5 bg-zinc-700 hidden sm:block shrink-0"/>
        {/* 방문자 수 */}
        {loading ? (
          <span className="text-zinc-500 text-xs">로딩중…</span>
        ) : stat ? (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-white font-semibold whitespace-nowrap">
              {stat.total.toLocaleString()}<span className="text-zinc-400 font-normal text-xs ml-0.5">명</span>
            </span>
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 whitespace-nowrap">
              <Smartphone size={12} className="text-emerald-400 shrink-0"/>
              <span className="text-emerald-300">{mobileTotal.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 whitespace-nowrap">
              <Monitor size={12} className="text-blue-400 shrink-0"/>
              <span className="text-blue-300">{stat.pc.toLocaleString()}</span>
            </div>
          </div>
        ) : (
          <span className="text-zinc-600 text-xs">-</span>
        )}
      </div>

      {/* 달력 팝업 */}
      {showCal && (
        <div className="absolute right-0 top-full mt-2 z-50 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl p-4 w-72">
          {/* 달력 헤더 */}
          <div className="flex items-center justify-between mb-3">
            <button onClick={prevMonth} className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors">
              <ChevronRight size={16} className="rotate-180"/>
            </button>
            <span className="text-sm font-semibold text-white">{calYear}년 {calMonth}월</span>
            <button onClick={nextMonth} className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors">
              <ChevronRight size={16}/>
            </button>
          </div>
          {/* 오늘로 */}
          <button
            onClick={()=>{
              const t=getBJDate();
              const y=parseInt(t.slice(0,4)); const m=parseInt(t.slice(5,7));
              setCalYear(y); setCalMonth(m); setSelDate(t); setShowCal(false);
            }}
            className="w-full text-xs text-amber-400 hover:text-amber-300 mb-3 text-right pr-1 transition-colors"
          >최근 일</button>
          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 text-center mb-1">
            {['일','월','화','수','목','금','토'].map((d,i)=>(
              <span key={d} className={cn("text-xs font-medium py-1", i===0?"text-red-400":i===6?"text-blue-400":"text-zinc-500")}>{d}</span>
            ))}
          </div>
          {/* 날짜 */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {Array.from({length: firstDayOfWeek(calYear,calMonth)}).map((_,i)=>(
              <span key={'e'+i}/>
            ))}
            {Array.from({length: daysInMonth(calYear,calMonth)}).map((_,i)=>{
              const d = i+1;
              const mm = String(calMonth).padStart(2,'0');
              const dd = String(d).padStart(2,'0');
              const dateStr = `${calYear}-${mm}-${dd}`;
              const isSel = dateStr === selDate;
              const isTdy = dateStr === nowBJ;
              const dayOfWeek = (firstDayOfWeek(calYear,calMonth)+i)%7;
              return (
                <button key={d} onClick={()=>handleDateClick(calYear,calMonth,d)}
                  className={cn(
                    "text-sm w-8 h-8 mx-auto rounded-full transition-all flex items-center justify-center",
                    isSel ? "bg-amber-500 text-black font-bold" :
                    isTdy ? "bg-emerald-500/20 text-emerald-400 font-semibold ring-1 ring-emerald-500/50" :
                    dayOfWeek===0 ? "text-red-400 hover:bg-zinc-800" :
                    dayOfWeek===6 ? "text-blue-400 hover:bg-zinc-800" :
                    "text-zinc-300 hover:bg-zinc-800"
                  )}
                >{d}</button>
              );
            })}
          </div>
          {/* 선택 날짜 통계 미리보기 */}
          {stat && (
            <div className="mt-3 pt-3 border-t border-zinc-800 text-xs text-zinc-400 flex items-center justify-between">
              <span className="text-zinc-500">{selDate}</span>
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold">{stat.total.toLocaleString()}명</span>
                <span className="text-emerald-400 flex items-center gap-0.5"><Smartphone size={10}/>{mobileTotal.toLocaleString()}</span>
                <span className="text-blue-400 flex items-center gap-0.5"><Monitor size={10}/>{stat.pc.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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
  // 하부대리점 수정 모달
  const [agencyEditModal, setAgencyEditModal] = useState<Partner|null>(null);
  const [agencyEditForm, setAgencyEditForm] = useState({name:"",commission_rate:"",referral_code:""});
  const [agencyEditError, setAgencyEditError] = useState<string|null>(null);
  // Toast 알림
  const [toast, setToast] = useState<{msg:string,type:'ok'|'err'}|null>(null);
  const showToast = (msg:string, type:'ok'|'err'='ok') => {
    setToast({msg,type}); setTimeout(()=>setToast(null), 2500);
  };
  const [roomAddModal, setRoomAddModal] = useState(false);
  const [roomForm, setRoomForm] = useState({name:"",type:"tournament",buy_in_gems:"100000",max_players:"9",blinds:"100/200",visibility:"public",password:""});
  // 5가지 유형별 모달 상태
  const [roomTypeModal, setRoomTypeModal] = useState<'club'|'mtt'|'sng'|'omaha'|'shortdeck'|null>(null);
  const [clubForm, setClubForm] = useState({name:"",buy_in_gems:"100000",max_players:"9",blinds:"100/200",visibility:"private",club_description:"",club_members_limit:"50"});
  const [mttForm, setMttForm]   = useState({name:"",buy_in_gems:"50000",max_players:"9",blinds:"100/200",visibility:"public",mtt_max_tables:"4",mtt_start_time:"",mtt_rebuy_allowed:false});
  const [sngForm, setSngForm]   = useState({name:"",buy_in_gems:"30000",max_players:"6",blinds:"50/100",visibility:"public",sng_start_players:"6",sng_prize_structure:"50/30/20"});
  const [omahaForm, setOmahaForm] = useState({name:"",buy_in_gems:"100000",max_players:"6",blinds:"100/200",visibility:"public",omaha_variant:"PLO"});
  const [shortForm, setShortForm] = useState({name:"",buy_in_gems:"100000",max_players:"6",blinds:"100/200",visibility:"public",short_deck_ante:"100"});
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
      const [statsR,usersR,roomsR,rechargeR,exchangeR,botsR,noticesR,settingsR,histR,partnersR,pfR,agenciesR] = await Promise.all([
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
        axios.get(`${API}/api/admin/agencies`),
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
        if (newRecharge > 0) msg.push(`${t.alertRecharge} ${newRecharge}${t.alertUnit}`);
        if (newExchange > 0) msg.push(`${t.alertExchange} ${newExchange}${t.alertUnit}`);
        setAlertBanner(`${t.alertBannerPending} ${msg.join(' / ')} ${t.alertBannerSuffix}`);
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
      setPartners(agenciesR.data);
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
  }
  // ── 충전/환전 삭제
  const handleRechargeDelete = async (id:number) => {
    if (!window.confirm('이 충전 내역을 삭제하시겠습니까?')) return;
    await axios.delete(`${API}/api/admin/recharge/${id}`); fetchAll();
  }
  const handleExchangeDelete = async (id:number) => {
    if (!window.confirm('이 환전 내역을 삭제하시겠습니까?')) return;
    await axios.delete(`${API}/api/admin/exchange/${id}`); fetchAll();
  };

  // ── 봇 추가
  // ── 파트너파이낸스 액션 핸들러
  const handlePfCharge = async () => {
    if (!pfModal||!pfAmount) return;
    const amt = parseInt(pfAmount.replace(/,/g,''))||0;
    if (amt<=0) return;
    // 파트너 이름으로 파트너 목록에서 id 찾기
    const partner = partners.find(p=>p.name===pfModal.record.partner_name);
    if (!partner) { alert(t.noPartners); return; }
    await axios.post(`${API}/api/admin/partners/charge`,{id:partner.id,amount:amt});
    setPfModal(null); setPfAmount(""); fetchAll();
  };
  const handlePfExchange = async () => {
    if (!pfModal||!pfAmount) return;
    const amt = parseInt(pfAmount.replace(/,/g,''))||0;
    if (amt<=0) return;
    const partner = partners.find(p=>p.name===pfModal.record.partner_name);
    if (!partner) { alert(t.noPartners); return; }
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
    if (!window.confirm(t.confirmDeleteBot)) return;
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
    if (!window.confirm(t.confirmDeleteNotice)) return;
    await axios.delete(`${API}/api/admin/notices/${id}`); fetchAll();
  };

  // ── 설정 저장
  const handleSaveSetting = async () => {
    if (!editSetting) return;
    // game_fee_percent: 전용 API 사용 + 검증
    if (editSetting.key === 'game_fee_percent') {
      const fee = parseFloat(editSetting.value);
      if (isNaN(fee)||fee<1||fee>20) { showToast(t.gameFeeError,'err'); return; }
      try {
        await axios.put(`${API}/api/admin/settings/game-fee`,{game_fee_percent:fee});
        showToast(t.gameFeeSuccess,'ok');
      } catch(e:any){ showToast(e.response?.data?.message||t.gameFeeError,'err'); return; }
    } else {
      await axios.post(`${API}/api/admin/settings`,editSetting);
    }
    setEditSetting(null); fetchAll();
  };

  // ── 게임방 생성
  const handleCreateRoom = async () => {
    if (!roomForm.name) return;
    await axios.post(`${API}/api/admin/rooms/create`, {...roomForm, buy_in_gems:parseInt(roomForm.buy_in_gems)||100000, max_players:parseInt(roomForm.max_players)||9});
    setRoomAddModal(false); setRoomForm({name:"",type:"tournament",buy_in_gems:"100000",max_players:"9",blinds:"100/200",visibility:"public",password:""}); fetchAll();
  };
  // ── 유형별 방 생성 공통 헬퍼
  const createRoom = async (payload: Record<string, any>, reset: ()=>void) => {
    if (!payload.name) return;
    try {
      await axios.post(`${API}/api/admin/rooms/create`, payload);
      reset(); setRoomTypeModal(null); fetchAll();
      showToast(t.roomNewBtn + ' ✅', 'ok');
    } catch(e:any){ showToast('❌ ' + e.message, 'err'); }
  };
  const handleCreateClub = () => createRoom({
    ...clubForm, type:'club',
    buy_in_gems: parseInt(clubForm.buy_in_gems)||100000,
    max_players: parseInt(clubForm.max_players)||9,
    club_members_limit: parseInt(clubForm.club_members_limit)||50,
  }, ()=>setClubForm({name:"",buy_in_gems:"100000",max_players:"9",blinds:"100/200",visibility:"private",club_description:"",club_members_limit:"50"}));
  const handleCreateMTT = () => createRoom({
    ...mttForm, type:'mtt',
    buy_in_gems: parseInt(mttForm.buy_in_gems)||50000,
    max_players: parseInt(mttForm.max_players)||9,
    mtt_max_tables: parseInt(mttForm.mtt_max_tables)||4,
    mtt_rebuy_allowed: mttForm.mtt_rebuy_allowed ? 1 : 0,
  }, ()=>setMttForm({name:"",buy_in_gems:"50000",max_players:"9",blinds:"100/200",visibility:"public",mtt_max_tables:"4",mtt_start_time:"",mtt_rebuy_allowed:false}));
  const handleCreateSNG = () => createRoom({
    ...sngForm, type:'sng',
    buy_in_gems: parseInt(sngForm.buy_in_gems)||30000,
    max_players: parseInt(sngForm.sng_start_players)||6,
    sng_start_players: parseInt(sngForm.sng_start_players)||6,
  }, ()=>setSngForm({name:"",buy_in_gems:"30000",max_players:"6",blinds:"50/100",visibility:"public",sng_start_players:"6",sng_prize_structure:"50/30/20"}));
  const handleCreateOmaha = () => createRoom({
    ...omahaForm, type:'omaha',
    buy_in_gems: parseInt(omahaForm.buy_in_gems)||100000,
    max_players: parseInt(omahaForm.max_players)||6,
  }, ()=>setOmahaForm({name:"",buy_in_gems:"100000",max_players:"6",blinds:"100/200",visibility:"public",omaha_variant:"PLO"}));
  const handleCreateShortDeck = () => createRoom({
    ...shortForm, type:'short_deck',
    buy_in_gems: parseInt(shortForm.buy_in_gems)||100000,
    max_players: parseInt(shortForm.max_players)||6,
    short_deck_ante: parseInt(shortForm.short_deck_ante)||100,
  }, ()=>setShortForm({name:"",buy_in_gems:"100000",max_players:"6",blinds:"100/200",visibility:"public",short_deck_ante:"100"}));
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
    if (!window.confirm(t.confirmDeletePartner)) return;
    await axios.delete(`${API}/api/admin/partners/${id}`); fetchAll();
  };
  // ── 하부대리점 수정
  const handleAgencyEditSave = async () => {
    if (!agencyEditModal) return;
    setAgencyEditError(null);
    const rate = parseFloat(agencyEditForm.commission_rate)||0;
    if (rate<0||rate>100){setAgencyEditError(t.gameFeeError);return;}
    const code = agencyEditForm.referral_code.trim();
    if (code && !/^[A-Za-z0-9]{1,50}$/.test(code)){setAgencyEditError(t.agencyReferralLabel+': A-Z/0-9 max 50');return;}
    try {
      await axios.put(`${API}/api/admin/agencies/${agencyEditModal.id}`,{
        name: agencyEditForm.name,
        commission_rate: rate,
        referral_code: code
      });
      setAgencyEditModal(null);
      showToast(t.agencyEditSuccess,'ok');
      fetchAll();
    } catch(e:any){
      setAgencyEditError(e.response?.data?.message||t.agencyEditError);
    }
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
                    {lang==="ko"?t.langKo:lang==="en"?t.langEn:t.langZh}
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
                <div className="text-sm font-bold text-white truncate">{adminDisplayName||t.superAdmin}</div>
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
            <VisitorStats />
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
                      {lang==="ko"?t.langKo:lang==="en"?t.langEn:t.langZh}
                    </button>
                  ))}
                </motion.div>
              )}</AnimatePresence>
            </div>
            {/* 상단 로그아웃 버튼 */}
            <button onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-full hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 text-zinc-400 transition-all text-sm font-medium"
              title={t.logoutTooltip}>
              <LogOut size={16}/>
              <span className="hidden sm:inline">{t.logoutLabel}</span>
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
                          <button onClick={()=>handleRechargeApprove(r.id)} className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-bold hover:bg-emerald-500/30 flex items-center gap-1"><CheckCircle size={14}/>{t.approve}</button>
                          <button onClick={()=>{setRejectModal({type:'recharge',id:r.id});setRejectMemo("");}} className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-xs font-bold hover:bg-red-500/30 flex items-center gap-1"><XCircle size={14}/>{t.reject}</button>
                          <button onClick={()=>handleRechargeDelete(r.id)} className="p-1.5 bg-zinc-700/50 text-zinc-400 rounded-lg hover:bg-red-500/20 hover:text-red-400 transition-colors" title="삭제"><Trash2 size={14}/></button>
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
                          <button onClick={()=>handleExchangeApprove(r.id)} className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-bold hover:bg-emerald-500/30 flex items-center gap-1"><CheckCircle size={14}/>{t.approve}</button>
                          <button onClick={()=>{setRejectModal({type:'exchange',id:r.id});setRejectMemo("");}} className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-xs font-bold hover:bg-red-500/30 flex items-center gap-1"><XCircle size={14}/>{t.reject}</button>
                          <button onClick={()=>handleExchangeDelete(r.id)} className="p-1.5 bg-zinc-700/50 text-zinc-400 rounded-lg hover:bg-red-500/20 hover:text-red-400 transition-colors" title="삭제"><Trash2 size={14}/></button>
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
                <h3 className="font-bold text-lg mb-3 text-amber-400 flex items-center gap-2"><TrendingUp size={18}/>{t.rechargeTabTitle}</h3>
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
                            <div className="flex gap-1 items-center">
                              {r.status==='pending'&&(
                                <>
                                  <button onClick={()=>handleRechargeApprove(r.id)} className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs font-bold hover:bg-emerald-500/30 flex items-center gap-1"><CheckCircle size={12}/>{t.approve}</button>
                                  <button onClick={()=>{setRejectModal({type:'recharge',id:r.id});setRejectMemo("");}} className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs font-bold hover:bg-red-500/30 flex items-center gap-1"><XCircle size={12}/>{t.reject}</button>
                                </>
                              )}
                              {r.status!=='pending'&&<span className="text-zinc-600 text-xs">{r.admin_memo||'-'}</span>}
                              <button onClick={()=>handleRechargeDelete(r.id)} className="ml-1 p-1 bg-zinc-700/50 text-zinc-400 rounded hover:bg-red-500/20 hover:text-red-400 transition-colors" title="삭제"><Trash2 size={13}/></button>
                            </div>
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
                <h3 className="font-bold text-lg mb-3 text-purple-400 flex items-center gap-2"><Coins size={18}/>{t.exchangeTabTitle}</h3>
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
                            <div className="flex gap-1 items-center">
                              {r.status==='pending'&&(
                                <>
                                  <button onClick={()=>handleExchangeApprove(r.id)} className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs font-bold hover:bg-emerald-500/30 flex items-center gap-1"><CheckCircle size={12}/>{t.approve}</button>
                                  <button onClick={()=>{setRejectModal({type:'exchange',id:r.id});setRejectMemo("");}} className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs font-bold hover:bg-red-500/30 flex items-center gap-1"><XCircle size={12}/>{t.reject}</button>
                                </>
                              )}
                              {r.status!=='pending'&&<span className="text-zinc-600 text-xs">{r.admin_memo||'-'}</span>}
                              <button onClick={()=>handleExchangeDelete(r.id)} className="ml-1 p-1 bg-zinc-700/50 text-zinc-400 rounded hover:bg-red-500/20 hover:text-red-400 transition-colors" title="삭제"><Trash2 size={13}/></button>
                            </div>
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
              {/* 방 유형별 생성 버튼 5개 */}
              <div className="flex flex-wrap gap-2 justify-end">
                {([
                  {type:'club',      label:t.roomTypeClub,      color:'bg-violet-500 hover:bg-violet-400',    icon:'🏛'},
                  {type:'mtt',       label:t.roomTypeMTT,       color:'bg-blue-500 hover:bg-blue-400',        icon:'🏆'},
                  {type:'sng',       label:t.roomTypeSNG,       color:'bg-amber-500 hover:bg-amber-400',      icon:'⚡'},
                  {type:'omaha',     label:t.roomTypeOmaha,     color:'bg-emerald-500 hover:bg-emerald-400',  icon:'🃏'},
                  {type:'shortdeck', label:t.roomTypeShortDeck, color:'bg-red-500 hover:bg-red-400',          icon:'🎴'},
                ] as const).map(({type,label,color,icon})=>(
                  <button key={type} onClick={()=>setRoomTypeModal(type)}
                    className={`flex items-center gap-1.5 px-3 py-2 ${color} text-white font-bold rounded-xl text-sm transition-all`}>
                    <span>{icon}</span>{label}
                  </button>
                ))}
                <button onClick={()=>setRoomAddModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white font-bold rounded-xl text-sm">
                  <PlusCircle size={16}/>{t.createRoom}
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {gameRooms.filter(r=>r.status==='open').map(r=>{
                  const typeMeta: Record<string,{icon:string,color:string}> = {
                    club:       {icon:'🏛', color:'text-violet-400'},
                    mtt:        {icon:'🏆', color:'text-blue-400'},
                    sng:        {icon:'⚡', color:'text-amber-400'},
                    omaha:      {icon:'🃏', color:'text-emerald-400'},
                    short_deck: {icon:'🎴', color:'text-red-400'},
                    tournament: {icon:'🎮', color:'text-zinc-400'},
                    cash:       {icon:'💰', color:'text-yellow-400'},
                    private:    {icon:'🔒', color:'text-zinc-400'},
                  };
                  const meta = typeMeta[r.type] ?? {icon:'🎮', color:'text-zinc-400'};
                  return (
                  <div key={r.id} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 hover:border-emerald-500/30 transition-all">
                    <div className="flex justify-between items-start mb-3">
                      <div className="w-11 h-11 bg-zinc-800 rounded-xl flex items-center justify-center text-xl">{meta.icon}</div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-bold uppercase ${meta.color} bg-zinc-800 px-2 py-0.5 rounded-full`}>{r.type}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400/10 text-emerald-400">open</span>
                      </div>
                    </div>
                    <h3 className="font-bold mb-1">{r.name}</h3>
                    <p className="text-xs text-zinc-500 mb-3">{r.blinds} · {t.maxPlayers}{r.max_players}{t.maxPlayersUnit} · {r.visibility}</p>
                    <div className="flex justify-between items-center pt-3 border-t border-zinc-800">
                      <p className="text-amber-400 font-mono text-sm">{r.buy_in_gems.toLocaleString()}{t.gemUnit}</p>
                      <button onClick={()=>handleCloseRoom(r.id)} className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-xs font-bold hover:bg-red-500/30 flex items-center gap-1">
                        <X size={12}/>{t.closeRoom}
                      </button>
                    </div>
                  </div>
                  );
                })}
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
                    <th className="px-5 py-3 text-xs font-bold uppercase text-zinc-500">{t.noticeColTitle2}</th>
                    <th className="px-5 py-3 text-xs font-bold uppercase text-zinc-500 hidden md:table-cell">{t.noticeColContent2}</th>
                    <th className="px-5 py-3 text-xs font-bold uppercase text-zinc-500">{t.noticeColDate2}</th>
                    <th className="px-5 py-3 text-xs font-bold uppercase text-zinc-500 text-right">{t.noticeColActions2}</th>
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
                              <Edit3 size={13}/>{t.edit}
                            </button>
                            <button
                              onClick={()=>handleDeleteNotice(n.id)}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-red-400 bg-red-400/10 hover:bg-red-400/20 rounded-lg transition-all">
                              <Trash2 size={13}/>{t.delete}
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
                    <th className="px-5 py-3 text-xs font-bold uppercase text-zinc-500">{t.colSettingKey}</th>
                    <th className="px-5 py-3 text-xs font-bold uppercase text-zinc-500 hidden sm:table-cell">{t.colSettingDesc}</th>
                    <th className="px-5 py-3 text-xs font-bold uppercase text-zinc-500">{t.colSettingVal}</th>
                    <th className="px-5 py-3 text-xs font-bold uppercase text-zinc-500 text-right">{t.colSettingEdit}</th>
                  </tr></thead>
                  <tbody>
                    {settings.map(s=>{
                      const lbl = SETTING_LABELS[s.key];
                      const displayLabel = lbl
                        ? (language==='ko' ? lbl.ko : language==='zh' ? lbl.zh : lbl.en)
                        : s.key;
                      const desc = lbl
                        ? (language==='ko' ? lbl.desc_ko : language==='zh' ? lbl.desc_zh : lbl.desc_en)
                        : undefined;
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

          {/* ── PARTNERS (하부 대리점 관리) ── */}
          {activeTab==="partners" && (
            <motion.div key="partners" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}}>
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[900px]">
                  <thead><tr className="bg-zinc-800/50 border-b border-zinc-800">
                    {[t.colName,t.colSales,t.colCommission,t.colReferralCode,t.colBalance,t.colStatus,t.colJoinDate,t.colOperation].map(h=>(
                      <th key={h} className="px-4 py-3 text-xs font-bold uppercase text-zinc-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {partners.map(p=>(
                      <tr key={p.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20">
                        <td className="px-4 py-3 font-bold whitespace-nowrap">{p.name}</td>
                        {/* 매출 */}
                        <td className="px-4 py-3">
                          <span className="text-yellow-400 font-bold text-sm">
                            {(p.sales||0) > 0 ? `₩${(p.sales||0).toLocaleString()}` : '₩0'}
                          </span>
                          {!p.referral_code && <span className="ml-1 text-[9px] text-zinc-500">({t.agencyHQSales})</span>}
                        </td>
                        {/* 배당수익 */}
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-400/10 text-sky-400">
                            {(p.commission_rate||0).toFixed(1)}%
                          </span>
                        </td>
                        {/* 추천인 코드 */}
                        <td className="px-4 py-3">
                          {p.referral_code
                            ? <div className="flex items-center gap-1.5">
                                <span className="font-mono text-sm text-emerald-300">{p.referral_code}</span>
                                <button title="복사" onClick={()=>{navigator.clipboard.writeText(p.referral_code!);showToast(t.agencyCodeCopied,'ok');}}
                                  className="text-zinc-500 hover:text-zinc-300 transition-colors text-xs">📋</button>
                              </div>
                            : <span className="text-zinc-600 italic text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3 text-amber-400 font-mono text-sm whitespace-nowrap">{p.balance.toLocaleString()}{t.wonUnit}</td>
                        <td className="px-4 py-3"><span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold",p.status==='active'?"bg-emerald-400/10 text-emerald-400":"bg-zinc-700 text-zinc-500")}>{p.status}</span></td>
                        <td className="px-4 py-3 text-zinc-500 text-sm whitespace-nowrap">{new Date(p.created_at).toLocaleDateString('ko-KR')}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 flex-wrap">
                            <button onClick={()=>{setAgencyEditModal(p);setAgencyEditForm({name:p.name,commission_rate:String(p.commission_rate||0),referral_code:p.referral_code||''});setAgencyEditError(null);}}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-violet-400 bg-violet-400/10 hover:bg-violet-400/20 rounded-lg whitespace-nowrap">
                              <Edit3 size={12}/>{t.agencyEditBtn}
                            </button>
                            <button onClick={()=>{setPartnerModal({partner:p,mode:'charge'});setPartnerAmount("");}} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20 rounded-lg whitespace-nowrap"><PlusCircle size={12}/>{t.charge}</button>
                            <button onClick={()=>{setPartnerModal({partner:p,mode:'deduct'});setPartnerAmount("");}} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-amber-400 bg-amber-400/10 hover:bg-amber-400/20 rounded-lg whitespace-nowrap"><MinusCircle size={12}/>{t.deduct}</button>
                            <button onClick={()=>handleDeletePartner(p.id)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-red-400 bg-red-400/10 hover:bg-red-400/20 rounded-lg whitespace-nowrap"><Trash2 size={12}/>{t.delete}</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {partners.length===0&&<tr><td colSpan={8} className="text-center py-12 text-zinc-600">{t.noPartners}</td></tr>}
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
              setGcMsg(t.gcSwapSuccess);await fetchAll();
              setCardSwap({new_cards:'',reason:''});
            }catch(e:any){setGcMsg('❌ '+e.message);}finally{setGcLoading(false);}
          };
          const handleForceEndRoom = async()=>{
            if(!forceAction.reason){setGcMsg(t.gcNeedReason);return;}
            if(!confirm('정말 게임방을 강제 종료하시겠습니까?'))return;
            setGcLoading(true);setGcMsg(null);
            try{
              await axios.post(`${API}/api/admin/rooms/${u.room_id}/force-end`,{reason:forceAction.reason,admin_id:'admin'});
              setGcMsg(t.gcEndRoomSuccess);await fetchAll();
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
                    <div className="text-xs text-zinc-500">{t.gcInfoSubtitle}</div>
                  </div>
                </div>
                <button onClick={()=>setGameControlModal(null)} className="text-zinc-500 hover:text-white"><X size={20}/></button>
              </div>
              {/* 탭 */}
              <div className="flex gap-2 px-5 pt-4">
                {tabBtn('info',t.gcTabInfo,'📊')}
                {tabBtn('cards',t.gcTabCards,'🃏')}
                {tabBtn('action',t.gcTabAction,'⚡')}
                {tabBtn('endroom',t.gcTabEndRoom,'🚫')}
              </div>
              {/* 내용 */}
              <div className="p-5 space-y-3 min-h-[220px] max-h-[75vh] overflow-y-auto">
                {gcMsg&&<div className={cn("px-3 py-2 rounded-lg text-sm font-medium",gcMsg.startsWith('✅')?"bg-emerald-500/10 text-emerald-400":"bg-red-500/10 text-red-400")}>{gcMsg}</div>}

                {gcTab==='info'&&(
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {[
                      [t.gcInfoRoom, u.room_name||t.gcCardNone],
                      [t.gcInfoRoomType, u.room_type||'—'],
                      [t.gcInfoTableSeat, u.table_no?`T${u.table_no}/S${u.seat_no}`:'—'],
                      [t.gcInfoGameStatus, u.play_status||'offline'],
                      [t.gcInfoHandStatus, u.hand_status||'idle'],
                      [t.gcInfoCurrentCards, u.current_cards||'—'],
                      [t.gcInfoPlayTime, u.play_start?`${Math.floor((Date.now()-new Date(u.play_start).getTime())/60000)}${t.gcMins}`:'—'],
                      [t.gcInfoGems, u.gems.toLocaleString()+t.gcGemsUnit],
                    ].map(([k,v])=>(
                      <div key={k} className="bg-zinc-800/50 rounded-xl px-3 py-2">
                        <div className="text-zinc-500 text-xs mb-0.5">{k}</div>
                        <div className="font-medium text-white">{v}</div>
                      </div>
                    ))}
                    <div className="col-span-2 flex gap-2 pt-1">
                      <button onClick={()=>{setGcTab('action');setForceAction({action:'kick_from_room',reason:'',amount:''});}}
                        className="flex-1 py-2 bg-amber-500/20 text-amber-400 rounded-xl text-sm font-bold hover:bg-amber-500/30">{t.gcForceExitBtn}</button>
                      <button onClick={()=>setGcTab('action')}
                        className="flex-1 py-2 bg-blue-500/20 text-blue-400 rounded-xl text-sm font-bold hover:bg-blue-500/30">{t.gcSpectate}</button>
                    </div>
                  </div>
                )}

                {gcTab==='cards'&&(()=>{
                  // ── 52장 카드 데이터 정의
                  const SUITS = [
                    {key:'s', sym:'♠', label:t.gcSuitSpade,   color:'text-white'},
                    {key:'h', sym:'♥', label:t.gcSuitHeart,   color:'text-red-400'},
                    {key:'d', sym:'♦', label:t.gcSuitDiamond, color:'text-red-400'},
                    {key:'c', sym:'♣', label:t.gcSuitClub,    color:'text-white'},
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
                    if(selectedCards.length!==2||!cardSwap.reason){setGcMsg(t.gcNeedCardAndReason);return;}
                    if(!cardConfirmStep){setCardConfirmStep(true);return;}
                    setGcLoading(true);setGcMsg(null);setCardConfirmStep(false);
                    try{
                      const newCards = selectedCards.join('|');
                      await axios.post(`${API}/api/admin/users/${u.id}/swap-cards`,{new_cards:newCards,reason:cardSwap.reason,admin_id:'admin'});
                      setGcMsg(t.gcSwapSuccess);
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
                      <span className="text-xs text-zinc-500 shrink-0">{t.gcCurrentCards}</span>
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
                        }) : <span className="text-zinc-600 text-sm">{t.gcCardNone}</span>}
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
                      {[{k:'all',l:t.gcSuitAll},
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
                        {t.gcOnlyRemaining}
                      </label>
                      <button onClick={handleRandomPick}
                        className="px-2.5 py-1 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg text-xs font-bold hover:bg-purple-500/30">
                        {t.gcRandom}
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
                                  title={isUsed?t.gcCardUsed:t.gcCardSelect}
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
                      <span className="text-zinc-500 text-xs shrink-0">{t.gcSelectedLabel}</span>
                      {selectedCards.length===0
                        ?<span className="text-zinc-600 text-xs">{t.gcSelectHint}</span>
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
                          {selectedCards.length===2&&<span className="ml-1 text-emerald-400 text-xs">{t.gc2CardsDone}</span>}
                        </div>
                      }
                    </div>

                    {/* 사유 입력 */}
                    <input value={cardSwap.reason} onChange={e=>setCardSwap(p=>({...p,reason:e.target.value}))}
                      placeholder={t.gcReasonPlaceholder}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500"/>

                    {/* 확인창 */}
                    {cardConfirmStep&&selectedCards.length===2&&(
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-sm space-y-2">
                        <div className="font-bold text-amber-400">{t.gcConfirmTitle}</div>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-zinc-400">{t.gcConfirmBefore}</span>
                          <span className="font-bold text-white">{usedCards.map(c=>cardLabel(c)).join(' ')||t.gcCardNone}</span>
                          <span className="text-zinc-500">{t.gcConfirmArrow}</span>
                          <span className="text-zinc-400">{t.gcConfirmAfter}</span>
                          <span className="font-bold text-amber-400">{selectedCards.map(c=>cardLabel(c)).join(' ')}</span>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={handleCardSwapVisual} disabled={gcLoading}
                            className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-sm disabled:opacity-40">
                            {gcLoading?t.gcProcessing:t.gcConfirmYes}
                          </button>
                          <button onClick={()=>setCardConfirmStep(false)}
                            className="flex-1 py-2 bg-zinc-700 hover:bg-zinc-600 text-white font-bold rounded-xl text-sm">
                            {t.gcConfirmNo}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* 교체 버튼 */}
                    {!cardConfirmStep&&(
                      <button onClick={handleCardSwapVisual}
                        disabled={gcLoading||selectedCards.length!==2||!cardSwap.reason}
                        className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-sm disabled:opacity-40 transition-all">
                        {gcLoading?t.gcProcessing:(selectedCards.length===2?`${t.gcSwapBtn} (${selectedCards.map(c=>cardLabel(c)).join(' + ')})`:t.gcSwapHint)}
                      </button>
                    )}
                    <div className="text-xs text-zinc-600 text-center">{t.gcSwapAuditNote}</div>
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
                        {a:'kick_from_room',label:t.gcForceActionKick,color:'bg-red-500/20 text-red-400'},
                      ].map(({a,label,color})=>(
                        <button key={a} onClick={()=>setForceAction(p=>({...p,action:a}))}
                          className={cn("py-2 rounded-xl text-xs font-bold border-2 transition-all",
                            forceAction.action===a?'border-white':'border-transparent',color)}>
                          {label}
                        </button>
                      ))}
                    </div>
                    <input value={forceAction.reason} onChange={e=>setForceAction(p=>({...p,reason:e.target.value}))}
                      placeholder={t.gcActionReasonPlaceholder} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"/>
                    <button onClick={handleForceAction} disabled={gcLoading||!forceAction.action||!forceAction.reason}
                      className="w-full py-2.5 bg-red-500 hover:bg-red-400 text-white font-bold rounded-xl text-sm disabled:opacity-40 transition-all">
                      {gcLoading?t.gcProcessing:`⚡ ${forceAction.action||t.gcActionSelect} ${t.gcActionBtn.replace('⚡ ','')}`}
                    </button>
                  </div>
                )}

                {gcTab==='endroom'&&(
                  <div className="space-y-3">
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-400">
                      {t.gcEndRoomWarning2}
                    </div>
                    <div className="bg-zinc-800/50 rounded-xl p-3 text-sm">
                      <span className="text-zinc-500">{t.gcEndRoomTarget}</span>
                      <span className="font-bold">{u.room_name||'—'}</span>
                    </div>
                    <input value={forceAction.reason} onChange={e=>setForceAction(p=>({...p,reason:e.target.value}))}
                      placeholder={t.gcEndRoomReasonPlaceholder} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-red-500"/>
                    <button onClick={handleForceEndRoom} disabled={gcLoading||!forceAction.reason||!u.room_id}
                      className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-sm disabled:opacity-40 transition-all">
                      {gcLoading?t.gcProcessing:t.gcEndRoomBtn}
                    </button>
                    {!u.room_id&&<div className="text-xs text-zinc-600 text-center">{t.gcNoRoom}</div>}
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
              <p className="text-zinc-400 text-sm mb-4">{partnerModal.partner.name} · {t.partnerCurrentBalance} {partnerModal.partner.balance.toLocaleString()}{t.wonUnit}</p>
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

      {/* ══ 유형별 방 생성 모달 ══ */}
      <AnimatePresence>
        {roomTypeModal && (()=>{
          // 공통 입력 컴포넌트 헬퍼
          const F = ({label,children}:{label:string,children:React.ReactNode}) => (
            <div><label className="text-xs font-bold text-zinc-400 mb-1.5 block uppercase tracking-wider">{label}</label>{children}</div>
          );
          const inp = "w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 outline-none text-sm focus:ring-2 focus:ring-violet-500/40";
          const visSel = (val:string, onChange:(v:string)=>void) => (
            <select value={val} onChange={e=>onChange(e.target.value)} className={inp}>
              <option value="public">public</option>
              <option value="private">private</option>
            </select>
          );

          const modalMeta: Record<string,{title:string,icon:string,color:string,desc:string}> = {
            club:      {title:t.roomTypeClub,      icon:'🏛', color:'violet', desc:t.roomTypeClubDesc},
            mtt:       {title:t.roomTypeMTT,       icon:'🏆', color:'blue',   desc:t.roomTypeMTTDesc},
            sng:       {title:t.roomTypeSNG,       icon:'⚡', color:'amber',  desc:t.roomTypeSNGDesc},
            omaha:     {title:t.roomTypeOmaha,     icon:'🃏', color:'emerald',desc:t.roomTypeOmahaDesc},
            shortdeck: {title:t.roomTypeShortDeck, icon:'🎴', color:'red',    desc:t.roomTypeShortDeckDesc},
          };
          const meta = modalMeta[roomTypeModal];
          const colorMap: Record<string,string> = {
            violet:'border-violet-500/30 text-violet-400',blue:'border-blue-500/30 text-blue-400',
            amber:'border-amber-500/30 text-amber-400',emerald:'border-emerald-500/30 text-emerald-400',red:'border-red-500/30 text-red-400'
          };
          const btnMap: Record<string,string> = {
            violet:'bg-violet-500 hover:bg-violet-400',blue:'bg-blue-500 hover:bg-blue-400',
            amber:'bg-amber-500 hover:bg-amber-400',emerald:'bg-emerald-500 hover:bg-emerald-400',red:'bg-red-500 hover:bg-red-400'
          };

          const commonTop = (name:string, setName:(v:string)=>void, buyin:string, setBuyin:(v:string)=>void, players:string, setPlayers:(v:string)=>void, blinds:string, setBlinds:(v:string)=>void, vis:string, setVis:(v:string)=>void) => (
            <>
              <F label={t.roomNameLabel}>
                <input value={name} onChange={e=>setName(e.target.value)} placeholder={t.roomNamePlaceholder} className={inp}/>
              </F>
              <div className="grid grid-cols-2 gap-3">
                <F label={t.roomBuyInLabel}><input type="number" value={buyin} onChange={e=>setBuyin(e.target.value)} className={inp}/></F>
                <F label={t.roomMaxPlayersLabel}><input type="number" value={players} onChange={e=>setPlayers(e.target.value)} className={inp}/></F>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <F label={t.roomBlindsLabel}><input value={blinds} onChange={e=>setBlinds(e.target.value)} className={inp}/></F>
                <F label={t.roomVisibilityLabel}>{visSel(vis, setVis)}</F>
              </div>
            </>
          );

          let formContent: React.ReactNode = null;
          let handleSubmit: ()=>void = ()=>{};
          let submitDisabled = false;

          if (roomTypeModal==='club') {
            handleSubmit = handleCreateClub; submitDisabled = !clubForm.name;
            formContent = (<>
              {commonTop(clubForm.name, v=>setClubForm(p=>({...p,name:v})), clubForm.buy_in_gems, v=>setClubForm(p=>({...p,buy_in_gems:v})), clubForm.max_players, v=>setClubForm(p=>({...p,max_players:v})), clubForm.blinds, v=>setClubForm(p=>({...p,blinds:v})), clubForm.visibility, v=>setClubForm(p=>({...p,visibility:v})))}
              <F label={t.clubDescLabel}><input value={clubForm.club_description} onChange={e=>setClubForm(p=>({...p,club_description:e.target.value}))} placeholder={t.clubDescPlaceholder} className={inp}/></F>
              <F label={t.clubMembersLimitLabel}><input type="number" value={clubForm.club_members_limit} onChange={e=>setClubForm(p=>({...p,club_members_limit:e.target.value}))} className={inp}/></F>
            </>);
          } else if (roomTypeModal==='mtt') {
            handleSubmit = handleCreateMTT; submitDisabled = !mttForm.name;
            formContent = (<>
              {commonTop(mttForm.name, v=>setMttForm(p=>({...p,name:v})), mttForm.buy_in_gems, v=>setMttForm(p=>({...p,buy_in_gems:v})), mttForm.max_players, v=>setMttForm(p=>({...p,max_players:v})), mttForm.blinds, v=>setMttForm(p=>({...p,blinds:v})), mttForm.visibility, v=>setMttForm(p=>({...p,visibility:v})))}
              <div className="grid grid-cols-2 gap-3">
                <F label={t.mttMaxTablesLabel}><input type="number" value={mttForm.mtt_max_tables} onChange={e=>setMttForm(p=>({...p,mtt_max_tables:e.target.value}))} className={inp}/></F>
                <F label={t.mttStartTimeLabel}><input value={mttForm.mtt_start_time} onChange={e=>setMttForm(p=>({...p,mtt_start_time:e.target.value}))} placeholder={t.mttStartTimePlaceholder} className={inp}/></F>
              </div>
              <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                <input type="checkbox" checked={mttForm.mtt_rebuy_allowed} onChange={e=>setMttForm(p=>({...p,mtt_rebuy_allowed:e.target.checked}))} className="accent-blue-500 w-4 h-4"/>
                {t.mttRebuyLabel}
              </label>
            </>);
          } else if (roomTypeModal==='sng') {
            handleSubmit = handleCreateSNG; submitDisabled = !sngForm.name;
            formContent = (<>
              {commonTop(sngForm.name, v=>setSngForm(p=>({...p,name:v})), sngForm.buy_in_gems, v=>setSngForm(p=>({...p,buy_in_gems:v})), sngForm.max_players, v=>setSngForm(p=>({...p,max_players:v})), sngForm.blinds, v=>setSngForm(p=>({...p,blinds:v})), sngForm.visibility, v=>setSngForm(p=>({...p,visibility:v})))}
              <div className="grid grid-cols-2 gap-3">
                <F label={t.sngStartPlayersLabel}><input type="number" value={sngForm.sng_start_players} onChange={e=>setSngForm(p=>({...p,sng_start_players:e.target.value}))} className={inp}/></F>
                <F label={t.sngPrizeLabel}><input value={sngForm.sng_prize_structure} onChange={e=>setSngForm(p=>({...p,sng_prize_structure:e.target.value}))} placeholder={t.sngPrizePlaceholder} className={inp}/></F>
              </div>
            </>);
          } else if (roomTypeModal==='omaha') {
            handleSubmit = handleCreateOmaha; submitDisabled = !omahaForm.name;
            formContent = (<>
              {commonTop(omahaForm.name, v=>setOmahaForm(p=>({...p,name:v})), omahaForm.buy_in_gems, v=>setOmahaForm(p=>({...p,buy_in_gems:v})), omahaForm.max_players, v=>setOmahaForm(p=>({...p,max_players:v})), omahaForm.blinds, v=>setOmahaForm(p=>({...p,blinds:v})), omahaForm.visibility, v=>setOmahaForm(p=>({...p,visibility:v})))}
              <F label={t.omahaVariantLabel}>
                <select value={omahaForm.omaha_variant} onChange={e=>setOmahaForm(p=>({...p,omaha_variant:e.target.value}))} className={inp}>
                  <option value="PLO">{t.omahaVariantPLO}</option>
                  <option value="PLO8">{t.omahaVariantPLO8}</option>
                  <option value="5cardPLO">{t.omahaVariant5}</option>
                </select>
              </F>
            </>);
          } else if (roomTypeModal==='shortdeck') {
            handleSubmit = handleCreateShortDeck; submitDisabled = !shortForm.name;
            formContent = (<>
              {commonTop(shortForm.name, v=>setShortForm(p=>({...p,name:v})), shortForm.buy_in_gems, v=>setShortForm(p=>({...p,buy_in_gems:v})), shortForm.max_players, v=>setShortForm(p=>({...p,max_players:v})), shortForm.blinds, v=>setShortForm(p=>({...p,blinds:v})), shortForm.visibility, v=>setShortForm(p=>({...p,visibility:v})))}
              <F label={t.shortDeckAnteLabel}><input type="number" value={shortForm.short_deck_ante} onChange={e=>setShortForm(p=>({...p,short_deck_ante:e.target.value}))} className={inp}/></F>
            </>);
          }

          return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
              <motion.div initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.9}}
                className={`bg-zinc-900 border ${colorMap[meta.color].split(' ')[0]} rounded-2xl w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto`}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className={`font-bold text-lg flex items-center gap-2 ${colorMap[meta.color].split(' ')[1]}`}>
                    <span className="text-xl">{meta.icon}</span>{meta.title}
                  </h3>
                  <button onClick={()=>setRoomTypeModal(null)} className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg"><X size={18}/></button>
                </div>
                <p className="text-xs text-zinc-500 mb-4">{meta.desc}</p>
                <div className="space-y-3">{formContent}</div>
                <div className="flex gap-3 mt-5">
                  <button onClick={handleSubmit} disabled={submitDisabled}
                    className={`flex-1 ${btnMap[meta.color]} text-white font-bold py-3 rounded-xl disabled:opacity-30 transition-all`}>
                    {meta.icon} {t.roomNewBtn}
                  </button>
                  <button onClick={()=>setRoomTypeModal(null)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 font-bold py-3 rounded-xl text-sm">{t.cancel}</button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* ── Toast 알림 ── */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{opacity:0,y:40}} animate={{opacity:1,y:0}} exit={{opacity:0,y:40}}
            className={cn("fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-xl text-sm font-bold shadow-2xl",
              toast.type==='ok'?"bg-emerald-500 text-zinc-950":"bg-red-500 text-white")}>
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 하부대리점 수정 모달 ── */}
      <AnimatePresence>
        {agencyEditModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.9}}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-lg flex items-center gap-2"><Edit3 size={18} className="text-violet-400"/>{t.agencyEditTitle}</h3>
                <button onClick={()=>setAgencyEditModal(null)} className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg"><X size={18}/></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-zinc-400 mb-1.5 block uppercase tracking-wider">{t.agencyNameLabel}</label>
                  <input value={agencyEditForm.name} onChange={e=>setAgencyEditForm(p=>({...p,name:e.target.value}))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-violet-500/50 outline-none text-sm"/>
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-400 mb-1.5 block uppercase tracking-wider">{t.agencyCommissionLabel}</label>
                  <input type="number" min="0" max="100" step="0.1" value={agencyEditForm.commission_rate}
                    onChange={e=>setAgencyEditForm(p=>({...p,commission_rate:e.target.value}))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-violet-500/50 outline-none text-sm"/>
                  <p className="text-[11px] text-zinc-500 mt-1">{t.agencyCommissionNote}</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-400 mb-1.5 block uppercase tracking-wider">{t.agencyReferralLabel}</label>
                  <input value={agencyEditForm.referral_code} onChange={e=>setAgencyEditForm(p=>({...p,referral_code:e.target.value.toUpperCase()}))}
                    placeholder="예: BUSAN01 (영문/숫자, 최대 50자)"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-violet-500/50 outline-none text-sm font-mono"/>
                  <p className="text-[11px] text-zinc-500 mt-1">{t.agencyDupNote}</p>
                </div>
                {agencyEditError && <p className="text-red-400 text-xs font-bold">{agencyEditError}</p>}
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={handleAgencyEditSave} disabled={!agencyEditForm.name}
                  className="flex-1 bg-violet-500 hover:bg-violet-400 text-white font-bold py-3 rounded-xl disabled:opacity-30 transition-all">
                  {t.agencyEditSave}
                </button>
                <button onClick={()=>setAgencyEditModal(null)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 font-bold py-3 rounded-xl">{t.cancel}</button>
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
