/* R&A Concrete LLC — site behaviour. No dependencies. */
(function () {
  "use strict";

  /**
   * Form delivery. Leave empty until a real endpoint exists (Formspree,
   * Netlify Forms, Basin, or your own API). While empty, the form runs in
   * demo mode: it validates input but never claims a request was sent.
   * The endpoint must accept a POST of FormData and return a 2xx on success.
   */
  var FORM_ENDPOINT = "";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- Header state ---------------------------------------------------- */
  var header = document.querySelector(".site-header");
  function onScroll() {
    header.classList.toggle("is-scrolled", window.scrollY > 8);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---- Mobile navigation ---------------------------------------------- */
  var toggle = document.querySelector(".menu-toggle");
  var nav = document.getElementById("site-nav");
  var mq = window.matchMedia("(max-width: 960px)");

  function setMenu(open) {
    toggle.setAttribute("aria-expanded", String(open));
    nav.classList.toggle("is-open", open);
    document.body.classList.toggle("menu-open", open);
    if (mq.matches) {
      // Keep the hidden drawer out of the tab order.
      nav.toggleAttribute("inert", !open);
    }
  }
  function syncNavForViewport() {
    if (mq.matches) {
      nav.toggleAttribute("inert", !nav.classList.contains("is-open"));
    } else {
      nav.removeAttribute("inert");
      setMenu(false);
    }
  }
  toggle.addEventListener("click", function () {
    setMenu(toggle.getAttribute("aria-expanded") !== "true");
  });
  nav.addEventListener("click", function (e) {
    if (e.target.closest("a")) setMenu(false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && nav.classList.contains("is-open")) {
      setMenu(false);
      toggle.focus();
    }
  });
  mq.addEventListener("change", syncNavForViewport);
  syncNavForViewport();

  /* ---- Reveal on scroll ---------------------------------------------- */
  var revealables = document.querySelectorAll(".reveal, [data-slab]");
  if (!reduceMotion && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    revealables.forEach(function (el) { io.observe(el); });
  } else {
    revealables.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---- Mobile sticky estimate bar ------------------------------------ */
  var sticky = document.getElementById("sticky-cta");
  var hero = document.querySelector(".hero");
  var estimate = document.getElementById("estimate");
  if (sticky && "IntersectionObserver" in window) {
    var heroVisible = true;
    var estimateVisible = false;
    var update = function () {
      sticky.classList.toggle("is-visible", !heroVisible && !estimateVisible);
    };
    new IntersectionObserver(function (e) {
      heroVisible = e[0].isIntersecting;
      update();
    }).observe(hero);
    new IntersectionObserver(function (e) {
      estimateVisible = e[0].isIntersecting;
      update();
    }).observe(estimate);
  }

  /* ---- Estimate form ------------------------------------------------- */
  var form = document.getElementById("estimate-form");
  var status = document.getElementById("form-status");
  var banner = document.getElementById("demo-banner");
  if (!form) return;
  if (FORM_ENDPOINT && banner) banner.remove();

  var fields = {
    name: form.elements.name,
    location: form.elements.location,
    phone: form.elements.phone,
    email: form.elements.email,
    type: form.elements.type,
    description: form.elements.description
  };
  var attempted = false;
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function setError(input, errorId, on) {
    var field = document.getElementById(errorId).closest(".field");
    field.classList.toggle("has-error", on);
    if (input) input.setAttribute("aria-invalid", on ? "true" : "false");
  }

  function validate() {
    var problems = [];
    var v = function (el) { return el.value.trim(); };

    var nameBad = !v(fields.name);
    setError(fields.name, "e-name", nameBad);
    if (nameBad) problems.push({ id: "f-name", text: "Name is missing" });

    var locBad = !v(fields.location);
    setError(fields.location, "e-location", locBad);
    if (locBad) problems.push({ id: "f-location", text: "Project location is missing" });

    var phone = v(fields.phone);
    var email = v(fields.email);
    var emailBad = !!email && !EMAIL_RE.test(email);
    setError(fields.email, "e-email", emailBad);
    if (emailBad) problems.push({ id: "f-email", text: "Email address looks incomplete" });

    var phoneBad = !!phone && phone.replace(/\D/g, "").length < 10;
    var contactBad = (!phone && !email) || phoneBad;
    setError(null, "e-contact", contactBad);
    fields.phone.setAttribute("aria-invalid", contactBad ? "true" : "false");
    if (!email) fields.email.setAttribute("aria-invalid", contactBad ? "true" : String(emailBad));
    document.getElementById("e-contact").textContent = phoneBad
      ? "Please enter a full phone number, including area code."
      : "Please give us a phone number or an email so we can reach you.";
    if (contactBad) problems.push({ id: "f-phone", text: phoneBad ? "Phone number looks incomplete" : "Phone or email is needed" });

    var typeBad = !fields.type.value;
    setError(fields.type, "e-type", typeBad);
    if (typeBad) problems.push({ id: "f-type", text: "Project type is not selected" });

    var descBad = v(fields.description).length < 5;
    setError(fields.description, "e-desc", descBad);
    if (descBad) problems.push({ id: "f-desc", text: "Project description is missing" });

    return problems;
  }

  function showStatus(state, html) {
    status.dataset.state = state;
    status.innerHTML = html;
    status.focus({ preventScroll: true });
    status.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
  }

  function clearStatus() {
    status.innerHTML = "";
    delete status.dataset.state;
  }

  // Live re-validation once the person has tried to submit.
  form.addEventListener("input", function () {
    if (attempted) validate();
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    attempted = true;
    var problems = validate();

    if (problems.length) {
      showStatus(
        "error",
        "<h3>Please fix " + (problems.length === 1 ? "1 item" : problems.length + " items") + " below</h3><ul>" +
          problems.map(function (p) { return '<li><a href="#' + p.id + '">' + p.text + "</a></li>"; }).join("") +
          "</ul>"
      );
      return;
    }

    if (!FORM_ENDPOINT) {
      showStatus(
        "demo",
        "<h3>Not sent &mdash; this is a demo form</h3>" +
          "<p>Your details passed validation, but this form isn&rsquo;t connected to R&amp;A Concrete yet, so nothing was delivered. Your entries are still in the form.</p>"
      );
      return;
    }

    var button = form.querySelector('[type="submit"]');
    button.setAttribute("aria-busy", "true");
    clearStatus();

    fetch(FORM_ENDPOINT, {
      method: "POST",
      body: new FormData(form),
      headers: { Accept: "application/json" }
    })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        form.reset();
        attempted = false;
        showStatus(
          "success",
          "<h3>Request received</h3><p>Thanks. Your project details were sent to R&amp;A Concrete, and we&rsquo;ll be in touch using the contact information you provided.</p>"
        );
      })
      .catch(function () {
        showStatus(
          "error",
          "<h3>Your request didn&rsquo;t go through</h3><p>Something went wrong while sending. Your details are still in the form, so please try again in a moment.</p>"
        );
      })
      .finally(function () {
        button.removeAttribute("aria-busy");
      });
  });

  // Error-summary links: move focus to the field, not just scroll.
  status.addEventListener("click", function (e) {
    var a = e.target.closest("a[href^='#f-']");
    if (!a) return;
    e.preventDefault();
    var target = document.getElementById(a.getAttribute("href").slice(1));
    target.focus();
  });

  /* ---- Footer year ---------------------------------------------------- */
  var year = document.querySelector("[data-year]");
  if (year) year.textContent = new Date().getFullYear();
})();
