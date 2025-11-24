// Elder Futhark rune data and simple games (write, translate, puzzle)
(function(){
  const runes = [
    {ch:'ᚠ', name:'Fehu', latin:'f'},
    {ch:'ᚢ', name:'Uruz', latin:'u'},
    {ch:'ᚦ', name:'Thurisaz', latin:'th'},
    {ch:'ᚨ', name:'Ansuz', latin:'a'},
    {ch:'ᚱ', name:'Raidho', latin:'r'},
    {ch:'ᚲ', name:'Kenaz', latin:'k'},
    {ch:'ᚷ', name:'Gebo', latin:'g'},
    {ch:'ᚹ', name:'Wunjo', latin:'w'},
    {ch:'ᚺ', name:'Hagalaz', latin:'h'},
    {ch:'ᚾ', name:'Nauthiz', latin:'n'},
    {ch:'ᛁ', name:'Isa', latin:'i'},
    {ch:'ᛃ', name:'Jera', latin:'j'},
    {ch:'ᛇ', name:'Eihwaz', latin:'ei'},
    {ch:'ᛈ', name:'Perthro', latin:'p'},
    {ch:'ᛉ', name:'Algiz', latin:'z'},
    {ch:'ᛋ', name:'Sowilo', latin:'s'},
    {ch:'ᛏ', name:'Tiwaz', latin:'t'},
    {ch:'ᛒ', name:'Berkano', latin:'b'},
    {ch:'ᛖ', name:'Ehwaz', latin:'e'},
    {ch:'ᛗ', name:'Mannaz', latin:'m'},
    {ch:'ᛚ', name:'Laguz', latin:'l'},
    {ch:'ᛝ', name:'Ingwaz', latin:'ng'},
    {ch:'ᛟ', name:'Othala', latin:'o'},
    {ch:'ᛞ', name:'Dagaz', latin:'d'}
  ];

  const latinToRune = {};
  const runeToLatin = {};
  runes.forEach(r=>{ latinToRune[r.latin] = latinToRune[r.latin] || r.ch; runeToLatin[r.ch]=r.latin; });

  // Prepare quick single-letter lookup (some latin letters map to same rune)
  const singleLetterMap = {};
  runes.forEach(r=>{
    // many mappings are 1-letter, but also include digraphs later
    if(r.latin.length===1) singleLetterMap[r.latin]=r.ch;
  });
  
  // Add fallback mappings for letters not in Elder Futhark
  singleLetterMap['c'] = latinToRune['k']; // c → k
  singleLetterMap['q'] = latinToRune['k']; // q → k
  singleLetterMap['v'] = latinToRune['w']; // v → w
  singleLetterMap['y'] = latinToRune['i']; // y → i
  singleLetterMap['x'] = latinToRune['k']; // x → k (simplified)

  // DOM refs
  const tabs = document.querySelectorAll('.tab');
  const panels = document.querySelectorAll('.panel');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetId = tab.dataset.target;
      tabs.forEach(btn => btn.classList.toggle('active', btn === tab));
      panels.forEach(panel => {
        panel.classList.toggle('hidden', panel.id !== targetId);
      });
    });
  });

  // Transliterate Latin to runes (greedy for 'th' and 'ng')
  function transliterateLatinToRunes(text){
    if(!text) return '';
    text = text.toLowerCase();
    const out = [];
    for(let i=0;i<text.length;i++){
      const two = text.slice(i,i+2);
      if(two==='th' && latinToRune['th']){ out.push(latinToRune['th']); i++; continue; }
      if(two==='ng' && latinToRune['ng']){ out.push(latinToRune['ng']); i++; continue; }
      const ch = text[i];
      if(ch===' '){ out.push(' '); continue; }
      if(singleLetterMap[ch]){ out.push(singleLetterMap[ch]); continue; }
      // fallback: accept digits/punctuation as-is
      out.push('?');
    }
    return out.join('');
  }

  function transliterateRunesToLatin(text){
    if(!text) return '';
    const out=[];
    for(const ch of text){
      if(ch===' ') out.push(' ');
      else if(runeToLatin[ch]) out.push(runeToLatin[ch]);
      else out.push('?');
    }
    return out.join('');
  }

  // Render runes with tooltips
  function renderRuneLine(container, runeString){
    container.innerHTML='';
    for(const ch of runeString){
      if(ch===' '){ const sp=document.createElement('span'); sp.style.width='8px'; container.appendChild(sp); continue; }
      const span=document.createElement('div'); span.className='rune';
      const name = (runeToLatin[ch] ? runes.find(r=>r.ch===ch).name : 'Unknown');
      span.innerHTML = `<div class="glyph">${ch}</div><small>${name}</small>`;
      container.appendChild(span);
    }
  }

  // Write name UI
  const nameInput = document.getElementById('nameInput');
  const transliterateBtn = document.getElementById('transliterateBtn');
  const nameOutput = document.getElementById('nameOutput');
  const copyRunesBtn = document.getElementById('copyRunesBtn');

  if(transliterateBtn){
    transliterateBtn.addEventListener('click', ()=>{
      const txt = nameInput.value.trim();
      const runestr = transliterateLatinToRunes(txt);
      renderRuneLine(nameOutput, runestr);
      nameOutput.dataset.runes = runestr;
    });
  }
  
  // Carving mode: create stones with guide and an overlay canvas for each rune
  const carveBtn = document.getElementById('carveBtn');
  const carvingArea = document.getElementById('carvingArea');
  const stoneContainer = document.getElementById('stoneContainer');
  const resetCarveBtn = document.getElementById('resetCarve');
  const finishCarveBtn = document.getElementById('finishCarve');
  const toolChiselBtn = document.getElementById('toolChisel');
  const toolHammerBtn = document.getElementById('toolHammer');
  const toolSizeEl = document.getElementById('toolSize');
  const toolHint = document.getElementById('toolHint');

  let currentTool = 'chisel';
  let toolSize = toolSizeEl ? (parseInt(toolSizeEl.value,10) || 12) : 12;

  if(toolChiselBtn) toolChiselBtn.addEventListener('click', ()=>{ currentTool='chisel'; toolChiselBtn.classList.add('active'); toolHammerBtn.classList.remove('active'); updateCursors(); });
  if(toolHammerBtn) toolHammerBtn.addEventListener('click', ()=>{ currentTool='hammer'; toolHammerBtn.classList.add('active'); toolChiselBtn.classList.remove('active'); updateCursors(); });
  if(toolSizeEl) toolSizeEl.addEventListener('input', ()=>{ toolSize = parseInt(toolSizeEl.value,10) || 12; if(toolHint) toolHint.textContent = `Size ${toolSize} — ${currentTool==='chisel' ? 'drag to carve' : 'click to strike'}`; });

  function updateCursors(){
    if(!stoneContainer) return;
    // set cursor classes on the stone container (applies to canvases)
    stoneContainer.querySelectorAll('.draw, .overlay').forEach(c=>{
      if(currentTool==='chisel'){ c.classList.add('cursor-chisel'); c.classList.remove('cursor-hammer'); }
      else{ c.classList.add('cursor-hammer'); c.classList.remove('cursor-chisel'); }
    });
    if(toolHint) toolHint.textContent = `Size ${toolSize} — ${currentTool==='chisel' ? 'drag to carve' : 'click to strike'}`;
  }

  if(carveBtn) carveBtn.addEventListener('click', ()=>{
    const runeStr = nameOutput.dataset.runes || transliterateLatinToRunes(nameInput.value||'');
    startCarvingSession(runeStr);
  });

  if(resetCarveBtn) resetCarveBtn.addEventListener('click', ()=>{
    stoneContainer.querySelectorAll('.stone').forEach(s=>{
      const draw = s.querySelector('.draw');
      const ctx = draw.getContext('2d'); ctx.clearRect(0,0,draw.width,draw.height);
      s.classList.remove('done'); s.querySelector('.status').textContent='';
    });
  });
  if(finishCarveBtn) finishCarveBtn.addEventListener('click', ()=>{
    const remaining = stoneContainer.querySelectorAll('.stone:not(.done)').length;
    if(remaining===0){ alert('All runes carved! Well done.'); }
    else{ alert('You still have '+remaining+' rune(s) to carve.'); }
  });

  function startCarvingSession(runeStr){
    carvingArea.classList.remove('hidden');
    stoneContainer.innerHTML='';
    // build stones for rune characters only (ignore spaces and unknowns)
    const chars = Array.from(runeStr).filter(ch=> ch!==' ' && runeToLatin[ch]);
    if(chars.length===0){ alert('No runes to carve. Render a name first.'); return; }
    chars.forEach((ch,idx)=>{
      const stone = createStone(ch, idx);
      stoneContainer.appendChild(stone);
      // small staggered appear animation
      setTimeout(()=>stone.classList.add('appear'), 80*idx);
    });
  }

  function createStone(runeChar, idx){
    const wrap = document.createElement('div'); wrap.className='stone';
    // inner canvas wrap
    const cw = document.createElement('div'); cw.className='canvas-wrap'; cw.style.width='120px'; cw.style.height='120px';
  // two canvases stacked: guide (below) and overlay (above) which represents the stone surface
  const guide = document.createElement('canvas'); guide.width=120; guide.height=120; guide.className='guide';
  const overlay = document.createElement('canvas'); overlay.width=120; overlay.height=120; overlay.className='overlay draw';
    // status and clear button
    const status = document.createElement('div'); status.className='status'; status.textContent='';
    const clearBtn = document.createElement('button'); clearBtn.className='clearBtn'; clearBtn.textContent='✕';
    clearBtn.title='Clear strokes';
    clearBtn.addEventListener('click',(e)=>{ e.stopPropagation(); const ctx=draw.getContext('2d'); ctx.clearRect(0,0,draw.width,draw.height); wrap.classList.remove('done'); status.textContent=''; });

    cw.appendChild(guide); cw.appendChild(draw);
    wrap.appendChild(cw); wrap.appendChild(status); wrap.appendChild(clearBtn);

    // draw guide rune onto guide canvas (solid black for comparison)
    const gctx = guide.getContext('2d');
    gctx.clearRect(0,0,guide.width,guide.height);
    gctx.fillStyle = '#ffffff'; gctx.fillRect(0,0,guide.width,guide.height);
    gctx.fillStyle = '#000000'; gctx.textAlign='center'; gctx.textBaseline='middle';
    const fontSize = 84; gctx.font = `${fontSize}px serif`;
    gctx.fillText(runeChar, guide.width/2, guide.height/2 + 4);
    guide.style.opacity = '0.12'; guide.style.zIndex = '1';

    // overlay represents the stone surface; initially filled and will be cleared with destination-out to reveal guide
    const octx = overlay.getContext('2d');
    overlay.style.zIndex = '2';
    // fill overlay with stone color/pattern
    const g = octx.createLinearGradient(0,0,0,overlay.height); g.addColorStop(0,'#efe7dd'); g.addColorStop(1,'#e6d7c2');
    octx.fillStyle = g; octx.fillRect(0,0,overlay.width,overlay.height);

    // drawing/erasing logic: chisel clears continuously on pointermove; hammer clears on click with a single circle
    overlay.style.touchAction = 'none';
    let drawing=false; let lastPos=null;
    function getPos(e){ const rect = overlay.getBoundingClientRect(); const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left; const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top; return {x,y}; }

    overlay.addEventListener('pointerdown',(ev)=>{
      ev.preventDefault(); overlay.setPointerCapture(ev.pointerId);
      if(currentTool==='chisel'){ drawing=true; lastPos = getPos(ev); carveAt(octx, lastPos.x, lastPos.y, toolSize, true); }
      else if(currentTool==='hammer'){ const p = getPos(ev); hammerStrike(octx, p.x, p.y, Math.max(8, Math.round(toolSize*1.6)), wrap); }
    });
    overlay.addEventListener('pointermove',(ev)=>{ if(currentTool!=='chisel') return; if(!drawing) return; const p = getPos(ev); // draw line of cleared area
      carveLine(octx, lastPos.x, lastPos.y, p.x, p.y, toolSize); lastPos = p;
    });
    overlay.addEventListener('pointerup',(ev)=>{ drawing=false; lastPos=null; checkCarved(guide, overlay, wrap, status); });
    overlay.addEventListener('pointercancel',(ev)=>{ drawing=false; lastPos=null; });

    // double-click to auto-fill (for quick testing)
    wrap.addEventListener('dblclick', ()=>{ const img = gctx.getImageData(0,0,guide.width,guide.height); const octx2 = overlay.getContext('2d'); // clear overlay where guide is
      for(let i=0;i<img.data.length;i+=4){ if(img.data[i+3]>10 && img.data[i]<250){ const px = ((i/4)%guide.width)|0; const py = (Math.floor((i/4)/guide.width))|0; carveAt(octx2, px, py, 1, true); }} checkCarved(guide, overlay, wrap, status);
    });

    // set initial cursor state
    updateCursors();

    return wrap;


  // carve helpers: erase a circular area at x,y on the overlay context
  function carveAt(octx, x, y, radius, apply){
    octx.save(); octx.globalCompositeOperation = 'destination-out'; octx.beginPath(); octx.arc(x,y,radius,0,Math.PI*2); octx.fill(); octx.restore();
  }
  function carveLine(octx, x1,y1,x2,y2, radius){
    octx.save(); octx.globalCompositeOperation='destination-out'; octx.lineCap='round'; octx.lineWidth = radius*2; octx.beginPath(); octx.moveTo(x1,y1); octx.lineTo(x2,y2); octx.stroke(); octx.restore();
  }
  function hammerStrike(octx, x,y, radius, wrap){
    // clear a circular area and spawn a small chip animation
    carveAt(octx, x, y, radius, true);
    spawnChip(wrap, x, y, radius);
    checkCarved(wrap.querySelector('.guide'), octx.canvas, wrap, wrap.querySelector('.status'));
  }

  function spawnChip(wrap, x, y, r){
    const chip = document.createElement('div'); chip.className='chip';
    // position relative to wrap
    const rect = wrap.getBoundingClientRect(); chip.style.width = (r+'px'); chip.style.height=(r+'px');
    chip.style.left = (x - r/2)+'px'; chip.style.top = (y - r/2)+'px';
    wrap.appendChild(chip);
    setTimeout(()=>chip.remove(),450);
  }
    return wrap;
  }

  // compare guide and overlay canvases by checking how many guide pixels are revealed (overlay cleared)
  function checkCarved(guideCanvas, overlayCanvas, wrapEl, statusEl){
    const gw = guideCanvas.width, gh = guideCanvas.height;
    try{
      const gctx = guideCanvas.getContext('2d');
      const octx = overlayCanvas.getContext('2d');
      const gdata = gctx.getImageData(0,0,gw,gh).data;
      const odata = octx.getImageData(0,0,gw,gh).data;
      let guideCount=0, revealed=0;
      for(let i=0;i<gdata.length;i+=4){
        const ga = gdata[i+3]; const gb = gdata[i]; // guide darkness
        // overlay alpha
        const oa = odata[i+3];
        const isGuide = ga>10 && gb<250;
        if(isGuide) guideCount++;
        // if overlay alpha low => revealed
        if(isGuide && oa < 128) revealed++;
      }
      if(guideCount===0) return;
      const ratio = revealed / guideCount;
      if(ratio > 0.42){ wrapEl.classList.add('done'); statusEl.textContent='Carved'; }
      else{ wrapEl.classList.remove('done'); statusEl.textContent=''; }
    }catch(e){ console.error('carve check failed', e); }
  }
  if(copyRunesBtn) copyRunesBtn.addEventListener('click', async ()=>{
    const r = nameOutput.dataset.runes||'';
    try{ await navigator.clipboard.writeText(r); alert('Runes copied to clipboard'); }
    catch(e){ alert('Copy failed — select and copy manually') }
  });

  // Translate UI
  const runeInput = document.getElementById('runeInput');
  const translateBtn = document.getElementById('translateBtn');
  const translateOutput = document.getElementById('translateOutput');
  if(translateBtn) translateBtn.addEventListener('click', ()=>{
    const r = runeInput.value.trim();
    const latin = transliterateRunesToLatin(r);
    translateOutput.textContent = latin || '(no translation)';
  });

  // Memory Game
  const memoryGrid = document.getElementById('memoryGrid');
  const resetMemoryBtn = document.getElementById('resetMemory');
  
  let memoryCards = [];
  let flippedCards = [];
  let matchedPairs = 0;
  
  function initMemoryGame() {
    // Use all 24 runes for the game (48 cards total)
    const selectedRunes = runes;
    
    // Create pairs: one card with rune, one with latin
    const cardPairs = [];
    selectedRunes.forEach(rune => {
      cardPairs.push({ type: 'rune', value: rune.ch, match: rune.latin });
      cardPairs.push({ type: 'latin', value: rune.latin, match: rune.ch });
    });
    
    // Shuffle cards
    cardPairs.sort(() => Math.random() - 0.5);
    
    // Clear grid
    if(memoryGrid) {
      memoryGrid.innerHTML = '';
      memoryCards = [];
      flippedCards = [];
      matchedPairs = 0;
      
      // Create card elements
      cardPairs.forEach((card, index) => {
        const cardEl = document.createElement('div');
        cardEl.className = 'memory-card';
        cardEl.dataset.index = index;
        cardEl.dataset.type = card.type;
        cardEl.dataset.value = card.value;
        cardEl.dataset.match = card.match;
        
        cardEl.innerHTML = `
          <div class="card-inner">
            <div class="card-face card-back"></div>
            <div class="card-face card-front ${card.type}-card">${card.value}</div>
          </div>
        `;
        
        cardEl.addEventListener('click', () => flipCard(cardEl));
        memoryGrid.appendChild(cardEl);
        memoryCards.push(cardEl);
      });
    }
    
    // Show translation challenge from the start
    startTranslationChallenge();
  }
  
  function flipCard(card) {
    // Ignore if already flipped or matched
    if (card.classList.contains('flipped') || card.classList.contains('matched')) {
      return;
    }
    
    // Only allow 2 cards to be flipped at once
    if (flippedCards.length >= 2) {
      return;
    }
    
    card.classList.add('flipped');
    flippedCards.push(card);
    
    // Highlight matching runes in the challenge word
    highlightMatchingRunes();
    
    // Check if both cards of a pair are flipped
    if (flippedCards.length === 2) {
      const [c1, c2] = flippedCards;
      const match1 = c1.dataset.match;
      const value2 = c2.dataset.value;
      
      // If they match each other, highlight both cards
      if (match1 === value2) {
        c1.classList.add('pair-highlight');
        c2.classList.add('pair-highlight');
        setTimeout(() => {
          c1.classList.remove('pair-highlight');
          c2.classList.remove('pair-highlight');
        }, 1000);
      }
      
      // Check for matches after delay
      setTimeout(() => checkMatch(), 600);
    }
    
    // Hint: shake the matching card after 1.5s and repeat every 1.5 seconds if still unmatched
    const matchValue = card.dataset.match;
    
    // First hint after 1.5 seconds
    const firstHint = setTimeout(() => {
      memoryCards.forEach(c => {
        if (c !== card && !c.classList.contains('flipped') && !c.classList.contains('matched')) {
          if (c.dataset.value === matchValue) {
            c.classList.add('hint-shake');
            setTimeout(() => c.classList.remove('hint-shake'), 500);
          }
        }
      });
      
      // Then repeat every 1.5 seconds
      const hintInterval = setInterval(() => {
        // Stop if card gets matched or flipped
        if (card.classList.contains('matched') || flippedCards.length === 0) {
          clearInterval(hintInterval);
          return;
        }
        
        memoryCards.forEach(c => {
          if (c !== card && !c.classList.contains('flipped') && !c.classList.contains('matched')) {
            if (c.dataset.value === matchValue) {
              c.classList.add('hint-shake');
              setTimeout(() => c.classList.remove('hint-shake'), 500);
            }
          }
        });
      }, 1500);
      
      // Store interval ID to clear it later
      card.dataset.hintInterval = hintInterval;
    }, 1500);
    
    // Store timeout ID to clear it if needed
    card.dataset.hintTimeout = firstHint;
  }
  
  function checkMatch() {
    // Only check pairs when exactly 2 cards are flipped
    if (flippedCards.length !== 2) return;
    
    const [card1, card2] = flippedCards;
    const value1 = card1.dataset.value;
    const match1 = card1.dataset.match;
    const value2 = card2.dataset.value;
    
    // Check if they match (one's value matches the other's match field)
    if (value1 === card2.dataset.match || value2 === match1) {
      // Match found
      card1.classList.add('matched');
      card2.classList.add('matched');
      matchedPairs++;
      
      // Clear the flipped cards array
      flippedCards = [];
      
      // Update highlights
      highlightMatchingRunes();
      
      // Auto-fill the letter in the translation input
      autoFillMatchedLetter(card1, card2);
      
      // Check if game is complete
      if (matchedPairs === 24) {
        setTimeout(() => {
          alert('All runes discovered! Keep translating! 🎉');
        }, 500);
      }
    } else {
      // No match - flip cards back after delay
      setTimeout(() => {
        flippedCards.forEach(card => {
            // Clear hint intervals and timeouts
            if (card.dataset.hintTimeout) clearTimeout(parseInt(card.dataset.hintTimeout));
            if (card.dataset.hintInterval) clearInterval(parseInt(card.dataset.hintInterval));
            
            card.classList.remove('flipped');
          });
          
          // Clear the array
          flippedCards = [];
          
          // Update highlights after unflipping
          highlightMatchingRunes();
        }, 1000);
      }
    }
  
  function autoFillMatchedLetter(card1, card2) {
    if (!currentWord || !translationContainer) return;
    
    // Find which card is the latin one
    const latinCard = card1.dataset.type === 'latin' ? card1 : card2;
    const latinLetter = latinCard.dataset.value.toLowerCase();
    
    // Find all positions of this letter in the current word
    const letterInputs = translationContainer.querySelectorAll('.letter-input');
    currentWord.split('').forEach((letter, index) => {
      if (letter.toLowerCase() === latinLetter) {
        letterInputs[index].value = letter;
      }
    });
  }
  
  function highlightMatchingRunes() {
    if (!currentRuneWord) return;
    
    const challengeWordEl = document.querySelector('.challenge-word');
    if (!challengeWordEl) return;
    
    // Get all flipped or matched cards
    const knownRunes = new Set();
    const knownLatins = new Set();
    memoryCards.forEach(card => {
      if (card.classList.contains('flipped') || card.classList.contains('matched')) {
        const val = card.dataset.value;
        if (card.dataset.type === 'rune') {
          knownRunes.add(val);
          knownLatins.add(card.dataset.match);
        } else {
          knownLatins.add(val);
          knownRunes.add(card.dataset.match);
        }
      }
    });
    
    // Rebuild the word with highlighted runes
    let html = '';
    Array.from(currentRuneWord).forEach(rune => {
      if (knownRunes.has(rune)) {
        html += `<span class="highlighted-rune">${rune}</span>`;
      } else {
        html += rune;
      }
    });
    
    challengeWordEl.innerHTML = html;
    
    // Also highlight the cards that match runes in the current word
    memoryCards.forEach(card => {
      const val = card.dataset.value;
      const match = card.dataset.match;
      
      // Check if this card's rune appears in the current runic word
      const wordRunes = Array.from(currentRuneWord);
      
      let shouldHighlight = false;
      if (card.dataset.type === 'rune' && wordRunes.includes(val)) {
        shouldHighlight = knownRunes.has(val);
      } else if (card.dataset.type === 'latin') {
        // For latin cards, check if the matching rune is in the word
        if (wordRunes.includes(match)) {
          shouldHighlight = knownLatins.has(val);
        }
      }
      
      if (shouldHighlight && (card.classList.contains('flipped') || card.classList.contains('matched'))) {
        card.classList.add('word-highlight');
      } else {
        card.classList.remove('word-highlight');
      }
    });
  }
  
  if(resetMemoryBtn) resetMemoryBtn.addEventListener('click', initMemoryGame);
  
  // Solve button for testing
  const solveMemoryBtn = document.getElementById('solveMemory');
  if(solveMemoryBtn) solveMemoryBtn.addEventListener('click', () => {
    // Flip and match all cards instantly
    memoryCards.forEach(card => {
      card.classList.add('flipped', 'matched');
    });
    matchedPairs = 24;
    flippedCards = [];
    
    // Start translation challenge
    setTimeout(() => {
      startTranslationChallenge();
    }, 500);
  });
  
  // Translation Challenge after completing memory game
  const translationWords = [
    'father', 'mother', 'warrior', 'king', 'shield', 'sword', 'rune',
    'fire', 'water', 'earth', 'wind', 'sun', 'moon', 'star', 'tree',
    'wolf', 'bear', 'eagle', 'serpent', 'dragon', 'horse', 'raven', 'thor'
  ];
  
  let currentWord = '';
  let currentRuneWord = '';
  let translationContainer = null;
  
  function startTranslationChallenge() {
    // Pick random word
    currentWord = translationWords[Math.floor(Math.random() * translationWords.length)];
    currentRuneWord = transliterateLatinToRunes(currentWord);
    
    // Create translation UI above cards
    if (!translationContainer) {
      translationContainer = document.createElement('div');
      translationContainer.className = 'translation-challenge';
      memoryGrid.parentNode.insertBefore(translationContainer, memoryGrid);
    }
    
    // Create individual input boxes for each letter in the word
    const inputBoxes = currentWord.split('').map((letter, i) => 
      `<input type="text" class="letter-input" data-index="${i}" maxlength="1" />`
    ).join('');
    
    translationContainer.innerHTML = `
      <h3>Translate:</h3>
      <div class="challenge-word">${currentRuneWord}</div>
      <div class="letter-inputs">${inputBoxes}</div>
      <button id="checkTranslation">CHECK</button>
      <div id="translationFeedback"></div>
    `;
    
    const checkBtn = document.getElementById('checkTranslation');
    const letterInputs = translationContainer.querySelectorAll('.letter-input');
    const feedback = document.getElementById('translationFeedback');
    
    // Apply initial highlights
    highlightMatchingRunes();
    
    // Auto-focus next input on type
    letterInputs.forEach((input, idx) => {
      input.addEventListener('input', (e) => {
        const val = e.target.value;
        if (val && idx < letterInputs.length - 1) {
          letterInputs[idx + 1].focus();
        }
      });
      
      // Backspace moves to previous input
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !e.target.value && idx > 0) {
          letterInputs[idx - 1].focus();
        }
        if (e.key === 'Enter') checkBtn.click();
      });
    });
    
    checkBtn.addEventListener('click', () => {
      const answer = Array.from(letterInputs).map(input => input.value).join('').toLowerCase();
      if (answer === currentWord) {
        feedback.textContent = '✓ Correct!';
        feedback.style.color = '#4CAF50';
        setTimeout(() => {
          // Reset all cards
          memoryCards.forEach(card => {
            card.classList.remove('flipped', 'matched', 'pair-highlight', 'word-highlight');
          });
          matchedPairs = 0;
          flippedCards = [];
          
          // New word
          startTranslationChallenge();
        }, 1500);
      } else {
        feedback.textContent = '✗ Try again!';
        feedback.style.color = '#f44336';
      }
    });
    
    // Focus first input
    if (letterInputs.length > 0) {
      letterInputs[0].focus();
    }
  }
  
  // Initialize memory game on load
  document.addEventListener('DOMContentLoaded', () => {
    initMemoryGame();
    
    // Unmute background music on first interaction
    const bgMusic = document.getElementById('bgMusic');
    if (bgMusic) {
      const unmute = () => {
        bgMusic.muted = false;
        bgMusic.play().catch(() => {});
        document.removeEventListener('click', unmute);
        document.removeEventListener('keydown', unmute);
      };
      document.addEventListener('click', unmute);
      document.addEventListener('keydown', unmute);
    }
  });

  // Ring puzzle - individual runes that rotate by 90 degrees on click
  const ringRotations = {};

  function rotateRing(ringEl, ringName){
    if(!ringEl) return;
    if(!ringRotations[ringName]) ringRotations[ringName] = 0;
    ringRotations[ringName] = (ringRotations[ringName] + 90) % 360;
    ringEl.style.transform = `rotate(${ringRotations[ringName]}deg)`;
  }

  // Add click listeners to all puzzle rings (except v2 and v3 rings which are handled separately)
  document.querySelectorAll('.puzzle-ring').forEach(ring => {
    const ringName = ring.dataset.ring;
    if(ringName && !ringName.startsWith('v2') && !ringName.startsWith('v3')) {
      ring.addEventListener('click', ()=> rotateRing(ring, ringName));
    }
  });

  const RUNE_SNAP_INCREMENT = 45;
  const RUNE_SNAP_ANGLES = Array.from({length: 360 / RUNE_SNAP_INCREMENT}, (_, idx) => idx * RUNE_SNAP_INCREMENT);
  const solvedRuneIds = new Set();

  function applyRotation(group, angle){
    if(!group) return;
    group.style.transform = `rotate(${angle}deg)`;
    const textGroup = document.getElementById(`${group.id}Text`);
    if(textGroup) textGroup.style.transform = `rotate(${angle}deg)`;
  }

  function incrementRotation(store, key){
    if(typeof store[key] === 'undefined') store[key] = 0;
    store[key] += RUNE_SNAP_INCREMENT;
    return store[key];
  }

  function isCorrectOrientation(angle){
    const normalized = ((angle % 360) + 360) % 360;
    return normalized === 0;
  }

  function unlockRune(runeId){
    solvedRuneIds.delete(runeId);
    const group = document.getElementById(runeId);
    if(group) group.classList.remove('rune-locked');
    const textGroup = document.getElementById(`${runeId}Text`);
    if(textGroup) textGroup.classList.remove('rune-locked');
  }

  function lockRune(runeId){
    solvedRuneIds.add(runeId);
    const group = document.getElementById(runeId);
    if(group) group.classList.add('rune-locked');
    const textGroup = document.getElementById(`${runeId}Text`);
    if(textGroup) textGroup.classList.add('rune-locked');
    checkPuzzleCompletion();
  }

  function checkPuzzleCompletion() {
    // Only check for visible puzzle (test2 and test3)
    const puzzleSvg = document.querySelector('.ring-puzzle-v3test2, .ring-puzzle-v3test3');
    if (!puzzleSvg) return;
    // Get all rune groups in this puzzle
    const runeGroups = Array.from(puzzleSvg.querySelectorAll('g[id^="v3OuterRune"], g[id^="v3MiddleRune"]'));
    if (!runeGroups.length) return;
    // All runes must be locked
    const allLocked = runeGroups.every(g => g.classList.contains('rune-locked'));
    if (allLocked) {
      // Trigger zoom out animation on all rune text elements
      runeGroups.forEach(g => {
        const textGroup = document.getElementById(`${g.id}Text`);
        if(textGroup) textGroup.classList.add('puzzle-solved-zoom');
      });
      
      // After 3 seconds, reset and randomize
      setTimeout(() => {
        // Remove animation class and unlock all runes
        runeGroups.forEach(g => {
          const textGroup = document.getElementById(`${g.id}Text`);
          if(textGroup) textGroup.classList.remove('puzzle-solved-zoom');
          unlockRune(g.id);
        });
        
        // Wait for transition to complete before randomizing
        setTimeout(() => {
          // Randomize the puzzle again based on which version is active
          if(puzzleSvg.classList.contains('ring-puzzle-v3test3')) {
            randomizeRunePieces('[id^="v3OuterRune"][id$="test3"],[id^="v3MiddleRune"][id$="test3"]', v3Test3Rotations);
          } else if(puzzleSvg.classList.contains('ring-puzzle-v3test2')) {
            randomizeRunePieces('[id^="v3OuterRune"][id$="test2"],[id^="v3MiddleRune"][id$="test2"]', v3Test2Rotations);
          }
        }, 400); // Wait for the existing 0.4s transition
      }, 3000);
    }
  }

  function showConfetti() {
    const canvas = document.getElementById('confettiCanvas');
    if (!canvas) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    canvas.classList.remove('hidden');
    const ctx = canvas.getContext('2d');
    const confettiCount = 60;
    const confetti = [];
    for (let i = 0; i < confettiCount; i++) {
      confetti.push({
        x: Math.random() * canvas.width,
        y: -20,
        r: 6 + Math.random() * 8,
        d: Math.random() * 2 + 2,
        color: `hsl(${Math.random()*360},80%,60%)`,
        tilt: Math.random() * 10 - 5,
        tiltAngle: Math.random() * Math.PI * 2
      });
    }
    let frame = 0;
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      confetti.forEach(c => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        ctx.fillStyle = c.color;
        ctx.globalAlpha = 0.85;
        ctx.fill();
        ctx.restore();
      });
    }
    function update() {
      confetti.forEach(c => {
        c.y += c.d + Math.sin(frame/10 + c.tiltAngle) * 2;
        c.x += Math.sin(frame/15 + c.tilt) * 2;
        c.tiltAngle += 0.1;
      });
    }
    function loop() {
      frame++;
      update();
      draw();
      if (frame < 60) {
        requestAnimationFrame(loop);
      } else {
        canvas.classList.add('hidden');
      }
    }
    loop();
  }

  function getCurrentRotation(group) {
    // Extract current rotation from the group's style or data
    // Since we set it in applyRotation, we can parse it
    const transform = group.style.transform || '';
    const match = transform.match(/rotate\(([^)]+)deg\)/);
    return match ? parseFloat(match[1]) : 0;
  }

  function maybeLockRune(runeId, angle){
    if(isCorrectOrientation(angle)){
      lockRune(runeId);
    }
  }

  // v3 specific: clicking ring segments rotates corresponding rune groups
  const v3Rotations = {};
  
  document.querySelectorAll('.puzzle-ring[data-ring^="v3"]').forEach(ringSegment => {
    const ringName = ringSegment.dataset.ring;
    if(!ringName) return;
    
    // Skip test version rings - they're handled separately
    if(ringName.includes('test')) return;
    
    // Extract which rune this segment controls (e.g., "v3outer1" -> "v3OuterRune1")
    const parts = ringName.match(/v3(outer|middle)(\d+)/);
    if(!parts) return;
    
    const layer = parts[1]; // "outer" or "middle"
    const num = parts[2]; // "1", "2", etc.
    const runeId = `v3${layer.charAt(0).toUpperCase() + layer.slice(1)}Rune${num}`; // "v3OuterRune1"
    const runeGroup = document.getElementById(runeId);
    
    if(!runeGroup) return;
    
    ringSegment.addEventListener('click', (e) => {
      e.stopPropagation();
      if(solvedRuneIds.has(runeId)) return;
      const newAngle = incrementRotation(v3Rotations, runeId);
      applyRotation(runeGroup, newAngle);
      maybeLockRune(runeId, newAngle);
    });
  });

  // v3 TEST version: clicking ring segments rotates corresponding rune groups
  const v3TestRotations = {};
  
  document.querySelectorAll('.puzzle-ring[data-ring$="test"]').forEach(ringSegment => {
    const ringName = ringSegment.dataset.ring;
    if(!ringName) return;
    
    // Extract which rune this segment controls (e.g., "v3outer1test" -> "v3OuterRune1test")
    const parts = ringName.match(/v3(outer|middle)(\d+)test/);
    if(!parts) return;
    
    const layer = parts[1]; // "outer" or "middle"
    const num = parts[2]; // "1", "2", etc.
    const runeId = `v3${layer.charAt(0).toUpperCase() + layer.slice(1)}Rune${num}test`; // "v3OuterRune1test"
    const runeGroup = document.getElementById(runeId);
    
    if(!runeGroup) return;
    
    ringSegment.addEventListener('click', (e) => {
      e.stopPropagation();
      if(solvedRuneIds.has(runeId)) return;
      const newAngle = incrementRotation(v3TestRotations, runeId);
      applyRotation(runeGroup, newAngle);
      maybeLockRune(runeId, newAngle);
    });
  });

  // v3 TEST2 version: clicking ring segments rotates corresponding rune groups
  const v3Test2Rotations = {};
  
  document.querySelectorAll('.puzzle-ring[data-ring$="test2"]').forEach(ringSegment => {
    const ringName = ringSegment.dataset.ring;
    if(!ringName) return;
    
    // Extract which rune this segment controls (e.g., "v3outer1test2" -> "v3OuterRune1test2")
    const parts = ringName.match(/v3(outer|middle)(\d+)test2/);
    if(!parts) return;
    
    const layer = parts[1]; // "outer" or "middle"
    const num = parts[2]; // "1", "2", etc.
    const runeId = `v3${layer.charAt(0).toUpperCase() + layer.slice(1)}Rune${num}test2`; // "v3OuterRune1test2"
    const textId = `${runeId}Text`;
    const runeGroup = document.getElementById(runeId);
    const textGroup = document.getElementById(textId);
    
    if(!runeGroup) return;
    
    ringSegment.addEventListener('click', (e) => {
      e.stopPropagation();
      if(solvedRuneIds.has(runeId)) return;
      const newAngle = incrementRotation(v3Test2Rotations, runeId);
      applyRotation(runeGroup, newAngle);
      maybeLockRune(runeId, newAngle);
    });
  });

  // v3 TEST3 version: clicking ring segments rotates corresponding rune groups
  const v3Test3Rotations = {};
  
  document.querySelectorAll('.puzzle-ring[data-ring$="test3"]').forEach(ringSegment => {
    const ringName = ringSegment.dataset.ring;
    if(!ringName) return;
    
    // Extract which rune this segment controls (e.g., "v3outer1test3" -> "v3OuterRune1test3")
    const parts = ringName.match(/v3(outer|middle)(\d+)test3/);
    if(!parts) return;
    
    const layer = parts[1]; // "outer" or "middle"
    const num = parts[2]; // "1", "2", etc.
    const runeId = `v3${layer.charAt(0).toUpperCase() + layer.slice(1)}Rune${num}test3`; // "v3OuterRune1test3"
    const textId = `${runeId}Text`;
    const runeGroup = document.getElementById(runeId);
    const textGroup = document.getElementById(textId);
    
    if(!runeGroup) return;
    
    ringSegment.addEventListener('click', (e) => {
      e.stopPropagation();
      if(solvedRuneIds.has(runeId)) return;
      const newAngle = incrementRotation(v3Test3Rotations, runeId);
      applyRotation(runeGroup, newAngle);
      maybeLockRune(runeId, newAngle);
    });
  });

  function randomizeRunePieces(selector, rotationStore){
    const groups = Array.from(document.querySelectorAll(selector));
    console.log('Randomizing puzzle - found groups:', groups.length, 'selector:', selector);
    if(!groups.length) return;
    // Use only non-zero angles so pieces are never already in correct position
    const snapAngles = RUNE_SNAP_ANGLES.filter(angle => angle !== 0);
    let anglePool = [];
    const drawAngle = () => {
      if(anglePool.length === 0) {
        anglePool = snapAngles.slice();
      }
      const pick = Math.floor(Math.random() * anglePool.length);
      return anglePool.splice(pick, 1)[0];
    };

    groups.forEach(group => {
      const groupId = group.id;
      if(!groupId) return;
      const randomQuarterTurns = drawAngle();
      console.log('Randomizing', groupId, 'to angle:', randomQuarterTurns);
      unlockRune(groupId);
      rotationStore[groupId] = randomQuarterTurns;
      applyRotation(group, randomQuarterTurns);
    });
  }

  // Test version 2: clicking outer or middle ring rotates their respective rune pieces
  const v2OuterRunePiece = document.getElementById('v2OuterRunePiece');
  const v2MiddleRunePiece = document.getElementById('v2MiddleRunePiece');
  let v2OuterRotation = 0;
  let v2MiddleRotation = 0;
  
  const v2OuterRing = document.querySelector('[data-ring="v2outerRing"]');
  const v2MiddleRing = document.querySelector('[data-ring="v2middleRing"]');
  
  if(v2OuterRing) {
    v2OuterRing.removeEventListener('click', ()=>{}); // clear any existing
    v2OuterRing.addEventListener('click', (e) => {
      e.stopPropagation();
      v2OuterRotation += 90;
      if(v2OuterRunePiece) v2OuterRunePiece.style.transform = `rotate(${v2OuterRotation}deg)`;
    });
  }
  
  if(v2MiddleRing) {
    v2MiddleRing.removeEventListener('click', ()=>{}); // clear any existing
    v2MiddleRing.addEventListener('click', (e) => {
      e.stopPropagation();
      v2MiddleRotation += 90;
      if(v2MiddleRunePiece) v2MiddleRunePiece.style.transform = `rotate(${v2MiddleRotation}deg)`;
    });
  }

  // Test version 3: clicking outer or middle ring rotates their respective rune pieces
  const v3OuterRunePiece = document.getElementById('v3OuterRunePiece');
  const v3MiddleRunePiece = document.getElementById('v3MiddleRunePiece');
  let v3OuterRotation = 0;
  let v3MiddleRotation = 0;
  
  const v3OuterRing = document.querySelector('[data-ring="v3outerRing"]');
  const v3MiddleRing = document.querySelector('[data-ring="v3middleRing"]');
  
  if(v3OuterRing) {
    v3OuterRing.addEventListener('click', (e) => {
      e.stopPropagation();
      v3OuterRotation += 90;
      if(v3OuterRunePiece) v3OuterRunePiece.style.transform = `rotate(${v3OuterRotation}deg)`;
    });
  }
  
  if(v3MiddleRing) {
    v3MiddleRing.addEventListener('click', (e) => {
      e.stopPropagation();
      v3MiddleRotation += 90;
      if(v3MiddleRunePiece) v3MiddleRunePiece.style.transform = `rotate(${v3MiddleRotation}deg)`;
    });
  }

  // expose some functions for debugging in console
  window.runesData = runes;
  window.transliterateLatinToRunes = transliterateLatinToRunes;
  window.transliterateRunesToLatin = transliterateRunesToLatin;

  // small demo content
  document.addEventListener('DOMContentLoaded', ()=>{
    randomizeRunePieces('[id^="v3OuterRune"][id$="test3"],[id^="v3MiddleRune"][id$="test3"]', v3Test3Rotations);
    
    // Article navigation
    let currentArticleIndex = 0;
    const articleSections = document.querySelectorAll('.article-section');
    const articleContainer = document.querySelector('.rune-article');
    const leftNav = document.querySelector('.article-nav-left');
    const rightNav = document.querySelector('.article-nav-right');
    const paginationDots = document.querySelectorAll('.pagination-dot');
    
    function updateArticle() {
      articleSections.forEach((section, index) => {
        section.classList.toggle('active', index === currentArticleIndex);
      });
      paginationDots.forEach((dot, index) => {
        dot.classList.toggle('active', index === currentArticleIndex);
      });
      if (articleContainer) {
        articleContainer.style.left = `-${currentArticleIndex * 100}vw`;
      }
    }
    
    if (leftNav) {
      leftNav.addEventListener('click', () => {
        currentArticleIndex = (currentArticleIndex - 1 + articleSections.length) % articleSections.length;
        updateArticle();
      });
    }
    
    if (rightNav) {
      rightNav.addEventListener('click', () => {
        currentArticleIndex = (currentArticleIndex + 1) % articleSections.length;
        updateArticle();
      });
    }
    
    // Pagination dot click handlers
    paginationDots.forEach((dot, index) => {
      dot.addEventListener('click', () => {
        currentArticleIndex = index;
        updateArticle();
      });
    });
  });

})();
