// ===== ELEMENTS =====
const form = document.getElementById("add-form");
const taskInput = document.getElementById("task-input");
const priorityInput = document.getElementById("priority-input");
const dueInput = document.getElementById("due-input");
const formError = document.getElementById("form-error");
const searchInput = document.getElementById("search-input");
const sortInput = document.getElementById("sort-input");
const taskList = document.getElementById("task-list");
const template = document.getElementById("task-template");
const viewTitle = document.getElementById("view-title");
const emptyState = document.getElementById("empty-state");
const emptyTitle = document.getElementById("empty-title");
const emptyText = document.getElementById("empty-text");
const menuItems = document.querySelectorAll(".menu-item");
const itemsLeft = document.getElementById("items-left");
const clearCompletedBtn = document.getElementById("clear-completed");
const progressLabel = document.getElementById("progress-label");
const progressPercent = document.getElementById("progress-percent");
const ring = document.getElementById("ring");
const themeToggle = document.getElementById("theme-toggle");
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");
const toast = document.getElementById("toast");
const toastText = document.getElementById("toast-text");
const undoBtn = document.getElementById("undo-btn");

const STORAGE_KEY = "todo-tasks";
const PRIORITIES = ["low", "medium", "high"];
const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

// Title and empty-state text for each sidebar view
const VIEWS = {
  all: { title: "All tasks", empty: "No tasks here", hint: "Add your first task above to get started." },
  active: { title: "Active", empty: "All done!", hint: "Nothing left to do. Enjoy your free time." },
  completed: { title: "Completed", empty: "Nothing completed yet", hint: "Tick a task's circle to mark it as done." },
  today: { title: "Due today", empty: "Nothing due today", hint: "Tasks with today's due date will show here." },
  overdue: { title: "Overdue", empty: "No overdue tasks", hint: "Great job staying on top of things!" },
  high: { title: "High priority", empty: "No high priority tasks", hint: "Set a task's priority to High to see it here." },
};

let tasks = loadTasks();
let currentFilter = "all";
let searchTerm = "";
let lastDeleted = null; // { snapshot, timer }

// ===== LOCAL STORAGE =====
// Each task is stored as: { id, text, completed, priority, dueDate, createdAt }
function loadTasks() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!Array.isArray(data)) return [];
    // Keep only well-formed items, in case storage was edited by hand
    return data.filter(
      (t) => t && typeof t.id === "string" && typeof t.text === "string" && t.text.trim() !== ""
    ).map((t) => ({
      id: t.id,
      text: t.text,
      completed: Boolean(t.completed),
      priority: PRIORITIES.includes(t.priority) ? t.priority : "medium",
      dueDate: typeof t.dueDate === "string" ? t.dueDate : "",
      createdAt: Number(t.createdAt) || Date.now(),
    }));
  } catch (e) {
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (e) { /* storage full or blocked */ }
}

// ===== HELPERS =====
function createId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isOverdue(t) {
  return !t.completed && t.dueDate !== "" && t.dueDate < todayString();
}

function isDueToday(t) {
  return !t.completed && t.dueDate === todayString();
}

function formatDue(dateStr) {
  const today = todayString();
  if (dateStr === today) return { text: "Today", status: "today" };

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const date = new Date(dateStr + "T00:00:00");
  const label = date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  if (dateStr < today) return { text: `Overdue · ${label}`, status: "overdue" };
  if (date.toDateString() === tomorrow.toDateString()) return { text: "Tomorrow", status: "" };
  return { text: label, status: "" };
}

const FILTERS = {
  all: () => true,
  active: (t) => !t.completed,
  completed: (t) => t.completed,
  today: isDueToday,
  overdue: isOverdue,
  high: (t) => t.priority === "high" && !t.completed,
};

function sortTasks(list) {
  const sorted = [...list];
  if (sortInput.value === "due") {
    // Tasks without a due date go last
    sorted.sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999"));
  } else if (sortInput.value === "priority") {
    sorted.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
  } else {
    sorted.sort((a, b) => b.createdAt - a.createdAt);
  }
  return sorted;
}

function getVisibleTasks() {
  const visible = tasks.filter(
    (t) => FILTERS[currentFilter](t) && t.text.toLowerCase().includes(searchTerm)
  );
  return sortTasks(visible);
}

// ===== RENDER =====
function createTaskElement(task) {
  const li = template.content.firstElementChild.cloneNode(true);
  li.dataset.id = task.id;
  li.dataset.priority = task.priority;
  li.classList.toggle("completed", task.completed);

  li.querySelector(".task-check").checked = task.completed;
  li.querySelector(".task-check").setAttribute("aria-label", `Mark "${task.text}" as done`);
  // textContent (not innerHTML) so user input can never inject HTML
  li.querySelector(".task-text").textContent = task.text;
  li.querySelector(".priority-text").textContent = task.priority;

  if (task.dueDate) {
    const due = formatDue(task.dueDate);
    const dueChip = li.querySelector(".due");
    dueChip.hidden = false;
    dueChip.querySelector(".due-text").textContent = due.text;
    if (due.status && !task.completed) dueChip.classList.add(due.status);
  }
  return li;
}

function render() {
  const visible = getVisibleTasks();
  taskList.replaceChildren(...visible.map(createTaskElement));

  // Empty state message depends on why the list is empty
  const view = VIEWS[currentFilter];
  viewTitle.textContent = view.title;
  emptyState.hidden = visible.length > 0;
  if (tasks.length === 0) {
    emptyTitle.textContent = "No tasks yet";
    emptyText.textContent = "Add your first task above to get started.";
  } else if (searchTerm) {
    emptyTitle.textContent = "No results";
    emptyText.textContent = "No tasks match your search.";
  } else {
    emptyTitle.textContent = view.empty;
    emptyText.textContent = view.hint;
  }

  updateStats();
}

function updateStats() {
  const total = tasks.length;
  const done = tasks.filter((t) => t.completed).length;
  const active = total - done;
  const overdue = tasks.filter(isOverdue).length;
  const percent = total ? Math.round((done / total) * 100) : 0;

  document.getElementById("count-all").textContent = total;
  document.getElementById("count-active").textContent = active;
  document.getElementById("count-completed").textContent = done;
  document.getElementById("count-today").textContent = tasks.filter(isDueToday).length;
  document.getElementById("count-high").textContent = tasks.filter(FILTERS.high).length;
  const overdueCount = document.getElementById("count-overdue");
  overdueCount.textContent = overdue;
  overdueCount.classList.toggle("alert", overdue > 0);

  itemsLeft.textContent = `${active} ${active === 1 ? "task" : "tasks"} left`;
  clearCompletedBtn.disabled = done === 0;

  progressLabel.textContent = total ? `${done} of ${total} tasks completed` : "No tasks yet";
  progressPercent.textContent = `${percent}%`;
  ring.style.setProperty("--p", percent);
}

// ===== ADD =====
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = taskInput.value.trim();

  if (text === "") {
    formError.textContent = "Please enter a task before adding.";
    form.classList.add("invalid");
    taskInput.focus();
    return;
  }

  tasks.unshift({
    id: createId(),
    text,
    completed: false,
    priority: priorityInput.value,
    dueDate: dueInput.value,
    createdAt: Date.now(),
  });
  saveTasks();

  // Show the new task even if a view or search would hide it
  const newTask = tasks[0];
  if (!FILTERS[currentFilter](newTask)) setFilter("all");
  searchInput.value = "";
  searchTerm = "";

  render();
  form.reset();
  priorityInput.value = "medium";
  taskInput.focus();
});

taskInput.addEventListener("input", () => {
  formError.textContent = "";
  form.classList.remove("invalid");
});

// ===== COMPLETE / EDIT / DELETE (event delegation) =====
taskList.addEventListener("change", (e) => {
  if (!e.target.classList.contains("task-check")) return;
  const task = findTask(e.target);
  task.completed = e.target.checked;
  saveTasks();
  render();
});

taskList.addEventListener("click", (e) => {
  const li = e.target.closest(".task");
  if (!li) return;
  if (e.target.closest(".edit-btn")) startEdit(li);
  if (e.target.closest(".delete-btn")) deleteTasks([li.dataset.id]);
});

taskList.addEventListener("dblclick", (e) => {
  if (e.target.classList.contains("task-text")) startEdit(e.target.closest(".task"));
});

function findTask(el) {
  const id = el.closest(".task").dataset.id;
  return tasks.find((t) => t.id === id);
}

function startEdit(li) {
  const textEl = li.querySelector(".task-text");
  const editEl = li.querySelector(".task-edit");
  if (!editEl.hidden) return;

  const task = findTask(li);
  editEl.value = task.text;
  textEl.hidden = true;
  editEl.hidden = false;
  editEl.focus();
  editEl.select();

  let finished = false;
  function finish(save) {
    if (finished) return;
    finished = true;
    const newText = editEl.value.trim();
    // An empty edit keeps the old text instead of deleting the task
    if (save && newText !== "" && newText !== task.text) {
      task.text = newText;
      saveTasks();
    }
    render();
  }

  editEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") finish(true);
    if (e.key === "Escape") finish(false);
  });
  editEl.addEventListener("blur", () => finish(true));
}

function deleteTasks(ids) {
  const removed = tasks.filter((t) => ids.includes(t.id));
  if (removed.length === 0) return;

  // Remember positions so Undo puts tasks back where they were
  const snapshot = removed.map((t) => ({ task: t, index: tasks.indexOf(t) }));

  const finishDelete = () => {
    tasks = tasks.filter((t) => !ids.includes(t.id));
    saveTasks();
    render();
    showUndoToast(snapshot);
  };

  // Fade out the items first, then remove them
  const items = ids
    .map((id) => taskList.querySelector(`.task[data-id="${id}"]`))
    .filter(Boolean);
  if (items.length === 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    finishDelete();
    return;
  }
  items.forEach((el) => el.classList.add("removing"));
  setTimeout(finishDelete, 250);
}

clearCompletedBtn.addEventListener("click", () => {
  deleteTasks(tasks.filter((t) => t.completed).map((t) => t.id));
});

// ===== UNDO TOAST =====
function showUndoToast(snapshot) {
  if (lastDeleted) clearTimeout(lastDeleted.timer);
  toastText.textContent = snapshot.length === 1 ? "Task deleted" : `${snapshot.length} tasks deleted`;
  toast.classList.add("show");
  lastDeleted = {
    snapshot,
    timer: setTimeout(() => {
      toast.classList.remove("show");
      lastDeleted = null;
    }, 5000),
  };
}

undoBtn.addEventListener("click", () => {
  if (!lastDeleted) return;
  clearTimeout(lastDeleted.timer);
  lastDeleted.snapshot
    .sort((a, b) => a.index - b.index)
    .forEach(({ task, index }) => tasks.splice(index, 0, task));
  lastDeleted = null;
  toast.classList.remove("show");
  saveTasks();
  render();
});

// ===== VIEWS, SEARCH & SORT =====
function setFilter(filter) {
  currentFilter = filter;
  menuItems.forEach((b) => b.classList.toggle("active", b.dataset.filter === filter));
}

menuItems.forEach((btn) => {
  btn.addEventListener("click", () => {
    setFilter(btn.dataset.filter);
    render();
    closeSidebar();
  });
});

searchInput.addEventListener("input", () => {
  searchTerm = searchInput.value.trim().toLowerCase();
  render();
});

sortInput.addEventListener("change", render);

// ===== MOBILE SIDEBAR =====
function openSidebar() {
  sidebar.classList.add("open");
  overlay.classList.add("show");
}

function closeSidebar() {
  sidebar.classList.remove("open");
  overlay.classList.remove("show");
}

document.getElementById("open-sidebar").addEventListener("click", openSidebar);
document.getElementById("close-sidebar").addEventListener("click", closeSidebar);
overlay.addEventListener("click", closeSidebar);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeSidebar();
});

// ===== THEME =====
function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  themeToggle.querySelector("i").className = theme === "dark" ? "fa-solid fa-sun" : "fa-solid fa-moon";
  themeToggle.querySelector("span").textContent = theme === "dark" ? "Light mode" : "Dark mode";
  try { localStorage.setItem("theme", theme); } catch (e) { /* storage blocked */ }
}

let savedTheme = null;
try { savedTheme = localStorage.getItem("theme"); } catch (e) { /* storage blocked */ }
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
setTheme(savedTheme || (prefersDark ? "dark" : "light"));

themeToggle.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme");
  setTheme(current === "dark" ? "light" : "dark");
});

// Sync if tasks are changed in another tab
window.addEventListener("storage", (e) => {
  if (e.key === STORAGE_KEY) {
    tasks = loadTasks();
    render();
  }
});

// ===== START =====
const now = new Date();
const hour = now.getHours();
const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
document.getElementById("greeting").textContent = `${greeting} 👋`;
document.getElementById("today").textContent = now.toLocaleDateString("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
render();
