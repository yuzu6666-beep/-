// ====== 未処理。 (メモボタン式 / 完了ボタンのみ / 横配置 / 完了に削除) ======

const STORAGE_KEY = "mishori_v12";

// ---- utils ----
function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

// ---- state ----
let state = loadState();

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { tasks: [], showDone:false, editingMemo:null };
  try {
    const s = JSON.parse(raw);
    return {
      tasks: s.tasks ?? [],
      showDone: s.showDone ?? false,
      editingMemo: null
    };
  } catch {
    return { tasks: [], showDone:false, editingMemo:null };
  }
}

function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      tasks: state.tasks,
      showDone: state.showDone
    })
  );
}

// ---- DOM ----
const taskInput   = document.getElementById("taskInput");
const addBtn      = document.getElementById("addBtn");
const openListEl  = document.getElementById("openList");
const doneListEl  = document.getElementById("doneList");
const doneToggle  = document.getElementById("doneToggle");

// ---- helpers ----
function findTask(id){
  return state.tasks.find(t => t.id === id);
}

// ---- actions ----
function toggleDoneCard(next){
  state.showDone = typeof next === "boolean" ? next : !state.showDone;
  saveState();
  render();
}

function toggleStatus(id){
  const t = findTask(id);
  if (!t) return;

  if (t.status === "open") {
    t.status = "done";
    t.doneAt = Date.now();
  } else {
    t.status = "open";
    t.doneAt = null;
  }
  saveState();
  render();
}

function removeTask(id){
  if (!confirm("削除する？")) return;
  state.tasks = state.tasks.filter(t => t.id !== id);
  if (state.editingMemo === id) state.editingMemo = null;
  saveState();
  render();
}

function openMemo(id){
  state.editingMemo = id;
  render();

  // 表示直後にフォーカスしたい場合（次フレームで）
  requestAnimationFrame(()=>{
    const ta = document.querySelector(`textarea[data-memo-input][data-id="${id}"]`);
    if (ta) ta.focus();
  });
}

function saveMemo(id, value){
  const t = findTask(id);
  if (!t) return;
  t.memo = (value ?? "").trim();
  state.editingMemo = null;
  saveState();
  render();
}

// ---- render ----
function render(){
  const open = state.tasks.filter(t=>t.status==="open");
  const done = state.tasks.filter(t=>t.status==="done");

  // --- 未処理 ---
  if (open.length === 0){
    openListEl.innerHTML = `<div class="small">未処理はない。</div>`;
  } else {
    openListEl.innerHTML = open.map(t=>{
      const editing = state.editingMemo === t.id;

      return `
      <div class="item">
        <div class="itemTop">
          <div class="left">
            <span class="dotSmall"></span>
            <div class="content">
              <div class="title">${escapeHtml(t.title)}</div>

              ${t.memo && !editing
                ? `<div class="memoView">${escapeHtml(t.memo)}</div>`
                : ``}

              ${editing
                ? `
                  <div class="memoEdit">
                    <textarea class="memoInput" data-memo-input data-id="${t.id}" rows="2"
                      placeholder="メモを書く…">${escapeHtml(t.memo||"")}</textarea>

                    <button class="memoSaveBtn" data-action="memo-save" data-id="${t.id}">保存</button>
                  </div>
                `
                : ``}
            </div>
          </div>

          <div class="actions side">
            ${editing
              ? ``
              : `<button class="linkbtn" data-action="memo-open" data-id="${t.id}">メモ</button>`}
            <button class="linkbtn primary" data-action="toggle" data-id="${t.id}">完了</button>
          </div>
        </div>
      </div>`;
    }).join("");
  }

  // --- 完了 ---
  doneToggle.textContent = `完了（${done.length}）`;
  doneToggle.classList.toggle("open", state.showDone);

  if (!state.showDone){
    doneListEl.innerHTML =
      `<button class="donePeek" data-done-toggle="open">▼ タップして開く</button>`;
  } else if (done.length === 0){
    doneListEl.innerHTML =
      `<div class="small">完了はまだない。</div>
       <button class="doneClose" data-done-toggle="close">▲ 閉じる</button>`;
  } else {
    doneListEl.innerHTML = done.map(t=>`
      <div class="item doneItem">
        <div class="itemTop">
          <div class="left">
            <span class="dotSmall"></span>
            <div class="content">
              <div class="title">${escapeHtml(t.title)}</div>
              ${t.memo ? `<div class="memoView">${escapeHtml(t.memo)}</div>` : ``}
            </div>
          </div>
          <div class="actions side">
            <button class="linkbtn" data-action="toggle" data-id="${t.id}">未処理へ</button>
            <button class="linkbtn" data-action="delete" data-id="${t.id}">削除</button>
          </div>
        </div>
      </div>
    `).join("") +
    `<button class="doneClose" data-done-toggle="close">▲ 閉じる</button>`;
  }
}

// ---- events ----
document.addEventListener("click", e=>{
  const btn = e.target.closest("button");
  if (!btn) return;

  const { action, id, doneToggle } = btn.dataset;

  if (action === "toggle") toggleStatus(id);
  if (action === "memo-open") openMemo(id);
  if (action === "memo-save") {
    const ta = document.querySelector(`textarea[data-memo-input][data-id="${id}"]`);
    if (ta) saveMemo(id, ta.value);
  }
  if (action === "delete") removeTask(id);
  if (doneToggle) toggleDoneCard(doneToggle==="open");
});

// メモ編集時：Enterで保存（Shift+Enterで改行）
document.addEventListener("keydown", e=>{
  const ta = e.target.closest && e.target.closest("textarea[data-memo-input]");
  if (!ta) return;

  if (e.key === "Enter" && !e.shiftKey){
    e.preventDefault();
    const id = ta.dataset.id;
    saveMemo(id, ta.value);
  }
});

// ---- add ----
addBtn.onclick = ()=>{
  const title = taskInput.value.trim();
  if (!title) return;

  state.tasks.push({
    id: uid(),
    title,
    memo: "",
    status:"open",
    createdAt: Date.now(),
    doneAt:null
  });

  taskInput.value="";
  saveState();
  render();
};

taskInput.addEventListener("keydown", e=>{
  if (e.key==="Enter" && !e.shiftKey){
    e.preventDefault();
    addBtn.click();
  }
});

// ---- start ----
render();
taskInput.focus();
