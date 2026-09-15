/* app.js — 手机优先的碎念日记：本地存 localStorage，写段落 + 当天待办。
   条目结构 { id, ts, date:'YYYY-MM-DD', time:'HH:MM', text, todos:[{id,text,done}] }。 */
(function () {
  'use strict';

  var KEY = 'suinian_entries_v1';

  /* ---------- 工具 ---------- */

  function pad(n) { return ('0' + n).slice(-2); }

  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function nowTime() {
    var d = new Date();
    return pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function fmtDate(iso) {
    if (!iso) return '';
    var parts = iso.split('-');
    if (parts.length < 3) return iso;
    return parts[0] + '年' + Number(parts[1]) + '月' + Number(parts[2]) + '日';
  }

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  /* ---------- 数据 ---------- */

  // 首次打开时，把 data.js 里旧收纳的 SNIPPETS 播进本地
  function seed() {
    if (typeof window.SNIPPETS === 'undefined' || !window.SNIPPETS.length) return [];
    return window.SNIPPETS.map(function (s, i) {
      return { id: 'seed-' + i, ts: i, date: s.time, time: '', text: s.text, todos: [] };
    });
  }

  function load() {
    var raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { raw = null; }
    if (raw) {
      try { return JSON.parse(raw); } catch (e) { return seed(); }
    }
    var entries = seed();
    save(entries);
    return entries;
  }

  function save(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {}
  }

  var entries = load();

  /* ---------- 渲染 ---------- */

  function render() {
    var flow = document.getElementById('flow');
    flow.innerHTML = '';

    var sorted = entries.slice().sort(function (a, b) {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      return a.ts - b.ts;
    });

    if (!sorted.length) {
      var empty = el('div', 'empty');
      empty.appendChild(el('p', '', '还没有记录。'));
      empty.appendChild(el('p', '', '点右下角的 ＋ 写今天的第一条。'));
      flow.appendChild(empty);
      document.getElementById('count').textContent = '还没有记录';
      return;
    }

    var groups = [];
    sorted.forEach(function (e) {
      var last = groups[groups.length - 1];
      if (!last || last.date !== e.date) { last = { date: e.date, items: [] }; groups.push(last); }
      last.items.push(e);
    });

    groups.forEach(function (g) {
      var day = el('div', 'day');
      day.appendChild(el('div', 'day-label', fmtDate(g.date)));

      g.items.forEach(function (e) {
        var item = el('div', 'item');

        if (e.text) item.appendChild(el('p', 'item-text', e.text));

        if (e.todos && e.todos.length) {
          var tl = el('div', 'item-todos');
          e.todos.forEach(function (t) {
            var lab = el('label', 'item-todo' + (t.done ? ' done' : ''));
            var cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.checked = !!t.done;
            cb.addEventListener('click', function (ev) { ev.stopPropagation(); });
            cb.addEventListener('change', function () {
              t.done = cb.checked;
              save(entries);
              render();
            });
            lab.appendChild(cb);
            lab.appendChild(el('span', '', t.text));
            tl.appendChild(lab);
          });
          item.appendChild(tl);
        }

        if (e.time) item.appendChild(el('div', 'item-time', e.time));

        item.addEventListener('click', function () { openEditor(e); });
        day.appendChild(item);
      });

      flow.appendChild(day);
    });

    document.getElementById('count').textContent = '共 ' + entries.length + ' 条';
  }

  /* ---------- 编辑器 ---------- */

  var editingId = null;      // null = 新建
  var editorTodos = [];      // 编辑中的待办副本

  function openEditor(entry) {
    editingId = entry ? entry.id : null;
    document.getElementById('editor-date').value = entry ? entry.date : todayStr();
    document.getElementById('editor-text').value = entry ? entry.text : '';
    editorTodos = entry
      ? entry.todos.map(function (t) { return { id: t.id, text: t.text, done: t.done }; })
      : [];
    document.getElementById('editor-delete').classList.toggle('hidden', !entry);
    renderEditorTodos();
    document.getElementById('editor').classList.remove('hidden');
    document.body.classList.add('no-scroll');
    setTimeout(function () { document.getElementById('editor-text').focus(); }, 50);
  }

  function closeEditor() {
    document.getElementById('editor').classList.add('hidden');
    document.body.classList.remove('no-scroll');
  }

  function moveTodo(idx, dir) {
    var j = idx + dir;
    if (j < 0 || j >= editorTodos.length) return;
    var tmp = editorTodos[idx];
    editorTodos[idx] = editorTodos[j];
    editorTodos[j] = tmp;
    renderEditorTodos();
  }

  function renderEditorTodos() {
    var list = document.getElementById('todo-list');
    list.innerHTML = '';

    editorTodos.forEach(function (t, idx) {
      var row = el('div', 'todo-row');

      var chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.className = 'todo-check';
      chk.checked = !!t.done;
      chk.addEventListener('change', function () { t.done = chk.checked; });

      var inp = document.createElement('input');
      inp.className = 'todo-text';
      inp.value = t.text;
      inp.placeholder = '待办内容';
      inp.addEventListener('input', function () { t.text = inp.value; });

      var up = el('button', 'todo-move', '↑');
      up.disabled = idx === 0;
      up.addEventListener('click', function () { moveTodo(idx, -1); });

      var down = el('button', 'todo-move', '↓');
      down.disabled = idx === editorTodos.length - 1;
      down.addEventListener('click', function () { moveTodo(idx, 1); });

      var del = el('button', 'todo-del', '×');
      del.addEventListener('click', function () {
        editorTodos.splice(idx, 1);
        renderEditorTodos();
      });

      row.appendChild(chk);
      row.appendChild(inp);
      row.appendChild(up);
      row.appendChild(down);
      row.appendChild(del);
      list.appendChild(row);
    });
  }

  function addTodo() {
    var input = document.getElementById('todo-input');
    var text = input.value.trim();
    if (!text) return;
    editorTodos.push({ id: uid(), text: text, done: false });
    input.value = '';
    renderEditorTodos();
    input.focus();
  }

  function saveEntry() {
    var text = document.getElementById('editor-text').value.trim();
    var date = document.getElementById('editor-date').value || todayStr();
    var todos = editorTodos.filter(function (t) { return t.text.trim() !== ''; });

    if (!text && !todos.length) { closeEditor(); return; }

    if (editingId) {
      var e = entries.find(function (x) { return x.id === editingId; });
      if (e) { e.text = text; e.date = date; e.todos = todos; }
    } else {
      entries.push({ id: uid(), ts: Date.now(), date: date, time: nowTime(), text: text, todos: todos });
    }

    save(entries);
    closeEditor();
    render();
  }

  function deleteEntry() {
    if (!editingId) return;
    if (!confirm('删除这条记录？')) return;
    entries = entries.filter(function (x) { return x.id !== editingId; });
    save(entries);
    closeEditor();
    render();
  }

  /* ---------- 事件绑定 ---------- */

  document.getElementById('fab').addEventListener('click', function () { openEditor(null); });
  document.getElementById('editor-close').addEventListener('click', closeEditor);
  document.getElementById('editor-save').addEventListener('click', saveEntry);
  document.getElementById('editor-delete').addEventListener('click', deleteEntry);
  document.getElementById('todo-add-btn').addEventListener('click', addTodo);
  document.getElementById('todo-input').addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter') { ev.preventDefault(); addTodo(); }
  });

  render();
})();
