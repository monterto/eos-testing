// ============================================
// MAIN APP INITIALIZATION
// ============================================

// Debug flag - set to true to enable manual testing of clear data prompt
const ENABLE_DEBUG_TRIGGER = false;

// Randomize hub emoji on load
document.getElementById('hubEmoji').textContent = "🐖";

// Check for old End of Day data on hub load
function checkForOldData() {
  const saved = localStorage.getItem('endOfDayData');
  if (!saved) return;
  
  const data = JSON.parse(saved);
  if (!data.sessionStartTime) return;
  
  const now = Date.now();
  const age = now - data.sessionStartTime;
  const twoHoursInMs = 2 * 60 * 60 * 1000;
  
  if (age > twoHoursInMs) {
    showClearDataModal(age);
  }
}

function showClearDataModal(age) {
  const hoursAgo = Math.floor(age / (60 * 60 * 1000));
  const alert = document.getElementById('clearDataAlert');
  const ageText = document.getElementById('dataAgeText');
  
  if (hoursAgo < 1) {
    ageText.textContent = 'Data from earlier today is still saved';
  } else if (hoursAgo === 1) {
    ageText.textContent = 'Data from 1 hour ago is still saved';
  } else if (hoursAgo < 24) {
    ageText.textContent = 'Data from ' + hoursAgo + ' hours ago is still saved';
  } else {
    const daysAgo = Math.floor(hoursAgo / 24);
    ageText.textContent = 'Data from ' + daysAgo + ' day' + (daysAgo > 1 ? 's' : '') + ' ago is still saved';
  }
  
  alert.classList.add('show');
}

function clearOldData() {
  localStorage.removeItem('endOfDayData');
  document.getElementById('clearDataAlert').classList.remove('show');
}

function keepOldData() {
  document.getElementById('clearDataAlert').classList.remove('show');
}

// Event listeners - wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {
  // Check for old data first
  checkForOldData();
  
  // Manual trigger - click hub emoji to test (only if debug enabled)
  if (ENABLE_DEBUG_TRIGGER) {
    const hubEmoji = document.getElementById('hubEmoji');
    hubEmoji.classList.add('debug-enabled');
    hubEmoji.addEventListener('click', function() {
      const saved = localStorage.getItem('endOfDayData');
      if (saved) {
        const data = JSON.parse(saved);
        const age = data.sessionStartTime ? Date.now() - data.sessionStartTime : 0;
        showClearDataModal(age);
      }
    });
  }
  
  // App cards
  document.getElementById('tipCalcCard').addEventListener('click', function() {
    loadApp('tipcalc');
  });
  document.getElementById('hoursCalcCard').addEventListener('click', function() {
    loadApp('hourscalc');
  });
  document.getElementById('endOfDayCard').addEventListener('click', function() {
    loadApp('endofday');
  });
  
  // Back button
  document.getElementById('backBtn').addEventListener('click', backToHub);
  
  // Info modal
  document.getElementById('infoBtn').addEventListener('click', openInfoModal);
  document.getElementById('closeModalBtn').addEventListener('click', closeInfoModal);
  document.getElementById('infoModal').addEventListener('click', function(e) {
    if (e.target.id === 'infoModal') {
      closeInfoModal();
    }
  });
  
  // Clear data modal buttons
  document.getElementById('keepDataBtn').addEventListener('click', keepOldData);
  document.getElementById('clearDataBtn').addEventListener('click', clearOldData);
  
  // Check if we should restore last app
  const lastApp = localStorage.getItem('lastActiveApp');
  if (lastApp && (lastApp === 'tipcalc' || lastApp === 'hourscalc' || lastApp === 'endofday')) {
    // Push initial state for back button
    history.pushState({ app: 'hub' }, '', '');
    loadApp(lastApp);
  }
});

function openInfoModal() {
  document.getElementById('infoModal').classList.add('show');
}

function closeInfoModal() {
  document.getElementById('infoModal').classList.remove('show');
}

function loadApp(appName) {
  document.getElementById('hubView').style.display = 'none';
  document.getElementById('appView').classList.add('active');
  
  // Save which app is active
  localStorage.setItem('lastActiveApp', appName);
  
  // Push a history state so back button works
  history.pushState({ app: appName }, '', '');
  
  const container = document.getElementById('appContainer');
  
  if (appName === 'tipcalc') {
    document.getElementById('currentAppTitle').textContent = 'Tip Breakdown';
    container.innerHTML = getTipCalcHTML();
    initTipCalc();
  } else if (appName === 'hourscalc') {
    document.getElementById('currentAppTitle').textContent = 'Hours Calculator';
    container.innerHTML = getHoursCalcHTML();
    initHoursCalc();
  } else if (appName === 'endofday') {
    document.getElementById('currentAppTitle').textContent = 'End of Day';
    container.innerHTML = getEndOfDayHTML();
    initEndOfDay();
  }
}

function backToHub() {
  document.getElementById('appView').classList.remove('active');
  document.getElementById('hubView').style.display = 'flex';
  document.getElementById('appContainer').innerHTML = '';
  
  // Clear last active app when returning to hub
  localStorage.removeItem('lastActiveApp');
  
  // Go back in history if we pushed a state
  if (history.state && history.state.app) {
    history.back();
  }
}

// Handle browser back button
window.addEventListener('popstate', function(e) {
  // If we're in an app view, go back to hub
  if (document.getElementById('appView').classList.contains('active')) {
    document.getElementById('appView').classList.remove('active');
    document.getElementById('hubView').style.display = 'flex';
    document.getElementById('appContainer').innerHTML = '';
    localStorage.removeItem('lastActiveApp');
  }
});

// ============================================
// TIP CALCULATOR
// ============================================

function getTipCalcHTML() {
  return `
<style>
  .tip-app {
    width: 100%;
    max-width: 420px;
    margin: 1rem auto;
    background-color: var(--card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .tip-primary-inputs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }
  
  .tip-field {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }
  
  .tip-field label {
    font-size: 0.8rem;
    color: var(--muted);
    font-weight: 500;
  }
  
  .tip-field input {
    width: 100%;
    background-color: #0c0e13;
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 0.65rem;
    font-size: 1.1rem;
    color: var(--text);
    font-weight: 600;
  }
  
  .tip-field input:focus {
    outline: none;
    border-color: var(--accent);
  }
  
  .tip-field input.error {
    border-color: var(--warning);
  }
  
  .tip-advanced {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }
  
  .tip-advanced .tip-field label {
    font-size: 0.75rem;
    opacity: 0.7;
  }
  
  .tip-advanced .tip-field input {
    padding: 0.5rem;
    font-size: 0.95rem;
    font-weight: 500;
  }
  
  .tip-secondary {
    display: grid;
    grid-template-columns: 1fr 1fr 40px;
    gap: 0.5rem;
    align-items: end;
    opacity: 0.6;
    margin-top: 0.5rem;
    transition: opacity 0.2s;
  }
  
  .tip-secondary:hover {
    opacity: 0.9;
  }
  
  .tip-secondary .tip-field {
    gap: 0.15rem;
  }
  
  .tip-secondary .tip-field label {
    font-size: 0.65rem;
    opacity: 0.7;
  }
  
  .tip-secondary .tip-field input {
    padding: 0.45rem;
    font-size: 0.85rem;
    background-color: rgba(12, 14, 19, 0.5);
  }
  
  .tip-secondary .tip-field input:focus {
    background-color: #0c0e13;
  }
  
  .tip-icon-btn {
    width: 40px;
    height: 40px;
    background-color: rgba(12, 14, 19, 0.5);
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--muted);
    cursor: pointer;
    transition: all 0.2s;
    font-size: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    opacity: 0.7;
  }
  
  .tip-icon-btn:hover {
    border-color: var(--accent);
    color: var(--accent);
    background-color: rgba(77, 163, 255, 0.1);
    opacity: 1;
  }
  
  .tip-icon-btn.saved {
    border-color: #51cf66;
    color: #51cf66;
    background-color: rgba(81, 207, 102, 0.2);
    animation: pulse 0.6s ease-in-out;
    opacity: 1;
  }
  
  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
  }
  
  .tip-warning {
    background-color: rgba(255, 107, 107, 0.1);
    border: 1px solid var(--warning);
    border-radius: 6px;
    padding: 0.6rem;
    color: var(--warning);
    font-size: 0.8rem;
    display: none;
    text-align: center;
    font-weight: 500;
  }
  
  .tip-warning.show {
    display: block;
  }
  
  .tip-outputs {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 0.5rem;
    margin-top: 0.5rem;
    padding: 0.75rem;
    background-color: #0c0e13;
    border: 2px solid var(--border);
    border-radius: 8px;
  }
  
  .tip-output {
    text-align: center;
    padding: 0.5rem;
    border-radius: 6px;
    transition: all 0.2s;
  }
  
  .tip-output span {
    display: block;
    font-size: 0.7rem;
    color: var(--muted);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 0.3rem;
  }
  
  .tip-output strong {
    display: block;
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--text);
  }
  
  .tip-output.highlight {
    background-color: rgba(77, 163, 255, 0.1);
    border: 2px solid var(--accent);
    padding: 0.4rem;
  }
  
  .tip-output.highlight span {
    color: var(--accent);
  }
  
  .tip-output.highlight strong {
    font-size: 1.5rem;
    color: var(--accent);
  }
  
  .tip-output.negative strong {
    color: var(--warning);
  }
  
  .tip-save-btn {
    background-color: var(--accent);
    color: white;
    border: none;
    border-radius: 6px;
    padding: 0.7rem;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    margin-top: 0.25rem;
  }
  
  .tip-save-btn:hover {
    background-color: #3d8fe6;
  }
  
  .tip-pig {
    margin-top: 0.5rem;
    text-align: center;
    font-size: 1.4rem;
    animation: bounce 2s ease-in-out infinite;
  }
  
  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-6px); }
  }
  
  @media (max-width: 400px) {
    .tip-app {
      padding: 0.75rem;
      gap: 0.6rem;
      margin: 0.5rem auto;
    }
    
    .tip-field input {
      padding: 0.55rem;
      font-size: 1rem;
    }
    
    .tip-outputs {
      padding: 0.5rem;
    }
    
    .tip-output strong {
      font-size: 1.1rem;
    }
    
    .tip-output.highlight strong {
      font-size: 1.3rem;
    }
  }
</style>

<div class="tip-app">
  <div class="tip-primary-inputs">
    <div class="tip-field">
      <label>Owed</label>
      <input id="owed" type="number" step="0.01" placeholder="0.00" inputmode="decimal" />
    </div>
    <div class="tip-field">
      <label>Total Net Sales</label>
      <input id="sales" type="number" step="0.01" placeholder="0.00" inputmode="decimal" />
    </div>
  </div>

  <div class="tip-advanced">
    <div class="tip-field">
      <label>Large Party (1%)</label>
      <input id="largeParty" type="number" step="0.01" placeholder="0.00" inputmode="decimal" />
    </div>
    <div class="tip-field">
      <label>Cash</label>
      <input id="cash" type="number" step="0.01" placeholder="0.00" inputmode="decimal" />
    </div>
  </div>

  <div class="tip-secondary">
    <div class="tip-field">
      <label>BoH %</label>
      <input id="bohPercent" type="number" step="0.01" inputmode="decimal" />
    </div>
    <div class="tip-field">
      <label>FoH %</label>
      <input id="fohPercent" type="number" step="0.01" inputmode="decimal" />
    </div>
    <button class="tip-icon-btn" id="savePreset" title="Save Preset">💾</button>
  </div>

  <div class="tip-warning" id="warningBox">
    ⚠️ Final tips are negative!
  </div>

  <div class="tip-outputs">
    <div class="tip-output">
      <span>BoH</span>
      <strong id="boh">$0.00</strong>
    </div>
    <div class="tip-output">
      <span>FoH</span>
      <strong id="foh">$0.00</strong>
    </div>
    <div class="tip-output highlight" id="tipsOutput">
      <span>Tips</span>
      <strong id="tips">$0.00</strong>
    </div>
  </div>

  <button class="tip-save-btn" id="saveToEndOfDay">
    → Send to End of Day
  </button>
  
  <button class="tip-icon-btn" id="clearBtn" title="Clear All" style="width: 100%; margin-top: 0.25rem;">
    🗑️ Clear All
  </button>

  <div class="tip-pig" id="pigDisplay"></div>
</div>

<div class="app-info-modal" id="tipCalcInfoModal">
  <div class="app-info-content">
    <div class="app-info-header">
      <span class="app-info-title">Field Explanations</span>
      <button class="app-info-close" id="closeTipCalcInfoBtn">✕</button>
    </div>
    <ul class="app-info-list">
      <li><strong>Owed</strong> - Total tips owed to you from the POS system</li>
      <li><strong>Total Net Sales</strong> - Your total net sales for the shift</li>
      <li><strong>Large Party (1%)</strong> - Sales from large party (1% is subtracted from tips)</li>
      <li><strong>Cash</strong> - Cash tips received (added to your final tips)</li>
      <li><strong>BoH %</strong> - Percentage of sales going to Back of House staff</li>
      <li><strong>FoH %</strong> - Percentage of sales going to Support staff</li>
      <li><strong>Save Button (💾)</strong> - Saves BoH% and FoH%</li>
      <li><strong>BoH (output)</strong> - Calculated amount going to Back of House</li>
      <li><strong>FoH (output)</strong> - Calculated amount going to Support</li>
      <li><strong>Tips (output)</strong> - Final tips to the tip pool</li>
    </ul>
    <div class="app-info-formula">
      <strong>Formula:</strong> Tips = Owed - BoH - FoH - (Large Party × 1%) + Cash
    </div>
  </div>
</div>`;
}

function initTipCalc() {
  const DEFAULT_BOH = 5;
  const DEFAULT_FOH = 3;

  const owed = document.getElementById("owed");
  const sales = document.getElementById("sales");
  const bohPercent = document.getElementById("bohPercent");
  const fohPercent = document.getElementById("fohPercent");
  const largeParty = document.getElementById("largeParty");
  const cash = document.getElementById("cash");
  const bohEl = document.getElementById("boh");
  const fohEl = document.getElementById("foh");
  const tipsEl = document.getElementById("tips");
  const tipsOutput = document.getElementById("tipsOutput");
  const warningBox = document.getElementById("warningBox");
  const pigDisplay = document.getElementById("pigDisplay");
  const savePresetBtn = document.getElementById("savePreset");
  const clearBtn = document.getElementById("clearBtn");

  const round2 = n => Math.round(n * 100) / 100;
  const usd = n => "$" + round2(n).toFixed(2);

  let currentTipValue = 0;

  function validateInput(input) {
    const value = parseFloat(input.value);
    if (input.value && (isNaN(value) || value < 0)) {
      input.classList.add('error');
      return false;
    } else {
      input.classList.remove('error');
      return true;
    }
  }

  function calculate() {
    const validInputs = [
      validateInput(owed),
      validateInput(sales),
      validateInput(bohPercent),
      validateInput(fohPercent)
    ].every(v => v);

    if (!validInputs) return;

    const o = parseFloat(owed.value) || 0;
    const s = parseFloat(sales.value) || 0;
    const bohP = (parseFloat(bohPercent.value) || 0) / 100;
    const fohP = (parseFloat(fohPercent.value) || 0) / 100;
    const lp = parseFloat(largeParty.value) || 0;
    const c = parseFloat(cash.value) || 0;

    const boh = s * bohP;
    const foh = s * fohP;
    const largePartyTip = lp * 0.01;
    const tips = o - (boh + foh) - largePartyTip + c;

    currentTipValue = tips;

    bohEl.textContent = usd(boh);
    fohEl.textContent = usd(foh);
    tipsEl.textContent = usd(tips);

    if (tips < 0) {
      warningBox.classList.add('show');
      tipsOutput.classList.add('negative');
    } else {
      warningBox.classList.remove('show');
      tipsOutput.classList.remove('negative');
    }
  }

  function loadPreset() {
    const saved = localStorage.getItem('tipCalcPreset');
    if (saved) {
      const preset = JSON.parse(saved);
      bohPercent.value = preset.boh;
      fohPercent.value = preset.foh;
    } else {
      bohPercent.value = DEFAULT_BOH;
      fohPercent.value = DEFAULT_FOH;
    }
    calculate();
  }

  savePresetBtn.addEventListener('click', function() {
    const bohVal = parseFloat(bohPercent.value) || 0;
    const fohVal = parseFloat(fohPercent.value) || 0;
    
    if (bohVal >= 0 && fohVal >= 0) {
      localStorage.setItem('tipCalcPreset', JSON.stringify({
        boh: bohVal,
        foh: fohVal
      }));
      savePresetBtn.textContent = '✓';
      savePresetBtn.classList.add('saved');
      setTimeout(function() {
        savePresetBtn.textContent = '💾';
        savePresetBtn.classList.remove('saved');
      }, 1500);
    }
  });

  clearBtn.addEventListener('click', function() {
    owed.value = '';
    sales.value = '';
    bohPercent.value = '';
    fohPercent.value = '';
    loadPreset();
  });

  const saveToEndOfDayBtn = document.getElementById('saveToEndOfDay');
  saveToEndOfDayBtn.addEventListener('click', function() {
    if (currentTipValue > 0) {
      const saved = localStorage.getItem('endOfDayData');
      let data = {
        sessionStartTime: Date.now(),
        totalHours: 0,
        totalTips: 0,
        hoursEntries: [],
        tipsEntries: []
      };
      
      if (saved) {
        data = JSON.parse(saved);
        if (!data.sessionStartTime) {
          data.sessionStartTime = Date.now();
        }
      }
      
      const roundedTip = Math.round(currentTipValue * 100) / 100;
      data.tipsEntries.push(roundedTip);
      data.totalTips += roundedTip;
      
      localStorage.setItem('endOfDayData', JSON.stringify(data));
      
      saveToEndOfDayBtn.textContent = '✓ Sent to End of Day!';
      saveToEndOfDayBtn.style.backgroundColor = '#51cf66';
      setTimeout(function() {
        saveToEndOfDayBtn.textContent = '→ Send to End of Day';
        saveToEndOfDayBtn.style.backgroundColor = 'var(--accent)';
      }, 2000);
    } else {
      saveToEndOfDayBtn.textContent = '⚠️ Calculate tips first';
      setTimeout(function() {
        saveToEndOfDayBtn.textContent = '→ Send to End of Day';
      }, 2000);
    }
  });

  const pigs = ["🐽", "🐖", "🐷"];
  const money = ["💸", "💰", "💵"];
  pigDisplay.textContent = pigs[Math.floor(Math.random() * pigs.length)] + 
                          money[Math.floor(Math.random() * money.length)];

  [owed, sales, bohPercent, fohPercent, largeParty, cash].forEach(function(el) {
    el.addEventListener("input", calculate);
  });

  // Info modal - use header button
  const appInfoBtn = document.getElementById('appInfoBtn');
  const tipCalcInfoModal = document.getElementById('tipCalcInfoModal');
  const closeTipCalcInfoBtn = document.getElementById('closeTipCalcInfoBtn');
  
  appInfoBtn.onclick = function() {
    tipCalcInfoModal.classList.add('show');
  };
  
  closeTipCalcInfoBtn.addEventListener('click', function() {
    tipCalcInfoModal.classList.remove('show');
  });
  
  tipCalcInfoModal.addEventListener('click', function(e) {
    if (e.target === tipCalcInfoModal) {
      tipCalcInfoModal.classList.remove('show');
    }
  });

  loadPreset();
}

// ============================================
// HOURS CALCULATOR
// ============================================

function getHoursCalcHTML() {
  return `
<style>
  .hours-app {
    width: 100%;
    max-width: 420px;
    margin: 2rem auto;
    background-color: var(--card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .hours-field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .hours-field label {
    font-size: 0.9rem;
    color: var(--muted);
    font-weight: 500;
  }
  
  .hours-field input {
    width: 100%;
    background-color: #0c0e13;
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 0.6rem;
    font-size: 1rem;
    color: var(--text);
  }
  
  .hours-field input:focus {
    outline: none;
    border-color: var(--accent);
  }
  
  .hours-field.primary input {
    border: 2px solid var(--border);
    padding: 0.75rem;
    font-size: 1.1rem;
    font-weight: 600;
  }
  
  .hours-field.primary input:focus {
    border-color: var(--accent);
  }
  
  .hours-field.secondary {
    opacity: 0.7;
  }
  
  .hours-field.secondary label {
    font-size: 0.8rem;
  }
  
  .hours-field.secondary input {
    padding: 0.5rem;
    font-size: 0.9rem;
  }
  
  .hours-output {
    background-color: #0c0e13;
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 0.6rem;
  }
  
  .hours-output strong {
    font-size: 1.05rem;
  }
  
  .hours-field.deemphasized {
    opacity: 0.5;
  }
  
  .hours-field.deemphasized label {
    font-size: 0.75rem;
  }
  
  .hours-field.deemphasized .hours-output {
    padding: 0.4rem;
  }
  
  .hours-field.deemphasized .hours-output strong {
    font-size: 0.9rem;
  }
  
  .hours-field.emphasized {
    margin-top: 0.5rem;
  }
  
  .hours-field.emphasized label {
    font-size: 1rem;
    font-weight: 600;
    color: var(--accent);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .hours-field.emphasized .hours-output {
    background-color: #0c0e13;
    border: 2px solid var(--accent);
    padding: 1rem;
    text-align: center;
  }
  
  .hours-field.emphasized .hours-output strong {
    font-size: 2rem;
    font-weight: 700;
    color: var(--accent);
  }
  
  .hours-bounce {
    margin-top: 15px;
    font-size: 2em;
    animation: bounce 1.5s ease-in-out infinite;
    text-align: center;
  }
  
  .hours-save-btn {
    background-color: var(--accent);
    color: white;
    border: none;
    border-radius: 8px;
    padding: 0.75rem;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    margin-top: 0.5rem;
  }
  
  .hours-save-btn:hover {
    background-color: #3d8fe6;
  }
  
  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-6px); }
  }
</style>

<div class="hours-app">
  <div class="hours-field primary">
    <label>Start Time</label>
    <input id="start" type="time" />
  </div>

  <div class="hours-field primary">
    <label>End Time</label>
    <input id="end" type="time" />
  </div>

  <div class="hours-field secondary">
    <label>Break Time (minutes)</label>
    <input id="breakTime" type="number" min="0" step="1" placeholder="0" value="0" />
  </div>

  <div class="hours-field deemphasized">
    <label>Exact Time Elapsed</label>
    <div class="hours-output">
      <strong id="exactTime">0h 0m</strong>
    </div>
  </div>

  <div class="hours-field deemphasized">
    <label>Time After Break</label>
    <div class="hours-output">
      <strong id="afterBreak">0h 0m</strong>
    </div>
  </div>

  <div class="hours-field emphasized">
    <label>Rounded Time</label>
    <div class="hours-output">
      <strong id="roundedTime">0.00h</strong>
    </div>
  </div>

  <button class="hours-save-btn" id="saveHoursToEndOfDay">
    → Send to End of Day
  </button>

  <div class="hours-bounce" id="emojiDisplay"></div>
</div>

<div class="app-info-modal" id="hoursCalcInfoModal">
  <div class="app-info-content">
    <div class="app-info-header">
      <span class="app-info-title">Field Explanations</span>
      <button class="app-info-close" id="closeHoursCalcInfoBtn">✕</button>
    </div>
    <ul class="app-info-list">
      <li><strong>Start Time</strong> - When your shift began</li>
      <li><strong>End Time</strong> - When your shift ended</li>
      <li><strong>Break Time</strong> - Minutes of unpaid break (subtracted from total hours)</li>
      <li><strong>Exact Time Elapsed</strong> - Total time from start to end</li>
      <li><strong>Time After Break</strong> - Working time minus break</li>
      <li><strong>Rounded Time ⭐</strong> - Hours rounded to nearest quarter hour (0.25h increments). This gets sent to the End of Day Calculator.</li>
    </ul>
  </div>
</div>`;
}

function initHoursCalc() {
  const pigEmojis = ["🐽", "🐖", "🐷"];
  const clockEmojis = ["⏰", "🕐", "⏳"];
  document.getElementById('emojiDisplay').textContent = 
    pigEmojis[Math.floor(Math.random() * pigEmojis.length)] +
    clockEmojis[Math.floor(Math.random() * clockEmojis.length)];

  const startInput = document.getElementById('start');
  const endInput = document.getElementById('end');
  const breakInput = document.getElementById('breakTime');
  const exactDiv = document.getElementById('exactTime');
  const afterBreakDiv = document.getElementById('afterBreak');
  const roundedDiv = document.getElementById('roundedTime');
  
  let currentRoundedHours = 0;

  function updateHours() {
    const startVal = startInput.value;
    const endVal = endInput.value;
    const breakMin = parseInt(breakInput.value) || 0;

    if (!startVal || !endVal) {
      exactDiv.textContent = "0h 0m";
      afterBreakDiv.textContent = "0h 0m";
      roundedDiv.textContent = "0.00h";
      currentRoundedHours = 0;
      return;
    }

    const startParts = startVal.split(':').map(Number);
    const endParts = endVal.split(':').map(Number);
    const startH = startParts[0];
    const startM = startParts[1];
    const endH = endParts[0];
    const endM = endParts[1];

    var start = new Date();
    start.setHours(startH, startM, 0, 0);

    var end = new Date();
    end.setHours(endH, endM, 0, 0);

    if (end < start) {
      end.setDate(end.getDate() + 1);
    }

    const diffMs = end - start;
    const totalMin = Math.floor(diffMs / 1000 / 60);
    const diffHrs = Math.floor(totalMin / 60);
    const diffMin = totalMin % 60;

    exactDiv.textContent = diffHrs + "h " + diffMin + "m";

    const workMin = Math.max(0, totalMin - breakMin);
    const workHrs = Math.floor(workMin / 60);
    const workMins = workMin % 60;

    afterBreakDiv.textContent = workHrs + "h " + workMins + "m";

    var decimalHours = workMin / 60;
    const roundedHours = Math.floor(decimalHours * 4) / 4;
    
    currentRoundedHours = roundedHours;
    roundedDiv.textContent = roundedHours.toFixed(2) + "h";
  }

  startInput.addEventListener('change', updateHours);
  endInput.addEventListener('change', updateHours);
  breakInput.addEventListener('input', updateHours);

  // Info modal - use header button
  const appInfoBtn = document.getElementById('appInfoBtn');
  const hoursCalcInfoModal = document.getElementById('hoursCalcInfoModal');
  const closeHoursCalcInfoBtn = document.getElementById('closeHoursCalcInfoBtn');
  
  appInfoBtn.onclick = function() {
    hoursCalcInfoModal.classList.add('show');
  };
  
  closeHoursCalcInfoBtn.addEventListener('click', function() {
    hoursCalcInfoModal.classList.remove('show');
  });
  
  hoursCalcInfoModal.addEventListener('click', function(e) {
    if (e.target === hoursCalcInfoModal) {
      hoursCalcInfoModal.classList.remove('show');
    }
  });

  const saveHoursBtn = document.getElementById('saveHoursToEndOfDay');
  saveHoursBtn.addEventListener('click', function() {
    if (currentRoundedHours > 0) {
      const saved = localStorage.getItem('endOfDayData');
      let data = {
        sessionStartTime: Date.now(),
        totalHours: 0,
        totalTips: 0,
        hoursEntries: [],
        tipsEntries: []
      };
      
      if (saved) {
        data = JSON.parse(saved);
        if (!data.sessionStartTime) {
          data.sessionStartTime = Date.now();
        }
      }
      
      data.hoursEntries.push(currentRoundedHours);
      data.totalHours += currentRoundedHours;
      
      localStorage.setItem('endOfDayData', JSON.stringify(data));
      
      saveHoursBtn.textContent = '✓ Sent to End of Day!';
      saveHoursBtn.style.backgroundColor = '#51cf66';
      setTimeout(function() {
        saveHoursBtn.textContent = '→ Send to End of Day';
        saveHoursBtn.style.backgroundColor = 'var(--accent)';
      }, 2000);
    } else {
      saveHoursBtn.textContent = '⚠️ Calculate hours first';
      setTimeout(function() {
        saveHoursBtn.textContent = '→ Send to End of Day';
      }, 2000);
    }
  });

  updateHours();
}

// ============================================
// END OF DAY CALCULATOR
// ============================================

function getEndOfDayHTML() {
  return `
<style>
  .eod-app {
    width: 100%;
    max-width: 420px;
    margin: 1rem auto;
    background-color: var(--card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .eod-field {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }
  
  .eod-field label {
    font-size: 0.8rem;
    color: var(--muted);
    font-weight: 500;
  }
  
  .eod-input-group {
    display: flex;
    gap: 0.5rem;
  }
  
  .eod-field input {
    flex: 1;
    background-color: #0c0e13;
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 0.65rem;
    font-size: 1.1rem;
    color: var(--text);
    font-weight: 600;
  }
  
  .eod-field input:focus {
    outline: none;
    border-color: var(--accent);
  }
  
  .eod-add-btn {
    background-color: var(--accent);
    border: none;
    border-radius: 6px;
    padding: 0.65rem 1rem;
    color: white;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 600;
    transition: all 0.2s;
    white-space: nowrap;
  }
  
  .eod-add-btn:hover {
    background-color: #3d8fe6;
  }
  
  .eod-summary {
    background-color: #0c0e13;
    border: 2px solid var(--accent);
    border-radius: 8px;
    padding: 1rem;
    margin-top: 0.5rem;
  }
  
  .eod-summary-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 0.4rem 0;
  }
  
  .eod-summary-label {
    font-size: 0.9rem;
    color: var(--muted);
    font-weight: 500;
  }
  
  .eod-summary-value {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--text);
  }
  
  .eod-hourly {
    font-size: 1.8rem !important;
    color: var(--accent) !important;
    font-weight: 700 !important;
  }
  
  .eod-breakdown-btn {
    width: 100%;
    background-color: rgba(77, 163, 255, 0.1);
    border: 1px solid var(--accent);
    border-radius: 6px;
    padding: 0.5rem;
    color: var(--accent);
    cursor: pointer;
    font-size: 0.8rem;
    font-weight: 600;
    transition: all 0.2s;
  }
  
  .eod-breakdown-btn:hover {
    background-color: rgba(77, 163, 255, 0.2);
  }
  
  .eod-breakdown-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    background-color: rgba(77, 163, 255, 0.05);
  }
  
  .eod-breakdown-btn:disabled:hover {
    background-color: rgba(77, 163, 255, 0.05);
  }
  
  .eod-breakdown-modal {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.8);
    z-index: 1000;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }
  
  .eod-breakdown-modal.show {
    display: flex;
  }
  
  .eod-breakdown-content {
    background-color: var(--card);
    border: 2px solid var(--accent);
    border-radius: 12px;
    padding: 1.5rem;
    max-width: 400px;
    width: 100%;
    max-height: 80vh;
    overflow-y: auto;
  }
  
  .eod-breakdown-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 2px solid var(--border);
  }
  
  .eod-breakdown-title {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--accent);
  }
  
  .eod-breakdown-close {
    background-color: transparent;
    border: 1px solid var(--border);
    color: var(--text);
    padding: 0.3rem 0.6rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
    transition: all 0.2s;
  }
  
  .eod-breakdown-close:hover {
    border-color: var(--warning);
    color: var(--warning);
  }
  
  .eod-breakdown-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .eod-breakdown-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: #0c0e13;
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 0.75rem;
  }
  
  .eod-breakdown-item-left {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }
  
  .eod-breakdown-item-label {
    font-size: 0.75rem;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .eod-breakdown-item-calc {
    font-size: 0.85rem;
    color: var(--muted);
    font-family: monospace;
  }
  
  .eod-breakdown-item-value {
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--accent);
  }
  
  .eod-breakdown-total {
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 2px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .eod-breakdown-total-label {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text);
  }
  
  .eod-breakdown-total-value {
    font-size: 1.4rem;
    font-weight: 700;
    color: var(--accent);
  }
  
  .eod-section {
    margin-top: 0.5rem;
  }
  
  .eod-section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }
  
  .eod-section-title {
    font-size: 0.85rem;
    color: var(--muted);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .eod-count {
    font-size: 0.75rem;
    color: var(--muted);
    background-color: #0c0e13;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
  }
  
  .eod-list {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  
  .eod-list-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: #0c0e13;
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 0.6rem;
    transition: border-color 0.2s;
  }
  
  .eod-list-item:hover {
    border-color: var(--accent);
  }
  
  .eod-item-label {
    font-size: 0.85rem;
    color: var(--muted);
  }
  
  .eod-item-value {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text);
    margin-right: 0.5rem;
  }
  
  .eod-item-actions {
    display: flex;
    gap: 0.3rem;
  }
  
  .eod-item-btn {
    background-color: transparent;
    border: 1px solid var(--border);
    color: var(--text);
    padding: 0.3rem 0.6rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.75rem;
    font-weight: 500;
    transition: all 0.2s;
  }
  
  .eod-item-btn:hover {
    border-color: var(--accent);
    background-color: rgba(77, 163, 255, 0.1);
  }
  
  .eod-item-btn.delete:hover {
    border-color: var(--warning);
    color: var(--warning);
    background-color: rgba(255, 107, 107, 0.1);
  }
  
  .eod-empty {
    text-align: center;
    color: var(--muted);
    font-size: 0.85rem;
    padding: 1rem;
    background-color: #0c0e13;
    border-radius: 6px;
    border: 1px dashed var(--border);
  }
  
  .eod-reset-btn {
    background-color: #0c0e13;
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 0.65rem;
    color: var(--text);
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.85rem;
    font-weight: 500;
    margin-top: 0.5rem;
  }
  
  .eod-reset-btn:hover {
    border-color: var(--warning);
    color: var(--warning);
    background-color: rgba(255, 107, 107, 0.1);
  }
  
  .eod-undo-btn {
    background-color: #0c0e13;
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 0.65rem;
    color: var(--text);
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.85rem;
    font-weight: 500;
  }
  
  .eod-undo-btn:hover {
    border-color: var(--accent);
    background-color: rgba(77, 163, 255, 0.2);
  }
  
  .eod-pig {
    margin-top: 0.5rem;
    text-align: center;
    font-size: 1.4rem;
    animation: bounce 2s ease-in-out infinite;
  }
  
  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-6px); }
  }
  
  @media (max-width: 400px) {
    .eod-app {
      padding: 0.75rem;
      gap: 0.6rem;
      margin: 0.5rem auto;
    }
    
    .eod-field input {
      padding: 0.55rem;
      font-size: 1rem;
    }
    
    .eod-add-btn {
      padding: 0.55rem 0.8rem;
      font-size: 0.85rem;
    }
    
    .eod-hourly {
      font-size: 1.5rem !important;
    }
    
    .eod-breakdown-content {
      padding: 1rem;
    }
    
    .eod-breakdown-item {
      padding: 0.6rem;
    }
    
    .eod-breakdown-item-value {
      font-size: 1.1rem;
    }
  }
</style>

<div class="eod-app">
  <div class="eod-field">
    <label>Add Hours Worked</label>
    <div class="eod-input-group">
      <input type="number" id="hoursInput" placeholder="0.00" step="0.01" inputmode="decimal" />
      <button class="eod-add-btn" id="addHoursBtn">Add</button>
    </div>
  </div>
  
  <div class="eod-field">
    <label>Add Tips Earned</label>
    <div class="eod-input-group">
      <input type="number" id="tipsInput" placeholder="0.00" step="0.01" inputmode="decimal" />
      <button class="eod-add-btn" id="addTipsBtn">Add</button>
    </div>
  </div>
  
  <div class="eod-summary">
    <div class="eod-summary-row">
      <span class="eod-summary-label">Total Hours</span>
      <span class="eod-summary-value" id="totalHours">0.00</span>
    </div>
    <div class="eod-summary-row">
      <span class="eod-summary-label">Total Tips</span>
      <span class="eod-summary-value" id="totalTips">$0.00</span>
    </div>
    <div class="eod-summary-row" style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--border);">
      <span class="eod-summary-label">Hourly Rate</span>
      <span class="eod-summary-value eod-hourly" id="hourlyRate">$0.00</span>
    </div>
  </div>
  
  <button class="eod-breakdown-btn" id="showBreakdownBtn">
    📊 View Tips Breakdown by Entry
  </button>
  
  <div class="eod-breakdown-modal" id="breakdownModal">
    <div class="eod-breakdown-content">
      <div class="eod-breakdown-header">
        <span class="eod-breakdown-title">Tips Breakdown</span>
        <button class="eod-breakdown-close" id="closeBreakdownBtn">✕</button>
      </div>
      <div class="eod-breakdown-list" id="breakdownList">
      </div>
    </div>
  </div>
  
  <div class="eod-section">
    <div class="eod-section-header">
      <span class="eod-section-title">Hours Entries</span>
      <span class="eod-count" id="hoursCount">0 entries</span>
    </div>
    <div class="eod-list" id="hoursList">
      <div class="eod-empty">No hours added yet</div>
    </div>
  </div>
  
  <div class="eod-section">
    <div class="eod-section-header">
      <span class="eod-section-title">Tips Entries</span>
      <span class="eod-count" id="tipsCount">0 entries</span>
    </div>
    <div class="eod-list" id="tipsList">
      <div class="eod-empty">No tips added yet</div>
    </div>
  </div>
  
  <button class="eod-reset-btn" id="resetBtn">Clear All Data</button>
  
  <button class="eod-undo-btn" id="undoBtn" style="display: none; margin-top: 0.5rem; background-color: rgba(77, 163, 255, 0.1); border-color: var(--accent); color: var(--accent);">
    ↶ Undo Last Delete
  </button>
  
  <div class="eod-pig" id="pigDisplay"></div>
</div>

<div class="app-info-modal" id="eodInfoModal">
  <div class="app-info-content">
    <div class="app-info-header">
      <span class="app-info-title">Field Explanations</span>
      <button class="app-info-close" id="closeEodInfoBtn">✕</button>
    </div>
    <ul class="app-info-list">
      <li><strong>Add Hours Worked</strong> - Enter rounded hours</li>
      <li><strong>Add Tips Earned</strong> - Enter final tips for the tip pool</li>
      <li><strong>Total Hours</strong> - Sum of all hours entries across shifts</li>
      <li><strong>Total Tips</strong> - Sum of all tips entries</li>
      <li><strong>Hourly Rate</strong> - Average earnings per hour (Total Tips ÷ Total Hours)</li>
      <li><strong>View Tips Breakdown</strong> - Shows calculated total tips based on the hourly rate</li>
      <li><strong>Hours/Tips Entries</strong> - Individual shift records (can edit or delete)</li>
    </ul>
  </div>
</div>`;
}

function initEndOfDay() {
  const pigEmojis = ["🐽", "🐖", "🐷"];
  const customEmojis = ["🍹", "🍺", "🍸"];
  document.getElementById('pigDisplay').textContent = 
    pigEmojis[Math.floor(Math.random() * pigEmojis.length)] +
    customEmojis[Math.floor(Math.random() * customEmojis.length)];

  var totalHours = 0;
  var totalTips = 0;
  var hoursEntries = [];
  var tipsEntries = [];
  var lastDeletedItem = null;

  function loadData() {
    const saved = localStorage.getItem('endOfDayData');
    if (saved) {
      const data = JSON.parse(saved);
      totalHours = data.totalHours || 0;
      totalTips = data.totalTips || 0;
      hoursEntries = data.hoursEntries || [];
      tipsEntries = data.tipsEntries || [];
      updateDisplay();
    }
  }

  function saveData() {
    const data = {
      sessionStartTime: totalHours === 0 && totalTips === 0 ? null : (function() {
        const saved = localStorage.getItem('endOfDayData');
        if (saved) {
          const existing = JSON.parse(saved);
          return existing.sessionStartTime || Date.now();
        }
        return Date.now();
      })(),
      totalHours: totalHours,
      totalTips: totalTips,
      hoursEntries: hoursEntries,
      tipsEntries: tipsEntries
    };
    localStorage.setItem('endOfDayData', JSON.stringify(data));
  }

  function updateDisplay() {
    document.getElementById('totalHours').textContent = totalHours.toFixed(2);
    document.getElementById('totalTips').textContent = "$" + totalTips.toFixed(2);
    
    const hourlyRate = totalHours > 0 ? totalTips / totalHours : 0;
    document.getElementById('hourlyRate').textContent = "$" + hourlyRate.toFixed(2);
    
    document.getElementById('hoursCount').textContent = 
      hoursEntries.length + " " + (hoursEntries.length === 1 ? 'entry' : 'entries');
    document.getElementById('tipsCount').textContent = 
      tipsEntries.length + " " + (tipsEntries.length === 1 ? 'entry' : 'entries');
    
    renderHoursList();
    renderTipsList();
    
    const undoBtn = document.getElementById('undoBtn');
    if (lastDeletedItem) {
      undoBtn.style.display = 'block';
    } else {
      undoBtn.style.display = 'none';
    }
    
    const breakdownBtn = document.getElementById('showBreakdownBtn');
    if (hoursEntries.length === 0 || totalHours === 0) {
      breakdownBtn.disabled = true;
    } else {
      breakdownBtn.disabled = false;
    }
  }

  function renderHoursList() {
    const listEl = document.getElementById('hoursList');
    if (hoursEntries.length === 0) {
      listEl.innerHTML = '<div class="eod-empty">No hours added yet</div>';
      return;
    }
    
    var html = '';
    for (var i = 0; i < hoursEntries.length; i++) {
      html += '<div class="eod-list-item">';
      html += '<div>';
      html += '<span class="eod-item-label">Entry ' + (i + 1) + '</span> ';
      html += '<span class="eod-item-value">' + hoursEntries[i].toFixed(2) + 'h</span>';
      html += '</div>';
      html += '<div class="eod-item-actions">';
      html += '<button class="eod-item-btn" data-index="' + i + '" data-type="hours-edit">Edit</button>';
      html += '<button class="eod-item-btn delete" data-index="' + i + '" data-type="hours-delete">×</button>';
      html += '</div>';
      html += '</div>';
    }
    listEl.innerHTML = html;
    
    listEl.querySelectorAll('[data-type="hours-edit"]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        editHoursEntry(parseInt(this.getAttribute('data-index')));
      });
    });
    
    listEl.querySelectorAll('[data-type="hours-delete"]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        deleteHoursEntry(parseInt(this.getAttribute('data-index')));
      });
    });
  }

  function renderTipsList() {
    const listEl = document.getElementById('tipsList');
    if (tipsEntries.length === 0) {
      listEl.innerHTML = '<div class="eod-empty">No tips added yet</div>';
      return;
    }
    
    var html = '';
    for (var i = 0; i < tipsEntries.length; i++) {
      html += '<div class="eod-list-item">';
      html += '<div>';
      html += '<span class="eod-item-label">Entry ' + (i + 1) + '</span> ';
      html += '<span class="eod-item-value">$' + tipsEntries[i].toFixed(2) + '</span>';
      html += '</div>';
      html += '<div class="eod-item-actions">';
      html += '<button class="eod-item-btn" data-index="' + i + '" data-type="tips-edit">Edit</button>';
      html += '<button class="eod-item-btn delete" data-index="' + i + '" data-type="tips-delete">×</button>';
      html += '</div>';
      html += '</div>';
    }
    listEl.innerHTML = html;
    
    listEl.querySelectorAll('[data-type="tips-edit"]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        editTipsEntry(parseInt(this.getAttribute('data-index')));
      });
    });
    
    listEl.querySelectorAll('[data-type="tips-delete"]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        deleteTipsEntry(parseInt(this.getAttribute('data-index')));
      });
    });
  }

  document.getElementById('addHoursBtn').addEventListener('click', function() {
    const input = document.getElementById('hoursInput');
    const value = parseFloat(input.value);
    
    if (input.value && !isNaN(value) && value > 0) {
      hoursEntries.push(value);
      totalHours += value;
      input.value = '';
      lastDeletedItem = null;
      saveData();
      updateDisplay();
      
      setTimeout(function() {
        input.focus();
      }, 50);
    }
  });

  document.getElementById('addTipsBtn').addEventListener('click', function() {
    const input = document.getElementById('tipsInput');
    const value = parseFloat(input.value);
    
    if (input.value && !isNaN(value) && value >= 0) {
      const rounded = Math.round(value * 100) / 100;
      tipsEntries.push(rounded);
      totalTips += rounded;
      input.value = '';
      lastDeletedItem = null;
      saveData();
      updateDisplay();
      
      setTimeout(function() {
        input.focus();
      }, 50);
    }
  });

  document.getElementById('hoursInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      document.getElementById('addHoursBtn').click();
    }
  });

  document.getElementById('tipsInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      document.getElementById('addTipsBtn').click();
    }
  });

  function editHoursEntry(index) {
    const currentValue = hoursEntries[index];
    const newValue = prompt("Edit hours (Entry " + (index + 1) + "):", currentValue);
    
    if (newValue !== null && !isNaN(newValue) && parseFloat(newValue) > 0) {
      totalHours = totalHours - currentValue + parseFloat(newValue);
      hoursEntries[index] = parseFloat(newValue);
      saveData();
      updateDisplay();
    }
  }

  function deleteHoursEntry(index) {
    lastDeletedItem = {
      type: 'hours',
      index: index,
      value: hoursEntries[index]
    };
    
    totalHours -= hoursEntries[index];
    hoursEntries.splice(index, 1);
    saveData();
    updateDisplay();
  }

  function editTipsEntry(index) {
    const currentValue = tipsEntries[index];
    const newValue = prompt("Edit tips (Entry " + (index + 1) + "):", currentValue.toFixed(2));
    
    if (newValue !== null && !isNaN(newValue) && parseFloat(newValue) >= 0) {
      const rounded = Math.round(parseFloat(newValue) * 100) / 100;
      totalTips = totalTips - currentValue + rounded;
      tipsEntries[index] = rounded;
      saveData();
      updateDisplay();
    }
  }

  function deleteTipsEntry(index) {
    lastDeletedItem = {
      type: 'tips',
      index: index,
      value: tipsEntries[index]
    };
    
    totalTips -= tipsEntries[index];
    tipsEntries.splice(index, 1);
    saveData();
    updateDisplay();
  }
  
  document.getElementById('undoBtn').addEventListener('click', function() {
    if (!lastDeletedItem) return;
    
    if (lastDeletedItem.type === 'hours') {
      hoursEntries.splice(lastDeletedItem.index, 0, lastDeletedItem.value);
      totalHours += lastDeletedItem.value;
    } else if (lastDeletedItem.type === 'tips') {
      tipsEntries.splice(lastDeletedItem.index, 0, lastDeletedItem.value);
      totalTips += lastDeletedItem.value;
    }
    
    lastDeletedItem = null;
    saveData();
    updateDisplay();
  });

  document.getElementById('resetBtn').addEventListener('click', function() {
    if (confirm('Clear all hours and tips data? This cannot be undone.')) {
      totalHours = 0;
      totalTips = 0;
      hoursEntries = [];
      tipsEntries = [];
      lastDeletedItem = null;
      localStorage.removeItem('endOfDayData');
      updateDisplay();
    }
  });

  const showBreakdownBtn = document.getElementById('showBreakdownBtn');
  const breakdownModal = document.getElementById('breakdownModal');
  const closeBreakdownBtn = document.getElementById('closeBreakdownBtn');
  
  showBreakdownBtn.addEventListener('click', function() {
    showBreakdown();
  });
  
  closeBreakdownBtn.addEventListener('click', function() {
    breakdownModal.classList.remove('show');
  });
  
  breakdownModal.addEventListener('click', function(e) {
    if (e.target === breakdownModal) {
      breakdownModal.classList.remove('show');
    }
  });
  
  // Info modal - use header button
  const appInfoBtn = document.getElementById('appInfoBtn');
  const eodInfoModal = document.getElementById('eodInfoModal');
  const closeEodInfoBtn = document.getElementById('closeEodInfoBtn');
  
  appInfoBtn.onclick = function() {
    eodInfoModal.classList.add('show');
  };
  
  closeEodInfoBtn.addEventListener('click', function() {
    eodInfoModal.classList.remove('show');
  });
  
  eodInfoModal.addEventListener('click', function(e) {
    if (e.target === eodInfoModal) {
      eodInfoModal.classList.remove('show');
    }
  });
  
  function showBreakdown() {
    if (hoursEntries.length === 0 || totalHours === 0) {
      return;
    }
    
    const hourlyRate = totalHours > 0 ? totalTips / totalHours : 0;
    const breakdownList = document.getElementById('breakdownList');
    
    var html = '';
    var calculatedTotal = 0;
    
    for (var i = 0; i < hoursEntries.length; i++) {
      const hours = hoursEntries[i];
      const tipsForEntry = hours * hourlyRate;
      calculatedTotal += tipsForEntry;
      
      html += '<div class="eod-breakdown-item">';
      html += '<div class="eod-breakdown-item-left">';
      html += '<span class="eod-breakdown-item-label">Entry ' + (i + 1) + '</span>';
      html += '<span class="eod-breakdown-item-calc">' + hours.toFixed(2) + 'h × $' + hourlyRate.toFixed(2) + '/h</span>';
      html += '</div>';
      html += '<span class="eod-breakdown-item-value">$' + tipsForEntry.toFixed(2) + '</span>';
      html += '</div>';
    }
    
    html += '<div class="eod-breakdown-total">';
    html += '<span class="eod-breakdown-total-label">Total Calculated</span>';
    html += '<span class="eod-breakdown-total-value">$' + calculatedTotal.toFixed(2) + '</span>';
    html += '</div>';
    
    breakdownList.innerHTML = html;
    breakdownModal.classList.add('show');
  }

  loadData();
}

// ============================================
// SERVICE WORKER & PWA
// ============================================

if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('./service-worker.js')
      .then(function(registration) {
        console.log('Service Worker registered:', registration.scope);
        
        registration.addEventListener('updatefound', function() {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', function() {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('New version available! Refresh to update.');
            }
          });
        });
      })
      .catch(function(err) {
        console.error('Service Worker registration failed:', err);
      });
  });
}

window.addEventListener('load', function() {
  var displayMode = 'browser';
  if (window.matchMedia('(display-mode: standalone)').matches) {
    displayMode = 'standalone';
  } else if (window.navigator.standalone === true) {
    displayMode = 'standalone-ios';
  }
  console.log('Display mode:', displayMode);
});

document.body.addEventListener('touchmove', function(e) {
  if (e.target === document.body) {
    e.preventDefault();
  }
}, { passive: false });
