/* app.js — 手机优先的碎念日记：本地存 localStorage，写段落 + 当天待办。
   每天一页，像翻日记本一样左右翻页（滑动或箭头）。
   条目结构 { id, ts, date:'YYYY-MM-DD', time:'HH:MM', text, todos:[{id,text,done}] }。 */
(function () {
  'use strict';

  var KEY = 'suinian_entries_v2';
  var DUR = 450; // 翻页动画时长(ms)

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

  function load() {
    var raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { raw = null; }
    if (raw) {
      try { return JSON.parse(raw); } catch (e) { return []; }
    }
    return [];
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(entries)); } catch (e) {}
  }

  var entries = load();

  /* ---------- 页面状态 ---------- */

  var days = [];      // [{ date, items:[...] }]，按日期从新到旧
  var pageEls = [];
  var current = 0;
  var busy = false;

  function buildDays() {
    var map = {};
    entries.forEach(function (e) {
      (map[e.date] = map[e.date] || []).push(e);
    });
    return Object.keys(map).sort().reverse().map(function (d) {
      return { date: d, items: map[d].slice().sort(function (a, b) { return b.ts - a.ts; }) };
    });
  }

  /* ---------- 渲染 ---------- */

  function buildPage(day) {
    var page = el('div', 'page');
    page.appendChild(el('div', 'page-date', fmtDate(day.date)));

    day.items.forEach(function (e) {
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
            lab.classList.toggle('done', cb.checked);
            save();
          });
          lab.appendChild(cb);
          lab.appendChild(el('span', '', t.text));
          tl.appendChild(lab);
        });
        item.appendChild(tl);
      }

      if (e.time) item.appendChild(el('div', 'item-time', e.time));

      item.addEventListener('click', function () { openEditor(e); });
      page.appendChild(item);
    });

    return page;
  }

  function renderPages() {
    var box = document.getElementById('pages');
    box.innerHTML = '';
    pageEls = [];

    if (!days.length) {
      var emptyPage = el('div', 'page empty-page');
      emptyPage.appendChild(el('p', 'empty', '还没有记录。'));
      emptyPage.appendChild(el('p', 'empty', '点右下角的 ＋ 写今天的第一条。'));
      box.appendChild(emptyPage);
      pageEls.push(emptyPage);
    } else {
      days.forEach(function (day) {
        var p = buildPage(day);
        box.appendChild(p);
        pageEls.push(p);
      });
    }

    setActive(current);
  }

  function setActive(i) {
    pageEls.forEach(function (p, k) {
      p.classList.remove('turn-out', 'turn-in', 'turn-in-from', 'below');
      p.classList.toggle('active', k === i);
    });
  }

  function updatePager() {
    var info = document.getElementById('pager-info');
    var prev = document.getElementById('prev-btn');
    var next = document.getElementById('next-btn');
    if (!days.length) {
      info.textContent = '';
      prev.disabled = true;
      next.disabled = true;
      return;
    }
    info.textContent = fmtDate(days[current].date) + ' · ' + (current + 1) + '/' + days.length;
    prev.disabled = current === 0;
    next.disabled = current === days.length - 1;
  }

  function updateCount() {
    document.getElementById('count').textContent =
      '共 ' + days.length + ' 天 · ' + entries.length + ' 条';
  }

  function render(focusDate) {
    days = buildDays();
    current = 0;
    renderPages();
    if (focusDate) jumpToDate(focusDate);
    else updatePager();
    updateCount();
  }

  /* ---------- 翻页 ---------- */

  function flipTo(next) {
    if (busy || !days.length) return;
    if (next < 0 || next >= days.length || next === current) return;

    var forward = next > current; // 往更早翻
    var out = pageEls[current];
    var inn = pageEls[next];
    busy = true;
    current = next;
    updatePager();

    out.classList.remove('active');
    inn.classList.remove('active', 'below', 'turn-in', 'turn-in-from', 'turn-out');

    if (forward) {
      out.classList.add('turn-out');
      inn.classList.add('below');
    } else {
      out.classList.add('below');
      inn.classList.add('turn-in-from');
      void inn.offsetWidth; // 强制重排，让起始状态生效
      inn.classList.remove('turn-in-from');
      inn.classList.add('turn-in');
    }

    setTimeout(function () {
      setActive(current);
      busy = false;
    }, DUR);
  }

  function jumpToDate(dateStr) {
    var idx = days.findIndex(function (d) { return d.date === dateStr; });
    if (idx < 0) idx = 0;
    current = idx;
    setActive(current);
    updatePager();
  }

  /* ---------- 编辑器 ---------- */

  var editingId = null;   // null = 新建
  var editorTodos = [];   // 编辑中的待办副本

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

    save();
    closeEditor();
    render(date); // 回到刚写的那一页
  }

  function deleteEntry() {
    if (!editingId) return;
    if (!confirm('删除这条记录？')) return;
    entries = entries.filter(function (x) { return x.id !== editingId; });
    save();
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

  document.getElementById('prev-btn').addEventListener('click', function () { flipTo(current - 1); });
  document.getElementById('next-btn').addEventListener('click', function () { flipTo(current + 1); });

  // 左右滑动翻页
  var stage = document.getElementById('stage');
  var touchX = null, touchY = null;
  stage.addEventListener('touchstart', function (ev) {
    if (ev.touches.length !== 1) return;
    touchX = ev.touches[0].clientX;
    touchY = ev.touches[0].clientY;
  }, { passive: true });
  stage.addEventListener('touchend', function (ev) {
    if (touchX == null) return;
    var dx = ev.changedTouches[0].clientX - touchX;
    var dy = ev.changedTouches[0].clientY - touchY;
    touchX = touchY = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) flipTo(current + 1); // 左滑 → 更早
      else flipTo(current - 1);        // 右滑 → 更新
    }
  }, { passive: true });

  render();
})();
