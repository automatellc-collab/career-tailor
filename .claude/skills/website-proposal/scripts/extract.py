#!/usr/bin/env python3
"""Summarize two Lighthouse JSON reports into the numbers the proposal needs.
Usage: extract.py current.json redesign.json > summary.json
Ratings use Google's published Core Web Vitals / Lighthouse thresholds."""
import json, sys

THRESH = {  # metric: (good_max, needs_work_max) in ms
    "largest-contentful-paint": (2500, 4000),
    "first-contentful-paint": (1800, 3000),
    "total-blocking-time": (200, 600),
    "interactive": (3800, 7300),
    "speed-index": (3400, 5800),
}

def rate_ms(metric, v):
    g, n = THRESH[metric]
    return "Good" if v <= g else "Needs work" if v <= n else "Poor"

def rate_score(s):
    return "Good" if s >= 90 else "Needs work" if s >= 50 else "Poor"

def summarize(path):
    d = json.load(open(path)); a = d["audits"]
    out = {"url": d.get("finalDisplayedUrl") or d.get("requestedUrl"),
           "lighthouse": d.get("lighthouseVersion"), "fetched": d.get("fetchTime"),
           "runtime_error": (d.get("runtimeError") or {}).get("code"), "scores": {}, "metrics": {}}
    for k, c in d["categories"].items():
        s = round(c["score"] * 100) if c["score"] is not None else None
        out["scores"][k] = {"value": s, "rating": rate_score(s) if s is not None else None}
    for k in THRESH:
        v = a[k].get("numericValue")
        out["metrics"][k] = {"display": a[k].get("displayValue"), "ms": round(v) if v else v,
                             "rating": rate_ms(k, v) if v is not None else None}
    out["metrics"]["total-byte-weight"] = {"display": a["total-byte-weight"].get("displayValue"),
                                           "kib": round(a["total-byte-weight"]["numericValue"] / 1024)}
    tp = a.get("third-party-summary", {}).get("details", {}).get("items", [])
    out["third_parties"] = [{"entity": i.get("entity"), "kib": round(i.get("transferSize", 0) / 1024),
                             "blocking_ms": round(i.get("blockingTime", 0))} for i in tp[:8]]
    out["failing_audits"] = [{"id": k, "title": v["title"], "detail": v.get("displayValue", "")}
                             for k, v in a.items()
                             if v.get("score") is not None and v["score"] < 0.9
                             and v.get("scoreDisplayMode") in ("binary", "numeric", "metricSavings")]
    return out

cur, new = summarize(sys.argv[1]), summarize(sys.argv[2])
lcp_c, lcp_n = cur["metrics"]["largest-contentful-paint"]["ms"], new["metrics"]["largest-contentful-paint"]["ms"]
print(json.dumps({"current": cur, "redesign": new,
                  "lcp_speedup_x": round(lcp_c / lcp_n, 1) if lcp_c and lcp_n else None}, indent=2))
