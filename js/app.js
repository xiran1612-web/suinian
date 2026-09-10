/* app.js — 渲染收纳流：按时间正序往下长，同一天的归到一起。 */
(function () {
  'use strict';

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

  function render() {
    var flow = document.getElementById('flow');
    flow.innerHTML = '';

    // 按日期分组，保持录入顺序（正序）
    var groups = [];
    SNIPPETS.forEach(function (s) {
      var last = groups[groups.length - 1];
      if (!last || last.time !== s.time) {
        last = { time: s.time, items: [] };
        groups.push(last);
      }
      last.items.push(s);
    });

    groups.forEach(function (g) {
      var day = el('div', 'day');
      day.appendChild(el('div', 'day-label', fmtDate(g.time)));

      g.items.forEach(function (s) {
        var item = el('div', 'item');
        item.appendChild(el('p', 'item-text', s.text));
        day.appendChild(item);
      });

      flow.appendChild(day);
    });

    var count = document.getElementById('count');
    count.textContent = '已收纳 ' + SNIPPETS.length + ' 段';
  }

  render();
})();
