import { useEffect, useMemo, useRef, useState } from "react";
import { BrainCircuit, Flame, LogOut, Target, TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { bootstrapSheet, fetchDashboard, fetchMe, updateSession } from "./api";

const sessionMeta = [
  { key: "session1", label: "DSA Practice (1h)" },
  { key: "session2", label: "Concepts + Algorithms (2h)" },
  { key: "session3", label: "Major Project (2h)" },
  { key: "session4", label: "Research + Notes (1h)" }
];

const avatarMap = {
  rookie: "/avatar-rookie.svg",
  warrior: "/avatar-warrior.svg",
  elite: "/avatar-elite.svg",
  sage: "/avatar-sage.svg"
};

const SHEET_KEY = "levelup_sheet_id";
const TOKEN_KEY = "levelup_access_token";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function streak(history) {
  let total = 0;
  for (let i = history.length - 1; i >= 0; i -= 1) {
    if (history[i].actualHours > 0) total += 1;
    else break;
  }
  return total;
}

export default function App() {
  const tokenClientRef = useRef(null);
  const [accessToken, setAccessToken] = useState(localStorage.getItem(TOKEN_KEY) || "");
  const [sheetId, setSheetId] = useState(localStorage.getItem(SHEET_KEY) || "");
  const [profile, setProfile] = useState(null);
  const [sheetUrl, setSheetUrl] = useState("");

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savingKey, setSavingKey] = useState("");

  async function loadDashboard(token, targetSheetId) {
    setLoading(true);
    setError("");
    try {
      const [me, boot] = await Promise.all([
        fetchMe(token),
        bootstrapSheet(token, targetSheetId || undefined)
      ]);

      localStorage.setItem(SHEET_KEY, boot.sheetId);
      setSheetId(boot.sheetId);
      setSheetUrl(boot.sheetUrl);
      setProfile(me);

      const dashboard = await fetchDashboard(token, boot.sheetId);
      setData(dashboard);
    } catch (err) {
      setError(err.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    let attempts = 0;
    const timer = setInterval(() => {
      if (!window.google?.accounts?.oauth2) {
        attempts += 1;
        if (attempts > 50) {
          clearInterval(timer);
          setError("Google auth SDK did not load. Refresh and try again.");
        }
        return;
      }

      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: [
          "openid",
          "https://www.googleapis.com/auth/userinfo.email",
          "https://www.googleapis.com/auth/userinfo.profile",
          "https://www.googleapis.com/auth/spreadsheets"
        ].join(" "),
        callback: async (response) => {
          if (response.error) {
            setError(response.error);
            return;
          }

          const token = response.access_token;
          localStorage.setItem(TOKEN_KEY, token);
          setAccessToken(token);
          await loadDashboard(token, localStorage.getItem(SHEET_KEY) || "");
        }
      });

      clearInterval(timer);
    }, 200);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!accessToken) return;
    loadDashboard(accessToken, sheetId);
  }, []);

  const stats = useMemo(() => {
    if (!data) return null;
    const totalHours = data.history.reduce((acc, item) => acc + item.actualHours, 0);
    const daysMet = data.history.filter((item) => item.actualHours >= item.targetHours).length;
    return {
      streak: streak(data.history),
      totalHours,
      daysMet,
      chartData: data.history.slice(-30).map((item) => ({
        day: item.date.slice(5),
        hours: item.actualHours,
        target: item.targetHours,
        sessions: item.completedSessions,
        level: item.level
      }))
    };
  }, [data]);

  async function connectGoogle() {
    if (!GOOGLE_CLIENT_ID) {
      setError("Missing VITE_GOOGLE_CLIENT_ID in frontend env");
      return;
    }

    if (!tokenClientRef.current) {
      setError("Google auth SDK is still loading. Try again.");
      return;
    }

    setError("");
    tokenClientRef.current.requestAccessToken({ prompt: accessToken ? "" : "consent" });
  }

  async function toggle(key, checked) {
    if (!data || !accessToken || !sheetId) return;

    const snapshot = data;
    const next = {
      ...data,
      todayRecord: {
        ...data.todayRecord,
        checks: {
          ...data.todayRecord.checks,
          [key]: checked
        }
      }
    };
    setData(next);
    setSavingKey(key);

    try {
      await updateSession(accessToken, {
        sheetId,
        date: data.today,
        sessionKey: key,
        completed: checked,
        targetHours: data.todayRecord.dailyTargetHours
      });

      const fresh = await fetchDashboard(accessToken, sheetId);
      setData(fresh);
    } catch (err) {
      setError(err.message);
      setData(snapshot);
    } finally {
      setSavingKey("");
    }
  }

  function logout() {
    if (window.google?.accounts?.oauth2 && accessToken) {
      window.google.accounts.oauth2.revoke(accessToken);
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(SHEET_KEY);
    setAccessToken("");
    setSheetId("");
    setSheetUrl("");
    setData(null);
    setProfile(null);
  }

  if (!accessToken || !data) {
    return (
      <main className="shell authShell">
        <section className="glass authCard">
          <h1>LevelUp Coding Tracker</h1>
          <p>Sign in with Google and your tracker will store directly in your Google Sheet account.</p>
          <button type="button" className="googleBtn" onClick={connectGoogle} disabled={loading}>
            {loading ? "Connecting..." : "Continue with Google"}
          </button>
          {error && <p className="error">{error}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <section className="hero glass">
        <div>
          <h1>LevelUp Coding Tracker</h1>
          <p>5-month consistency dashboard. Every check-in updates your own Google Sheet instantly.</p>
          <div className="badges">
            <span><Flame size={16} /> {stats.streak}-day streak</span>
            <span><Target size={16} /> {stats.daysMet} target days</span>
            <span><TrendingUp size={16} /> {Math.round(stats.totalHours)} focused hours</span>
          </div>
          <div className="profileRow">
            {profile?.picture && <img src={profile.picture} alt="Profile" className="profilePic" />}
            <div>
              <p className="profileText">{profile?.name || profile?.email}</p>
              {sheetUrl && <a className="sheetLink" href={sheetUrl} target="_blank" rel="noreferrer">Open your Google Sheet</a>}
            </div>
            <button type="button" className="logoutBtn" onClick={logout}><LogOut size={14} /> Logout</button>
          </div>
        </div>
        <div className="avatarCard">
          <img src={avatarMap[data.avatarStage]} alt="Avatar evolution" />
          <h2>Level {data.currentLevel}</h2>
          <p>{data.currentXp} XP</p>
        </div>
      </section>

      <section className="grid">
        <article className="glass panel">
          <h3><BrainCircuit size={18} /> Today Sessions</h3>
          <p>{data.today}</p>
          <div className="checks">
            {sessionMeta.map((item) => (
              <label key={item.key} className="checkItem">
                <input
                  type="checkbox"
                  checked={Boolean(data.todayRecord.checks[item.key])}
                  disabled={savingKey === item.key}
                  onChange={(event) => toggle(item.key, event.target.checked)}
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
        </article>

        <article className="glass panel">
          <h3>Hours vs Target (Last 30 Days)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={stats.chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="day" tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="hours" stroke="#34d399" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="target" stroke="#f59e0b" strokeDasharray="4 4" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </article>

        <article className="glass panel wide">
          <h3>Sessions Completed (Last 30 Days)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={stats.chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="day" tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} domain={[0, 4]} />
              <Tooltip />
              <Bar dataKey="sessions" fill="#60a5fa" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </article>
      </section>

      {error && <p className="error">{error}</p>}
    </main>
  );
}
