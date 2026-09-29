const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.ERMOL_CONFIG;
const { SUBJECTS, TOPICS } = window.ERMOL_DATA;
const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

/* ---------- subjects / topics / difficulty ---------- */
$("#subjectGrid").innerHTML = SUBJECTS.map(s =>
  `<button class="subj" data-s="${esc(s.n)}"><span class="ic">${s.i}</span><div><h3>${esc(s.n)}</h3><p>${esc(s.d)}</p></div></button>`).join("");
$("#subSel").innerHTML = '<option value="">-- Select Subject --</option>' + SUBJECTS.map(s => `<option>${esc(s.n)}</option>`).join("");

function fillTopics() {
  const t = TOPICS[$("#subSel").value] || [];
  $("#topSel").innerHTML = '<option value="">-- Select Topic --</option>' + t.map(x => `<option>${esc(x)}</option>`).join("");
  $("#topSel").disabled = !t.length;
  document.querySelectorAll(".subj").forEach(b => b.classList.toggle("on", b.dataset.s === $("#subSel").value));
  refreshStart();
}
function refreshStart() {
  const ok = $("#subSel").value && $("#topSel").value && document.querySelector('input[name=diff]:checked');
  $("#startPractice").classList.toggle("hidden", !ok);
}
$("#subSel").onchange = fillTopics;
$("#topSel").onchange = refreshStart;
document.querySelectorAll("input[name=diff]").forEach(r => r.onchange = refreshStart);
$("#subjectGrid").onclick = e => {
  const b = e.target.closest(".subj"); if (!b) return;
  $("#subSel").value = b.dataset.s; fillTopics(); $("#practice").scrollIntoView({ behavior: "smooth" });
};
$("#joinBtn").onclick = () => setTimeout(() => $("#codeIn").focus(), 400);

/* ---------- modals ---------- */
document.querySelectorAll("[data-close]").forEach(b => b.onclick = () => b.closest(".modal").classList.remove("open"));
document.querySelectorAll("[data-admin]").forEach(b => b.onclick = () => $("#adminModal").classList.add("open"));

$("#loginForm").onsubmit = async e => {
  e.preventDefault(); $("#loginErr").textContent = "";
  const { error } = await db.auth.signInWithPassword({ email: $("#aEmail").value.trim(), password: $("#aPass").value });
  if (error) $("#loginErr").textContent = error.message; else location.href = "admin.html";
};

/* ---------- join by code / practice ---------- */
let pend = null;
function askName(p) {
  pend = p; $("#nmTitle").textContent = p.title; $("#nmSub").textContent = p.sub; $("#nameErr").textContent = "";
  $("#nameModal").classList.add("open"); $("#nameIn").focus();
}

$("#codeForm").onsubmit = async e => {
  e.preventDefault(); $("#codeErr").textContent = "";
  const code = $("#codeIn").value.trim().toUpperCase();
  if (!/^ERMOL-[A-Z0-9]{5}$/.test(code)) return $("#codeErr").textContent = "Quiz not found or not published.";
  const { data: quiz } = await db.from("quizzes").select("*").eq("code", code).eq("published", true).maybeSingle();
  if (!quiz) return $("#codeErr").textContent = "Quiz not found or not published.";
  askName({
    title: quiz.title, sub: `${quiz.subject} • ${quiz.topic} • ${quiz.difficulty} • ${quiz.time_minutes} min`,
    load: async () => {
      const { data, error } = await db.from("questions").select("*").eq("quiz_id", quiz.id).order("order_no");
      return { qs: data || [], error, quiz, mins: quiz.time_minutes, qid: quiz.id };
    }
  });
};

$("#startPractice").onclick = () => {
  const s = $("#subSel").value, t = $("#topSel").value, d = document.querySelector('input[name=diff]:checked').value;
  askName({
    title: "Practice Quiz", sub: `${s} • ${t} • ${d}`,
    load: async () => {
      const { data, error } = await db.from("questions").select("*").eq("subject", s).eq("topic", t).eq("difficulty", d).limit(300);
      const seen = new Set(), qs = [];
      for (const q of shuffle(data || [])) { const k = q.question_text.trim().toLowerCase(); if (!seen.has(k)) { seen.add(k); qs.push(q); } }
      return { qs: qs.slice(0, 20), error, quiz: { title: "Practice", subject: s, topic: t, difficulty: d }, mins: 10, qid: null };
    }
  });
};

$("#nameForm").onsubmit = async e => {
  e.preventDefault();
  const name = $("#nameIn").value.trim(); if (!name) return;
  $("#nameGo").disabled = true;
  const r = await pend.load();
  $("#nameGo").disabled = false;
  if (r.error) return $("#nameErr").textContent = "Could not load questions. Check your connection.";
  if (!r.qs.length) return $("#nameErr").textContent = "No questions available for this selection yet.";
  $("#nameModal").classList.remove("open");
  startQuiz(name, r);
};

/* ---------- quiz ---------- */
let Q;
const fmt = s => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

function startQuiz(name, r) {
  Q = { name, qs: r.qs, qid: r.qid, ans: Array(r.qs.length).fill(-1), i: 0, end: Date.now() + r.mins * 60000, done: false };
  $("#site").classList.add("hidden"); $("#quizView").classList.remove("hidden");
  $("#qSub").textContent = r.quiz.subject; $("#qMeta").textContent = `${r.quiz.topic} • ${r.quiz.difficulty}`;
  Q.t = setInterval(tick, 500); tick(); draw();
}
function tick() {
  const s = Math.max(0, Math.ceil((Q.end - Date.now()) / 1000));
  $("#timer").textContent = fmt(s); $("#timer").classList.toggle("low", s <= 60);
  if (!s) submit();
}
function draw() {
  const q = Q.qs[Q.i], n = Q.qs.length, last = Q.i === n - 1;
  $("#qCount").textContent = `Question ${Q.i + 1} of ${n}`;
  $("#bar").style.width = ((Q.i + 1) / n * 100) + "%";
  $("#qText").textContent = q.question_text;
  $("#opts").innerHTML = [q.option_a, q.option_b, q.option_c, q.option_d].map((o, k) =>
    `<button class="opt${Q.ans[Q.i] === k ? " sel" : ""}" data-k="${k}"><b>${"ABCD"[k]}.</b><span>${esc(o)}</span></button>`).join("");
  $("#prevBtn").disabled = Q.i === 0;
  $("#nextBtn").textContent = last ? "Submit Quiz" : "Next →";
}
$("#opts").onclick = e => { const b = e.target.closest(".opt"); if (!b || Q.done) return; Q.ans[Q.i] = +b.dataset.k; draw(); };
$("#prevBtn").onclick = () => { if (Q.i > 0) { Q.i--; draw(); } };
$("#nextBtn").onclick = () => {
  if (Q.i < Q.qs.length - 1) { Q.i++; draw(); }
  else if (confirm("Submit your quiz now?")) submit();
};

async function submit() {
  if (Q.done) return; Q.done = true; clearInterval(Q.t);
  const total = Q.qs.length, ok = Q.qs.filter((q, i) => Q.ans[i] === q.correct_index).length, pct = Math.round(ok / total * 100);
  $("#quizView").classList.add("hidden"); $("#resultView").classList.remove("hidden");
  $("#rName").textContent = Q.name; $("#rScore").textContent = `${ok} / ${total}`;
  $("#rStats").innerHTML = [["Name", esc(Q.name)], ["Total Questions", total], ["Correct", ok], ["Wrong", total - ok], ["Score", `${ok} / ${total}`], ["Percentage", pct + "%"]]
    .map(([k, v]) => `<div class="stat"><span>${k}</span><b>${v}</b></div>`).join("");
  if (Q.qid) await db.from("attempts").insert({ quiz_id: Q.qid, student_name: Q.name, total_questions: total, correct_answers: ok, wrong_answers: total - ok, percentage: pct });
}
