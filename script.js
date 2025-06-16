let songs = [];
let daily = null;
let guesses = [];
const MAX_GUESSES = 8;
let gameNumber = 0;

window.addEventListener('DOMContentLoaded', () => {
  const songInput    = document.getElementById('songInput');
  const datalist     = document.getElementById('songsList');
  const submitBtn    = document.getElementById('submitBtn');
  const newGameBtn   = document.getElementById('newGameBtn');
  const retryBtn     = document.getElementById('retryBtn');
  const shareBtn     = document.getElementById('shareBtn');
  const guessCountEl = document.getElementById('guessCount');

  fetch('songs.json')
    .then(res => res.json())
    .then(data => {
      songs = data;
      initDailyGame();
      setupListeners();
    })
    .catch(err => console.error('Errore caricamento songs.json', err));

  function setupListeners() {
    submitBtn.addEventListener('click', check);
    newGameBtn.addEventListener('click', initRandomGame);
    retryBtn.addEventListener('click', initRandomGame);
    shareBtn.addEventListener('click', shareResult);
    songInput.addEventListener('input', filterSuggestions);
  }

  function initDailyGame() {
    resetRound();
    setDailyByDate();
    computeGameNumber();
  }

function initRandomGame() {
  resetRound();

  // Chiave YYYYMMDDHHMM deterministica, tagliata all’inizio di ogni minuto
  const minuteKey = new Date()
      .toISOString()           // 2025-06-16T13:42:17.123Z
      .slice(0, 16)            // 2025-06-16T13:42
      .replace(/[-:T]/g, '');  // 202506161342

  // Indice sicuro perché minuteKey < 9·10¹¹  <<  2^53
  const offset = ((parseInt(minuteKey,10) * 2654435761) >>> 0) % songs.length;
  const index = ((parseInt(minuteKey, 10)*67)+ offset) % songs.length;

  daily      = songs[index];
  gameNumber = `MIN${minuteKey}`;   // es. MIN202506161342
}


  function resetRound() {
    guesses = [];
    guessCountEl.textContent = '1';
    clearTable();
    hideEndScreen();
    songInput.value = '';
    datalist.innerHTML = '';
  }

  function setDailyByDate() {
    const key = new Date().toISOString().slice(0,10).replace(/-/g,'');
    daily = songs[parseInt(key, 10) % songs.length];
  }

  function computeGameNumber() {
    const key = new Date().toISOString().slice(0,10).replace(/-/g,'');
    gameNumber = (parseInt(key, 10) % 10000) + 1;
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function populateSuggestions(list) {
    datalist.innerHTML = '';
    shuffle(list).forEach(song => {
      const opt = document.createElement('option');
      opt.value = song.title;
      datalist.appendChild(opt);
    });
  }

  function filterSuggestions() {
    const term = songInput.value.trim().toLowerCase();
    if (term.length < 2) {
      datalist.innerHTML = '';
      return;
    }
    const filtered = songs.filter(s => s.title.toLowerCase().includes(term));
    populateSuggestions(filtered);
  }

  function clearTable() {
    document.querySelector('#resultsTable tbody').innerHTML = '';
  }

  function formatDuration(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function arrow(v, t) {
    if (v === t) return '✅';
    return v > t ? '🔽' : '🔼';
  }

function cellClass(v, t, type = '') {
  if (v === t) return 'correct';

  if (type === 'track'    && Math.abs(v - t) <= 5)  return 'hint';      // ±5 posizioni
  if (type === 'duration' && Math.abs(v - t) <= 30) return 'hint';      // ±30 secondi

  return '';   // niente evidenziazione
}

  function getCoverPath(album) {
    const slug = album
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    return `covers/${slug}.png`;
  }

  /**
   * Confronta featuring come stringhe comma-separate:
   * - 'correct' se listone esatto
   * - 'hint' se almeno un artista in comune
   * - 'none' altrimenti
   */
  function compareFeaturing(guessFeat, dailyFeat) {
    if (!dailyFeat || !guessFeat) return 'none';
    const gList = guessFeat.split(/\s*,\s*/).filter(Boolean);
    const dList = dailyFeat.split(/\s*,\s*/).filter(Boolean);
    if (gList.length === dList.length && gList.every(a => dList.includes(a))) {
      return 'correct';
    }
    if (gList.some(a => dList.includes(a))) {
      return 'hint';
    }
    return 'none';
  }

  function check() {
    if (guesses.length >= MAX_GUESSES) return;
    const val = songInput.value.trim();
    if (!val) { alert('Inserisci un titolo.'); return; }
    const guess = songs.find(s => s.title.toLowerCase() === val.toLowerCase());
    if (!guess) { alert('Titolo non trovato.'); return; }
    guesses.push(guess);
    renderGuessRow(guess);
    guessCountEl.textContent = guesses.length + 1;
    songInput.value = '';
    if (guess.title === daily.title)  showEndScreen(true);
    else if (guesses.length >= MAX_GUESSES) showEndScreen(false);
  }

  function renderGuessRow(g) {
    const tbody = document.querySelector('#resultsTable tbody');
    const tr = document.createElement('tr');

    ['title','album','track','duration','featuring'].forEach(field => {
      const td = document.createElement('td');

      if (field === 'album') {
        const img = document.createElement('img');
        img.src = getCoverPath(g.album);
        img.alt = g.album;
        img.className = 'cover';
        td.appendChild(img);
        if (g.album === daily.album) {
    td.classList.add('correct');
  }
        
   


      } else if (field === 'track') {
        const sym = arrow(g.track, daily.track);
        td.textContent = `${g.track} ${sym}`;
        td.className  = cellClass(g.track, daily.track, 'track'); 

      } else if (field === 'duration') {
        const sym = arrow(g.duration, daily.duration);
        td.textContent = `${formatDuration(g.duration)} ${sym}`;
        td.className  = cellClass(g.duration, daily.duration, 'duration');

      } else if (field === 'featuring') {
        const status = compareFeaturing(g.featuring, daily.featuring);
        td.textContent = g.featuring || '-';
        if (status === 'correct') td.classList.add('correct');
        else if (status === 'hint') td.classList.add('hint');

      } else {
        // title
        td.textContent = g[field] || '-';
        if (g[field] === daily[field]) td.classList.add('correct');
      }

      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  }

  function showEndScreen(win) {
    const ov = document.getElementById('endScreen');
    document.getElementById('endTitle').textContent   = win ? '🎉 Hai vinto!' : '😢 Hai perso!';
    document.getElementById('endMessage').textContent = win
      ? `Hai indovinato in ${guesses.length}/8 tentativi. #${gameNumber}`
      : `La canzone era "${daily.title}". #${gameNumber}`;
    ov.classList.remove('hidden');
  }

  function hideEndScreen() {
    document.getElementById('endScreen').classList.add('hidden');
  }

  function shareResult() {
    const lines = guesses.map(g =>
      ['track','duration','title','featuring'].map(f => {
        const ok   = g[f] === daily[f];
        const hint = ['track','duration'].includes(f) && !ok;
        return ok ? '🟢' : hint ? '🟡' : '⚪️';
      }).join(' ')
    ).join('\n');
    const text = `ZOGEDLE #${gameNumber}: ${guesses.length}/8\n\n${lines}\n\n🌐`;
    const shareData = { title:'ZOGEDLE', text, url:window.location.href };
    if (navigator.share) {
      navigator.share(shareData)
        .catch(() => navigator.clipboard.writeText(text + ' ' + window.location.href));
    } else {
      navigator.clipboard.writeText(text + ' ' + window.location.href);
    }
  }

});