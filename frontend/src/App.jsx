import { useState, useRef, useEffect } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from "recharts";

// ─── Dummy Data ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: "food", label: "Food & Dining", color: "#C8A97E", icon: "🍽️" },
  { id: "transport", label: "Transport", color: "#8FA8C8", icon: "🚗" },
  { id: "utilities", label: "Utilities", color: "#A8C4A2", icon: "⚡" },
  { id: "entertainment", label: "Entertainment", color: "#C4A8C0", icon: "🎬" },
  { id: "health", label: "Health", color: "#C4B8A0", icon: "💊" },
  { id: "shopping", label: "Shopping", color: "#C0A898", icon: "🛍️" },
  { id: "rent", label: "Rent & Housing", color: "#A0B4C8", icon: "🏠" },
  { id: "savings", label: "Savings", color: "#A8C4A8", icon: "💰" },
];

const DUMMY_EXPENSES = [
  { id: 1, title: "Grocery Store", amount: 2340, category: "food", date: "2025-11-01", note: "Weekly groceries" },
  { id: 2, title: "Metro Card Recharge", amount: 500, category: "transport", date: "2025-11-02", note: "" },
  { id: 3, title: "Netflix", amount: 649, category: "entertainment", date: "2025-11-03", note: "Monthly subscription" },
  { id: 4, title: "Electricity Bill", amount: 1800, category: "utilities", date: "2025-11-04", note: "" },
  { id: 5, title: "Zomato", amount: 480, category: "food", date: "2025-11-05", note: "Dinner order" },
  { id: 6, title: "Gym Membership", amount: 1200, category: "health", date: "2025-11-06", note: "" },
  { id: 7, title: "Amazon Order", amount: 3200, category: "shopping", date: "2025-11-07", note: "Clothes & accessories" },
  { id: 8, title: "Rent", amount: 18000, category: "rent", date: "2025-11-01", note: "November rent" },
  { id: 9, title: "Petrol", amount: 1100, category: "transport", date: "2025-11-08", note: "" },
  { id: 10, title: "Pharmacy", amount: 320, category: "health", date: "2025-11-09", note: "Vitamins" },
  { id: 11, title: "Coffee Shop", amount: 560, category: "food", date: "2025-11-10", note: "Meetings" },
  { id: 12, title: "Savings Transfer", amount: 5000, category: "savings", date: "2025-11-10", note: "Monthly savings" },
  { id: 13, title: "Internet Bill", amount: 999, category: "utilities", date: "2025-11-11", note: "" },
  { id: 14, title: "Movie Tickets", amount: 700, category: "entertainment", date: "2025-11-09", note: "Weekend outing" },
  { id: 15, title: "Swiggy", amount: 390, category: "food", date: "2025-11-11", note: "Lunch" },
];

const PAST_MONTHS = [
  { month: "October 2025", total: 34200, saved: 4000, topCategory: "Rent & Housing" },
  { month: "September 2025", total: 31800, saved: 6500, topCategory: "Shopping" },
  { month: "August 2025", total: 29500, saved: 8000, topCategory: "Food & Dining" },
  { month: "July 2025", total: 33100, saved: 3500, topCategory: "Rent & Housing" },
  { month: "June 2025", total: 28900, saved: 9200, topCategory: "Utilities" },
];

const MONTHLY_TREND = [
  { month: "Jun", spent: 28900, saved: 9200 },
  { month: "Jul", spent: 33100, saved: 3500 },
  { month: "Aug", spent: 29500, saved: 8000 },
  { month: "Sep", spent: 31800, saved: 6500 },
  { month: "Oct", spent: 34200, saved: 4000 },
  { month: "Nov", spent: 35238, saved: 5000 },
];

const SAVINGS_GOAL = {
  title: "Emergency Fund",
  target: 100000,
  current: 42000,
  deadline: "2026-06-01",
};

const CHAT_SUGGESTIONS = [
  "How much did I spend on food this month?",
  "Compare my October vs November expenses",
  "What's my biggest expense category?",
  "Am I on track with my savings goal?",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n) =>
  "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 });

const getCat = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[0];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function NavItem({ label, icon, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all duration-150 text-left
        ${active
          ? "bg-[#E8E3D9] text-[#2C2A26] font-medium"
          : "text-[#7C6F5B] hover:bg-[#F0EDE6] hover:text-[#2C2A26]"}`}
    >
      <span className="text-base">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function Chip({ label, color }) {
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ background: color + "30", color: color }}
    >
      {label}
    </span>
  );
}

function Modal({ open, onClose, children }) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#2C2A26]/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[#FAF8F5] rounded-2xl shadow-xl p-6 w-full max-w-md mx-4 border border-[#E8E3D9]"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Expense Form ─────────────────────────────────────────────────────────────

function ExpenseForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(
    initial || { title: "", amount: "", category: "food", date: todayStr(), note: "" }
  );
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div>
      <h3 className="text-base font-semibold text-[#2C2A26] mb-4">
        {initial ? "Edit Expense" : "Add Expense"}
      </h3>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-[#7C6F5B] mb-1 block">Title</label>
          <input
            className="w-full border border-[#E8E3D9] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#C8A97E] text-[#2C2A26]"
            placeholder="e.g. Grocery shopping"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[#7C6F5B] mb-1 block">Amount (₹)</label>
            <input
              type="number"
              className="w-full border border-[#E8E3D9] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#C8A97E] text-[#2C2A26]"
              placeholder="0"
              value={form.amount}
              onChange={(e) => set("amount", e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-[#7C6F5B] mb-1 block">Date</label>
            <input
              type="date"
              className="w-full border border-[#E8E3D9] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#C8A97E] text-[#2C2A26]"
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-[#7C6F5B] mb-1 block">Category</label>
          <select
            className="w-full border border-[#E8E3D9] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#C8A97E] text-[#2C2A26]"
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-[#7C6F5B] mb-1 block">Note (optional)</label>
          <input
            className="w-full border border-[#E8E3D9] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#C8A97E] text-[#2C2A26]"
            placeholder="Add a note..."
            value={form.note}
            onChange={(e) => set("note", e.target.value)}
          />
        </div>
      </div>
      <div className="flex gap-2 mt-5">
        <button
          onClick={() => onSave(form)}
          className="flex-1 bg-[#2C2A26] text-[#FAF8F5] rounded-lg py-2.5 text-sm font-medium hover:bg-[#3D3A35] transition-colors"
        >
          {initial ? "Save Changes" : "Add Expense"}
        </button>
        <button
          onClick={onCancel}
          className="flex-1 border border-[#E8E3D9] text-[#7C6F5B] rounded-lg py-2.5 text-sm hover:bg-[#F0EDE6] transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Chat Section ─────────────────────────────────────────────────────────────

function ChatSection() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hello! I've analysed your expense reports. Ask me anything about your spending — categories, trends, comparisons, or savings insights.",
    },
  ]);
  const [input, setInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fakeReply = (q) => {
    const lower = q.toLowerCase();
    if (lower.includes("food"))
      return "You've spent ₹3,770 on Food & Dining this month across 4 transactions — Grocery Store (₹2,340), Zomato (₹480), Coffee Shop (₹560), and Swiggy (₹390). That's 10.7% of your total spend.";
    if (lower.includes("saving"))
      return "You're on track! You've saved ₹5,000 this month. Your Emergency Fund goal is ₹1,00,000 — you're at 42% (₹42,000) with a June 2026 deadline. You need to save about ₹8,167/month to reach it.";
    if (lower.includes("biggest") || lower.includes("top"))
      return "Your biggest category this month is Rent & Housing at ₹18,000 (51.1%), followed by Shopping at ₹3,200 (9.1%) and Food & Dining at ₹3,770 (10.7%).";
    if (lower.includes("compar") || lower.includes("october"))
      return "Comparing October vs November: October total was ₹34,200, November is currently ₹35,238. You're ₹1,038 above last month (+3%). Food is up ₹620, but utilities are down ₹400.";
    return "Based on your expense data, I can see you've uploaded reports for November 2025. Your total spend so far is ₹35,238 across 8 categories. Would you like a breakdown by category or a comparison with last month?";
  };

  const send = () => {
    if (!input.trim()) return;
    const q = input.trim();
    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setTimeout(() => {
      setMessages((m) => [...m, { role: "assistant", text: fakeReply(q) }]);
    }, 900);
  };

  const handleUpload = (type) => {
    setUploading(true);
    setTimeout(() => {
      setUploading(false);
      setMessages((m) => [
        ...m,
        { role: "assistant", text: `✅ Your ${type} has been processed. I found 15 transactions totalling ₹35,238. The data has been categorised automatically — you can now ask me anything about it.` },
      ]);
    }, 1800);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Upload strip */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => { fileRef.current.accept = ".pdf"; fileRef.current.click(); handleUpload("PDF report"); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#E8E3D9] text-sm text-[#7C6F5B] hover:bg-[#F0EDE6] transition-colors bg-white"
        >
          <span>📄</span> Import PDF
        </button>
        <button
          onClick={() => { fileRef.current.accept = ".xlsx,.csv"; fileRef.current.click(); handleUpload("Excel sheet"); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#E8E3D9] text-sm text-[#7C6F5B] hover:bg-[#F0EDE6] transition-colors bg-white"
        >
          <span>📊</span> Import Excel
        </button>
        {uploading && (
          <span className="text-xs text-[#7C6F5B] self-center ml-2 animate-pulse">
            Processing...
          </span>
        )}
        <input ref={fileRef} type="file" className="hidden" onChange={() => {}} />
      </div>

      {/* Message area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-0">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-[#E8E3D9] flex items-center justify-center text-xs mr-2 mt-0.5 flex-shrink-0">
                ✦
              </div>
            )}
            <div
              className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed
                ${m.role === "user"
                  ? "bg-[#2C2A26] text-[#FAF8F5] rounded-br-sm"
                  : "bg-[#F0EDE6] text-[#2C2A26] rounded-bl-sm border border-[#E8E3D9]"}`}
            >
              {m.text}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 2 && (
        <div className="flex flex-wrap gap-2 mt-3 mb-2">
          {CHAT_SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => { setInput(s); }}
              className="text-xs px-3 py-1.5 rounded-full border border-[#E8E3D9] text-[#7C6F5B] hover:bg-[#F0EDE6] transition-colors bg-white"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="mt-3 flex gap-2 items-end">
        <div className="flex-1 relative">
          <textarea
            className="w-full border border-[#E8E3D9] rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:border-[#C8A97E] resize-none text-[#2C2A26] leading-relaxed"
            rows={2}
            placeholder="Ask anything about your expenses…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          />
        </div>
        <button
          onClick={send}
          className="bg-[#2C2A26] text-[#FAF8F5] rounded-xl px-4 py-3 text-sm font-medium hover:bg-[#3D3A35] transition-colors h-[62px] flex items-center gap-1.5"
        >
          <span>Send</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Savings Goal ─────────────────────────────────────────────────────────────

function SavingsGoalCard() {
  const [goal, setGoal] = useState(SAVINGS_GOAL);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(goal);
  const pct = Math.min(100, Math.round((goal.current / goal.target) * 100));

  const daysLeft = Math.max(
    0,
    Math.round((new Date(goal.deadline) - new Date()) / 86400000)
  );

  return (
    <div className="bg-white border border-[#E8E3D9] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs text-[#7C6F5B] uppercase tracking-wide">Savings Goal</p>
          <h3 className="text-base font-semibold text-[#2C2A26] mt-0.5">{goal.title}</h3>
        </div>
        <button
          onClick={() => { setDraft(goal); setEditing(true); }}
          className="text-xs text-[#7C6F5B] hover:text-[#2C2A26] border border-[#E8E3D9] px-3 py-1.5 rounded-lg transition-colors"
        >
          Edit
        </button>
      </div>

      <div className="flex items-end justify-between mb-2">
        <span className="text-2xl font-semibold text-[#2C2A26]">{fmt(goal.current)}</span>
        <span className="text-sm text-[#7C6F5B]">of {fmt(goal.target)}</span>
      </div>

      <div className="relative h-2 bg-[#F0EDE6] rounded-full overflow-hidden mb-3">
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: "linear-gradient(90deg, #A8C4A2, #4A7C59)" }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-[#7C6F5B]">
        <span>{pct}% reached</span>
        <span>🗓 {daysLeft} days left · {new Date(goal.deadline).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</span>
      </div>

      <Modal open={editing} onClose={() => setEditing(false)}>
        <h3 className="text-base font-semibold text-[#2C2A26] mb-4">Edit Savings Goal</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-[#7C6F5B] mb-1 block">Goal Title</label>
            <input
              className="w-full border border-[#E8E3D9] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#C8A97E] text-[#2C2A26]"
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#7C6F5B] mb-1 block">Target (₹)</label>
              <input
                type="number"
                className="w-full border border-[#E8E3D9] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#C8A97E] text-[#2C2A26]"
                value={draft.target}
                onChange={(e) => setDraft((d) => ({ ...d, target: +e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-[#7C6F5B] mb-1 block">Current (₹)</label>
              <input
                type="number"
                className="w-full border border-[#E8E3D9] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#C8A97E] text-[#2C2A26]"
                value={draft.current}
                onChange={(e) => setDraft((d) => ({ ...d, current: +e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-[#7C6F5B] mb-1 block">Deadline</label>
            <input
              type="date"
              className="w-full border border-[#E8E3D9] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#C8A97E] text-[#2C2A26]"
              value={draft.deadline}
              onChange={(e) => setDraft((d) => ({ ...d, deadline: e.target.value }))}
            />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button
            onClick={() => { setGoal(draft); setEditing(false); }}
            className="flex-1 bg-[#2C2A26] text-[#FAF8F5] rounded-lg py-2.5 text-sm font-medium hover:bg-[#3D3A35] transition-colors"
          >
            Save
          </button>
          <button
            onClick={() => setEditing(false)}
            className="flex-1 border border-[#E8E3D9] text-[#7C6F5B] rounded-lg py-2.5 text-sm hover:bg-[#F0EDE6] transition-colors"
          >
            Cancel
          </button>
        </div>
      </Modal>
    </div>
  );
}

// ─── Dashboard View ───────────────────────────────────────────────────────────

function DashboardView({ expenses, onAdd, onEdit, onDelete }) {
  const total = expenses.reduce((s, e) => s + +e.amount, 0);

  const catTotals = CATEGORIES.map((c) => ({
    ...c,
    total: expenses.filter((e) => e.category === c.id).reduce((s, e) => s + +e.amount, 0),
  })).filter((c) => c.total > 0).sort((a, b) => b.total - a.total);

  const pieData = catTotals.map((c) => ({ name: c.label, value: c.total, color: c.color }));

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total This Month", value: fmt(total), sub: "Nov 2025" },
          { label: "Largest Expense", value: fmt(Math.max(...expenses.map((e) => +e.amount))), sub: "Single transaction" },
          { label: "Transactions", value: expenses.length, sub: "This month" },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-[#E8E3D9] rounded-2xl p-4">
            <p className="text-xs text-[#7C6F5B]">{s.label}</p>
            <p className="text-2xl font-semibold text-[#2C2A26] mt-1">{s.value}</p>
            <p className="text-xs text-[#7C6F5B] mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Categories + Pie */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-[#E8E3D9] rounded-2xl p-5">
          <p className="text-xs text-[#7C6F5B] mb-3">Categories this month</p>
          <div className="space-y-3">
            {catTotals.map((c) => (
              <div key={c.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[#2C2A26]">{c.icon} {c.label}</span>
                  <span className="text-[#7C6F5B] font-medium">{fmt(c.total)}</span>
                </div>
                <div className="h-1.5 bg-[#F0EDE6] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(c.total / total) * 100}%`, background: c.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-[#E8E3D9] rounded-2xl p-5 flex flex-col">
          <p className="text-xs text-[#7C6F5B] mb-2">Spending distribution</p>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={2} dataKey="value">
                  {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: "#FAF8F5", border: "1px solid #E8E3D9", borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
            {pieData.slice(0, 5).map((d) => (
              <div key={d.name} className="flex items-center gap-1 text-xs text-[#7C6F5B]">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: d.color }} />
                {d.name.split(" ")[0]}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Savings goal */}
      <SavingsGoalCard />

      {/* Recent expenses table */}
      <div className="bg-white border border-[#E8E3D9] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8E3D9]">
          <p className="text-sm font-medium text-[#2C2A26]">Recent Expenses</p>
          <button
            onClick={onAdd}
            className="text-xs bg-[#2C2A26] text-[#FAF8F5] px-3 py-1.5 rounded-lg hover:bg-[#3D3A35] transition-colors"
          >
            + Add
          </button>
        </div>
        <div className="divide-y divide-[#F0EDE6]">
          {[...expenses].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8).map((exp) => {
            const cat = getCat(exp.category);
            return (
              <div key={exp.id} className="flex items-center px-5 py-3.5 hover:bg-[#FAFAF8] transition-colors group">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm mr-3 flex-shrink-0" style={{ background: cat.color + "25" }}>
                  {cat.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#2C2A26] font-medium truncate">{exp.title}</p>
                  <p className="text-xs text-[#7C6F5B]">{new Date(exp.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                </div>
                <Chip label={cat.label} color={cat.color} />
                <span className="text-sm font-semibold text-[#2C2A26] ml-4 w-20 text-right">{fmt(exp.amount)}</span>
                <div className="flex gap-1 ml-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => onEdit(exp)} className="p-1.5 rounded-md hover:bg-[#F0EDE6] text-[#7C6F5B] text-xs">✏️</button>
                  <button onClick={() => onDelete(exp.id)} className="p-1.5 rounded-md hover:bg-[#F0EDE6] text-[#7C6F5B] text-xs">🗑️</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-[#E8E3D9] rounded-2xl p-5">
          <p className="text-xs text-[#7C6F5B] mb-4">Monthly spending trend</p>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={MONTHLY_TREND} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#7C6F5B" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#7C6F5B" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v / 1000}k`} />
              <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: "#FAF8F5", border: "1px solid #E8E3D9", borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="spent" stroke="#C8A97E" strokeWidth={2} dot={{ fill: "#C8A97E", r: 3 }} name="Spent" />
              <Line type="monotone" dataKey="saved" stroke="#A8C4A2" strokeWidth={2} dot={{ fill: "#A8C4A2", r: 3 }} name="Saved" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-[#E8E3D9] rounded-2xl p-5">
          <p className="text-xs text-[#7C6F5B] mb-4">Spend vs Save — 6 months</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={MONTHLY_TREND} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={10} barGap={4}>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#7C6F5B" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#7C6F5B" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v / 1000}k`} />
              <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: "#FAF8F5", border: "1px solid #E8E3D9", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="spent" fill="#E8D9C8" radius={[3, 3, 0, 0]} name="Spent" />
              <Bar dataKey="saved" fill="#A8C4A2" radius={[3, 3, 0, 0]} name="Saved" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ─── History View ─────────────────────────────────────────────────────────────

function HistoryView() {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-[#2C2A26]">Past Month History</h2>
      <div className="space-y-3">
        {PAST_MONTHS.map((m) => (
          <div key={m.month} className="bg-white border border-[#E8E3D9] rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#2C2A26]">{m.month}</p>
                <p className="text-xs text-[#7C6F5B] mt-0.5">Top: {m.topCategory}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-[#2C2A26]">{fmt(m.total)}</p>
                <p className="text-xs text-[#4A7C59]">+{fmt(m.saved)} saved</p>
              </div>
            </div>
            <div className="mt-3 h-1.5 bg-[#F0EDE6] rounded-full overflow-hidden">
              <div className="h-full bg-[#C8A97E] rounded-full" style={{ width: `${Math.min(100, (m.total / 40000) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-[#E8E3D9] rounded-2xl p-5">
        <p className="text-xs text-[#7C6F5B] mb-4">6-month savings pattern</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={MONTHLY_TREND} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={14}>
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#7C6F5B" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#7C6F5B" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v / 1000}k`} />
            <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: "#FAF8F5", border: "1px solid #E8E3D9", borderRadius: 8, fontSize: 12 }} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: "#7C6F5B" }} />
            <Bar dataKey="spent" fill="#E8D9C8" radius={[3, 3, 0, 0]} name="Spent" />
            <Bar dataKey="saved" fill="#A8C4A2" radius={[3, 3, 0, 0]} name="Saved" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Profile View ─────────────────────────────────────────────────────────────

function ProfileView({ expenses }) {
  const totalEver = expenses.reduce((s, e) => s + +e.amount, 0) + PAST_MONTHS.reduce((s, m) => s + m.total, 0);
  const totalSaved = PAST_MONTHS.reduce((s, m) => s + m.saved, 0) + 5000;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#E8E3D9] rounded-2xl p-6 flex items-center gap-5">
        <div className="w-14 h-14 rounded-full bg-[#E8E3D9] flex items-center justify-center text-2xl">
          👤
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[#2C2A26]">Your Profile</h2>
          <p className="text-sm text-[#7C6F5B]">Member since January 2025</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "All-time Spent", value: fmt(totalEver) },
          { label: "Total Saved", value: fmt(totalSaved) },
          { label: "Active Goals", value: "1" },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-[#E8E3D9] rounded-2xl p-4 text-center">
            <p className="text-xl font-semibold text-[#2C2A26]">{s.value}</p>
            <p className="text-xs text-[#7C6F5B] mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-[#E8E3D9] rounded-2xl overflow-hidden">
        <p className="text-sm font-medium text-[#2C2A26] px-5 py-4 border-b border-[#E8E3D9]">Full Transaction History</p>
        <div className="divide-y divide-[#F0EDE6] max-h-[420px] overflow-y-auto">
          {[...expenses].sort((a, b) => new Date(b.date) - new Date(a.date)).map((exp) => {
            const cat = getCat(exp.category);
            return (
              <div key={exp.id} className="flex items-center px-5 py-3.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs mr-3 flex-shrink-0" style={{ background: cat.color + "25" }}>
                  {cat.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#2C2A26] truncate">{exp.title}</p>
                  <p className="text-xs text-[#7C6F5B]">{new Date(exp.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                </div>
                <Chip label={cat.label} color={cat.color} />
                <span className="text-sm font-semibold text-[#2C2A26] ml-4">{fmt(exp.amount)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Ask AI View ──────────────────────────────────────────────────────────────

function AskAIView() {
  return (
    <div className="bg-white border border-[#E8E3D9] rounded-2xl p-6 h-full flex flex-col" style={{ minHeight: 600 }}>
      <div className="mb-5">
        <h2 className="text-base font-semibold text-[#2C2A26]">Ask about your expenses</h2>
        <p className="text-sm text-[#7C6F5B] mt-0.5">Upload a report or ask questions about your current data</p>
      </div>
      <div className="flex-1 min-h-0">
        <ChatSection />
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState("dashboard");
  const [expenses, setExpenses] = useState(DUMMY_EXPENSES);
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const handleAdd = (form) => {
    setExpenses((prev) => [...prev, { ...form, id: Date.now(), amount: +form.amount }]);
    setShowAdd(false);
  };

  const handleEdit = (form) => {
    setExpenses((prev) => prev.map((e) => (e.id === editTarget.id ? { ...e, ...form, amount: +form.amount } : e)));
    setEditTarget(null);
  };

  const handleDelete = (id) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  const NAV = [
    { id: "dashboard", label: "Overview", icon: "◫" },
    { id: "ai", label: "Ask AI", icon: "✦" },
    { id: "history", label: "History", icon: "⟳" },
    { id: "profile", label: "Profile", icon: "◉" },
  ];

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-[#F0EDE6] border-r border-[#E8E3D9] flex flex-col px-3 py-6 fixed top-0 left-0 h-full">
        <div className="px-4 mb-7">
          <span className="text-base font-semibold text-[#2C2A26]" style={{ fontFamily: "'Lora', serif" }}>
            Spendwise
          </span>
          <p className="text-xs text-[#7C6F5B] mt-0.5">Expense tracker</p>
        </div>

        <nav className="space-y-1 flex-1">
          {NAV.map((n) => (
            <NavItem key={n.id} label={n.label} icon={n.icon} active={view === n.id} onClick={() => setView(n.id)} />
          ))}
        </nav>

        <div className="mt-auto space-y-1">
          <button
            onClick={() => setShowAdd(true)}
            className="w-full flex items-center justify-center gap-2 bg-[#2C2A26] text-[#FAF8F5] rounded-lg py-2.5 text-sm font-medium hover:bg-[#3D3A35] transition-colors"
          >
            <span>+</span> Add Expense
          </button>
          <div className="text-xs text-center text-[#7C6F5B] pt-3">Nov 2025</div>
        </div>
      </aside>

      {/* Main */}
      <main className="ml-56 flex-1 p-6 overflow-y-auto min-h-screen">
        <div className="max-w-4xl mx-auto">
          {view === "dashboard" && (
            <DashboardView
              expenses={expenses}
              onAdd={() => setShowAdd(true)}
              onEdit={setEditTarget}
              onDelete={handleDelete}
            />
          )}
          {view === "ai" && <AskAIView />}
          {view === "history" && <HistoryView />}
          {view === "profile" && <ProfileView expenses={expenses} />}
        </div>
      </main>

      {/* Add modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)}>
        <ExpenseForm onSave={handleAdd} onCancel={() => setShowAdd(false)} />
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)}>
        {editTarget && (
          <ExpenseForm initial={editTarget} onSave={handleEdit} onCancel={() => setEditTarget(null)} />
        )}
      </Modal>
    </div>
  );
}
