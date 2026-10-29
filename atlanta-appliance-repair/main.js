(() => {
  const S = window.SITE;
  const $ = (q, el = document) => el.querySelector(q);
  const $$ = (q, el = document) => [...el.querySelectorAll(q)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const telHref = "tel:+1" + S.phone.replace(/\D/g, "");
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // ─── Bind config text ───────────────────────────────
  $$("[data-cfg]").forEach((el) => { if (S[el.dataset.cfg] != null) el.textContent = S[el.dataset.cfg]; });
  $$("[data-tel]").forEach((a) => (a.href = telHref));
  $$("[data-mail]").forEach((a) => {
    if (S.email) a.href = "mailto:" + S.email;
    else { a.previousElementSibling?.tagName === "BR" && a.previousElementSibling.remove(); a.remove(); }
  });
  $("#yr").textContent = new Date().getFullYear();

  // ─── Icons ──────────────────────────────────────────
  const icons = {
    refrigerator: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M6 9h12M9 5v2M9 12v4"/>',
    washer: '<rect x="4" y="2" width="16" height="20" rx="2"/><circle cx="12" cy="13" r="5"/><path d="M8 5h1M11 5h1"/><path d="M9.5 14a3 3 0 0 0 5 0"/>',
    dishwasher: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M4 7h16M8 4.5h2M14 4.5h2M8 12h8M8 16h8"/>',
    oven: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 8h18"/><rect x="7" y="11" width="10" height="7" rx="1"/><path d="M7 5.5h.01M10 5.5h.01M13 5.5h.01"/>',
    cooktop: '<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="12" r="3"/><circle cx="16.5" cy="12" r="2"/>',
    microwave: '<rect x="2" y="5" width="20" height="14" rx="2"/><rect x="5" y="8" width="10" height="8" rx="1"/><path d="M18 9v.01M18 12v.01M18 15v.01"/>',
    disposal: '<path d="M7 3h10l-1 5H8z"/><path d="M8 8v8a4 4 0 0 0 8 0V8"/><path d="M12 12v4"/>',
    compactor: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M5 8h14M9 5h6M9 13l3 3 3-3"/>',
    commercial: '<path d="M3 21h18M5 21V9l7-5 7 5v12"/><path d="M9 21v-6h6v6M9 11h6"/>',
  };
  const arrow = '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

  // ─── Services ───────────────────────────────────────
  $("#services-grid").innerHTML = S.services.map((s, i) => `
    <article class="svc reveal" style="--d:${(i % 3) * 0.08}s">
      <span class="svc__n">${String(i + 1).padStart(2, "0")}</span>
      <span class="svc__ico"><svg viewBox="0 0 24 24">${icons[s.key] || icons.oven}</svg></span>
      <h3>${esc(s.title)}</h3>
      <p>${esc(s.desc)}</p>
      <a href="#book" class="svc__link" data-appliance="${esc(s.title)}">Request a quote ${arrow}</a>
    </article>`).join("");
  $("#footer-services").innerHTML = S.services.slice(0, 6).map((s) => `<li><a href="#services">${esc(s.title)}</a></li>`).join("");

  // ─── Proof, stats, brands ───────────────────────────
  $("#proof").innerHTML = S.proof.map((p) => `<li><strong>${esc(p.value)}</strong><small>${esc(p.label)}</small></li>`).join("");
  $("#stats").innerHTML = S.stats.map((s, i) => `
    <div class="stat reveal" style="--d:${i * 0.1}s">
      <strong class="count" data-to="${s.to}" data-prefix="${s.prefix || ""}" data-suffix="${esc(s.suffix || "")}">${s.prefix || ""}0${esc(s.suffix || "")}</strong>
      <span>${esc(s.label)}${s.sample ? " *" : ""}</span>
    </div>`).join("");
  if (S.stats.some((s) => s.sample)) $("#stats-note").hidden = false;
  const brands = S.brands.map((b) => `<span>${esc(b)}</span>`).join("");
  $("#brand-track").innerHTML = brands + brands;

  // ─── Hours + live open chip ─────────────────────────
  $("#hours").innerHTML = S.hours.map(([d, h]) => `<dt>${esc(d)}</dt><dd>${esc(h)}</dd>`).join("");
  (() => {
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
    const { days, open, close } = S.schedule, h = now.getHours();
    const isOpen = days.includes(now.getDay()) && h >= open && h < close;
    const fmt = (x) => `${x % 12 || 12} ${x < 12 ? "AM" : "PM"}`;
    $("#eta-label").textContent = isOpen ? "Open now" : "Book online anytime";
    $("#eta-slot").textContent = isOpen ? `Until ${fmt(close)} · Save 10%` : `Phones open ${fmt(open)} weekdays`;
  })();

  // ─── Areas + map ────────────────────────────────────
  const center = { lat: 33.93, lon: -84.10 }, k = 330;
  const project = (lat, lon) => ({ x: 200 + (lon - center.lon) * k * 0.83, y: 200 - (lat - center.lat) * k });
  const names = S.areas.map((a) => a[0]);
  $("#areas-list").innerHTML = names.map((n) => `<li data-area="${esc(n)}">${esc(n)}</li>`).join("");
  $("#footer-areas").innerHTML = names.slice(0, 6).map((n) => `<li>${esc(n)}</li>`).join("") + "<li>+ " + (names.length - 6) + " more</li>";
  $("#map-pins").innerHTML = S.areas.map(([n, lat, lon], i) => {
    const p = project(lat, lon), right = p.x < 300;
    return `<g class="pin" data-area="${esc(n)}" style="transition-delay:${0.3 + i * 0.035}s">
      <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5"/>
      <text x="${(p.x + (right ? 9 : -9)).toFixed(1)}" y="${(p.y + 3.5).toFixed(1)}" text-anchor="${right ? "start" : "end"}">${esc(n)}</text></g>`;
  }).join("");
  const hq = project(S.hq.lat, S.hq.lon);
  $$(".hq, .hq-pulse").forEach((c) => { c.setAttribute("cx", hq.x); c.setAttribute("cy", hq.y); });
  $(".hq-pulse").style.transformOrigin = `${hq.x}px ${hq.y}px`;
  const atl = project(33.749, -84.388);
  $$(".ring").forEach((c) => { c.setAttribute("cx", hq.x); c.setAttribute("cy", hq.y); });
  const ringP = $(".ring--perimeter"); ringP.setAttribute("cx", atl.x); ringP.setAttribute("cy", atl.y); ringP.setAttribute("r", 38);
  const tag = $("#map-tag"); tag.style.left = (atl.x / 4) + "%"; tag.style.top = ((atl.y + 50) / 4) + "%";
  const hot = (n, on) => $$(`[data-area="${CSS.escape(n)}"]`).forEach((el) => el.classList.toggle("is-hot", on));
  $$("[data-area]").forEach((el) => {
    el.addEventListener("mouseenter", () => hot(el.dataset.area, true));
    el.addEventListener("mouseleave", () => hot(el.dataset.area, false));
  });

  $("#zip-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const z = $("#zip").value.trim(), out = $("#zip-result");
    if (!/^\d{5}$/.test(z)) { out.className = "zip__result no"; out.textContent = "Please enter a 5-digit ZIP code."; return; }
    const ok = S.zipPrefixes.some((p) => z.startsWith(p));
    out.className = "zip__result " + (ok ? "ok" : "no");
    out.innerHTML = ok ? `Good news: ${z} is in our service area. <a href="#book"><u>Book now</u></a>.`
      : `${z} may be outside our usual area. Call <a href="${telHref}"><u>${S.phone}</u></a> and we'll see what we can do.`;
  });

  // ─── Reviews carousel ───────────────────────────────
  const track = $("#reviews-track");
  track.innerHTML = S.reviews.map((r) => `
    <article class="review">
      ${r.sample ? '<span class="sample" title="Placeholder. Replace with a real review in config.js">Sample</span>' : ""}
      <span class="stars" aria-label="5 out of 5 stars">★★★★★</span>
      <span class="review__q" aria-hidden="true">“</span>
      <blockquote>${esc(r.text)}</blockquote>
      <footer><span class="avatar" aria-hidden="true">${esc(r.name[0])}</span><div><b>${esc(r.name)}</b><small>${esc(r.area)}, GA</small></div></footer>
    </article>`).join("");
  let idx = 0;
  const perView = () => (innerWidth <= 680 ? 1 : innerWidth <= 1080 ? 2 : 3);
  const go = (d) => {
    const max = Math.max(0, S.reviews.length - perView());
    idx = Math.min(max, Math.max(0, idx + d));
    if (d > 0 && idx === max && go.wasMax) idx = 0;
    go.wasMax = idx === max;
    const card = track.children[0];
    track.style.transform = `translateX(-${idx * (card.offsetWidth + 20)}px)`;
  };
  $("#rev-next").onclick = () => go(1);
  $("#rev-prev").onclick = () => { go.wasMax = false; go(-1); };
  addEventListener("resize", () => go(0));
  let auto = !reduce && setInterval(() => go(1), 6000);
  $("#reviews").addEventListener("pointerenter", () => clearInterval(auto));
  let sx = 0;
  track.addEventListener("touchstart", (e) => (sx = e.touches[0].clientX), { passive: true });
  track.addEventListener("touchend", (e) => { const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 40) { clearInterval(auto); go(dx < 0 ? 1 : -1); } });

  // ─── FAQ accordion ──────────────────────────────────
  $("#faq-list").innerHTML = S.faqs.map((f, i) => `
    <div class="qa reveal" style="--d:${i * 0.05}s">
      <button aria-expanded="false" aria-controls="qa-${i}" id="qb-${i}">${esc(f.q)}<span class="qa__ic" aria-hidden="true"></span></button>
      <div class="qa__a" id="qa-${i}" role="region" aria-labelledby="qb-${i}"><div><p>${esc(f.a)}</p></div></div>
    </div>`).join("");
  $$(".qa button").forEach((b) => b.addEventListener("click", () => {
    const qa = b.parentElement, open = !qa.classList.contains("is-open");
    $$(".qa.is-open").forEach((o) => { o.classList.remove("is-open"); $("button", o).setAttribute("aria-expanded", "false"); });
    qa.classList.toggle("is-open", open); b.setAttribute("aria-expanded", open);
  }));

  // ─── Booking form ───────────────────────────────────
  $("#appliance-pills").innerHTML = S.services.map((s, i) => `
    <label class="pill"><input type="radio" name="appliance" value="${esc(s.title)}" ${i === 0 ? "checked" : ""}/><span>${esc(s.title)}</span></label>`).join("");
  $$("[data-appliance]").forEach((a) => a.addEventListener("click", () => {
    const r = $(`#appliance-pills input[value="${CSS.escape(a.dataset.appliance)}"]`); if (r) r.checked = true;
  }));
  const form = $("#book-form");
  if (!S.formEndpoint) $("#form-fine").textContent = "Sends as a text message to " + S.phone + ". Book today and save 10%.";
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const req = ["f-name", "f-phone", "f-zip"];
    let bad = false;
    req.forEach((id) => {
      const el = $("#" + id), v = el.value.trim();
      const ok = id === "f-phone" ? v.replace(/\D/g, "").length >= 10 : id === "f-zip" ? /^\d{5}$/.test(v) : v.length > 1;
      el.parentElement.classList.toggle("is-error", !ok); if (!ok) bad = true;
    });
    if (bad) { $(".is-error input", form)?.focus(); return; }
    const d = Object.fromEntries(new FormData(form));
    const body = `New repair request\n${d.appliance}${d.brand ? " (" + d.brand + ")" : ""}\nName: ${d.name}\nPhone: ${d.phone}\nZIP: ${d.zip}\nIssue: ${d.issue || "-"}`;
    if (S.formEndpoint) {
      try { await fetch(S.formEndpoint, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(d) }); }
      catch (_) { location.href = `sms:+1${S.phone.replace(/\D/g, "")}?&body=${encodeURIComponent(body)}`; }
    } else {
      location.href = `sms:+1${S.phone.replace(/\D/g, "")}?&body=${encodeURIComponent(body)}`;
    }
    $("#form-success").hidden = false;
  });
  $$(".field input").forEach((el) => el.addEventListener("input", () => el.parentElement.classList.remove("is-error")));

  // ─── Nav: scroll state, drawer, active link ─────────
  const nav = $("#nav"), burger = $(".nav__burger"), drawer = $("#drawer"), bar = $(".mobilebar");
  const onScroll = () => {
    const y = scrollY;
    nav.classList.toggle("is-scrolled", y > 20);
    bar.classList.toggle("is-on", y > 500);
    const steps = $("#steps"), r = steps.getBoundingClientRect();
    steps.style.setProperty("--progress", Math.min(1, Math.max(0, (innerHeight * 0.6 - r.top) / r.height)).toFixed(3));
  };
  addEventListener("scroll", onScroll, { passive: true }); onScroll();
  const toggle = (open) => { burger.setAttribute("aria-expanded", open); drawer.hidden = !open; };
  burger.addEventListener("click", () => toggle(burger.getAttribute("aria-expanded") !== "true"));
  $$("#drawer a").forEach((a) => a.addEventListener("click", () => toggle(false)));
  const links = $$(".nav__links a");
  const navIO = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) links.forEach((l) => l.classList.toggle("is-active", l.hash === "#" + e.target.id));
  }), { rootMargin: "-45% 0px -50% 0px" });
  links.forEach((l) => navIO.observe($(l.hash)));


  // ─── Reveal + counters ──────────────────────────────
  const countUp = (el) => {
    const to = +el.dataset.to, pre = el.dataset.prefix, suf = el.dataset.suffix;
    if (reduce || to === 0) { el.textContent = pre + to.toLocaleString() + suf; return; }
    const t0 = performance.now(), dur = 1800;
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 4);
      el.textContent = pre + Math.round(to * e).toLocaleString() + suf;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add("is-in");
    $$(".count", e.target).forEach(countUp);
    io.unobserve(e.target);
  }), { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
  $$(".reveal, .map").forEach((el) => io.observe(el));

  // ─── Hero load ──────────────────────────────────────
  requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add("is-loaded")));

  // ─── Magnetic buttons + spotlight ───────────────────
  if (!reduce && matchMedia("(pointer: fine)").matches) {
    $$(".magnetic").forEach((b) => {
      b.addEventListener("pointermove", (e) => {
        const r = b.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
        b.style.setProperty("--mx", x + "px"); b.style.setProperty("--my", y + "px");
        b.style.transform = `translate(${(x - r.width / 2) * 0.18}px, ${(y - r.height / 2) * 0.3}px)`;
      });
      b.addEventListener("pointerleave", () => (b.style.transform = ""));
    });
    const vis = $(".hero__visual");
    $(".hero").addEventListener("pointermove", (e) => {
      const x = e.clientX / innerWidth - 0.5, y = e.clientY / innerHeight - 0.5;
      $(".diag").style.translate = `${x * -14}px ${y * -10}px`;
      $(".eta").style.translate = `${x * 18}px ${y * 12}px`;
      $(".appliance").style.transform = `perspective(1200px) rotateY(${x * 5}deg) rotateX(${y * -4}deg)`;
    });
    vis && ($(".appliance").style.transition = "transform .6s cubic-bezier(.22,1,.36,1)");
  }

  // ─── Structured data (local SEO) ────────────────────
  $("#ld-json").textContent = JSON.stringify({
    "@context": "https://schema.org", "@type": "HomeAndConstructionBusiness", additionalType: "https://schema.org/ApplianceRepair",
    name: S.name, legalName: S.legalName, slogan: S.tagline, telephone: "+1-" + S.phone, url: "https://www." + S.domain + "/",
    address: { "@type": "PostalAddress", addressLocality: "Loganville", addressRegion: "GA", postalCode: "30052", addressCountry: "US" },
    areaServed: names.map((n) => ({ "@type": "City", name: n + ", GA" })),
    openingHours: "Mo-Fr 07:00-19:00", logo: "https://www." + S.domain + "/assets/logo-512.png", image: "https://www." + S.domain + "/assets/tech-fridge.jpg", sameAs: S.social.map((s) => s.url),
  });
  $("#footer-social").innerHTML = S.social.map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a></li>`).join("");
})();
