"use client";
/** Customer reviews (V7.4): write a review for COMPLETED work only - the
 * backend enforces eligibility; the UI surfaces the honest rejection. */
import { useState } from "react";
import { api, ApiError } from "../../lib/api";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

export default function Reviews() {
  const [workRef, setWorkRef] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [quality, setQuality] = useState(5);
  const [comment, setComment] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const token = typeof window !== "undefined" ? localStorage.getItem("depuko_session") : null;

  async function submit() {
    setResult(null);
    try {
      const res = await fetch(`${BASE}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ workRef, subjectId, quality, punctuality: quality, communication: quality, comment }),
      });
      const body = await res.json();
      if (!res.ok) throw new ApiError(res.status, body?.message ?? "review refused");
      setResult(`Review submitted - average ${(body as { average: number }).average}/5`);
    } catch (e) {
      setResult(e instanceof ApiError ? `Failed (${e.status}): only completed work can be reviewed` : "Network error");
    }
  }

  async function loadForSubject() {
    try {
      const r = await api.reviews.forSubject(subjectId);
      setResult(`${r.reviews.length} published reviews for ${subjectId}`);
    } catch (e) {
      setResult(e instanceof ApiError ? `Failed (${e.status})` : "Network error");
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24, fontFamily: "system-ui" }}>
      <h1>Reviews</h1>
      <div style={{ display: "grid", gap: 8, maxWidth: 400 }}>
        <input placeholder="Completed order id" value={workRef} onChange={e => setWorkRef(e.target.value)} style={{ padding: 12 }} aria-label="work ref" />
        <input placeholder="Worker/business user id" value={subjectId} onChange={e => setSubjectId(e.target.value)} style={{ padding: 12 }} aria-label="subject" />
        <label>Rating (1-5): <input type="number" min={1} max={5} value={quality} onChange={e => setQuality(Number(e.target.value))} style={{ padding: 8, width: 64 }} aria-label="rating" /></label>
        <textarea placeholder="Comment (optional)" value={comment} onChange={e => setComment(e.target.value)} style={{ padding: 12, minHeight: 80 }} aria-label="comment" />
        <button onClick={submit} disabled={!workRef || !subjectId}>Submit review</button>
        <button onClick={loadForSubject} disabled={!subjectId}>View published reviews</button>
      </div>
      {result && <p role="status">{result}</p>}
    </main>
  );
}