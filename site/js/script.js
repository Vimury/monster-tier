/* ================= СИСТЕМА ОБНОВЛЕНИЙ ================= */
async function checkForUpdates() {
  try {
    const response = await fetch('../data/updates.json');
    if (!response.ok) return;
    
    const updatesData = await response.json();
    const savedVersion = localStorage.getItem('monster-data-version') || '0.0';
    
    // Находим все обновления между сохранённой и текущей версией
    const pendingUpdates = updatesData.updates.filter(u => 
      compareVersions(u.version, savedVersion) > 0
    );
    
    if (pendingUpdates.length === 0) return;
    
    console.log(`Найдено ${pendingUpdates.length} обновлений. Применяем...`);
    
    // Применяем каждое обновление
    for (const update of pendingUpdates) {
      applyUpdate(update);
    }
    
    // Сохраняем новую версию
    localStorage.setItem('monster-data-version', updatesData.currentVersion);
    console.log('Обновления применены успешно!');
    
  } catch (error) {
    console.warn('Не удалось проверить обновления:', error);
  }
}

function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}

function applyUpdate(update) {
  for (const change of update.changes) {
    if (change.type === 'add') {
      // Добавляем новый напиток, если его ещё нет
      if (!DRINKS.find(d => d.id === change.drink.id)) {
        DRINKS.push(change.drink);
        console.log(`Добавлен: ${change.drink.shortName}`);
      }
    } else if (change.type === 'update') {
      // Обновляем поля существующего напитка
      const drink = DRINKS.find(d => d.id === change.id);
      if (drink) {
        Object.assign(drink, change.fields);
        console.log(`Обновлён: ${drink.shortName}`);
      }
    } else if (change.type === 'remove') {
      // Удаляем напиток (опционально)
      const idx = DRINKS.findIndex(d => d.id === change.id);
      if (idx > -1) {
        DRINKS.splice(idx, 1);
        console.log(`Удалён: ${change.id}`);
      }
    }
  }
}

/* ================= ЗАГРУЗКА/СОХРАНЕНИЕ (обновлено) ================= */
function loadState() {
  try {
    // Загружаем пользовательские правки (тиры, приоритеты)
    const state = localStorage.getItem('monster-tier-state');
    if (state) {
      JSON.parse(state).forEach(({ id, tier, priority }) => {
        const d = DRINKS.find(x => x.id === id);
        if (d) {
          d.tier = tier;
          d.priority = priority;
        }
      });
    }
    
    // Загружаем правки полей напитков
    const edits = localStorage.getItem('monster-drinks-edits');
    if (edits) {
      const parsed = JSON.parse(edits);
      Object.entries(parsed).forEach(([id, changes]) => {
        const d = DRINKS.find(x => x.id === id);
        if (d) Object.assign(d, changes);
      });
    }
    
    // Загружаем добавленные напитки
    const custom = localStorage.getItem('monster-drinks-custom');
    if (custom) {
      const parsed = JSON.parse(custom);
      parsed.forEach(d => {
        if (!DRINKS.find(x => x.id === d.id)) DRINKS.push(d);
      });
    }
  } catch (e) {
    console.warn('Не удалось загрузить состояние', e);
  }
}

function saveTierState() {
  const state = DRINKS.map(d => ({ id: d.id, tier: d.tier, priority: d.priority }));
  localStorage.setItem('monster-tier-state', JSON.stringify(state));
}

function saveDrinkEdits(id) {
  const d = DRINKS.find(x => x.id === id);
  if (!d) return;
  try {
    const edits = JSON.parse(localStorage.getItem('monster-drinks-edits') || '{}');
    edits[id] = {
      name: d.name, shortName: d.shortName, canName: d.canName, line: d.line,
      tagline: d.tagline, short: d.short, tags: d.tags,
      caffeine: d.caffeine, sugar: d.sugar, kcal: d.kcal, volume: d.volume,
      about: d.about, pros: d.pros, cons: d.cons, verdict: d.verdict,
      profile: d.profile, colors: d.colors, glow: d.glow, score: d.score, year: d.year
    };
    localStorage.setItem('monster-drinks-edits', JSON.stringify(edits));
  } catch (e) {
    console.warn('Не удалось сохранить правки', e);
  }
}

function saveCustomDrinks() {
  const baseIds = new Set(window.BASE_DRINK_IDS || []);
  const custom = DRINKS.filter(d => !baseIds.has(d.id));
  localStorage.setItem('monster-drinks-custom', JSON.stringify(custom));
}

const tierOf = id => TIERS.find(t => t.id === id);
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

/* ================= АВТОРИЗАЦИЯ ================= */
const ADMIN_CREDENTIALS = { login: 'admin', password: '123454321' };
let isAdmin = sessionStorage.getItem('monster-admin') === '1';

function applyAdminState(){
  document.body.classList.toggle('admin', isAdmin);
  $$('#authBtn').forEach(btn => {
    btn.textContent = isAdmin ? '🔓 Выйти' : '🔒 Войти';
  });
  $$('[id="addDrink"]').forEach(el => el.hidden = !isAdmin);
  $$('[id="editPageBtn"]').forEach(el => el.hidden = !isAdmin);
  $$('.admin-only').forEach(el => el.hidden = !isAdmin);
}

function openLoginModal(){
  $('#loginForm').reset();
  $('#loginError').hidden = true;
  $('#loginModal').hidden = false;
  setTimeout(() => $('input[name="login"]', $('#loginForm')).focus(), 50);
}

function closeLoginModal(){
  $('#loginModal').hidden = true;
}

function handleLogin(e){
  e.preventDefault();
  const form = e.target;
  const login = form.login.value.trim();
  const password = form.password.value;
  
  if(login === ADMIN_CREDENTIALS.login && password === ADMIN_CREDENTIALS.password){
    isAdmin = true;
    sessionStorage.setItem('monster-admin', '1');
    applyAdminState();
    closeLoginModal();
    // Перерисовываем текущую страницу
    if(document.body.dataset.page === 'drink') initDrink();
    else renderAll();
  } else {
    $('#loginError').hidden = false;
  }
}

function handleLogout(){
  isAdmin = false;
  sessionStorage.removeItem('monster-admin');
  applyAdminState();
  if(document.body.dataset.page === 'drink') initDrink();
  else renderAll();
}

function initAuthButtons(){
  $$('#authBtn').forEach(btn => {
    btn.onclick = () => isAdmin ? handleLogout() : openLoginModal();
  });
  $$('#cancelLogin').forEach(btn => btn.onclick = closeLoginModal);
  $$('#loginForm').forEach(form => form.onsubmit = handleLogin);
}

/* ================= ЗАГРУЗКА/СОХРАНЕНИЕ ================= */
function loadState(){
  try {
    // Загружаем правки напитков
    const edits = localStorage.getItem('monster-drinks-edits');
    if(edits){
      const parsed = JSON.parse(edits);
      Object.entries(parsed).forEach(([id, changes]) => {
        const d = DRINKS.find(x => x.id === id);
        if(d) Object.assign(d, changes);
      });
    }
    // Загружаем новые напитки
    const custom = localStorage.getItem('monster-drinks-custom');
    if(custom){
      const parsed = JSON.parse(custom);
      parsed.forEach(d => {
        if(!DRINKS.find(x => x.id === d.id)) DRINKS.push(d);
      });
    }
    // Загружаем тир и приоритеты
    const state = localStorage.getItem('monster-tier-state');
    if(state){
      JSON.parse(state).forEach(({id, tier, priority}) => {
        const d = DRINKS.find(x => x.id === id);
        if(d){ d.tier = tier; d.priority = priority; }
      });
    }
  } catch(e){ console.warn('Не удалось загрузить состояние', e); }
}

function saveTierState(){
  const state = DRINKS.map(d => ({id:d.id, tier:d.tier, priority:d.priority}));
  localStorage.setItem('monster-tier-state', JSON.stringify(state));
}

function saveDrinkEdits(id){
  const d = DRINKS.find(x => x.id === id);
  if(!d) return;
  try {
    const edits = JSON.parse(localStorage.getItem('monster-drinks-edits') || '{}');
    edits[id] = {
      name:d.name, shortName:d.shortName, canName:d.canName, line:d.line,
      tagline:d.tagline, short:d.short, tags:d.tags,
      caffeine:d.caffeine, sugar:d.sugar, kcal:d.kcal, volume:d.volume,
      about:d.about, pros:d.pros, cons:d.cons, verdict:d.verdict,
      profile:d.profile, colors:d.colors, glow:d.glow, score:d.score, year:d.year
    };
    localStorage.setItem('monster-drinks-edits', JSON.stringify(edits));
  } catch(e){ console.warn('Не удалось сохранить правки', e); }
}

function saveCustomDrinks(){
  const baseIds = new Set(window.BASE_DRINK_IDS || []);
  const custom = DRINKS.filter(d => !baseIds.has(d.id));
  localStorage.setItem('monster-drinks-custom', JSON.stringify(custom));
}

/* ================= СОРТИРОВКА ================= */
function sortDrinks(drinks){
  const prio = {'+':0, '':1, '-':2};
  return drinks.slice().sort((a,b) => {
    const pa = prio[a.priority] ?? 1;
    const pb = prio[b.priority] ?? 1;
    if(pa !== pb) return pa - pb;
    return b.score - a.score;
  });
}

/* ================= РЕНДЕР СПИСКА (вызывается при загрузке и обновлении) ================= */
function initList() {
  const tierlist = $('#tierlist');
  if (!tierlist) return;

  // 1. Рендерим основные тиры
  tierlist.innerHTML = TIERS.map(t => {
    const items = sortDrinks(DRINKS.filter(d => d.tier === t.id));
    return `<div class="row" style="--c:${t.color}" data-tier="${t.id}">
      <div class="row__label">
        <span class="row__grade">${t.id}</span>
        <span class="row__cap">${t.cap}</span>
      </div>
      <div class="row__items" data-drop-zone="${t.id}">
        ${items.map(cardHTML).join('')}
        <span class="row__none" hidden>Пусто по фильтру</span>
      </div>
    </div>`;
  }).join('');

  // 2. Рендерим секцию "Неоцененные" (без дублирования при повторных вызовах)
  let unratedSection = document.querySelector('.unrated');
  const unrated = sortDrinks(DRINKS.filter(d => d.tier === 'UNRATED'));
  
  if (unrated.length > 0) {
    if (!unratedSection) {
      unratedSection = document.createElement('section');
      unratedSection.className = 'unrated';
      tierlist.parentNode.insertBefore(unratedSection, tierlist.nextSibling);
    }
    unratedSection.innerHTML = `
      <h2 class="unrated__title">⚠️ Неоцененные <span class="unrated__count">${unrated.length}</span></h2>
      <div class="unrated__grid" data-drop-zone="UNRATED">
        ${unrated.map(cardHTML).join('')}
      </div>
    `;
  } else {
    if (unratedSection) unratedSection.remove();
  }

  // 3. Тултипы для карточек
  $$('.card').forEach(card => {
    const tip = $('.card__tip', card);
    if (!tip) return;
    
    const fix = () => {
      tip.style.setProperty('--shift', '0px');
      const r = tip.getBoundingClientRect();
      const pad = 10;
      let s = 0;
      if (r.left < pad) s = pad - r.left;
      else if (r.right > innerWidth - pad) s = (innerWidth - pad) - r.right;
      tip.style.setProperty('--shift', s + 'px');
    };
    
    card.addEventListener('mouseenter', fix);
    card.addEventListener('focus', fix);
  });

  // 4. Drag & Drop (пересоздаём для новых элементов DOM)
  if (isAdmin) {
    initDragDrop();
  }

  // 5. Обновляем счетчик
  const counter = $('#counter');
  if (counter) {
    const total = DRINKS.filter(d => d.tier !== 'UNRATED').length;
    const unratedCount = DRINKS.filter(d => d.tier === 'UNRATED').length;
    counter.textContent = `Оценено: ${total} · Неоценено: ${unratedCount}`;
  }
}

/* ================= СОБЫТИЯ СПИСКА (вызывается ОДИН РАЗ при старте) ================= */
function initListEvents() {
  const tierlist = $('#tierlist');
  if (!tierlist) return;

  // Делегирование: клик по приоритетам (работает даже после перерисовки)
  tierlist.addEventListener('click', e => {
    if (!isAdmin) return;
    const btn = e.target.closest('.card__prio');
    if (!btn) return;
    
    e.preventDefault();
    e.stopPropagation();
    const card = btn.closest('.card');
    const id = card.dataset.id;
    const d = DRINKS.find(x => x.id === id);
    if (d) {
      const cycle = { '': '+', '+': '-', '-': '' };
      d.priority = cycle[d.priority] || '';
      saveTierState();
      renderAll();
    }
  });

  // Делегирование: двойной клик по карточке для редактирования
  tierlist.addEventListener('dblclick', e => {
    if (!isAdmin) return;
    const card = e.target.closest('.card');
    if (!card) return;
    if (e.target.closest('.card__prio')) return; // Игнорируем, если клик был по кнопке приоритета
    
    e.preventDefault();
    e.stopPropagation();
    openDrinkEditor(card.dataset.id);
  });

  // Кнопка добавления напитка
  const addBtn = $('#addDrink');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      if (isAdmin) openDrinkEditor(null);
    });
  }

  // Поиск
  const searchInput = $('#search');
  if (searchInput) {
    searchInput.addEventListener('input', e => {
      const q = e.target.value.trim().toLowerCase();
      let shown = 0;
      
      $$('.row, .unrated').forEach(row => {
        let inRow = 0;
        $$('.card', row).forEach(card => {
          const d = DRINKS.find(x => x.id === card.dataset.id);
          if (!d) return;
          const hay = (d.name + ' ' + d.tagline + ' ' + d.short + ' ' + d.tags.join(' ') + ' ' + d.tier).toLowerCase();
          const ok = !q || hay.includes(q);
          card.classList.toggle('dim', !ok);
          if (ok) { inRow++; shown++; }
        });
        const none = $('.row__none', row);
        if (none) none.hidden = inRow > 0;
      });
      
      const empty = $('#empty');
      if (empty) empty.hidden = shown > 0;
      
      const counter = $('#counter');
      const total = DRINKS.filter(d => d.tier !== 'UNRATED').length;
      const unratedCount = DRINKS.filter(d => d.tier === 'UNRATED').length;
      if (counter) {
        counter.textContent = q ? `Найдено: ${shown}` : `Оценено: ${total} · Неоценено: ${unratedCount}`;
      }
    });
  }

  // Случайный вкус
  const randomBtn = $('#random');
  if (randomBtn) {
    randomBtn.addEventListener('click', () => {
      const pool = DRINKS.filter(d => d.tier !== 'UNRATED');
      if (pool.length > 0) {
        const d = pool[Math.floor(Math.random() * pool.length)];
        location.href = 'drink.html?id=' + d.id;
      }
    });
  }
}

/* ================= ПЕРЕОТРИСОВКА ================= */
function renderAll() {
  // Просто вызываем initList, так как события уже навешаны через делегирование
  initList();
}

function cardHTML(d){
  const t = tierOf(d.tier);
  const prioLabel = d.priority === '+' ? '▲' : d.priority === '-' ? '▼' : '';
  const prioClass = d.priority === '+' ? 'card__prio--plus' : d.priority === '-' ? 'card__prio--minus' : '';
  const draggable = isAdmin ? 'true' : 'false';
  
  // Расчёт цвета ценника: 170 = зелёный (120), 500 = красный (0)
  const price = d.price || 170;
  const ratio = Math.max(0, Math.min(1, (price - 170) / (500 - 170)));
  const hue = Math.round(120 * (1 - ratio));
  const priceColor = `hsl(${hue}, 85%, 42%)`;
  
  // Маппинг линейки → CSS-класс для таблички серии
  const seriesClass = {
    'ULTRA': 'card__series--ultra',
    'ORIGINAL': 'card__series--original',
    'JUICE': 'card__series--juice',
    'JAVA': 'card__series--java',
    'REHAB': 'card__series--rehab',
    'NITRO': 'card__series--nitro',
    'MULE': 'card__series--mule'
  }[d.line] || 'card__series--default';

  return `<a class="card" data-id="${d.id}" href="drink.html?id=${d.id}" draggable="${draggable}"
             style="--glow:${d.glow};--tc:${t?.color || '#888'}" aria-label="${d.name} — подробнее">
    <span class="card__price" style="background:${priceColor}">${price}</span>
    <span class="card__series ${seriesClass}">${d.line}</span>
    <span class="card__can">${canArt(d)}</span>
    <span class="card__name">${displayShortName(d)}</span>
    <span class="card__prio ${prioClass}" title="Приоритет: ${d.priority || 'нет'}">${prioLabel}</span>
    <span class="card__tip" role="tooltip">
      <span class="tip__head"><span class="tip__tier">${d.tier}</span><b>${d.name}</b></span>
      <p>${d.short}</p>
      <span class="tip__tags">${d.tags.map(x => `<i>${x}</i>`).join('')}</span>
      <span class="tip__more">ПОДРОБНЫЙ РАЗБОР →</span>
    </span>
  </a>`;
}

/* ================= DRAG & DROP ================= */
function initDragDrop() {
  $$('.card').forEach(card => {
    card.addEventListener('dragstart', e => {
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', card.dataset.id);
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      $$('.drop-target').forEach(el => el.classList.remove('drop-target'));
    });
  });

  $$('[data-drop-zone]').forEach(zone => {
    zone.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      zone.classList.add('drop-target');
    });
    zone.addEventListener('dragleave', e => {
      if (!zone.contains(e.relatedTarget)) {
        zone.classList.remove('drop-target');
      }
    });
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('drop-target');
      const id = e.dataTransfer.getData('text/plain');
      const newTier = zone.dataset.dropZone;
      const d = DRINKS.find(x => x.id === id);
      if (d && d.tier !== newTier) {
        d.tier = newTier;
        saveTierState();
        renderAll();
      }
    });
  });
}

/* ================= РЕДАКТОР НАПИТКА (с тирлиста) ================= */
function openDrinkEditor(id){
  const isNew = !id;
  const d = isNew ? createEmptyDrink() : DRINKS.find(x => x.id === id);
  
  const modal = $('#editModal');
  const title = $('#editTitle');
  const deleteBtn = $('#deleteDrink');
  const form = $('#editForm');
  
  if(!modal || !title || !form) return;
  
  title.textContent = isNew ? '+ Добавить напиток' : `✏️ ${d.shortName}`;
  
  if(deleteBtn){
    deleteBtn.hidden = isNew;
    deleteBtn.onclick = isNew ? null : () => {
      if(!confirm(`Удалить "${d.shortName}"?`)) return;
      const idx = DRINKS.findIndex(x => x.id === id);
      if(idx > -1) DRINKS.splice(idx, 1);
      try {
        const edits = JSON.parse(localStorage.getItem('monster-drinks-edits') || '{}');
        delete edits[id];
        localStorage.setItem('monster-drinks-edits', JSON.stringify(edits));
      } catch(e){}
      saveCustomDrinks();
      saveTierState();
      closeEditModal();
      renderAll();
    };
  }
  
  form.innerHTML = buildDrinkFormHTML(d);
  
  form.onsubmit = e => {
    e.preventDefault();
    const updated = readDrinkForm(form, d);
    if(isNew){
      DRINKS.push(updated);
      saveCustomDrinks();
    } else {
      Object.assign(d, updated);
      saveDrinkEdits(id);
    }
    saveTierState();
    closeEditModal();
    renderAll();
  };
  
  modal.hidden = false;
}

function createEmptyDrink(){
  return {
    id:'drink-' + Date.now(),
    tier:'UNRATED', priority:'', score:5,
    name:'', shortName:'', canName:'', line:'ULTRA',
    tagline:'', short:'', tags:[],
    caffeine:'', sugar:'', kcal:'', volume:'500 мл', year:new Date().getFullYear().toString(),
    about:[], pros:[], cons:[], verdict:'',
    colors:{body:'#1a1d23',body2:'#000000',accent:'#7bff2a',ink:'#ffffff'},
    glow:'#7bff2a',
    profile:{Сладость:5,Кислотность:5,Газированность:5,Фруктовость:5,Послевкусие:5}
  };
}

function buildDrinkFormHTML(d){
  return `
    <div class="form-row">
      <div class="form-group">
        <label>ID (уникальный)</label>
        <input type="text" name="id" value="${d.id}" required ${d.id.startsWith('drink-') ? '' : 'readonly'}>
      </div>
      <div class="form-group">
        <label>Тир</label>
        <select name="tier">
          ${TIERS.map(t => `<option value="${t.id}" ${d.tier===t.id?'selected':''}>${t.id} — ${t.cap}</option>`).join('')}
          <option value="UNRATED" ${d.tier==='UNRATED'?'selected':''}>Неоценен</option>
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Полное название</label>
        <input type="text" name="name" value="${escapeHtml(d.name)}" required>
      </div>
      <div class="form-group">
        <label>Краткое название</label>
        <input type="text" name="shortName" value="${escapeHtml(d.shortName)}" required>
      </div>
    </div>
    <div class="form-group">
      <label>Название на банке</label>
      <input type="text" name="canName" value="${escapeHtml(d.canName)}" required>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Линейка</label>
        <select name="line">
          ${['ULTRA','JUICE','ORIGINAL','REHAB','JAVA','NITRO','MULE'].map(l => 
            `<option value="${l}" ${d.line===l?'selected':''}>${l}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Оценка (0-10)</label>
        <input type="number" name="score" min="0" max="10" step="0.1" value="${d.score}" required>
      </div>
    </div>
    <div class="form-group">
      <label>Слоган</label>
      <input type="text" name="tagline" value="${escapeHtml(d.tagline)}">
    </div>
    <div class="form-group">
      <label>Краткое описание</label>
      <textarea name="short" required>${escapeHtml(d.short)}</textarea>
    </div>
    <div class="form-group">
      <label>Теги (через запятую)</label>
      <input type="text" name="tags" value="${escapeHtml(d.tags.join(', '))}">
    </div>
    <div class="form-row">
      <div class="form-group"><label>Кофеин</label><input type="text" name="caffeine" value="${escapeHtml(d.caffeine)}"></div>
      <div class="form-group"><label>Сахар</label><input type="text" name="sugar" value="${escapeHtml(d.sugar)}"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Калории</label><input type="text" name="kcal" value="${escapeHtml(d.kcal)}"></div>
      <div class="form-group"><label>Объём</label><input type="text" name="volume" value="${escapeHtml(d.volume)}"></div>
    </div>
    <div class="form-group">
      <label>Год</label>
      <input type="text" name="year" value="${escapeHtml(d.year)}">
    </div>
    <div class="form-group">
      <label>Приоритет</label>
      <select name="priority">
        <option value="" ${!d.priority?'selected':''}>Нет</option>
        <option value="+" ${d.priority==='+'?'selected':''}>+ (высокий)</option>
        <option value="-" ${d.priority==='-'?'selected':''}>- (низкий)</option>
      </select>
    </div>
    <div class="form-group">
      <label>Подробное описание (каждый абзац с новой строки)</label>
      <textarea name="about" rows="4">${escapeHtml(d.about.join('\n'))}</textarea>
    </div>
    <div class="form-group">
      <label>Плюсы (каждый с новой строки)</label>
      <textarea name="pros" rows="3">${escapeHtml(d.pros.join('\n'))}</textarea>
    </div>
    <div class="form-group">
      <label>Минусы (каждый с новой строки)</label>
      <textarea name="cons" rows="3">${escapeHtml(d.cons.join('\n'))}</textarea>
    </div>
    <div class="form-group">
      <label>Вердикт</label>
      <textarea name="verdict" rows="2">${escapeHtml(d.verdict)}</textarea>
    </div>
    <div class="form-group">
      <label>Цвета банки</label>
      <div class="form-row">
        <div class="form-group"><label style="font-size:11px">Основной</label><input type="color" name="body" value="${d.colors.body}"></div>
        <div class="form-group"><label style="font-size:11px">Второй</label><input type="color" name="body2" value="${d.colors.body2}"></div>
        <div class="form-group"><label style="font-size:11px">Акцент</label><input type="color" name="accent" value="${d.colors.accent}"></div>
        <div class="form-group"><label style="font-size:11px">Текст</label><input type="color" name="ink" value="${d.colors.ink}"></div>
      </div>
    </div>
    <div class="form-group">
      <label>Цвет свечения</label>
      <input type="color" name="glow" value="${d.glow}">
    </div>
    <div class="form-group">
      <label>Профиль вкуса (1-10)</label>
      <div class="form-row">
        ${Object.entries(d.profile).map(([k,v]) => `
          <div class="form-group">
            <label style="font-size:11px">${k}</label>
            <input type="number" name="profile-${k}" min="1" max="10" value="${v}">
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function fillDrinkForm(form, d){
  // Уже заполнено в buildDrinkFormHTML
}

function readDrinkForm(form, d){
  const profile = {};
  Object.keys(d.profile).forEach(k => {
    profile[k] = parseInt(form[`profile-${k}`].value) || 5;
  });
  return {
    id: form.id.value.trim() || d.id,
    tier: form.tier.value,
    priority: form.priority.value,
    score: parseFloat(form.score.value) || 0,
    name: form.name.value.trim(),
    shortName: form.shortName.value.trim(),
    canName: form.canName.value.trim(),
    line: form.line.value,
    year: form.year.value.trim(),
    tagline: form.tagline.value.trim(),
    short: form.short.value.trim(),
    tags: form.tags.value.split(',').map(t => t.trim()).filter(Boolean),
    caffeine: form.caffeine.value.trim(),
    sugar: form.sugar.value.trim(),
    kcal: form.kcal.value.trim(),
    volume: form.volume.value.trim(),
    about: form.about.value.split('\n').map(s => s.trim()).filter(Boolean),
    pros: form.pros.value.split('\n').map(s => s.trim()).filter(Boolean),
    cons: form.cons.value.split('\n').map(s => s.trim()).filter(Boolean),
    verdict: form.verdict.value.trim(),
    colors:{
      body: form.body.value,
      body2: form.body2.value,
      accent: form.accent.value,
      ink: form.ink.value
    },
    glow: form.glow.value,
    profile
  };
}

function closeEditModal(){
  $('#editModal').hidden = true;
}

function escapeHtml(s){
  return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* ================= ОТОБРАЖАЕМОЕ ИМЯ ДЛЯ КАРТОЧКИ ================= */
function displayShortName(d){
  const name = d.shortName;
  const parts = name.split(/\s+/).filter(Boolean);
  if(parts.length < 2) return name;
  
  const seriesPrefixes = ['ULTRA', 'JUICE', 'JAVA', 'REHAB', 'NITRO', 'MULE', 'ORIGINAL'];
  const firstUpper = parts[0].toUpperCase();
  
  if(seriesPrefixes.includes(firstUpper)){
    const withoutPrefix = parts.slice(1).join(' ');
    // Убираем только если после удаления остаётся 2+ слова
    if(withoutPrefix.split(/\s+/).filter(Boolean).length > 1){
      return withoutPrefix;
    }
  }
  return name;
}

/* ================= СТРАНИЦА НАПИТКА ================= */
function initDrink(){
  const id = new URLSearchParams(location.search).get('id');
  const i = DRINKS.findIndex(d => d.id === id);
  const box = $('#detail');

  if(i < 0){
    box.innerHTML = `<div class="err"><h1>Такого монстра нет 🫥</h1>
      <p class="hero__sub">Возможно, вкус снят с производства или ссылка битая.</p>
      <a class="btn" href="index.html">← Вернуться к тирлисту</a></div>`;
    return;
  }

  const d = DRINKS[i], t = tierOf(d.tier);
  const prev = DRINKS[(i - 1 + DRINKS.length) % DRINKS.length];
  const next = DRINKS[(i + 1) % DRINKS.length];
  const similar = DRINKS
    .filter(x => x.id !== d.id && (x.line === d.line || x.tier === d.tier))
    .sort((a,b) => Math.abs(a.score - d.score) - Math.abs(b.score - d.score))
    .slice(0,5);

  document.title = `${d.name} — ${d.tier}-тир | Monster Tier`;

  box.innerHTML = `
  <a class="back" href="index.html">← Назад к тирлисту</a>

  <section class="dhero" style="--glow:${d.glow};--tc:${t?.color || '#888'}">
    <div class="dcan">${canArt(d)}</div>
    <div class="dinfo">
      <div class="badges">
        <span class="pill pill--tier">${d.tier}-ТИР · ${t?.cap || 'Неоценен'}</span>
        <span class="pill">${d.line}</span>
        <span class="pill">с ${d.year}</span>
      </div>
      <h1 data-edit="name">${escapeHtml(d.name)}</h1>
      <p class="tagline" data-edit="tagline">${escapeHtml(d.tagline)}</p>
      <p class="lead" data-edit="short">${escapeHtml(d.short)}</p>
      <div class="score" data-edit="score"><b>${d.score.toFixed(1)}</b><span>/ 10 — оценка редакции тирлиста</span></div>
    </div>
  </section>

  <div class="stats" data-edit="stats">
    <div class="stat"><u>Кофеин</u><b>${escapeHtml(d.caffeine)}</b></div>
    <div class="stat"><u>Сахар</u><b>${escapeHtml(d.sugar)}</b></div>
    <div class="stat"><u>Калории</u><b>${escapeHtml(d.kcal)}</b></div>
    <div class="stat"><u>Объём</u><b>${escapeHtml(d.volume)}</b></div>
  </div>

  <div class="grid2">
    <div class="box" data-edit="about">
      <h2>Вкус подробно</h2>
      ${d.about.map(p => `<p>${escapeHtml(p)}</p>`).join('')}
    </div>
    <div class="box" data-edit="profile" style="--glow:${d.glow}">
      <h2>Профиль вкуса</h2>
      ${Object.entries(d.profile).map(([k,v]) => `
        <div class="bar">
          <div class="bar__top"><span>${k}</span><span>${v}/10</span></div>
          <div class="bar__track"><div class="bar__fill" data-v="${v*10}"></div></div>
        </div>`).join('')}
    </div>
  </div>

  <div class="lists">
    <div class="box pros" data-edit="pros"><h2>Плюсы</h2><ul>${d.pros.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul></div>
    <div class="box cons" data-edit="cons"><h2>Минусы</h2><ul>${d.cons.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul></div>
  </div>

  <blockquote class="verdict" data-edit="verdict" style="--glow:${d.glow}">
    <small>ВЕРДИКТ</small>${escapeHtml(d.verdict)}
  </blockquote>

  <section class="similar">
    <h2>Похоже по духу</h2>
    <div class="simgrid">${similar.map(cardHTML).join('')}</div>
  </section>

  <nav class="pager">
    <a href="drink.html?id=${prev.id}"><small>← Предыдущий</small>${prev.shortName}</a>
    <a href="drink.html?id=${next.id}" style="text-align:right"><small>Следующий →</small>${next.shortName}</a>
  </nav>`;

  requestAnimationFrame(() => {
    box.querySelectorAll('.bar__fill').forEach((el, k) =>
      setTimeout(() => el.style.width = el.dataset.v + '%', 80 + k * 90));
  });

  box.querySelectorAll('.card').forEach(card => {
    const tip = $('.card__tip', card);
    card.addEventListener('mouseenter', () => {
      tip.style.setProperty('--shift','0px');
      const r = tip.getBoundingClientRect();
      let s = 0;
      if(r.left < 10) s = 10 - r.left;
      else if(r.right > innerWidth - 10) s = (innerWidth - 10) - r.right;
      tip.style.setProperty('--shift', s + 'px');
    });
  });

  // Двойной клик для редактирования блоков (только для админа)
  if(isAdmin){
    box.querySelectorAll('[data-edit]').forEach(el => {
      el.addEventListener('dblclick', e => {
        e.preventDefault();
        const field = el.dataset.edit;
        openBlockEditor(d, field, el);
      });
    });

    // Кнопка "Редактировать" — открывает полный редактор
    $('#editPageBtn').onclick = () => openDrinkEditor(d.id);
  }
}

/* ================= РЕДАКТОР БЛОКА (на странице напитка) ================= */
function openBlockEditor(d, field, el){
  const form = $('#editForm');
  let html = '', title = '';
  
  switch(field){
    case 'name':
      title = 'Название';
      html = `<div class="form-group"><label>Полное название</label>
        <input type="text" name="value" value="${escapeHtml(d.name)}" required></div>`;
      break;
    case 'tagline':
      title = 'Слоган';
      html = `<div class="form-group"><label>Слоган</label>
        <input type="text" name="value" value="${escapeHtml(d.tagline)}"></div>`;
      break;
    case 'short':
      title = 'Краткое описание';
      html = `<div class="form-group"><label>Краткое описание</label>
        <textarea name="value" rows="3">${escapeHtml(d.short)}</textarea></div>`;
      break;
    case 'score':
      title = 'Оценка';
      html = `<div class="form-group"><label>Оценка (0-10)</label>
        <input type="number" name="value" min="0" max="10" step="0.1" value="${d.score}"></div>`;
      break;
    case 'stats':
      title = 'Характеристики';
      html = `
        <div class="form-row">
          <div class="form-group"><label>Кофеин</label><input type="text" name="caffeine" value="${escapeHtml(d.caffeine)}"></div>
          <div class="form-group"><label>Сахар</label><input type="text" name="sugar" value="${escapeHtml(d.sugar)}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Калории</label><input type="text" name="kcal" value="${escapeHtml(d.kcal)}"></div>
          <div class="form-group"><label>Объём</label><input type="text" name="volume" value="${escapeHtml(d.volume)}"></div>
        </div>`;
      break;
    case 'about':
      title = 'Подробное описание';
      html = `<div class="form-group"><label>Каждый абзац с новой строки</label>
        <textarea name="value" rows="6">${escapeHtml(d.about.join('\n'))}</textarea></div>`;
      break;
    case 'profile':
      title = 'Профиль вкуса';
      html = `<div class="form-row">
        ${Object.entries(d.profile).map(([k,v]) => `
          <div class="form-group">
            <label>${k}</label>
            <input type="number" name="profile-${k}" min="1" max="10" value="${v}">
          </div>`).join('')}
      </div>`;
      break;
    case 'pros':
      title = 'Плюсы';
      html = `<div class="form-group"><label>Каждый пункт с новой строки</label>
        <textarea name="value" rows="5">${escapeHtml(d.pros.join('\n'))}</textarea></div>`;
      break;
    case 'cons':
      title = 'Минусы';
      html = `<div class="form-group"><label>Каждый пункт с новой строки</label>
        <textarea name="value" rows="5">${escapeHtml(d.cons.join('\n'))}</textarea></div>`;
      break;
    case 'verdict':
      title = 'Вердикт';
      html = `<div class="form-group"><label>Вердикт</label>
        <textarea name="value" rows="3">${escapeHtml(d.verdict)}</textarea></div>`;
      break;
  }
  
  $('#editTitle').textContent = '✏️ ' + title;
  form.innerHTML = html;
  
  form.onsubmit = e => {
    e.preventDefault();
    const fd = new FormData(form);
    
    switch(field){
      case 'name': d.name = fd.get('value'); break;
      case 'tagline': d.tagline = fd.get('value'); break;
      case 'short': d.short = fd.get('value'); break;
      case 'score': d.score = parseFloat(fd.get('value')) || d.score; break;
      case 'stats':
        d.caffeine = fd.get('caffeine');
        d.sugar = fd.get('sugar');
        d.kcal = fd.get('kcal');
        d.volume = fd.get('volume');
        break;
      case 'about':
        d.about = fd.get('value').split('\n').map(s => s.trim()).filter(Boolean);
        break;
      case 'profile':
        Object.keys(d.profile).forEach(k => {
          d.profile[k] = parseInt(fd.get(`profile-${k}`)) || d.profile[k];
        });
        break;
      case 'pros':
        d.pros = fd.get('value').split('\n').map(s => s.trim()).filter(Boolean);
        break;
      case 'cons':
        d.cons = fd.get('value').split('\n').map(s => s.trim()).filter(Boolean);
        break;
      case 'verdict':
        d.verdict = fd.get('value');
        break;
    }
    
    saveDrinkEdits(d.id);
    closeEditModal();
    initDrink(); // Перерисовка страницы
  };
  
  $('#editModal').hidden = false;
}

/* ================= ЗАПУСК ================= */
window.BASE_DRINK_IDS = new Set(DRINKS.map(d => d.id));

async function initApp() {
  // Сначала проверяем обновления
  await checkForUpdates();
  
  // Затем загружаем пользовательские данные
  loadState();
  
  // Применяем состояние админа
  applyAdminState();
  initAuthButtons();
  
  $$('#cancelEdit').forEach(btn => btn.onclick = closeEditModal);
  
  // Инициализируем страницу
  if (document.body.dataset.page === 'drink') {
    initDrink();
  } else {
    initList();
    initListEvents();
  }
}

initApp();