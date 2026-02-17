const STORAGE_KEY = "todo-list-v1";

const state = {
  todos: [],
  filter: "all",
  keyword: "",
  editingId: null
};

const refs = {
  todoForm: document.getElementById("todo-form"),
  todoInput: document.getElementById("todo-input"),
  todoDate: document.getElementById("todo-date"),
  todoList: document.getElementById("todo-list"),
  filterButtons: [...document.querySelectorAll("[data-filter]")],
  searchInput: document.getElementById("search-input"),
  clearCompleted: document.getElementById("clear-completed"),
  taskCount: document.getElementById("task-count"),
  toggleAll: document.getElementById("toggle-all"),
  template: document.getElementById("todo-item-template"),
  editDialog: document.getElementById("edit-dialog"),
  editForm: document.getElementById("edit-form"),
  editInput: document.getElementById("edit-input"),
  editDate: document.getElementById("edit-date")
};

init();

function init() {
  loadTodos();
  bindEvents();
  render();
}

function bindEvents() {
  refs.todoForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const title = refs.todoInput.value.trim();
    const dueDate = refs.todoDate.value || null;
    if (!title) return;

    state.todos.unshift({
      id: crypto.randomUUID(),
      title,
      dueDate,
      completed: false,
      createdAt: new Date().toISOString()
    });

    refs.todoForm.reset();
    persist();
    render();
  });

  refs.todoList.addEventListener("click", (event) => {
    const item = event.target.closest(".todo-item");
    if (!item) return;
    const id = item.dataset.id;

    if (event.target.classList.contains("delete-btn")) {
      state.todos = state.todos.filter((todo) => todo.id !== id);
    }

    if (event.target.classList.contains("edit-btn")) {
      openEditDialog(id);
    }

    persist();
    render();
  });

  refs.todoList.addEventListener("change", (event) => {
    if (!event.target.classList.contains("todo-item__toggle")) return;

    const item = event.target.closest(".todo-item");
    const todo = state.todos.find((current) => current.id === item.dataset.id);
    if (!todo) return;

    todo.completed = event.target.checked;
    persist();
    render();
  });

  refs.filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.filter = button.dataset.filter;
      render();
    });
  });

  refs.searchInput.addEventListener("input", (event) => {
    state.keyword = event.target.value.trim().toLowerCase();
    render();
  });

  refs.clearCompleted.addEventListener("click", () => {
    state.todos = state.todos.filter((todo) => !todo.completed);
    persist();
    render();
  });

  refs.toggleAll.addEventListener("click", () => {
    const hasActive = state.todos.some((todo) => !todo.completed);
    state.todos = state.todos.map((todo) => ({ ...todo, completed: hasActive }));
    persist();
    render();
  });

  refs.editForm.addEventListener("submit", (event) => {
    const action = event.submitter?.value;
    if (action === "cancel") return;

    event.preventDefault();
    const todo = state.todos.find((current) => current.id === state.editingId);
    const title = refs.editInput.value.trim();

    if (!todo || !title) return;

    todo.title = title;
    todo.dueDate = refs.editDate.value || null;

    refs.editDialog.close();
    persist();
    render();
  });
}

function openEditDialog(id) {
  const todo = state.todos.find((current) => current.id === id);
  if (!todo) return;

  state.editingId = id;
  refs.editInput.value = todo.title;
  refs.editDate.value = todo.dueDate || "";
  refs.editDialog.showModal();
}

function render() {
  refs.filterButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.filter === state.filter);
  });

  const visibleTodos = state.todos.filter((todo) => {
    if (state.filter === "active" && todo.completed) return false;
    if (state.filter === "completed" && !todo.completed) return false;
    if (state.keyword && !todo.title.toLowerCase().includes(state.keyword)) return false;
    return true;
  });

  refs.todoList.innerHTML = "";
  visibleTodos.forEach((todo) => {
    const fragment = refs.template.content.cloneNode(true);
    const item = fragment.querySelector(".todo-item");
    const title = fragment.querySelector(".todo-item__title");
    const meta = fragment.querySelector(".todo-item__meta");
    const toggle = fragment.querySelector(".todo-item__toggle");

    item.dataset.id = todo.id;
    item.classList.toggle("completed", todo.completed);
    title.textContent = todo.title;
    meta.textContent = formatMeta(todo);
    toggle.checked = todo.completed;

    refs.todoList.appendChild(fragment);
  });

  const activeCount = state.todos.filter((todo) => !todo.completed).length;
  refs.taskCount.textContent = `${state.todos.length} 个任务（${activeCount} 个进行中）`;
}

function formatMeta(todo) {
  const created = new Date(todo.createdAt).toLocaleString("zh-CN", {
    dateStyle: "short",
    timeStyle: "short"
  });

  if (!todo.dueDate) {
    return `创建于 ${created}`;
  }

  return `截止 ${todo.dueDate} · 创建于 ${created}`;
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.todos));
}

function loadTodos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return;

    state.todos = data.filter((todo) => todo.id && todo.title && todo.createdAt);
  } catch {
    state.todos = [];
  }
}
