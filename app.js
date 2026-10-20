/* freecoursee — السلوك: الوضع الليلي، البحث والتصفية، التقدم، الاختبار الاختياري */
(function () {
  'use strict';
  var root = document.documentElement;

  function get(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function doneList() { try { return JSON.parse(get('fc-done', '[]')) || []; } catch (e) { return []; } }
  function markDone(id, on) {
    var l = doneList().filter(function (x) { return x !== id; });
    if (on) l.push(id);
    set('fc-done', JSON.stringify(l));
  }

  /* الوضع الليلي */
  var themeBtn = document.getElementById('themeBtn');
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var cur = root.getAttribute('data-theme');
      if (!cur) cur = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      var next = cur === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      set('fc-theme', next);
    });
  }

  /* شريط تقدم القراءة */
  var bar = document.getElementById('progress');
  if (bar && document.querySelector('.article')) {
    window.addEventListener('scroll', function () {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      bar.style.width = (max > 0 ? Math.min(100, (h.scrollTop / max) * 100) : 0) + '%';
    }, { passive: true });
  }

  /* الصفحة الرئيسية: بحث + تصنيفات + شارة الإنهاء */
  var grid = document.getElementById('grid');
  if (grid) {
    var cards = Array.prototype.slice.call(grid.querySelectorAll('.card'));
    var q = document.getElementById('q');
    var chips = Array.prototype.slice.call(document.querySelectorAll('.chip'));
    var empty = document.getElementById('empty');
    var cat = 'all';
    var done = doneList();
    cards.forEach(function (c) {
      if (done.indexOf(c.getAttribute('data-id')) > -1) c.querySelector('.done-badge').hidden = false;
    });
    function apply() {
      var term = (q.value || '').trim().toLowerCase();
      var shown = 0;
      cards.forEach(function (c) {
        var okCat = cat === 'all' || c.getAttribute('data-cat') === cat;
        var okTxt = !term || c.getAttribute('data-search').toLowerCase().indexOf(term) > -1;
        c.hidden = !(okCat && okTxt);
        if (!c.hidden) shown++;
      });
      empty.hidden = shown > 0;
    }
    q.addEventListener('input', apply);
    chips.forEach(function (b) {
      b.addEventListener('click', function () {
        chips.forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        cat = b.getAttribute('data-cat');
        apply();
      });
    });
  }

  /* صفحة الكورس */
  var article = document.querySelector('.article');
  if (article) {
    var id = article.getAttribute('data-course');
    var doneBtn = document.getElementById('doneBtn');
    function paintDone() {
      var on = doneList().indexOf(id) > -1;
      doneBtn.classList.toggle('on', on);
      doneBtn.textContent = on ? 'تم الإنهاء ✓' : 'تمت قراءة الكورس ✓';
    }
    if (doneBtn) {
      paintDone();
      doneBtn.addEventListener('click', function () {
        markDone(id, doneList().indexOf(id) === -1);
        paintDone();
      });
    }

    var startBtn = document.getElementById('startQuiz');
    var box = document.getElementById('quizBox');
    if (startBtn && box && window.QUIZ) {
      startBtn.addEventListener('click', function () {
        render();
        box.hidden = false;
        startBtn.textContent = 'إعادة الاختبار';
        box.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function render() {
    var box = document.getElementById('quizBox');
    var data = window.QUIZ;
    box.innerHTML = '';
    box.appendChild(el('h2', '', 'اختبر نفسك'));
    box.appendChild(el('p', 'muted', 'اختبار اختياري من ' + data.length + ' أسئلة. اختر إجابة لكل سؤال ثم اضغط «تحقق من إجاباتي».'));

    var form = el('form');
    data.forEach(function (item, i) {
      var q = el('div', 'q');
      var fs = el('fieldset');
      fs.appendChild(el('legend', '', (i + 1) + '. ' + item.q));
      item.o.forEach(function (opt, j) {
        var lab = el('label', 'opt');
        var inp = document.createElement('input');
        inp.type = 'radio';
        inp.name = 'q' + i;
        inp.value = j;
        lab.appendChild(inp);
        lab.appendChild(el('span', 't', opt));
        fs.appendChild(lab);
      });
      fs.appendChild(el('p', 'exp'));
      fs.lastChild.hidden = true;
      q.appendChild(fs);
      form.appendChild(q);
    });

    var submit = el('button', 'btn', 'تحقق من إجاباتي');
    submit.type = 'submit';
    var res = el('div', 'result');
    res.hidden = true;
    res.setAttribute('role', 'status');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var score = 0;
      var qs = form.querySelectorAll('.q');
      data.forEach(function (item, i) {
        var chosen = form.querySelector('input[name="q' + i + '"]:checked');
        var labels = qs[i].querySelectorAll('.opt');
        labels.forEach(function (l) { l.classList.remove('correct', 'wrong'); });
        labels[item.a].classList.add('correct');
        var ok = chosen && Number(chosen.value) === item.a;
        if (ok) score++;
        else if (chosen) labels[Number(chosen.value)].classList.add('wrong');
        var exp = qs[i].querySelector('.exp');
        exp.textContent = (ok ? 'إجابة صحيحة. ' : 'الإجابة الصحيحة موضحة بالأخضر. ') + item.e;
        exp.hidden = false;
        qs[i].querySelectorAll('input').forEach(function (x) { x.disabled = true; });
      });
      var msg = score === data.length ? 'ممتاز! أتقنت الكورس.' :
                score >= Math.ceil(data.length * 0.6) ? 'نتيجة جيدة، راجع الأسئلة التي أخطأت فيها.' :
                'لا بأس، أعد قراءة الدروس ثم حاول مرة ثانية.';
      res.innerHTML = '';
      res.appendChild(el('b', '', score + ' / ' + data.length));
      res.appendChild(el('p', '', msg));
      var again = el('button', 'btn ghost', 'إعادة الاختبار');
      again.type = 'button';
      again.addEventListener('click', function () { render(); box.scrollIntoView({ behavior: 'smooth' }); });
      res.appendChild(again);
      res.hidden = false;
      submit.hidden = true;
      if (score >= Math.ceil(data.length * 0.6)) {
        var id = document.querySelector('.article').getAttribute('data-course');
        markDone(id, true);
        var db = document.getElementById('doneBtn');
        if (db) { db.classList.add('on'); db.textContent = 'تم الإنهاء ✓'; }
      }
      res.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    form.appendChild(submit);
    form.appendChild(res);
    box.appendChild(form);
  }
})();
