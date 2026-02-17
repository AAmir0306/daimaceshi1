const STORAGE_KEY = "todo-items-v1";

const priorityLabel = {
  low: "低优先级",
  medium: "中优先级",
  high: "高优先级",
};

const priorityWeight = {
  low: 1,
  medium: 2,
  high: 3,
};

const state = {
  items: loadItems(),
  search: "",
  filter: "all",
  sort: "created-desc",
  editId: null,
};

const elements = {
  todoForm: document.querySelector("#todo-form"),
  todoInput: document.querySelector("#todo-input"),
  todoPriority: document.querySelector("#todo-priority"),
  todoDeadline: document.querySelector("#todo-deadline"),
  searchInput: document.querySelector("#search-input"),
  filterSelect: document.querySelector("#filter-select"),
  sortSelect: document.querySelector("#sort-select"),
  toggleAllBtn: document.querySelector("#toggle-all-btn"),
  clearCompletedBtn: document.querySelector("#clear-completed-btn"),
  todoList: document.querySelector("#todo-list"),
  stats: document.querySelector("#stats"),
  itemTemplate: document.querySelector("#todo-item-template"),
  editDialog: document.querySelector("#edit-dialog"),
  editForm: document.querySelector("#edit-form"),
  editInput: document.querySelector("#edit-input"),
  editPriority: document.querySelector("#edit-priority"),
  editDeadline: document.querySelector("#edit-deadline"),
  cancelEditBtn: document.querySelector("#cancel-edit-btn"),
};

bindEvents();
render();

function bindEvents() {
  elements.todoForm.addEventListener("submit", handleCreate);
  elements.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value.trim().toLowerCase();
    render();
  });
  elements.filterSelect.addEventListener("change", (event) => {
    state.filter = event.target.value;
    render();
  });
  elements.sortSelect.addEventListener("change", (event) => {
    state.sort = event.target.value;
    render();
  });
  elements.toggleAllBtn.addEventListener("click", toggleAll);
  elements.clearCompletedBtn.addEventListener("click", clearCompleted);
  elements.cancelEditBtn.addEventListener("click", () => elements.editDialog.close());
  elements.editForm.addEventListener("submit", handleEditSave);
}

function handleCreate(event) {
  event.preventDefault();
  const title = elements.todoInput.value.trim();
  if (!title) return;

  state.items.push({
    id: crypto.randomUUID(),
    title,
    completed: false,
    priority: elements.todoPriority.value,
    deadline: elements.todoDeadline.value || null,
    createdAt: new Date().toISOString(),
  });

  elements.todoForm.reset();
  elements.todoPriority.value = "medium";
  saveItems();
  render();
}

function handleEditSave(event) {
  event.preventDefault();
  if (!state.editId) return;

  const target = state.items.find((item) => item.id === state.editId);
  if (!target) return;

  const newTitle = elements.editInput.value.trim();
  if (!newTitle) return;

  target.title = newTitle;
  target.priority = elements.editPriority.value;
  target.deadline = elements.editDeadline.value || null;

  state.editId = null;
  elements.editDialog.close();
  saveItems();
  render();
}

function clearCompleted() {
  state.items = state.items.filter((item) => !item.completed);
  saveItems();
  render();
}

function toggleAll() {
  if (state.items.length === 0) return;
  const shouldComplete = state.items.some((item) => !item.completed);
  state.items = state.items.map((item) => ({ ...item, completed: shouldComplete }));
  saveItems();
  render();
}

function render() {
  elements.todoList.innerHTML = "";
  const visibleItems = getVisibleItems();

  if (visibleItems.length === 0) {
    elements.todoList.innerHTML = `<li class="empty">没有匹配的待办项，试试调整筛选条件。</li>`;
  } else {
    visibleItems.forEach((item) => {
      const node = elements.itemTemplate.content.firstElementChild.cloneNode(true);
      const checkbox = node.querySelector(".todo-checkbox");
      const title = node.querySelector(".todo-title");
      const meta = node.querySelector(".todo-meta");
      const editBtn = node.querySelector(".edit-btn");
      const deleteBtn = node.querySelector(".delete-btn");

      node.dataset.id = item.id;
      node.classList.toggle("completed", item.completed);

      checkbox.checked = item.completed;
      checkbox.addEventListener("change", () => toggleItem(item.id));

      title.textContent = item.title;
      meta.innerHTML = buildMeta(item);

      editBtn.addEventListener("click", () => openEdit(item.id));
      deleteBtn.addEventListener("click", () => deleteItem(item.id));

      elements.todoList.appendChild(node);
    });
  }

  renderStats();
}

function getVisibleItems() {
  const today = getTodayISO();
  return [...state.items]
    .filter((item) => {
      if (!state.search) return true;
      return item.title.toLowerCase().includes(state.search);
    })
    .filter((item) => {
      if (state.filter === "active") return !item.completed;
      if (state.filter === "completed") return item.completed;
      if (state.filter === "overdue") {
        return Boolean(item.deadline) && item.deadline < today && !item.completed;
      }
      return true;
    })
    .sort((a, b) => {
      switch (state.sort) {
        case "created-asc":
          return new Date(a.createdAt) - new Date(b.createdAt);
        case "priority-desc":
          return priorityWeight[b.priority] - priorityWeight[a.priority];
        case "deadline-asc":
          return normalizeDeadline(a.deadline) - normalizeDeadline(b.deadline);
        case "created-desc":
        default:
          return new Date(b.createdAt) - new Date(a.createdAt);
      }
    });
}

function renderStats() {
  const total = state.items.length;
  const completed = state.items.filter((item) => item.completed).length;
  const active = total - completed;
  const overdue = state.items.filter((item) => isOverdue(item)).length;

  elements.stats.textContent = `总数 ${total} | 未完成 ${active} | 已完成 ${completed} | 已过期 ${overdue}`;
}

function toggleItem(id) {
  state.items = state.items.map((item) =>
    item.id === id ? { ...item, completed: !item.completed } : item,
  );
  saveItems();
  render();
}

function openEdit(id) {
  const item = state.items.find((entry) => entry.id === id);
  if (!item) return;

  state.editId = id;
  elements.editInput.value = item.title;
  elements.editPriority.value = item.priority;
  elements.editDeadline.value = item.deadline ?? "";
  elements.editDialog.showModal();
}

function deleteItem(id) {
  state.items = state.items.filter((item) => item.id !== id);
  saveItems();
  render();
}

function loadItems() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
}

function buildMeta(item) {
  const created = new Date(item.createdAt).toLocaleString("zh-CN", {
    hour12: false,
  });
  const priority = `<span class="badge ${item.priority}">${priorityLabel[item.priority]}</span>`;

  let deadlineText = "未设置截止日期";
  if (item.deadline) {
    deadlineText = `截止：${item.deadline}`;
  }

  const overdueBadge = isOverdue(item) ? '<span class="badge overdue">已过期</span>' : "";
  return `${priority}${overdueBadge} ${deadlineText} | 创建：${created}`;
}

function isOverdue(item) {
  if (!item.deadline || item.completed) return false;
  return item.deadline < getTodayISO();
}

function getTodayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const localDate = new Date(now.getTime() - offset * 60_000);
  return localDate.toISOString().slice(0, 10);
}

function normalizeDeadline(deadline) {
  if (!deadline) return Number.MAX_SAFE_INTEGER;
  return Number(deadline.replaceAll("-", ""));
}
