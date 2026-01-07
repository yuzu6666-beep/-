// ====== 未処理。 (完了は別枠カード) ======

const STORAGE_KEY = "mishori_v9";

// ---- utils ----
function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { tasks: [], deciding: null };
  try {
    const s = JSON.parse(raw);
    return { tasks: s.tasks || [], deciding: null };
  } catch {
    return { tasks: [], deciding: null };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ tasks: state.tasks }));
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

// ---- DOM ----
const taskInput = document.getElementById("taskInput");
const addBtn = document.getElementById("addBtn");
const openListEl = document.getElementById("openList");
const doneListEl = document.getElementById("doneList");

// ---- state ----
let state = loadState();

// ---- helpers ----
function findTask(id) {
  return state.tasks.find(t => t.id === id);
}

// ---- actions ----
function openDecide(id) {
  state.deciding = id;
  render();
}

function decideSave(id, value) {
  const t = findTask(id);
  if (!t) return;
  t.step2m = value.trim();
  state.deciding = null;
  saveState();
  render();
}

function decideSkip() {
  state.deciding = null;
  render();
}

function decideFinish(id) {
  const t = findTask(id);
  if (!t) return;
  t.status = "done";
  t.doneAt = Date.now();
  state.deciding = null;
  saveState();
  render();
}

function removeTask(id) {
  if (!confirm("削除する？")) return;
  state.tasks = state.tasks.filter(t => t.id !== id);
  saveState();
  render();
}

// ---- render ----
function render() {
  const open = state.tasks
    .filter(t => t.status === "open")
    .sort((a,b) => a.createdAt - b.createdAt);

  const done = state.tasks
    .filter(t => t.status === "done")
    .sort((a,b) => (b.doneAt || 0) - (a.doneAt || 0)); // 新しい完了が上

  // 未処理（open）
  if (open.length === 0) {
    openListEl.innerHTML = `
      <div class="small">未処理はない。</div>
    `;
  } else {
    openListEl.innerHTML = open.map(t => {
      const deciding = state.deciding === t.id;
      const hasStep = t.step2m && t.step2m.trim();

      return `
        <div class="item">
          <div class="itemTop">
            <div class="left">
              <span class="dotSmall"></span>
              <div>
                <div class="title">${escapeHtml(t.title)}</div>

                <div class="meta">
                  ${hasStep
                    ? `10秒：<strong>${escapeHtml(t.step2m)}</strong>`
                    : `10秒はまだ決めてない。`
                  }
                </div>

                <!-- ★ ボタンを10秒の下へ / 横並び -->
                <div class="actions underMeta">
                  <button class="linkbtn primary" type="button" data-action="done" data-id="${t.id}">やった。</button>
                  ${!hasStep
                    ? `<button class="linkbtn" type="button" data-action="start" data-id="${t.id}">最初の10秒を決める</button>`
                    : ``}
                  <button class="linkbtn" type="button" data-action="delete" data-id="${t.id}">削除</button>
                </div>
              </div>
            </div>
          </div>

          ${deciding ? `
            <div class="meta" style="margin-top:10px;">
              <div style="margin-bottom:6px;">次の10秒</div>
              <input class="input" data-step-input data-for="${t.id}" value="" />

              <div class="actions underMeta" style="margin-top:8px;">
                <button class="linkbtn primary" type="button" data-action="save" data-id="${t.id}">これにする</button>
                <button class="linkbtn" type="button" data-action="skip">今は決めない</button>
                <button class="linkbtn" type="button" data-action="finish" data-id="${t.id}">続きはない</button>
              </div>
            </div>
          ` : ``}
        </div>
      `;
    }).join("");
  }

  // 完了（done）別枠
  if (done.length === 0) {
    doneListEl.innerHTML = `<div class="small">完了はまだない。</div>`;
  } else {
    doneListEl.innerHTML = done.map(t => `
      <div class="item doneItem">
        <div class="itemTop">
          <div class="left">
            <span class="dotSmall"></span>
            <div>
              <div class="title">${escapeHtml(t.title)}</div>
              ${t.step2m ? `<div class="meta">最後の10秒：<strong>${escapeHtml(t.step2m)}</strong></div>` : ``}

              <!-- 完了側も同じ位置に -->
              <div class="actions underMeta">
                <button class="linkbtn" type="button" data-action="delete" data-id="${t.id}">削除</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `).join("");
  }

  // deciding を開いた直後、その入力欄にフォーカス
  if (state.deciding) {
    const focusEl = openListEl.querySelector(`input[data-step-input][data-for="${state.deciding}"]`);
    if (focusEl) focusEl.focus();
  }
}

// ---- events (委譲) ----

// クリック：open/done 両方まとめて
function handleClick(e) {
  const btn = e.target.closest("button");
  if (!btn) return;

  const id = btn.dataset.id;
  const action = btn.dataset.action;

  if (action === "done" || action === "start") openDecide(id);
  if (action === "delete") removeTask(id);
  if (action === "skip") decideSkip();
  if (action === "finish") decideFinish(id);

  if (action === "save") {
    const input = document.querySelector(`input[data-step-input][data-for="${id}"]`);
    if (!input) return;
    const v = input.value.trim();
    if (!v) return;
    decideSave(id, v);
  }
}

openListEl.addEventListener("click", handleClick);
doneListEl.addEventListener("click", handleClick);

// ★ここが本題：次の10秒入力欄 Enter = これにする（イベント委譲）
openListEl.addEventListener("keydown", (e) => {
  const inp = e.target.closest('input[data-step-input]');
  if (!inp) return;

  // 日本語IME変換中は何もしない
  if (e.isComposing) return;

  if (e.key === "Enter") {
    e.preventDefault();

    const id = inp.dataset.for;
    const v = inp.value.trim();
    if (!v) return;

    decideSave(id, v);
  }
});

// ---- add ----
addBtn.onclick = () => {
  const title = taskInput.value.trim();
  if (!title) return;

  state.tasks.push({
    id: uid(),
    title,
    step2m: null,
    status: "open",
    createdAt: Date.now(),
    doneAt: null
  });

  taskInput.value = "";
  saveState();
  render();
};

taskInput.addEventListener("keydown", (e) => {
  // 日本語IME変換中は何もしない
  if (e.isComposing) return;

  if (e.key === "Enter") {
    // Shift+Enter は改行させる
    if (e.shiftKey) return;

    // Enter 単体は追加
    e.preventDefault();
    addBtn.click();
  }
});

// ---- start ----
render();
taskInput.focus();
