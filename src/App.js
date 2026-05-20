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

const C = {
  black:  "#0a0a0a",
  dark:   "#111111",
  card:   "#1a1a1a",
  border: "#2a2a2a",
  red:    "#DC2626",
  orange: "#f97316",
  gold:   "#F5A623",
  text:   "#ffffff",
  muted:  "rgba(255,255,255,0.45)",
};

const STATUS = {
  pending:    { label: "قيد الانتظار", color: "#F5A623", bg: "#2a1f00", icon: "⏳" },
  inProgress: { label: "جاري التحضير", color: "#f97316", bg: "#2a1200", icon: "🔥" },
  ready:      { label: "جاهز",          color: "#22c55e", bg: "#002a0f", icon: "✅" },
  delivered:  { label: "تم التسليم",    color: "#6B7280", bg: "#1a1a1a", icon: "📦" },
};

const SOURCE = {
  whatsapp: { label: "واتساب",        icon: "💬" },
  inPerson: { label: "وجهاً لوجه",   icon: "🏪" },
  online:   { label: "متجر إلكتروني", icon: "🌐" },
};

function QRModal({ order, onClose }) {
  const text = `JAMRA ORDER\n${order.customer}\n${order.item} x${order.qty}${order.price ? "\n$" + order.price : ""}${order.deliveryTime ? "\n" + order.deliveryTime : ""}${order.note ? "\n" + order.note : ""}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(text)}`;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: 28, maxWidth: 320, width: "100%", textAlign: "center" }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 24, fontWeight: 900, background: "linear-gradient(90deg,#DC2626,#f97316,#F5A623)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>JAMRA</div>
          <div style={{ fontSize: 10, color: C.gold, letterSpacing: 2, marginTop: 2 }}>THE AUTHENTIC TASTE</div>
        </div>
        <div style={{ background: "#111", borderRadius: 12, padding: "12px 16px", marginBottom: 16, textAlign: "right" }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>{order.customer}</div>
          <div style={{ fontSize: 14, color: C.orange, marginTop: 4 }}>{order.item} × {order.qty}</div>
          {order.price && <div style={{ fontSize: 14, color: C.gold, marginTop: 4, fontWeight: 700 }}>💰 ${order.price}</div>}
          {order.deliveryTime && <div style={{ fontSize: 13, color: C.gold, marginTop: 4 }}>🕐 {order.deliveryTime}</div>}
          {order.note && <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>📝 {order.note}</div>}
        </div>
        <img src={qrUrl} alt="QR" style={{ width: 180, height: 180, borderRadius: 12, border: `2px solid ${C.border}` }} />
        <div style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>امسح الـ QR من تطبيق Katasymbol</div>
        <button onClick={onClose} style={{ marginTop: 16, width: "100%", background: "linear-gradient(135deg,#DC2626,#f97316)", border: "none", color: "#fff", padding: 12, borderRadius: 12, fontFamily: "inherit", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
          إغلاق
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [orders, setOrders]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch]     = useState("");
  const [qrOrder, setQrOrder]   = useState(null);
  const [form, setForm] = useState({ customer: "", item: "", qty: 1, price: "", source: "whatsapp", note: "", deliveryTime: "" });

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
      ...form, qty: Number(form.qty), price: form.price ? Number(form.price) : null,
      status: "pending", date: new Date().toISOString().slice(0, 10), createdAt: Date.now(),
    });
    setForm({ customer: "", item: "", qty: 1, price: "", source: "whatsapp", note: "", deliveryTime: "" });
    setShowForm(false);
  };

  const updateStatus = async (id, status) => await updateDoc(doc(db, "orders", id), { status });
  const deleteOrder  = async (id)         => await deleteDoc(doc(db, "orders", id));

  const filtered = orders.filter(o =>
    (filter === "all" || o.status === filter) &&
    (o.customer.includes(search) || o.item.includes(search))
  );

  const counts = Object.fromEntries(Object.keys(STATUS).map(s => [s, orders.filter(o => o.status === s).length]));
  const itemSummary = orders.filter(o => o.status !== "delivered").reduce((acc, o) => { acc[o.item] = (acc[o.item] || 0) + o.qty; return acc; }, {});
  const totalQty = filtered.reduce((s, o) => s + o.qty, 0);
  const totalRevenue = filtered.filter(o => o.price).reduce((s, o) => s + (o.price * o.qty), 0);

  const inputStyle = { width: "100%", boxSizing: "border-box", background: "#111", border: `1px solid ${C.border}`, borderRadius: 10, padding: "11px 14px", color: C.text, fontFamily: "inherit", fontSize: 14, outline: "none" };

  if (loading) return (
    <div style={{ fontFamily: "'Tajawal', sans-serif", direction: "rtl", minHeight: "100vh", background: C.black, color: C.text, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;800;900&display=swap" rel="stylesheet" />
      <div style={{ fontSize: 52 }}>🔥</div>
      <div style={{ fontSize: 28, fontWeight: 900, background: "linear-gradient(90deg,#DC2626,#f97316,#F5A623)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>JAMRA</div>
      <div style={{ fontSize: 14, color: C.muted }}>جاري تحميل الطلبات...</div>
    </div>
  );

  return (
    <div style={{ fontFamily: "'Tajawal', sans-serif", direction: "rtl", minHeight: "100vh", background: C.black, color: C.text, paddingBottom: 40 }}>
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;800;900&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: C.dark, borderBottom: `1px solid ${C.border}`, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 900, background: "linear-gradient(90deg,#DC2626,#f97316,#F5A623)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1 }}>JAMRA</div>
          <div style={{ fontSize: 10, color: C.gold, letterSpacing: 2, marginTop: 2 }}>THE AUTHENTIC TASTE</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 2 }}>☁️ محفوظ ومشترك مع الفريق</div>
        </div>
        <button onClick={() => setShowForm(true)}
          style={{ background: "linear-gradient(135deg,#DC2626,#f97316)", border: "none", color: "#fff", padding: "11px 20px", borderRadius: 12, fontFamily: "inherit", fontSize: 14, fontWeight: 800, cursor: "pointer", boxShadow: "0 4px 15px rgba(220,38,38,0.35)" }}>
          + طلب جديد
        </button>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "20px 16px" }}>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 16 }}>
          {Object.entries(STATUS).map(([key, s]) => (
            <div key={key} onClick={() => setFilter(filter === key ? "all" : key)}
              style={{ background: filter === key ? s.bg : C.card, border: `1px solid ${filter === key ? s.color : C.border}`, borderRadius: 12, padding: "12px 8px", textAlign: "center", cursor: "pointer", transition: "all 0.2s" }}>
              <div style={{ fontSize: 20 }}>{s.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: filter === key ? s.color : C.text, marginTop: 2 }}>{counts[key]}</div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Revenue banner */}
        {totalRevenue > 0 && (
          <div style={{ background: "linear-gradient(135deg,#1a0d00,#2a1500)", border: `1px solid ${C.gold}30`, borderRadius: 12, padding: "12px 16px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 13, color: C.muted }}>💰 إجمالي الإيرادات</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: C.gold }}>${totalRevenue.toFixed(2)}</div>
          </div>
        )}

        {/* Item Summary */}
        {Object.keys(itemSummary).length > 0 && (
          <div style={{ background: "#1a0d00", border: `1px solid #f9731630`, borderRadius: 14, padding: "14px 16px", marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: C.orange, fontWeight: 700, marginBottom: 10 }}>📦 المطلوب تحضيره الآن</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {Object.entries(itemSummary).map(([item, qty]) => (
                <div key={item} style={{ background: "#111", border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 28, fontWeight: 900, color: C.orange, lineHeight: 1 }}>{qty}</span>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 ابحث باسم الزبون أو المنتج..."
          style={{ ...inputStyle, marginBottom: 12 }} />

        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: C.muted }}>{filtered.length} طلب • {totalQty} قطعة</div>
          {filter !== "all" && <div style={{ background: C.card, border: `1px solid ${C.border}`, padding: "3px 12px", borderRadius: 20, fontSize: 11, color: C.gold }}>{STATUS[filter].label}</div>}
        </div>

        {orders.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: C.muted }}>
            <div style={{ fontSize: 48, marginBottom: 10 }}>🔥</div>
            <div style={{ fontSize: 16, color: C.gold, fontWeight: 700 }}>لا توجد طلبات بعد</div>
          </div>
        )}

        {/* Orders */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(order => {
            const st  = STATUS[order.status];
            const src = SOURCE[order.source];
            return (
              <div key={order.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16, borderRight: `3px solid ${st.color}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 16 }}>{order.customer}</div>
                    <div style={{ color: C.muted, fontSize: 13, marginTop: 3 }}>
                      {order.item} • <b style={{ color: C.orange }}>×{order.qty}</b>
                      {order.price && <b style={{ color: C.gold, marginRight: 6 }}> • ${(order.price * order.qty).toFixed(2)}</b>}
                    </div>
                    {order.note && <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>📝 {order.note}</div>}
                    {order.deliveryTime && (
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#2a1500", border: `1px solid ${C.orange}40`, borderRadius: 8, padding: "3px 10px", marginTop: 6, fontSize: 12, fontWeight: 700, color: C.gold }}>
                        🕐 {order.deliveryTime}
                      </div>
                    )}
                    <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 11, marginTop: 6 }}>{src?.icon} {src?.label} • {order.date}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, marginRight: 8 }}>
                    <span style={{ background: st.bg, color: st.color, padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", border: `1px solid ${st.color}40` }}>{st.icon} {st.label}</span>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => setQrOrder(order)}
                        style={{ background: "#1a1500", border: `1px solid ${C.gold}50`, color: C.gold, padding: "4px 10px", borderRadius: 8, fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>
                        🔲 QR
                      </button>
                      <button onClick={() => deleteOrder(order.id)}
                        style={{ background: "#1a0000", border: "1px solid rgba(220,38,38,0.3)", color: "#f87171", padding: "4px 10px", borderRadius: 8, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                        حذف
                      </button>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
                  {Object.entries(STATUS).map(([key, s]) => (
                    <button key={key} onClick={() => updateStatus(order.id, key)}
                      style={{ background: order.status === key ? s.bg : "transparent", color: order.status === key ? s.color : C.muted, border: `1px solid ${order.status === key ? s.color : C.border}`, padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}>
                      {s.icon} {s.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* QR Modal */}
      {qrOrder && <QRModal order={qrOrder} onClose={() => setQrOrder(null)} />}

      {/* Add Order Modal */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16, overflowY: "auto" }}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: 24, width: "100%", maxWidth: 400, maxHeight: "90vh", overflowY: "auto", margin: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div style={{ width: 4, height: 24, background: "linear-gradient(#DC2626,#f97316)", borderRadius: 4 }} />
              <div style={{ fontSize: 18, fontWeight: 900 }}>طلب جديد</div>
            </div>

            {[
              { label: "اسم الزبون *", key: "customer", type: "text",   placeholder: "مثال: أم محمد" },
              { label: "المنتج *",      key: "item",     type: "text",   placeholder: "مثال: جمرة فاخرة" },
              { label: "الكمية",        key: "qty",      type: "number", placeholder: "1" },
              { label: "💰 السعر (اختياري)", key: "price", type: "number", placeholder: "مثال: 25.00" },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: C.muted, display: "block", marginBottom: 6 }}>{f.label}</label>
                <input type={f.type} value={form[f.key]} placeholder={f.placeholder}
                  onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                  style={inputStyle} />
              </div>
            ))}

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: C.muted, display: "block", marginBottom: 6 }}>مصدر الطلب</label>
              <select value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}
                style={{ ...inputStyle }}>
                {Object.entries(SOURCE).map(([k, v]) => <option key={k} value={k} style={{ background: "#111" }}>{v.icon} {v.label}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: C.muted, display: "block", marginBottom: 6 }}>🕐 وقت التسليم (اختياري)</label>
              <input type="time" value={form.deliveryTime} onChange={e => setForm({ ...form, deliveryTime: e.target.value })}
                style={inputStyle} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: C.muted, display: "block", marginBottom: 6 }}>ملاحظة (اختياري)</label>
              <input value={form.note} placeholder="مثال: لون بيج، مقاس خاص..." onChange={e => setForm({ ...form, note: e.target.value })}
                style={inputStyle} />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={addOrder}
                style={{ flex: 1, background: "linear-gradient(135deg,#DC2626,#f97316)", border: "none", color: "#fff", padding: 13, borderRadius: 12, fontFamily: "inherit", fontSize: 15, fontWeight: 800, cursor: "pointer", boxShadow: "0 4px 15px rgba(220,38,38,0.3)" }}>
                حفظ الطلب
              </button>
              <button onClick={() => setShowForm(false)}
                style={{ flex: 1, background: "transparent", border: `1px solid ${C.border}`, color: C.muted, padding: 13, borderRadius: 12, fontFamily: "inherit", fontSize: 15, cursor: "pointer" }}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
