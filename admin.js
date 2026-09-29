const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.ERMOL_CONFIG;
const { SUBJECTS, TOPICS } = window.ERMOL_DATA;
const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let user, quizzes = [], editing = null;

(async () => {
  const { data: { session } } = await db.auth.getSession();
  if (!session) { location.href = "index.html"; return; }
  user = session.user;
  $("#fSub").innerHTML = SUBJECTS.map(s => `<option>${esc(s.n)}</option>`).join("");
  load();
})();

$("#logout").onclick = async () => { await db.auth.signOut(); location.href = "index.html"; };
document.querySelectorAll("[data-close]").forEach(b => b.onclick = () => $("#builder").classList.remove("open"));

/* ---------- dashboard ---------- */
async function load() {
  const [q, a] = await Promise.all([
    db.from("quizzes").select("*").eq("created_by", user.id).order("created_at", { ascending: false }),
    db.from("attempts").select("*, quizzes(title)").order("created_at", { ascending: false })
  ]);
  quizzes = q.data || [];
  const att = a.data || [];
  const avg = att.length ? Math.round(att.reduce((s, x) => s + x.percentage, 0) / att.length) : 0;
  $("#stats").innerHTML = [["Total Quizzes", quizzes.length], ["Published", quizzes.filter(x => x.published).length], ["Attempts", att.length], ["Average Score", avg + "%"]]
    .map(([k, v]) => `<div class="stat"><span>${k}</span><b class="grad">${v}</b></div>`).join("");

  $("#quizBody").innerHTML = quizzes.map(x => `<tr>
    <td>${esc(x.title)}</td><td>${esc(x.subject)}</td><td>${esc(x.topic)}</td><td>${x.difficulty}</td>
    <td class="code">${x.code}</td><td><span class="tag ${x.published ? "pub" : ""}">${x.published ? "Published" : "Draft"}</span></td>
    <td class="row"><button class="btn sm" data-a="pub" data-id="${x.id}">${x.published ? "Unpublish" : "Publish"}</button>
      <button class="btn sm ghost" data-a="edit" data-id="${x.id}">Edit</button>
      <button class="btn sm danger" data-a="del" data-id="${x.id}">Delete</button></td></tr>`).join("")
    || '<tr><td colspan="7" class="mut">No quizzes yet. Click “+ Create Quiz” to add your first one.</td></tr>';

  $("#attBody").innerHTML = att.slice(0, 10).map(x => `<tr><td>${esc(x.student_name)}</td><td>${esc(x.quizzes?.title)}</td>
    <td>${x.correct_answers} / ${x.total_questions}</td><td>${x.percentage}%</td><td>${new Date(x.created_at).toLocaleString()}</td></tr>`).join("")
    || '<tr><td colspan="5" class="mut">No attempts yet.</td></tr>';
}

$("#quizBody").onclick = async e => {
  const b = e.target.closest("button"); if (!b) return;
  const x = quizzes.find(q => q.id === b.dataset.id);
  if (b.dataset.a === "pub") { await db.from("quizzes").update({ published: !x.published }).eq("id", x.id); load(); }
  if (b.dataset.a === "del" && confirm(`Delete “${x.title}” and all its questions and attempts?`)) { await db.from("quizzes").delete().eq("id", x.id); load(); }
  if (b.dataset.a === "edit") openBuilder(x);
};

/* ---------- builder ---------- */
function fillTop(sel) {
  $("#fTop").innerHTML = (TOPICS[$("#fSub").value] || []).map(t => `<option>${esc(t)}</option>`).join("");
  if (sel) $("#fTop").value = sel;
}
$("#fSub").onchange = () => fillTop();

function addQ(q = {}) {
  const d = document.createElement("div"); d.className = "qb";
  d.innerHTML = `<label>Question</label><input class="qt" required value="${esc(q.question_text)}">
    <div class="cols">${["a", "b", "c", "d"].map(k => `<div><label>Option ${k.toUpperCase()}</label><input class="o-${k}" required value="${esc(q["option_" + k])}"></div>`).join("")}</div>
    <label>Correct Answer</label><select class="ci" style="max-width:120px">${"ABCD".split("").map((l, i) => `<option value="${i}"${q.correct_index === i ? " selected" : ""}>${l}</option>`).join("")}</select>
    <div style="margin-top:12px"><button type="button" class="btn sm danger rm">Remove</button></div>`;
  d.querySelector(".rm").onclick = () => d.remove();
  $("#qList").appendChild(d);
}
$("#addQ").onclick = () => addQ();

async function openBuilder(x = null) {
  editing = x; $("#bErr").textContent = ""; $("#qList").innerHTML = "";
  $("#bTitle").textContent = x ? "Edit Quiz" : "Create Quiz";
  $("#fTitle").value = x?.title || ""; $("#fSub").value = x?.subject || SUBJECTS[0].n; fillTop(x?.topic);
  $("#fDiff").value = x?.difficulty || "Medium"; $("#fTime").value = x?.time_minutes || 10;
  if (x) { const { data } = await db.from("questions").select("*").eq("quiz_id", x.id).order("order_no"); (data || []).forEach(addQ); }
  else addQ();
  $("#builder").classList.add("open");
}
$("#newQuiz").onclick = () => openBuilder();

function genCode() {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", r = crypto.getRandomValues(new Uint8Array(5));
  return "ERMOL-" + [...r].map(n => c[n % c.length]).join("");
}

$("#quizForm").onsubmit = async e => {
  e.preventDefault(); $("#bErr").textContent = "";
  const meta = { title: $("#fTitle").value.trim(), subject: $("#fSub").value, topic: $("#fTop").value, difficulty: $("#fDiff").value, time_minutes: +$("#fTime").value };
  const qs = [...document.querySelectorAll(".qb")].map((b, i) => ({
    question_text: b.querySelector(".qt").value.trim(), option_a: b.querySelector(".o-a").value.trim(), option_b: b.querySelector(".o-b").value.trim(),
    option_c: b.querySelector(".o-c").value.trim(), option_d: b.querySelector(".o-d").value.trim(), correct_index: +b.querySelector(".ci").value,
    subject: meta.subject, topic: meta.topic, difficulty: meta.difficulty, order_no: i + 1
  }));
  if (!qs.length) return $("#bErr").textContent = "Add at least one question.";
  if (new Set(qs.map(q => q.question_text.toLowerCase())).size !== qs.length) return $("#bErr").textContent = "Duplicate questions found. Each question must be unique.";
  $("#saveBtn").disabled = true;
  let id = editing?.id, err = null;
  if (editing) {
    ({ error: err } = await db.from("quizzes").update(meta).eq("id", id));
    if (!err) ({ error: err } = await db.from("questions").delete().eq("quiz_id", id));
  } else {
    for (let n = 0; n < 6; n++) {   // retry if a generated code collides
      const { data, error } = await db.from("quizzes").insert({ ...meta, code: genCode(), created_by: user.id }).select().single();
      if (!error) { id = data.id; err = null; break; }
      err = error; if (error.code !== "23505") break;
    }
  }
  if (!err) ({ error: err } = await db.from("questions").insert(qs.map(q => ({ ...q, quiz_id: id }))));
  $("#saveBtn").disabled = false;
  if (err) return $("#bErr").textContent = err.message;
  $("#builder").classList.remove("open"); load();
};
