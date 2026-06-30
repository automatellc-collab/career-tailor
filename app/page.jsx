import { useState, useEffect } from "react";

// ─── CONFIG ──────────────────────────────────────────────
const FREE_USES = 1;
const GUMROAD_URL = "https://gumroad.com/l/YOUR_PRODUCT_LINK"; // ← replace after Gumroad setup
const STORAGE_KEY = "ct_uses";

// ─── THEME ───────────────────────────────────────────────
const C = {
  blue: "#2563EB",
  green: "#16A34A",
  amber: "#D97706",
  bg: "#F8FAFC",
  border: "#E2E8F0",
  dark: "#0F172A",
  mid: "#475569",
  light: "#94A3B8",
  white: "#ffffff",
};

const s = {
  app: { fontFamily: "'Inter', system-ui, sans-serif", minHeight: "100vh", background: C.bg, color: C.dark },
  header: { background: C.white, borderBottom: `1px solid ${C.border}`, padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  logo: { display: "flex", alignItems: "center", gap: 10, fontWeight: 700, fontSize: 18, letterSpacing: "-0.5px" },
  logoIcon: { width: 32, height: 32, background: C.blue, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: C.white, fontSize: 16 },
  badge: (color = C.blue, bg = "#EFF6FF") => ({ background: bg, color, fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 100 }),
  hero: { textAlign: "center", padding: "48px 24px 32px" },
  heroTitle: { fontSize: 36, fontWeight: 800, letterSpacing: "-1px", lineHeight: 1.15, marginBottom: 12 },
  heroSub: { fontSize: 16, color: C.mid, maxWidth: 480, margin: "0 auto 28px", lineHeight: 1.6 },
  stats: { display: "flex", justifyContent: "center", gap: 32, flexWrap: "wrap" },
  card: { background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, maxWidth: 680, margin: "0 auto 32px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" },
  label: { fontSize: 12, fontWeight: 700, color: C.light, letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: 8 },
  textarea: { width: "100%", minHeight: 140, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", fontSize: 14, color: C.dark, resize: "vertical", fontFamily: "inherit", outline: "none", boxSizing: "border-box", lineHeight: 1.6 },
  btn: (bg = C.blue, full = true) => ({ background: bg, color: C.white, border: "none", borderRadius: 10, padding: "13px 28px", fontSize: 15, fontWeight: 700, cursor: "pointer", width: full ? "100%" : "auto", letterSpacing: "-0.2px" }),
  btnOutline: { background: "transparent", color: C.blue, border: `1.5px solid ${C.blue}`, borderRadius: 10, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  tab: (active) => ({ padding: "8px 18px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", background: active ? C.blue : "transparent", color: active ? C.white : C.mid }),
  resultBox: { background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 18px", fontSize: 14, lineHeight: 1.75, whiteSpace: "pre-wrap", minHeight: 200, maxHeight: 420, overflowY: "auto" },
  tag: { display: "inline-block", background: "#F0FDF4", color: C.green, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 100, marginRight: 6, marginBottom: 6 },
  error: { background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginTop: 10 },
  spinner: { display: "inline-block", width: 18, height: 18, border: "2.5px solid rgba(255,255,255,0.3)", borderTop: "2.5px solid #fff", borderRadius: "50%", animation: "spin 0.7s linear infinite", marginRight: 8, verticalAlign: "middle" },
  stepDot: (active, done) => ({ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, background: done ? C.green : active ? C.blue : C.border, color: done || active ? C.white : C.light }),
  stepLine: (done) => ({ width: 40, height: 2, background: done ? C.green : C.border, marginBottom: 16 }),
  overlay: { position: "fixed", inset: 0, background: "rgba(15,23,42,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 24, backdropFilter: "blur(4px)" },
  paywallCard: { background: C.white, borderRadius: 20, padding: 36, maxWidth: 440, width: "100%", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" },
  usagePill: (remaining) => ({ background: remaining > 0 ? "#F0FDF4" : "#FEF3C7", color: remaining > 0 ? C.green : C.amber, fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 100 }),
  blurBox: { filter: "blur(5px)", pointerEvents: "none", userSelect: "none", opacity: 0.6 },
};

function PaywallModal({ onClose }) {
  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.paywallCard} onClick={e => e.stopPropagation()} className="fade-in">
        <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 8 }}>
          You've used your free generation
        </h2>
        <p style={{ fontSize: 14, color: C.mid, lineHeight: 1.6, marginBottom: 24 }}>
          Unlock unlimited cover letters, resume bullets, and keyword matching for a one-time payment. No subscription ever.
        </p>
        <div style={{ background: C.bg, borderRadius: 12, padding: 16, marginBottom: 24, textAlign: "left" }}>
          {["✅  Unlimited tailored cover letters", "✅  Resume bullet rewrites for every job", "✅  ATS keyword matching", "✅  Lifetime access · no monthly fees"].map(f => (
            <div key={f} style={{ fontSize: 13, color: C.dark, padding: "5px 0", fontWeight: 500 }}>{f}</div>
          ))}
        </div>
        <div style={{ marginBottom: 20 }}>
          <span style={{ fontSize: 40, fontWeight: 800, color: C.dark }}>$9</span>
          <span style={{ fontSize: 14, color: C.light, marginLeft: 6 }}>one-time</span>
        </div>
        <a href={GUMROAD_URL} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
          <button style={{ ...s.btn(C.blue), marginBottom: 12 }}>
            Unlock Unlimited Access →
          </button>
        </a>
        <div style={{ fontSize: 12, color: C.light }}>
          Secure payment via Gumroad · Instant access
        </div>
      </div>
    </div>
  );
}

function UsageBanner({ uses }) {
  const remaining = Math.max(0, FREE_USES - uses);
  return (
    <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
      <span style={s.usagePill(remaining)}>
        {remaining > 0
          ? `✦ ${remaining} free generation${remaining > 1 ? "s" : ""} remaining`
          : "⚡ Upgrade for unlimited access"}
      </span>
    </div>
  );
}

export default function CareerTailor() {
  const [step, setStep] = useState(0);
  const [jobDesc, setJobDesc] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [fileName, setFileName] = useState("");
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState(null);
  const [activeTab, setActiveTab] = useState("cover");
  const [copied, setCopied] = useState("");
  const [uses, setUses] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);

  useEffect(() => {
    try {
      const stored = parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
      setUses(stored);
    } catch (_) {}
  }, []);

  const saveUse = () => {
    const next = uses + 1;
    setUses(next);
    try { localStorage.setItem(STORAGE_KEY, String(next)); } catch (_) {}
  };

  const handleFileRead = (file) => {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = e => setResumeText(e.target.result);
    reader.readAsText(file);
  };

  const generate = async () => {
    if (!jobDesc.trim()) { setError("Please paste a job description first."); return; }
    if (!resumeText.trim()) { setError("Please add your resume content."); return; }

    if (uses >= FREE_USES) {
      setShowPaywall(true);
      return;
    }

    setError("");
    setLoading(true);

    const prompt = `You are an expert career coach and professional resume writer.

The user has provided:
1. A job description they are applying to
2. Their current resume

Your task is to produce TWO things:

---
COVER_LETTER_START
Write a compelling, personalized cover letter (3 paragraphs, ~200 words). 
- Match the tone and keywords from the job description
- Highlight the most relevant experience from the resume
- End with a confident call to action
- Do NOT use generic phrases like "I am writing to express my interest"
COVER_LETTER_END

---
RESUME_BULLETS_START
Rewrite 5-7 of the most relevant resume bullet points to better match this specific job.
- Use strong action verbs
- Quantify impact where possible (or suggest placeholders like [X%])
- Mirror keywords from the job description naturally
- Format each as: • [Bullet point]
RESUME_BULLETS_END

---
JOB_KEYWORDS_START
List the 8-10 most important keywords/skills from the job description, comma-separated.
JOB_KEYWORDS_END

---
JOB DESCRIPTION:
${jobDesc}

---
RESUME:
${resumeText}`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      const text = data.content?.map(b => b.text || "").join("") || "";

      const extract = (tag, content) => {
        const match = content.match(new RegExp(`${tag}_START([\\s\\S]*?)${tag}_END`));
        return match ? match[1].trim() : "";
      };

      setResults({
        cover: extract("COVER_LETTER", text),
        bullets: extract("RESUME_BULLETS", text),
        keywords: extract("JOB_KEYWORDS", text).split(",").map(k => k.trim()).filter(Boolean),
      });

      saveUse();
      setStep(2);
    } catch (e) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyText = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 2000);
  };

  const reset = () => {
    setStep(0); setJobDesc(""); setResumeText(""); setFileName("");
    setResults(null); setError(""); setActiveTab("cover");
  };

  const isLocked = uses >= FREE_USES;

  return (
    <div style={s.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        textarea:focus { border-color: #2563EB !important; }
        button:hover { opacity: 0.9; }
        a button:hover { opacity: 0.9; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeIn 0.3s ease; }
      `}</style>

      {showPaywall && <PaywallModal onClose={() => setShowPaywall(false)} />}

      <header style={s.header}>
        <div style={s.logo}>
          <div style={s.logoIcon}>✦</div>
          CareerTailor
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {isLocked ? (
            <a href={GUMROAD_URL} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
              <button style={{ ...s.btn(C.amber, false), fontSize: 12, padding: "6px 14px" }}>
                ⚡ Upgrade — $9
              </button>
            </a>
          ) : (
            <span style={s.badge()}>AI-Powered · Free Preview</span>
          )}
        </div>
      </header>

      <div style={s.hero}>
        <h1 style={s.heroTitle}>
          Land the job.<br />
          <span style={{ color: C.blue }}>Tailored in seconds.</span>
        </h1>
        <p style={s.heroSub}>
          Paste any job description + your resume. Get a custom cover letter and optimized resume bullets instantly.
        </p>
        <div style={s.stats}>
          {[["30 sec", "Average time"], ["2×", "More interviews"], ["$9", "Lifetime access"]].map(([n, l]) => (
            <div key={l} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.blue }}>{n}</div>
              <div style={{ fontSize: 12, color: C.light, marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      <UsageBanner uses={uses} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, margin: "16px 0 24px" }}>
        {["Job", "Resume", "Results"].map((label, i) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={s.stepDot(step === i, step > i)}>{step > i ? "✓" : i + 1}</div>
              <span style={{ fontSize: 10, color: step === i ? C.blue : C.light, fontWeight: 600 }}>{label}</span>
            </div>
            {i < 2 && <div style={s.stepLine(step > i)} />}
          </div>
        ))}
      </div>

      {step === 0 && (
        <div style={s.card} className="fade-in">
          <div style={s.label}>Step 1 — Job Description</div>
          <p style={{ fontSize: 14, color: C.mid, marginBottom: 14 }}>Paste the full job posting. The more detail, the better the tailoring.</p>
          <textarea
            style={s.textarea}
            placeholder="Paste the job description here — title, responsibilities, requirements, company info..."
            value={jobDesc}
            onChange={e => setJobDesc(e.target.value)}
          />
          {error && <div style={s.error}>{error}</div>}
          <button style={{ ...s.btn(), marginTop: 16 }} onClick={() => {
            if (!jobDesc.trim()) { setError("Please paste a job description."); return; }
            setError(""); setStep(1);
          }}>
            Next: Add My Resume →
          </button>
        </div>
      )}

      {step === 1 && (
        <div style={s.card} className="fade-in">
          <div style={s.label}>Step 2 — Your Resume</div>
          <p style={{ fontSize: 14, color: C.mid, marginBottom: 14 }}>Upload a plain text file or paste your resume content below.</p>

          <div
            style={{ border: `2px dashed ${dragging ? C.blue : C.border}`, borderRadius: 10, padding: "28px 20px", textAlign: "center", cursor: "pointer", background: dragging ? "#EFF6FF" : C.bg }}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); handleFileRead(e.dataTransfer.files[0]); }}
            onClick={() => document.getElementById("resumeFile").click()}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
            <div style={{ fontSize: 14, color: C.mid, marginBottom: 4 }}>{fileName ? `✓ ${fileName}` : "Drop your resume file here or click to browse"}</div>
            <div style={{ fontSize: 12, color: C.light }}>.txt files work best · PDF support coming soon</div>
            <input id="resumeFile" type="file" accept=".txt,.md" style={{ display: "none" }} onChange={e => handleFileRead(e.target.files[0])} />
          </div>

          <div style={{ textAlign: "center", fontSize: 12, color: C.light, margin: "12px 0" }}>— or paste below —</div>

          <textarea
            style={s.textarea}
            placeholder="Paste your resume text here: work experience, skills, education..."
            value={resumeText}
            onChange={e => setResumeText(e.target.value)}
          />

          {error && <div style={s.error}>{error}</div>}

          {isLocked && (
            <div style={{ background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 10, padding: "12px 16px", marginTop: 14, fontSize: 13, color: "#92400E" }}>
              🔒 You've used your free generation. <a href={GUMROAD_URL} target="_blank" rel="noopener noreferrer" style={{ color: C.amber, fontWeight: 700 }}>Upgrade for $9</a> to unlock unlimited access.
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button style={{ ...s.btnOutline, flexShrink: 0 }} onClick={() => setStep(0)}>← Back</button>
            <button
              style={{ ...s.btn(isLocked ? C.amber : C.blue), flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}
              onClick={generate}
              disabled={loading}
            >
              {loading
                ? <><span style={s.spinner} />Tailoring your application...</>
                : isLocked ? "🔒 Unlock to Generate →" : "✦ Generate My Application"}
            </button>
          </div>
        </div>
      )}

      {step === 2 && results && (
        <div style={s.card} className="fade-in">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={s.label}>Your Tailored Application</div>
            <button style={s.btnOutline} onClick={reset}>Start Over</button>
          </div>

          {results.keywords.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: C.light, fontWeight: 600, marginBottom: 8 }}>KEY SKILLS MATCHED</div>
              <div>{results.keywords.map(k => <span key={k} style={s.tag}>{k}</span>)}</div>
            </div>
          )}

          <div style={{ display: "flex", gap: 6, marginBottom: 14, background: C.bg, padding: 4, borderRadius: 10, width: "fit-content" }}>
            <button style={s.tab(activeTab === "cover")} onClick={() => setActiveTab("cover")}>Cover Letter</button>
            <button style={s.tab(activeTab === "bullets")} onClick={() => setActiveTab("bullets")}>Resume Bullets</button>
          </div>

          <div style={s.resultBox}>
            {activeTab === "cover" ? results.cover : results.bullets}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
            <button
              style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 7, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", color: C.mid, display: "flex", alignItems: "center", gap: 5 }}
              onClick={() => copyText(activeTab === "cover" ? results.cover : results.bullets, activeTab)}
            >
              {copied === activeTab ? "✓ Copied!" : "⎘ Copy"}
            </button>
            {uses >= FREE_USES && (
              <a href={GUMROAD_URL} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                <button style={{ ...s.btn(C.amber, false), fontSize: 12, padding: "7px 16px" }}>
                  ⚡ Unlock Unlimited — $9
                </button>
              </a>
            )}
          </div>

          <div style={{ marginTop: 20, padding: "14px 16px", background: "#EFF6FF", borderRadius: 10, fontSize: 13, color: "#1E40AF" }}>
            💡 <strong>Pro tip:</strong> Review and personalize before sending — add specific company details only you would know.
          </div>
        </div>
      )}

      <div style={{ textAlign: "center", padding: "24px 16px 40px", fontSize: 12, color: C.light }}>
        CareerTailor · Built with AI · Your data is never stored ·{" "}
        <a href={GUMROAD_URL} target="_blank" rel="noopener noreferrer" style={{ color: C.blue, fontWeight: 600, textDecoration: "none" }}>Upgrade — $9</a>
      </div>
    </div>
  );
}
