import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, setDoc, getDoc } from "firebase/firestore";

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
  black: "#0a0a0a", dark: "#111111", card: "#1a1a1a", border: "#2a2a2a",
  red: "#DC2626", orange: "#f97316", gold: "#F5A623", text: "#ffffff",
  muted: "rgba(255,255,255,0.45)", green: "#22c55e", yellow: "#eab308",
};

const PRODUCTS = [
  { id: "whole_chicken_mandi",   label: "Whole Chicken Mandi",                        mandi: 1, madhbi: 0, lamb: 0, price: 34  },
  { id: "whole_chicken_madhbi",  label: "Whole Chicken Madhbi",                       mandi: 0, madhbi: 1, lamb: 0, price: 37  },
  { id: "lamb_plate",            label: "Lamb Plate (3 pcs)",                         mandi: 0, madhbi: 0, lamb: 3, price: 24  },
  { id: "family_chicken_mandi",  label: "Family Meal — Chicken Mandi",                mandi: 2, madhbi: 0, lamb: 0, price: 67  },
  { id: "family_chicken_madhbi", label: "Family Meal — Chicken Madhbi",               mandi: 0, madhbi: 2, lamb: 0, price: 72  },
  { id: "family_mix_chicken",    label: "Family Meal — Mix Chicken",                  mandi: 1, madhbi: 1, lamb: 0, price: 70  },
  { id: "family_mix_sm",         label: "Family Meal — Mix Lamb & Chicken (Medium)",  mandi: 1, madhbi: 0, lamb: 4, price: 80  },
  { id: "family_mix_lg",         label: "Family Meal — Mix Lamb & Chicken (Large)",   mandi: 2, madhbi: 0, lamb: 8, price: 150 },
  { id: "family_lamb",           label: "Family Lamb Meal",                           mandi: 0, madhbi: 0, lamb: 6, price: 100 },
];

const STATUS = {
  pending:    { label: "Pending",   color: "#F5A623", bg: "#2a1f00", icon: "⏳" },
  inProgress: { label: "Preparing", color: "#f97316", bg: "#2a1200", icon: "🔥" },
  ready:      { label: "Ready",     color: "#22c55e", bg: "#002a0f", icon: "✅" },
  delivered:  { label: "Delivered", color: "#6B7280", bg: "#1a1a1a", icon: "📦" },
};

const SOURCE = {
  whatsapp: { label: "WhatsApp", icon: "💬" },
  inPerson: { label: "Walk-in",  icon: "🏪" },
  online:   { label: "Online",   icon: "🌐" },
};

const TODAY = new Date().toISOString().slice(0, 10);

function StockModal({ stock, onSave, onClose }) {
  const [mandi,  setMandi]  = useState(stock.mandi  ?? "");
  const [madhbi, setMadhbi] = useState(stock.madhbi ?? "");
  const [lamb,   setLamb]   = useState(stock.lamb   ?? "");
  const mn = Number(mandi) || 0;
  const mb = Number(madhbi) || 0;
  const lb = Number(lamb) || 0;
  const inputStyle = { width:"100%", boxSizing:"border-box", background:"#111", border:`1px solid ${C.border}`, borderRadius:10, padding:"12px 14px", color:C.text, fontFamily:"inherit", fontSize:16, outline:"none", textAlign:"center" };
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.9)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, padding:16, overflowY:"auto" }}>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:20, padding:24, width:"100%", maxWidth:460, maxHeight:"90vh", overflowY:"auto", margin:"auto" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
          <div style={{ width:4, height:24, background:"linear-gradient(#DC2626,#f97316)", borderRadius:4 }} />
          <div style={{ fontSize:18, fontWeight:900 }}>Today's Inventory — {TODAY}</div>
        </div>
        <div style={{ fontSize:12, color:C.muted, marginBottom:20 }}>Enter available quantities for today.</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:20 }}>
          {[
            { icon:"🔥", label:"Chicken Mandi", val:mandi, set:setMandi },
            { icon:"🐔", label:"Chicken Madhbi", val:madhbi, set:setMadhbi },
            { icon:"🥩", label:"Lamb Pieces",   val:lamb,   set:setLamb },
          ].map(f => (
            <div key={f.label} style={{ background:"#111", border:`1px solid ${C.border}`, borderRadius:14, padding:"14px 10px", textAlign:"center" }}>
              <div style={{ fontSize:28, marginBottom:6 }}>{f.icon}</div>
              <div style={{ fontSize:11, color:C.gold, fontWeight:700, marginBottom:10, lineHeight:1.3 }}>{f.label}</div>
              <input type="number" min="0" value={f.val} placeholder="0" onChange={e => f.set(e.target.value)} style={inputStyle} />
            </div>
          ))}
        </div>
        {(mn > 0 || mb > 0 || lb > 0) && (
          <div style={{ background:"#111", borderRadius:14, padding:16, marginBottom:20 }}>
            <div style={{ fontSize:12, color:C.green, fontWeight:700, marginBottom:12 }}>📊 Meals you can make:</div>
            {PRODUCTS.map(p => {
              const byMandi  = p.mandi  > 0 ? Math.floor(mn / p.mandi)  : Infinity;
              const byMadhbi = p.madhbi > 0 ? Math.floor(mb / p.madhbi) : Infinity;
              const byLamb   = p.lamb   > 0 ? Math.floor(lb / p.lamb)   : Infinity;
              const canMake  = Math.min(byMandi, byMadhbi, byLamb);
              const color = canMake === 0 ? C.red : canMake <= 2 ? C.yellow : C.green;
              const recipe = [];
              if (p.mandi  > 0) recipe.push(`${p.mandi} mandi`);
              if (p.madhbi > 0) recipe.push(`${p.madhbi} madhbi`);
              if (p.lamb   > 0) recipe.push(`${p.lamb} lamb`);
              return (
                <div key={p.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:`1px solid ${C.border}` }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600 }}>{p.label}</div>
                    <div style={{ fontSize:11, color:C.muted }}>uses: {recipe.join(" + ")}</div>
                  </div>
                  <div style={{ fontSize:20, fontWeight:900, color, minWidth:36, textAlign:"right" }}>{canMake === Infinity ? "—" : canMake}</div>
                </div>
              );
            })}
          </div>
        )}
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={() => onSave({ mandi:mn, madhbi:mb, lamb:lb })}
            style={{ flex:1, background:"linear-gradient(135deg,#DC2626,#f97316)", border:"none", color:"#fff", padding:13, borderRadius:12, fontFamily:"inherit", fontSize:15, fontWeight:800, cursor:"pointer" }}>
            Save Inventory
          </button>
          <button onClick={onClose}
            style={{ flex:1, background:"transparent", border:`1px solid ${C.border}`, color:C.muted, padding:13, borderRadius:12, fontFamily:"inherit", fontSize:15, cursor:"pointer" }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [orders,    setOrders]    = useState([]);
  const [stock,     setStock]     = useState({});
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState("all");
  const [showForm,  setShowForm]  = useState(false);
  const [showStock, setShowStock] = useState(false);
  const [search,    setSearch]    = useState("");
  const [copied,    setCopied]    = useState(null);
  const [form, setForm] = useState({
    customer: "", item: PRODUCTS[0].id, qty: 1,
    price: PRODUCTS[0].price, discount: "",
    source: "whatsapp", note: "", deliveryDate: TODAY, deliveryTime: ""
  });

  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, snap => {
      setOrders(snap.docs.map(d => ({ id:d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, "stock", TODAY));
        if (snap.exists()) setStock(snap.data());
      } catch(_) {}
    })();
  }, []);

  const saveStock = async (values) => {
    await setDoc(doc(db, "stock", TODAY), values);
    setStock(values);
    setShowStock(false);
  };

  const handleItemChange = (itemId) => {
    const p = PRODUCTS.find(x => x.id === itemId);
    setForm(f => ({ ...f, item: itemId, price: p ? p.price : 0 }));
  };

  const consumedToday = orders
    .filter(o => o.date === TODAY && o.status !== "delivered")
    .reduce((acc, o) => {
      const p = PRODUCTS.find(x => x.id === o.item);
      if (!p) return acc;
      acc.mandi  += p.mandi  * o.qty;
      acc.madhbi += p.madhbi * o.qty;
      acc.lamb   += p.lamb   * o.qty;
      return acc;
    }, { mandi:0, madhbi:0, lamb:0 });

  const remainingMandi  = (stock.mandi  || 0) - consumedToday.mandi;
  const remainingMadhbi = (stock.madhbi || 0) - consumedToday.madhbi;
  const remainingLamb   = (stock.lamb   || 0) - consumedToday.lamb;
  const pctMandi  = stock.mandi  > 0 ? remainingMandi  / stock.mandi  : null;
  const pctMadhbi = stock.madhbi > 0 ? remainingMadhbi / stock.madhbi : null;
  const pctLamb   = stock.lamb   > 0 ? remainingLamb   / stock.lamb   : null;

  const canMake = (productId) => {
    const p = PRODUCTS.find(x => x.id === productId);
    if (!p || (!stock.mandi && !stock.madhbi && !stock.lamb)) return null;
    const byMandi  = p.mandi  > 0 ? Math.floor(remainingMandi  / p.mandi)  : Infinity;
    const byMadhbi = p.madhbi > 0 ? Math.floor(remainingMadhbi / p.madhbi) : Infinity;
    const byLamb   = p.lamb   > 0 ? Math.floor(remainingLamb   / p.lamb)   : Infinity;
    return Math.min(byMandi, byMadhbi, byLamb);
  };

  const addOrder = async () => {
    if (!form.customer || !form.item) return;
    const deliveryTime = [form.deliveryDate, form.deliveryTime].filter(Boolean).join(" ");
    const subtotal = Number(form.price) * Number(form.qty);
    const discount = Number(form.discount) || 0;
    const total = Math.max(0, subtotal - discount);
    await addDoc(collection(db, "orders"), {
      customer: form.customer, item: form.item, qty: Number(form.qty),
      price: Number(form.price) || 0, discount, total,
      source: form.source, note: form.note,
      deliveryTime, status: "pending", date: TODAY, createdAt: Date.now(),
    });
    setForm({ customer:"", item:PRODUCTS[0].id, qty:1, price:PRODUCTS[0].price, discount:"", source:"whatsapp", note:"", deliveryDate:TODAY, deliveryTime:"" });
    setShowForm(false);
  };

  const updateStatus = async (id, status) => await updateDoc(doc(db, "orders", id), { status });
  const deleteOrder  = async (id)         => await deleteDoc(doc(db, "orders", id));

  const copyOrderText = (order) => {
    const product = PRODUCTS.find(p => p.id === order.item);
    const label = product ? product.label : order.item;
    const lines = [
      "🔥 JAMRA ORDER",
      "─────────────────",
      `👤 ${order.customer}`,
      `🍽  ${label}`,
      `📦 Qty: ${order.qty}`,
      order.price > 0 ? `💰 Price: $${(order.price * order.qty).toFixed(2)}` : null,
      order.discount > 0 ? `🏷  Discount: -$${Number(order.discount).toFixed(2)}` : null,
      order.total > 0 ? `✅ Total: $${Number(order.total).toFixed(2)}` : null,
      order.deliveryTime ? `🕐 Delivery: ${order.deliveryTime}` : null,
      order.note ? `📝 Note: ${order.note}` : null,
      "─────────────────",
      "jamra.ca",
    ].filter(Boolean).join("\n");
    navigator.clipboard.writeText(lines).then(() => {
      setCopied(order.id);
      setTimeout(() => setCopied(null), 2500);
    });
  };

  const filtered = orders.filter(o =>
    (filter === "all" || o.status === filter) &&
    (o.customer.toLowerCase().includes(search.toLowerCase()) ||
     (PRODUCTS.find(p => p.id === o.item)?.label || "").toLowerCase().includes(search.toLowerCase()))
  );

  const counts = Object.fromEntries(Object.keys(STATUS).map(s => [s, orders.filter(o => o.status === s).length]));
  const totalRevenue = filtered.filter(o => o.total > 0).reduce((s, o) => s + o.total, 0);

  const inputStyle = { width:"100%", boxSizing:"border-box", background:"#111", border:`1px solid ${C.border}`, borderRadius:10, padding:"11px 14px", color:C.text, fontFamily:"inherit", fontSize:14, outline:"none" };

  // Live price preview in form
  const formSubtotal = (Number(form.price) || 0) * (Number(form.qty) || 1);
  const formDiscount = Number(form.discount) || 0;
  const formTotal    = Math.max(0, formSubtotal - formDiscount);

  if (loading) return (
    <div style={{ fontFamily:"'Inter',sans-serif", minHeight:"100vh", background:C.black, color:C.text, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:12 }}>
      <div style={{ fontSize:52 }}>🔥</div>
      <div style={{ fontSize:28, fontWeight:900, background:"linear-gradient(90deg,#DC2626,#f97316,#F5A623)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>JAMRA</div>
      <div style={{ fontSize:14, color:C.muted }}>Loading...</div>
    </div>
  );

  return (
    <div style={{ fontFamily:"'Inter','Segoe UI',sans-serif", minHeight:"100vh", background:C.black, color:C.text, paddingBottom:40 }}>

      {/* Header */}
      <div style={{ background:C.dark, borderBottom:`1px solid ${C.border}`, padding:"16px 20px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <div style={{ fontSize:26, fontWeight:900, background:"linear-gradient(90deg,#DC2626,#f97316,#F5A623)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", lineHeight:1 }}>JAMRA</div>
          <div style={{ fontSize:10, color:C.gold, letterSpacing:2, marginTop:2 }}>THE AUTHENTIC TASTE</div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.25)", marginTop:2 }}>☁️ Synced with team</div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={() => setShowStock(true)}
            style={{ background:"#1a1500", border:`1px solid ${C.gold}50`, color:C.gold, padding:"10px 14px", borderRadius:12, fontFamily:"inherit", fontSize:13, fontWeight:700, cursor:"pointer" }}>
            📦 Stock
          </button>
          <button onClick={() => setShowForm(true)}
            style={{ background:"linear-gradient(135deg,#DC2626,#f97316)", border:"none", color:"#fff", padding:"10px 16px", borderRadius:12, fontFamily:"inherit", fontSize:13, fontWeight:800, cursor:"pointer", boxShadow:"0 4px 15px rgba(220,38,38,0.35)" }}>
            + New Order
          </button>
        </div>
      </div>

      <div style={{ maxWidth:720, margin:"0 auto", padding:"20px 16px" }}>

        {/* Inventory bars */}
        {(stock.mandi > 0 || stock.madhbi > 0 || stock.lamb > 0) ? (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:14 }}>
            {[
              { icon:"🔥", label:"Mandi",  remaining:remainingMandi,  total:stock.mandi ||0, pct:pctMandi  },
              { icon:"🐔", label:"Madhbi", remaining:remainingMadhbi, total:stock.madhbi||0, pct:pctMadhbi },
              { icon:"🥩", label:"Lamb",   remaining:remainingLamb,   total:stock.lamb  ||0, pct:pctLamb   },
            ].map(item => {
              const color = item.remaining <= 0 ? C.red : item.pct <= 0.2 ? C.yellow : C.green;
              const bgColor = item.remaining <= 0 ? "#2a0000" : item.pct <= 0.2 ? "#1a1400" : "#0d1a0d";
              const barWidth = item.total > 0 ? Math.max(0, Math.min(100, (item.remaining / item.total) * 100)) : 0;
              return (
                <div key={item.label} style={{ background:bgColor, border:`1px solid ${color}40`, borderRadius:12, padding:"12px 14px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                    <div style={{ fontSize:13, fontWeight:700 }}>{item.icon} {item.label}</div>
                    <div style={{ fontSize:18, fontWeight:900, color }}>{Math.max(0,item.remaining)}<span style={{ fontSize:11, color:C.muted }}>/{item.total}</span></div>
                  </div>
                  <div style={{ background:C.border, borderRadius:6, height:6 }}>
                    <div style={{ background:color, borderRadius:6, height:6, width:`${barWidth}%`, transition:"width 0.3s" }} />
                  </div>
                  {item.remaining <= 0 && <div style={{ fontSize:11, color:C.red, marginTop:6, fontWeight:700 }}>🚫 OUT OF STOCK</div>}
                  {item.remaining > 0 && item.pct <= 0.2 && <div style={{ fontSize:11, color:C.yellow, marginTop:6, fontWeight:700 }}>⚠️ LOW — below 20%</div>}
                </div>
              );
            })}
          </div>
        ) : (
          <div onClick={() => setShowStock(true)} style={{ background:"#1a1500", border:`1px dashed ${C.gold}50`, borderRadius:12, padding:"14px 16px", marginBottom:14, textAlign:"center", cursor:"pointer" }}>
            <div style={{ fontSize:13, color:C.gold }}>📦 No inventory set for today — <b>tap to add stock</b></div>
          </div>
        )}

        {/* Stats */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:14 }}>
          {Object.entries(STATUS).map(([key, s]) => (
            <div key={key} onClick={() => setFilter(filter === key ? "all" : key)}
              style={{ background:filter===key ? s.bg : C.card, border:`1px solid ${filter===key ? s.color : C.border}`, borderRadius:12, padding:"12px 8px", textAlign:"center", cursor:"pointer", transition:"all 0.2s" }}>
              <div style={{ fontSize:20 }}>{s.icon}</div>
              <div style={{ fontSize:22, fontWeight:900, color:filter===key ? s.color : C.text, marginTop:2 }}>{counts[key]}</div>
              <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Revenue */}
        {totalRevenue > 0 && (
          <div style={{ background:"#1a0d00", border:`1px solid ${C.gold}30`, borderRadius:12, padding:"12px 16px", marginBottom:14, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ fontSize:13, color:C.muted }}>💰 Total Revenue</div>
            <div style={{ fontSize:22, fontWeight:900, color:C.gold }}>${totalRevenue.toFixed(2)}</div>
          </div>
        )}

        {/* Search */}
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search by customer or item..."
          style={{ ...inputStyle, marginBottom:12 }} />

        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12 }}>
          <div style={{ fontSize:12, color:C.muted }}>{filtered.length} orders</div>
          {filter !== "all" && <div style={{ background:C.card, border:`1px solid ${C.border}`, padding:"3px 12px", borderRadius:20, fontSize:11, color:C.gold }}>{STATUS[filter].label}</div>}
        </div>

        {orders.length === 0 && (
          <div style={{ textAlign:"center", padding:"60px 20px", color:C.muted }}>
            <div style={{ fontSize:48, marginBottom:10 }}>🔥</div>
            <div style={{ fontSize:16, color:C.gold, fontWeight:700 }}>No orders yet</div>
          </div>
        )}

        {/* Orders list */}
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {filtered.map(order => {
            const st = STATUS[order.status];
            const src = SOURCE[order.source];
            const product = PRODUCTS.find(p => p.id === order.item);
            const productLabel = product?.label || order.item;
            return (
              <div key={order.id} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:16, borderLeft:`3px solid ${st.color}` }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:800, fontSize:16 }}>{order.customer}</div>
                    <div style={{ color:C.muted, fontSize:13, marginTop:3 }}>
                      {productLabel} • <b style={{ color:C.orange }}>×{order.qty}</b>
                      {order.price > 0 && (
                        <span>
                          <span style={{ color:C.muted }}> • ${(order.price * order.qty).toFixed(2)}</span>
                          {order.discount > 0 && <span style={{ color:C.red }}> −${Number(order.discount).toFixed(2)}</span>}
                          {order.total > 0 && <b style={{ color:C.gold }}> = ${Number(order.total).toFixed(2)}</b>}
                        </span>
                      )}
                    </div>
                    {order.note && <div style={{ color:C.muted, fontSize:12, marginTop:4 }}>📝 {order.note}</div>}
                    {order.deliveryTime && (
                      <div style={{ display:"inline-flex", alignItems:"center", gap:5, background:"#2a1500", border:`1px solid ${C.orange}40`, borderRadius:8, padding:"3px 10px", marginTop:6, fontSize:12, fontWeight:700, color:C.gold }}>
                        🕐 {order.deliveryTime}
                      </div>
                    )}
                    <div style={{ color:"rgba(255,255,255,0.2)", fontSize:11, marginTop:6 }}>{src?.icon} {src?.label} • {order.date}</div>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6 }}>
                    <span style={{ background:st.bg, color:st.color, padding:"4px 10px", borderRadius:20, fontSize:11, fontWeight:700, whiteSpace:"nowrap", border:`1px solid ${st.color}40` }}>{st.icon} {st.label}</span>
                    <div style={{ display:"flex", gap:6 }}>
                      <button onClick={() => copyOrderText(order)}
                        style={{ background:copied===order.id ? "#002a0f" : "#1a1500", border:`1px solid ${copied===order.id ? C.green : C.gold}50`, color:copied===order.id ? C.green : C.gold, padding:"4px 10px", borderRadius:8, fontSize:11, cursor:"pointer", fontFamily:"inherit", fontWeight:700, transition:"all 0.2s" }}>
                        {copied===order.id ? "✅ Copied!" : "📋 Copy"}
                      </button>
                      <button onClick={() => deleteOrder(order.id)}
                        style={{ background:"#1a0000", border:"1px solid rgba(220,38,38,0.3)", color:"#f87171", padding:"4px 10px", borderRadius:8, fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
                <div style={{ display:"flex", gap:6, marginTop:12, flexWrap:"wrap" }}>
                  {Object.entries(STATUS).map(([key, s]) => (
                    <button key={key} onClick={() => updateStatus(order.id, key)}
                      style={{ background:order.status===key ? s.bg : "transparent", color:order.status===key ? s.color : C.muted, border:`1px solid ${order.status===key ? s.color : C.border}`, padding:"5px 12px", borderRadius:8, fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s" }}>
                      {s.icon} {s.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showStock && <StockModal stock={stock} onSave={saveStock} onClose={() => setShowStock(false)} />}

      {/* New Order Modal */}
      {showForm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100, padding:16, overflowY:"auto" }}>
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:20, padding:24, width:"100%", maxWidth:420, maxHeight:"90vh", overflowY:"auto", margin:"auto" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
              <div style={{ width:4, height:24, background:"linear-gradient(#DC2626,#f97316)", borderRadius:4 }} />
              <div style={{ fontSize:18, fontWeight:900 }}>New Order</div>
            </div>

            {/* Customer */}
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, color:C.muted, display:"block", marginBottom:6 }}>Customer Name *</label>
              <input value={form.customer} placeholder="e.g. John Smith" onChange={e => setForm({ ...form, customer:e.target.value })} style={inputStyle} />
            </div>

            {/* Item */}
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, color:C.muted, display:"block", marginBottom:6 }}>Item *</label>
              <select value={form.item} onChange={e => handleItemChange(e.target.value)} style={inputStyle}>
                {PRODUCTS.map(p => {
                  const avail = canMake(p.id);
                  const suffix = avail === null ? "" : avail === 0 ? " 🚫 UNAVAILABLE" : avail <= 2 ? ` ⚠️ only ${avail} left` : ` ✅ ${avail} avail`;
                  return <option key={p.id} value={p.id} style={{ background:"#111" }}>{p.label} — ${p.price}{suffix}</option>;
                })}
              </select>
            </div>

            {/* Qty + Price + Discount */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:14 }}>
              <div>
                <label style={{ fontSize:12, color:C.muted, display:"block", marginBottom:6 }}>Quantity</label>
                <input type="number" min="1" value={form.qty} onChange={e => setForm({ ...form, qty:e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize:12, color:C.muted, display:"block", marginBottom:6 }}>💰 Price ($)</label>
                <input type="number" value={form.price} onChange={e => setForm({ ...form, price:e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize:12, color:C.red, display:"block", marginBottom:6 }}>🏷 Discount ($)</label>
                <input type="number" min="0" value={form.discount} placeholder="0" onChange={e => setForm({ ...form, discount:e.target.value })} style={{ ...inputStyle, borderColor:formDiscount > 0 ? C.red : C.border }} />
              </div>
            </div>

            {/* Total preview */}
            <div style={{ background:"#111", border:`1px solid ${C.gold}30`, borderRadius:10, padding:"10px 14px", marginBottom:14, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ fontSize:12, color:C.muted }}>
                ${Number(form.price)||0} × {form.qty}
                {formDiscount > 0 && <span style={{ color:C.red }}> − ${formDiscount}</span>}
              </div>
              <div style={{ fontSize:20, fontWeight:900, color:C.gold }}>${formTotal.toFixed(2)}</div>
            </div>

            {/* Source */}
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, color:C.muted, display:"block", marginBottom:6 }}>Order Source</label>
              <select value={form.source} onChange={e => setForm({ ...form, source:e.target.value })} style={inputStyle}>
                {Object.entries(SOURCE).map(([k, v]) => <option key={k} value={k} style={{ background:"#111" }}>{v.icon} {v.label}</option>)}
              </select>
            </div>

            {/* Delivery */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
              <div>
                <label style={{ fontSize:12, color:C.muted, display:"block", marginBottom:6 }}>🗓 Delivery Date</label>
                <input type="date" value={form.deliveryDate} onChange={e => setForm({ ...form, deliveryDate:e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize:12, color:C.muted, display:"block", marginBottom:6 }}>🕐 Delivery Time</label>
                <input type="time" value={form.deliveryTime} onChange={e => setForm({ ...form, deliveryTime:e.target.value })} style={inputStyle} />
              </div>
            </div>

            {/* Note */}
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:12, color:C.muted, display:"block", marginBottom:6 }}>Note (optional)</label>
              <input value={form.note} placeholder="e.g. extra spicy, no onions..." onChange={e => setForm({ ...form, note:e.target.value })} style={inputStyle} />
            </div>

            <div style={{ display:"flex", gap:10 }}>
              <button onClick={addOrder} style={{ flex:1, background:"linear-gradient(135deg,#DC2626,#f97316)", border:"none", color:"#fff", padding:13, borderRadius:12, fontFamily:"inherit", fontSize:15, fontWeight:800, cursor:"pointer" }}>Save Order</button>
              <button onClick={() => setShowForm(false)} style={{ flex:1, background:"transparent", border:`1px solid ${C.border}`, color:C.muted, padding:13, borderRadius:12, fontFamily:"inherit", fontSize:15, cursor:"pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
