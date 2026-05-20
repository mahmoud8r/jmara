import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCjRpE49x2QdOMUsW0D9eHPv2uXl466JJw",
  authDomain: "jamra-order.firebaseapp.com",
  projectId: "jamra-order",
  storageBucket: "jamra-order.firebasestorage.app",
  messagingSenderId: "579299260203",
  appId: "1:579299260203:web:80414025a31f2b1c99376e",
  measurementId: "G-1S9WJZ9W22"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const STATUS = {
  pending:    { label: "قيد الانتظار", color: "#F59E0B", bg: "#FEF3C7", icon: "⏳" },
  inProgress: { label: "جاري التحضير", color: "#3B82F6", bg: "#DBEAFE", icon: "🔥" },
  ready:      { label: "جاهز",          color: "#10B981", bg: "#D1FAE5", icon: "✅" },
  delivered:  { label: "تم التسليم",    color: "#6B7280", bg: "#F3F4F6", icon: "📦" },
};

const SOURCE = {
  whatsapp: { label: "واتساب",        icon: "💬" },
  inPerson: { label: "وجهاً لوجه",   icon: "🏪" },
  online:   { label: "متجر إلكتروني", icon: "🌐" },
};

export default function App() {
  const [orders, setOrders]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch]     = useState("");
  const [form, setForm]         = useState({ customer: "", item: "", qty: 1, source: "whatsapp", note: "", deliveryTime: "" });

  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const addOrder = async () => {
    if (!form.customer || !form.item) return;
    await addDoc(collection(db, "orders"), {
      ...form,
      qty: Number(form.qty),
      status: "pending",
      date: new Date().toISOString().slice(0, 10),
      createdAt: Date.now(),
    });
    setForm({ customer: "", item: "", qty: 1, source: "whatsapp", note: "", deliveryTime: "" });
    setShowForm(false);
  };

  const updateStatus = async (id, status) => {
    await updateDoc(doc(db, "orders", id), { status });
  };

  const deleteOrder = async (id) => {
    await deleteDoc(doc(db, "orders", id));
  };

  const filtered = orders.filter(o => {
    const matchStatus = filter === "all" || o.status === filter;
    const matchSearch = o.customer.includes(search) || o.item.includes(search);
    return matchStatus && matchSearch;
  });

  const counts = Object.fromEntries(Object.keys(STATUS).map(s => [s, orders.filter(o => o.status === s).length]));

  const itemSummary = orders
    .filter(o => o.status !== "delivered")
    .reduce((acc, o) => { acc[o.item] = (acc[o.item] || 0) + o.qty; return acc; }, {});

  const totalQty = filtered.reduce((s, o) => s + o.qty, 0);

  if (loading) return (
    <div style={{ fontFamily: "'Tajawal', sans-serif", direction: "rtl", minHeight: "100vh", background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <div style={{ fontSize: 48 }}>🔥</div>
      <div style={{ fontSize: 18, fontWeight: 700 }}>جاري تحميل الطلبات...</div>
    </div>
  );

  return (
    <div style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif", direction: "rtl", minHeight: "100vh", background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)", color: "#fff", padding: "0 0 40px 0" }}>
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.1)", padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 900 }}>🔥 جمرة</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>☁️ محفوظ ومشترك مع الفريق</div>
        </div>
        <button onClick={() => setShowForm(true)} style={{ background: "linear-gradient(135deg, #f97316, #ef4444)", border: "none", color: "#fff", padding: "10px 20px", borderRadius: 12, fontFamily: "inherit", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
          + طلب جديد
        </button>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px" }}>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 24 }}>
          {Object.entries(STATUS).map(([key, s]) => (
            <div key={key} onClick={() => setFilter(filter === key ? "all" : key)}
              style={{ background: filter === key ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.05)", border: `1px solid ${filter === key ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.08)"}`, borderRadius: 14, padding: "14px 10px", textAlign: "center", cursor: "pointer" }}>
              <div style={{ fontSize: 22 }}>{s.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 900, marginTop: 4 }}>{counts[key]}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Item Summary */}
        {Object.keys(itemSummary).length > 0 && (
          <div style={{ background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.3)", borderRadius: 16, padding: "16px 18px", marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: "#f97316", fontWeight: 700, marginBottom: 12 }}>📦 المطلوب تحضيره الآن</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {Object.entries(itemSummary).map(([item, qty]) => (
                <div key={item} style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "10px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 36, fontWeight: 900, color: "#f97316", lineHeight: 1 }}>{qty}</span>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 ابحث باسم الزبون أو المنتج..."
          style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "12px 16px", color: "#fff", fontFamily: "inherit", fontSize: 14, marginBottom: 16, outline: "none" }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>{filtered.length} طلب • {totalQty} قطعة</div>
          {filter !== "all" && <div style={{ background: "rgba(255,255,255,0.1)", padding: "4px 12px", borderRadius: 20, fontSize: 12 }}>فلتر: {STATUS[filter].label}</div>}
        </div>

        {orders.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "rgba(255,255,255,0.3)" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 16 }}>لا توجد طلبات بعد</div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map(order => {
            const st  = STATUS[order.status];
            const src = SOURCE[order.source];
            return (
              <div key={order.id} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 16 }}>{order.customer}</div>
                    <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, marginTop: 3 }}>{order.item} • <b style={{ color: "#f97316" }}>×{order.qty}</b></div>
                    {order.note && <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 4 }}>📝 {order.note}</div>}
                    {order.deliveryTime && (
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.35)", borderRadius: 8, padding: "3px 10px", marginTop: 6, fontSize: 13, fontWeight: 700, color: "#fca5a5" }}>
                        🕐 موعد التسليم: {order.deliveryTime}
                      </div>
                    )}
                    <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginTop: 6 }}>{src?.icon} {src?.label} • {order.date}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                    <span style={{ background: st.bg, color: st.color, padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>{st.icon} {st.label}</span>
                    <button onClick={() => deleteOrder(order.id)} style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", padding: "4px 10px", borderRadius: 8, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>حذف</button>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 14, flexWrap: "wrap" }}>
                  {Object.entries(STATUS).map(([key, s]) => (
                    <button key={key} onClick={() => updateStatus(order.id, key)}
                      style={{ background: order.status === key ? s.bg : "rgba(255,255,255,0.05)", color: order.status === key ? s.color : "rgba(255,255,255,0.5)", border: `1px solid ${order.status === key ? s.color : "rgba(255,255,255,0.1)"}`, padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                      {s.icon} {s.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16, overflowY: "auto" }}>
          <div style={{ background: "#1e1b4b", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 20, padding: 24, width: "100%", maxWidth: 400, maxHeight: "90vh", overflowY: "auto", margin: "auto" }}>
            <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 20 }}>➕ طلب جديد</div>
            {[
              { label: "اسم الزبون *", key: "customer", type: "text",   placeholder: "مثال: أم محمد" },
              { label: "المنتج *",      key: "item",     type: "text",   placeholder: "مثال: جمرة فاخرة" },
              { label: "الكمية",        key: "qty",      type: "number", placeholder: "1" },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", display: "block", marginBottom: 6 }}>{f.label}</label>
                <input type={f.type} value={form[f.key]} placeholder={f.placeholder}
                  onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                  style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "10px 14px", color: "#fff", fontFamily: "inherit", fontSize: 14, outline: "none" }} />
              </div>
            ))}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", display: "block", marginBottom: 6 }}>مصدر الطلب</label>
              <select value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}
                style={{ width: "100%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "10px 14px", color: "#fff", fontFamily: "inherit", fontSize: 14, outline: "none" }}>
                {Object.entries(SOURCE).map(([k, v]) => <option key={k} value={k} style={{ background: "#1e1b4b" }}>{v.icon} {v.label}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", display: "block", marginBottom: 6 }}>🕐 وقت التسليم المطلوب (اختياري)</label>
              <input type="time" value={form.deliveryTime} onChange={e => setForm({ ...form, deliveryTime: e.target.value })}
                style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "10px 14px", color: "#fff", fontFamily: "inherit", fontSize: 14, outline: "none" }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", display: "block", marginBottom: 6 }}>ملاحظة (اختياري)</label>
              <input value={form.note} placeholder="مثال: لون بيج، مقاس خاص..." onChange={e => setForm({ ...form, note: e.target.value })}
                style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "10px 14px", color: "#fff", fontFamily: "inherit", fontSize: 14, outline: "none" }} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={addOrder} style={{ flex: 1, background: "linear-gradient(135deg, #f97316, #ef4444)", border: "none", color: "#fff", padding: 13, borderRadius: 12, fontFamily: "inherit", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>حفظ الطلب</button>
              <button onClick={() => setShowForm(false)} style={{ flex: 1, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", padding: 13, borderRadius: 12, fontFamily: "inherit", fontSize: 15, cursor: "pointer" }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
