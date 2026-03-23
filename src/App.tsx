import { useState, useEffect } from "react";
import { 
  Users, 
  Gamepad2, 
  LogOut, 
  ShieldCheck, 
  Search, 
  UserMinus, 
  RefreshCw,
  Coins,
  Activity,
  LayoutDashboard,
  ChevronRight,
  Globe,
  ChevronDown,
  Wallet,
  Building2,
  CreditCard,
  Bot,
  History,
  Bell,
  Settings,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import axios from "axios";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { translations, type Language } from "./translations";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
interface User {
  id: number;
  username: string;
  chips: number;
  status: string;
  current_card?: string;
}

interface Game {
  id: number;
  table_name: string;
  pot: number;
  status: string;
}

// --- Components ---

const SidebarItem = ({ 
  icon: Icon, 
  label, 
  active, 
  onClick 
}: { 
  icon: any, 
  label: string, 
  active: boolean, 
  onClick: () => void 
}) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
      active 
        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
        : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
    )}
  >
    <Icon size={20} className={cn(active ? "text-emerald-400" : "text-zinc-500 group-hover:text-zinc-300")} />
    <span className="font-medium">{label}</span>
    {active && <motion.div layoutId="active-pill" className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400" />}
  </button>
);

const StatCard = ({ icon: Icon, label, value, trend, color }: { icon: any, label: string, value: string, trend?: string, color: string }) => (
  <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl">
    <div className="flex justify-between items-start mb-4">
      <div className={cn("p-2.5 rounded-xl bg-opacity-10", color)}>
        <Icon size={24} className={color.replace("bg-", "text-").replace("/10", "")} />
      </div>
      {trend && (
        <span className="text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full">
          {trend}
        </span>
      )}
    </div>
    <div className="space-y-1">
      <p className="text-zinc-400 text-sm font-medium">{label}</p>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
    </div>
  </div>
);

interface UserFinance {
  id: number;
  username: string;
  type: string;
  amount: number;
  status: string;
  created_at: string;
}

interface Partner {
  id: number;
  name: string;
  balance: number;
  status: string;
}

interface PartnerFinance {
  id: number;
  partner_name: string;
  type: string;
  amount: number;
  status: string;
  created_at: string;
}

interface Bot {
  id: number;
  name: string;
  difficulty: string;
  style: string;
  chips: number;
  status: string;
  assigned_room?: string;
}

interface GameHistory {
  id: number;
  table_name: string;
  winner: string;
  pot: number;
  created_at: string;
}

interface Notice {
  id: number;
  title: string;
  content: string;
  created_at: string;
}

interface Setting {
  key: string;
  value: string;
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "users" | "userFinance" | "partners" | "partnerFinance" | "bots" | "games" | "history" | "notice" | "settings"
  >("dashboard");
  const [users, setUsers] = useState<User[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [userFinance, setUserFinance] = useState<UserFinance[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [partnerFinance, setPartnerFinance] = useState<PartnerFinance[]>([]);
  const [bots, setBots] = useState<Bot[]>([]);
  const [history, setHistory] = useState<GameHistory[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem("app_lang");
    return (saved as Language) || "ko";
  });
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [editingCard, setEditingCard] = useState<{ userId: number, value: string } | null>(null);
  const [assigningBot, setAssigningBot] = useState<number | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<number | string>("");
  const [managingGame, setManagingGame] = useState<Game | null>(null);

  const t = translations[language];

  useEffect(() => {
    localStorage.setItem("app_lang", language);
  }, [language]);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (token) setIsLoggedIn(true);
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      fetchData();
      const interval = setInterval(fetchData, 5000); // Poll every 5s to simulate real-time
      return () => clearInterval(interval);
    }
  }, [isLoggedIn]);

  const fetchData = async () => {
    try {
      const [usersRes, gamesRes, userFinanceRes, partnersRes, partnerFinanceRes, botsRes, historyRes, noticesRes, settingsRes] = await Promise.all([
        axios.get("/api/admin/users"),
        axios.get("/api/admin/games"),
        axios.get("/api/admin/user-finance"),
        axios.get("/api/admin/partners"),
        axios.get("/api/admin/partner-finance"),
        axios.get("/api/admin/bots"),
        axios.get("/api/admin/history"),
        axios.get("/api/admin/notices"),
        axios.get("/api/admin/settings")
      ]);
      setUsers(usersRes.data);
      setGames(gamesRes.data);
      setUserFinance(userFinanceRes.data);
      setPartners(partnersRes.data);
      setPartnerFinance(partnerFinanceRes.data);
      setBots(botsRes.data);
      setHistory(historyRes.data);
      setNotices(noticesRes.data);
      setSettings(settingsRes.data);
    } catch (err) {
      console.error("Failed to fetch data", err);
    }
  };

  const handleLogin = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await axios.post("/api/admin/login", { username, password });
      if (res.data.success) {
        localStorage.setItem("admin_token", res.data.token);
        setIsLoggedIn(true);
      }
    } catch (err: any) {
      localStorage.removeItem("admin_token");
      setError(err.response?.data?.message || t.loginFailed);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    setIsLoggedIn(false);
  };

  const handleKick = async (userId: number) => {
    try {
      await axios.post("/api/admin/kick", { userId });
      fetchData();
    } catch (err) {
      console.error("Failed to kick user", err);
    }
  };

  const handleChangeCard = async (userId: number, newCard: string) => {
    try {
      await axios.post("/api/admin/game/change-card", { userId, newCard });
      setEditingCard(null);
      fetchData();
    } catch (err) {
      console.error("Failed to change card", err);
    }
  };

  const handleAssignBot = async (botId: number) => {
    if (!selectedRoom) return;
    try {
      await axios.post("/api/admin/bot/assign", { botId, gameId: selectedRoom });
      setAssigningBot(null);
      setSelectedRoom("");
      fetchData();
    } catch (err) {
      console.error("Failed to assign bot", err);
    }
  };

  const handleRemoveBot = async (botId: number) => {
    try {
      await axios.post("/api/admin/bot/remove", { botId });
      fetchData();
    } catch (err) {
      console.error("Failed to remove bot", err);
    }
  };

  const handleAssignBotToSpecificRoom = async (botId: number, gameId: number) => {
    try {
      await axios.post("/api/admin/bot/assign", { botId, gameId });
      fetchData();
    } catch (err) {
      console.error("Failed to assign bot to room", err);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0c0c0e] p-4 relative">
        {/* Language Selector in Login Page */}
        <div className="absolute top-6 right-6">
          <div className="relative">
            <button 
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-xl text-zinc-400 hover:text-zinc-200 transition-all"
            >
              <Globe size={18} />
              <span className="text-sm font-medium uppercase">{language}</span>
              <ChevronDown size={14} className={cn("transition-transform", showLangMenu && "rotate-180")} />
            </button>
            
            <AnimatePresence>
              {showLangMenu && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-32 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-50"
                >
                  {(["ko", "en", "zh"] as Language[]).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => {
                        setLanguage(lang);
                        setShowLangMenu(false);
                      }}
                      className={cn(
                        "w-full px-4 py-2.5 text-left text-sm transition-all hover:bg-zinc-800",
                        language === lang ? "text-emerald-400 bg-emerald-400/5" : "text-zinc-400"
                      )}
                    >
                      {lang === "ko" ? "한국어" : lang === "en" ? "English" : "中文"}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-zinc-900 border border-zinc-800 p-8 rounded-3xl shadow-2xl"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-4 border border-emerald-500/20">
              <ShieldCheck size={32} className="text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
            <p className="text-zinc-400 text-sm">{t.slogan}</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 ml-1">{t.username}</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                placeholder="admin"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 ml-1">{t.password}</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                placeholder="••••••••"
                required
              />
            </div>
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold py-3 rounded-xl transition-all disabled:opacity-50"
            >
              {loading ? t.authenticating : t.signIn}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0c0c0e] flex">
      {/* Sidebar */}
      <aside className="w-64 border-right border-zinc-800 p-6 flex flex-col gap-8 hidden md:flex">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
            <ShieldCheck size={24} className="text-zinc-950" />
          </div>
          <span className="font-bold text-xl tracking-tight">PokerHub</span>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto pr-2 custom-scrollbar">
          <SidebarItem 
            icon={LayoutDashboard} 
            label={t.dashboard} 
            active={activeTab === "dashboard"} 
            onClick={() => setActiveTab("dashboard")} 
          />
          <SidebarItem 
            icon={Users} 
            label={t.users} 
            active={activeTab === "users"} 
            onClick={() => setActiveTab("users")} 
          />
          <SidebarItem 
            icon={Wallet} 
            label={t.userFinance} 
            active={activeTab === "userFinance"} 
            onClick={() => setActiveTab("userFinance")} 
          />
          <SidebarItem 
            icon={Building2} 
            label={t.partners} 
            active={activeTab === "partners"} 
            onClick={() => setActiveTab("partners")} 
          />
          <SidebarItem 
            icon={CreditCard} 
            label={t.partnerFinance} 
            active={activeTab === "partnerFinance"} 
            onClick={() => setActiveTab("partnerFinance")} 
          />
          <SidebarItem 
            icon={Bot} 
            label={t.bots} 
            active={activeTab === "bots"} 
            onClick={() => setActiveTab("bots")} 
          />
          <SidebarItem 
            icon={Gamepad2} 
            label={t.games} 
            active={activeTab === "games"} 
            onClick={() => setActiveTab("games")} 
          />
          <SidebarItem 
            icon={History} 
            label={t.history} 
            active={activeTab === "history"} 
            onClick={() => setActiveTab("history")} 
          />
          <SidebarItem 
            icon={Bell} 
            label={t.notice} 
            active={activeTab === "notice"} 
            onClick={() => setActiveTab("notice")} 
          />
          <SidebarItem 
            icon={Settings} 
            label={t.settings} 
            active={activeTab === "settings"} 
            onClick={() => setActiveTab("settings")} 
          />
        </nav>

        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
        >
          <LogOut size={20} />
          <span className="font-medium">{t.logout}</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 overflow-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-3xl font-bold tracking-tight capitalize">
              {t[activeTab as keyof typeof t]}
            </h2>
            <p className="text-zinc-500 text-sm">{t.monitoring}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input 
                type="text" 
                placeholder={t.search} 
                className="bg-zinc-900 border border-zinc-800 rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
            
            {/* Language Selector in Header */}
            <div className="relative">
              <button 
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-full hover:bg-zinc-800 transition-all text-zinc-400"
              >
                <Globe size={20} />
              </button>
              
              <AnimatePresence>
                {showLangMenu && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-32 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-50"
                  >
                    {(["ko", "en", "zh"] as Language[]).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => {
                          setLanguage(lang);
                          setShowLangMenu(false);
                        }}
                        className={cn(
                          "w-full px-4 py-2.5 text-left text-sm transition-all hover:bg-zinc-800",
                          language === lang ? "text-emerald-400 bg-emerald-400/5" : "text-zinc-400"
                        )}
                      >
                        {lang === "ko" ? "한국어" : lang === "en" ? "English" : "中文"}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button onClick={fetchData} className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-full hover:bg-zinc-800 transition-all">
              <RefreshCw size={20} className="text-zinc-400" />
            </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === "dashboard" && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                  icon={Users} 
                  label={t.totalPlayers} 
                  value={users.length.toString()} 
                  trend="+12%" 
                  color="bg-emerald-500/10" 
                />
                <StatCard 
                  icon={Gamepad2} 
                  label={t.activeTables} 
                  value={games.length.toString()} 
                  color="bg-blue-500/10" 
                />
                <StatCard 
                  icon={Coins} 
                  label={t.totalPot} 
                  value={`$${games.reduce((acc, g) => acc + g.pot, 0).toLocaleString()}`} 
                  trend="+5.4%" 
                  color="bg-amber-500/10" 
                />
                <StatCard 
                  icon={Activity} 
                  label={t.systemLoad} 
                  value="1.2ms" 
                  color="bg-purple-500/10" 
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-lg">{t.recentActivity}</h3>
                    <button className="text-emerald-400 text-sm hover:underline">{t.viewAll}</button>
                  </div>
                  <div className="space-y-4">
                    {users.slice(0, 5).map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-zinc-800/30 transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 font-bold">
                            {user.username[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">{user.username}</p>
                            <p className="text-xs text-zinc-500">{t.joinedAgo}</p>
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-zinc-600" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                  <h3 className="font-bold text-lg mb-6">{t.gamePerformance}</h3>
                  <div className="h-64 flex items-end gap-4 px-4">
                    {[40, 70, 45, 90, 65, 85, 55].map((h, i) => (
                      <div key={i} className="flex-1 bg-emerald-500/20 rounded-t-lg relative group">
                        <motion.div 
                          initial={{ height: 0 }}
                          animate={{ height: `${h}%` }}
                          className="absolute bottom-0 left-0 right-0 bg-emerald-500 rounded-t-lg transition-all group-hover:bg-emerald-400"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-4 px-4 text-xs text-zinc-500 uppercase font-bold tracking-widest">
                    <span>{t.mon}</span>
                    <span>{t.tue}</span>
                    <span>{t.wed}</span>
                    <span>{t.thu}</span>
                    <span>{t.fri}</span>
                    <span>{t.sat}</span>
                    <span>{t.sun}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "users" && (
            <motion.div 
              key="users"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-800/50 border-b border-zinc-800">
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500">{t.id}</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500">{t.username}</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500">{t.chips}</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500">{t.newCard}</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500">{t.status}</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500 text-right">{t.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-all">
                        <td className="px-6 py-4 font-mono text-zinc-500">#{user.id}</td>
                        <td className="px-6 py-4 font-medium">{user.username}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Coins size={14} className="text-amber-400" />
                            <span className="font-mono">{user.chips.toLocaleString()}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <input 
                              type="text" 
                              value={editingCard?.userId === user.id ? editingCard.value : (user.current_card || "")}
                              onChange={(e) => setEditingCard({ userId: user.id, value: e.target.value })}
                              className="w-16 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                              placeholder="A♠"
                            />
                            {editingCard?.userId === user.id && (
                              <button 
                                onClick={() => handleChangeCard(user.id, editingCard.value)}
                                className="p-1 bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30 transition-all"
                              >
                                <RefreshCw size={12} />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                            user.status === "active" ? "bg-emerald-400/10 text-emerald-400" : "bg-red-400/10 text-red-400"
                          )}>
                            {user.status === "active" ? t.active : t.kicked}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => handleKick(user.id)}
                            disabled={user.status === "kicked"}
                            className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all disabled:opacity-20"
                            title={t.kickUser}
                          >
                            <UserMinus size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === "games" && (
            <motion.div 
              key="games"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
            >
              {games.map((game) => (
                <div key={game.id} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 hover:border-emerald-500/30 transition-all group">
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center group-hover:bg-emerald-500/10 transition-all">
                      <Gamepad2 size={24} className="text-zinc-500 group-hover:text-emerald-400" />
                    </div>
                    <span className={cn(
                      "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      game.status === "active" ? "bg-emerald-400/10 text-emerald-400" : "bg-zinc-800 text-zinc-500"
                    )}>
                      {game.status}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold mb-2">{game.table_name}</h3>
                  <div className="flex items-center justify-between mt-6 pt-6 border-t border-zinc-800">
                    <div>
                      <p className="text-xs text-zinc-500 uppercase font-bold tracking-widest mb-1">{t.currentPot}</p>
                      <p className="text-xl font-mono font-bold text-amber-400">${game.pot.toLocaleString()}</p>
                    </div>
                    <button 
                      onClick={() => setManagingGame(game)}
                      className="bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                    >
                      {t.manage}
                    </button>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {/* Placeholder for new tabs */}
          {["userFinance", "partners", "partnerFinance", "bots", "history", "notice", "settings"].includes(activeTab) && (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden"
            >
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-800/50 border-b border-zinc-800">
                    {activeTab === "userFinance" && (
                      <>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500">{t.username}</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500">{t.type}</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500">{t.amount}</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500">{t.status}</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500">{t.date}</th>
                      </>
                    )}
                    {activeTab === "partners" && (
                      <>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500">{t.name}</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500">{t.balance}</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500">{t.status}</th>
                      </>
                    )}
                    {activeTab === "partnerFinance" && (
                      <>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500">{t.name}</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500">{t.type}</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500">{t.amount}</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500">{t.status}</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500">{t.date}</th>
                      </>
                    )}
                    {activeTab === "bots" && (
                      <>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500">{t.name}</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500">{t.difficulty}</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500">{t.style}</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500">{t.chips}</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500">{t.assignedRoom}</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500">{t.status}</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500 text-right">{t.actions}</th>
                      </>
                    )}
                    {activeTab === "history" && (
                      <>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500">{t.tableName}</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500">{t.winner}</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500">{t.pot}</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500">{t.date}</th>
                      </>
                    )}
                    {activeTab === "notice" && (
                      <>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500">{t.title_notice}</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500">{t.date}</th>
                      </>
                    )}
                    {activeTab === "settings" && (
                      <>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500">{t.key}</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500">{t.value}</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {activeTab === "userFinance" && userFinance.map((f) => (
                    <tr key={f.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-all">
                      <td className="px-6 py-4">{f.username}</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-1 rounded text-[10px] font-bold uppercase",
                          f.type === "deposit" ? "bg-blue-400/10 text-blue-400" : "bg-orange-400/10 text-orange-400"
                        )}>
                          {f.type === "deposit" ? t.deposit : t.withdrawal}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono">${f.amount.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-1 rounded text-[10px] font-bold uppercase",
                          f.status === "completed" ? "bg-emerald-400/10 text-emerald-400" : "bg-zinc-800 text-zinc-500"
                        )}>
                          {f.status === "completed" ? t.completed : t.pending}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-zinc-500 text-sm">{new Date(f.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                  {activeTab === "partners" && partners.map((p) => (
                    <tr key={p.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-all">
                      <td className="px-6 py-4 font-bold">{p.name}</td>
                      <td className="px-6 py-4 font-mono">${p.balance.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-400/10 text-emerald-400">
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {activeTab === "partnerFinance" && partnerFinance.map((f) => (
                    <tr key={f.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-all">
                      <td className="px-6 py-4">{f.partner_name}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-blue-400/10 text-blue-400">{f.type}</span>
                      </td>
                      <td className="px-6 py-4 font-mono">${f.amount.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-emerald-400/10 text-emerald-400">{f.status}</span>
                      </td>
                      <td className="px-6 py-4 text-zinc-500 text-sm">{new Date(f.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                  {activeTab === "bots" && bots.map((b) => (
                    <tr key={b.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-all">
                      <td className="px-6 py-4 font-bold">{b.name}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-zinc-800 text-zinc-400">
                          {b.difficulty}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-zinc-800 text-zinc-400">
                          {b.style}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono">{b.chips.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        {b.assigned_room ? (
                          <span className="text-emerald-400 font-medium">{b.assigned_room}</span>
                        ) : (
                          <span className="text-zinc-600 italic">None</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                          b.status === "playing" ? "bg-emerald-400/10 text-emerald-400" : "bg-zinc-800 text-zinc-500"
                        )}>
                          {b.status === "playing" ? t.playing : t.idle}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {assigningBot === b.id ? (
                            <div className="flex items-center gap-2">
                              <select 
                                value={selectedRoom}
                                onChange={(e) => setSelectedRoom(e.target.value)}
                                className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                              >
                                <option value="">{t.selectRoom}</option>
                                {games.map(g => (
                                  <option key={g.id} value={g.id}>{g.table_name}</option>
                                ))}
                              </select>
                              <button 
                                onClick={() => handleAssignBot(b.id)}
                                className="bg-emerald-500 hover:bg-emerald-600 text-white p-1 rounded transition-all"
                              >
                                <RefreshCw size={14} />
                              </button>
                              <button 
                                onClick={() => setAssigningBot(null)}
                                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 p-1 rounded transition-all"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <>
                              {b.status === "idle" ? (
                                <button 
                                  onClick={() => setAssigningBot(b.id)}
                                  className="text-xs font-bold uppercase tracking-widest text-emerald-400 hover:text-emerald-300 transition-all"
                                >
                                  {t.assignBot}
                                </button>
                              ) : (
                                <button 
                                  onClick={() => handleRemoveBot(b.id)}
                                  className="text-xs font-bold uppercase tracking-widest text-red-400 hover:text-red-300 transition-all"
                                >
                                  {t.removeBot}
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {activeTab === "history" && history.map((h) => (
                    <tr key={h.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-all">
                      <td className="px-6 py-4">{h.table_name}</td>
                      <td className="px-6 py-4 font-bold text-emerald-400">{h.winner}</td>
                      <td className="px-6 py-4 font-mono text-amber-400">${h.pot.toLocaleString()}</td>
                      <td className="px-6 py-4 text-zinc-500 text-sm">{new Date(h.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                  {activeTab === "notice" && notices.map((n) => (
                    <tr key={n.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-all">
                      <td className="px-6 py-4 font-bold">{n.title}</td>
                      <td className="px-6 py-4 text-zinc-500 text-sm">{new Date(n.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                  {activeTab === "settings" && settings.map((s) => (
                    <tr key={s.key} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-all">
                      <td className="px-6 py-4 font-mono text-zinc-400">{s.key}</td>
                      <td className="px-6 py-4">
                        <input 
                          type="text" 
                          value={s.value} 
                          readOnly
                          className="bg-zinc-800 border border-zinc-700 rounded px-3 py-1 text-sm w-full max-w-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Game Management Modal */}
        <AnimatePresence>
          {managingGame && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl"
              >
                <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-800/20">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                      <Gamepad2 size={24} className="text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{managingGame.table_name}</h3>
                      <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">{t.monitoring}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setManagingGame(null)}
                    className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 transition-all"
                  >
                    <X size={24} />
                  </button>
                </div>
                
                <div className="p-8">
                  <div className="grid grid-cols-2 gap-6 mb-8">
                    <div className="bg-zinc-800/30 p-4 rounded-2xl border border-zinc-800">
                      <p className="text-xs text-zinc-500 uppercase font-bold tracking-widest mb-1">{t.currentPot}</p>
                      <p className="text-2xl font-mono font-bold text-amber-400">${managingGame.pot.toLocaleString()}</p>
                    </div>
                    <div className="bg-zinc-800/30 p-4 rounded-2xl border border-zinc-800">
                      <p className="text-xs text-zinc-500 uppercase font-bold tracking-widest mb-1">{t.status}</p>
                      <p className="text-2xl font-bold text-emerald-400 uppercase">{managingGame.status}</p>
                    </div>
                  </div>

                  <div className="mb-8">
                    <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Bot size={16} />
                      {t.bots} ({bots.filter(b => b.assigned_room === managingGame.table_name).length})
                    </h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                      {bots.filter(b => b.assigned_room === managingGame.table_name).map(bot => (
                        <div key={bot.id} className="flex items-center justify-between p-3 bg-zinc-800/20 rounded-xl border border-zinc-800/50">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center">
                              <Bot size={16} className="text-zinc-500" />
                            </div>
                            <div>
                              <p className="text-sm font-bold">{bot.name}</p>
                              <p className="text-[10px] text-zinc-500 uppercase font-bold">{bot.style} • {bot.difficulty}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleRemoveBot(bot.id)}
                            className="text-xs font-bold text-red-400 hover:text-red-300 uppercase tracking-widest"
                          >
                            {t.removeBot}
                          </button>
                        </div>
                      ))}
                      {bots.filter(b => b.assigned_room === managingGame.table_name).length === 0 && (
                        <div className="text-center py-6 bg-zinc-800/10 rounded-xl border border-dashed border-zinc-800">
                          <p className="text-sm text-zinc-600">{t.noData}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4">{t.assignBot}</h4>
                    <div className="flex gap-3">
                      <select 
                        className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/50"
                        onChange={(e) => {
                          const botId = parseInt(e.target.value);
                          if (botId) handleAssignBotToSpecificRoom(botId, managingGame.id);
                        }}
                        value=""
                      >
                        <option value="">{t.selectRoom}</option>
                        {bots.filter(b => b.status === "idle").map(bot => (
                          <option key={bot.id} value={bot.id}>{bot.name} ({bot.style})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
