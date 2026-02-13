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
    <div class="tip-party-display">
      <div class="tip-party-display-field">
        <label>Large Party</label>
        <div class="tip-party-display-value" id="partyDisplayValue">$0.00</div>
      </div>
      <button class="tip-party-edit-btn" id="openPartyModalBtn" title="Configure Large Parties">📝</button>
    </div>
    <div class="tip-field">
      <label>Cash</label>
      <input id="cash" type="number" step="0.01" placeholder="0.00" inputmode="decimal" />
    </div>
  </div>

  <div class="tip-secondary">
    <div class="tip-percent-display">
      <div class="tip-percent-display-field">
        <label>BoH %</label>
        <div class="tip-percent-display-value" id="bohPercentDisplay">5%</div>
      </div>
    </div>
    <div class="tip-percent-display">
      <div class="tip-percent-display-field">
        <label>FoH %</label>
        <div class="tip-percent-display-value" id="fohPercentDisplay">3%</div>
      </div>
    </div>
    <button class="tip-icon-btn" id="openPercentModalBtn" title="Edit Percentages">📝</button>
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

<div class="tip-party-modal" id="partyModal">
  <div class="tip-party-modal-content">
    <div class="tip-party-modal-header">
      <span class="tip-party-modal-title">Large Party Configuration</span>
      <button class="tip-party-modal-close" id="closePartyModalBtn">Done</button>
    </div>
    <div class="tip-party-section">
      <div id="partyContainer"></div>
      <button class="tip-add-party" id="addPartyBtn">+ Add Party</button>
    </div>
  </div>
</div>

<div class="tip-party-modal" id="percentModal">
  <div class="tip-party-modal-content">
    <div class="tip-party-modal-header">
      <span class="tip-party-modal-title">Percentage Configuration</span>
      <button class="tip-party-modal-close" id="closePercentModalBtn">Cancel</button>
    </div>
    <div class="tip-percent-edit-section">
      <div class="tip-percent-edit-field">
        <label>Back of House %</label>
        <input type="number" id="bohPercentEdit" step="0.01" placeholder="5" inputmode="decimal" />
      </div>
      <div class="tip-percent-edit-field">
        <label>Front of House Support %</label>
        <input type="number" id="fohPercentEdit" step="0.01" placeholder="3" inputmode="decimal" />
      </div>
      <div class="tip-percent-actions">
        <button class="tip-percent-reset" id="resetPercentsBtn">Reset to Defaults</button>
        <button class="tip-percent-save" id="savePercentsBtn">Save Changes</button>
      </div>
    </div>
  </div>
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
      <li><strong>Large Party</strong> - Click 📝 to configure parties. Enter headcount and cost per head; 1% of (headcount × cost per head) is subtracted from tips</li>
      <li><strong>Cash</strong> - Cash tips received (added to your final tips)</li>
      <li><strong>BoH %</strong> - Percentage of sales going to Back of House staff (click 📝 to edit)</li>
      <li><strong>FoH %</strong> - Percentage of sales going to Support staff (click 📝 to edit)</li>
      <li><strong>Edit Button (📝)</strong> - Opens editor to safely change BoH% and FoH%. Changes require explicit confirmation.</li>
      <li><strong>Reset to Defaults</strong> - In the percentage editor, resets BoH to 5% and FoH to 3% (requires confirmation)</li>
      <li><strong>BoH (output)</strong> - Calculated amount going to Back of House</li>
      <li><strong>FoH (output)</strong> - Calculated amount going to Support</li>
      <li><strong>Tips (output)</strong> - Final tips to the tip pool</li>
    </ul>
    <div class="app-info-formula">
      <strong>Formula:</strong> Tips = Owed - BoH - FoH - (Large Party) + Cash
    </div>
  </div>
</div>`;
}

function initTipCalc() {
  const DEFAULT_BOH = 5;
  const DEFAULT_FOH = 3;
  const DEFAULT_COST_PER_HEAD = 65;

  const owed = document.getElementById("owed");
  const sales = document.getElementById("sales");
  const cash = document.getElementById("cash");
  const bohEl = document.getElementById("boh");
  const fohEl = document.getElementById("foh");
  const tipsEl = document.getElementById("tips");
  const tipsOutput = document.getElementById("tipsOutput");
  const warningBox = document.getElementById("warningBox");
  const pigDisplay = document.getElementById("pigDisplay");
  const clearBtn = document.getElementById("clearBtn");
  const partyContainer = document.getElementById("partyContainer");
  const addPartyBtn = document.getElementById("addPartyBtn");
  const partyDisplayValue = document.getElementById("partyDisplayValue");
  const openPartyModalBtn = document.getElementById("openPartyModalBtn");
  const partyModal = document.getElementById("partyModal");
  const closePartyModalBtn = document.getElementById("closePartyModalBtn");
  
  // Percent modal elements
  const bohPercentDisplay = document.getElementById("bohPercentDisplay");
  const fohPercentDisplay = document.getElementById("fohPercentDisplay");
  const openPercentModalBtn = document.getElementById("openPercentModalBtn");
  const percentModal = document.getElementById("percentModal");
  const closePercentModalBtn = document.getElementById("closePercentModalBtn");
  const bohPercentEdit = document.getElementById("bohPercentEdit");
  const fohPercentEdit = document.getElementById("fohPercentEdit");
  const savePercentsBtn = document.getElementById("savePercentsBtn");
  const resetPercentsBtn = document.getElementById("resetPercentsBtn");

  const round2 = n => Math.round(n * 100) / 100;
  const usd = n => "$" + round2(n).toFixed(2);

  let currentTipValue = 0;
  let largeParties = [];
  let bohPercent = DEFAULT_BOH;
  let fohPercent = DEFAULT_FOH;

  function renderParties() {
    let html = '';
    largeParties.forEach(function(party, index) {
      const calculation = party.headcount && party.costPerHead 
        ? (party.headcount * party.costPerHead * 0.01).toFixed(2) 
        : '0.00';
      
      html += '<div class="tip-party-row">';
      html += '  <div class="tip-party-input">';
      html += '    <label>Headcount</label>';
      html += '    <input type="number" class="party-headcount" data-index="' + index + '" value="' + (party.headcount || '') + '" placeholder="0" inputmode="numeric" />';
      html += '  </div>';
      html += '  <div class="tip-party-input">';
      html += '    <label>$/Head</label>';
      html += '    <input type="number" step="0.01" class="party-cost" data-index="' + index + '" value="' + (party.costPerHead || DEFAULT_COST_PER_HEAD) + '" placeholder="65" inputmode="decimal" />';
      html += '  </div>';
      html += '  <button class="tip-party-remove" data-index="' + index + '">×</button>';
      html += '</div>';
      html += '<div class="tip-party-calc">' + (party.headcount || 0) + ' × $' + (party.costPerHead || DEFAULT_COST_PER_HEAD) + ' × 1% = $' + calculation + '</div>';
    });
    
    partyContainer.innerHTML = html;
    
    // Update main screen display
    let totalDeduction = 0;
    largeParties.forEach(function(party) {
      if (party.headcount && party.costPerHead) {
        totalDeduction += (party.headcount * party.costPerHead * 0.01);
      }
    });
    partyDisplayValue.textContent = '$' + totalDeduction.toFixed(2);
    
    // Attach event listeners to new inputs
    document.querySelectorAll('.party-headcount').forEach(function(input) {
      input.addEventListener('input', function() {
        const idx = parseInt(this.getAttribute('data-index'));
        largeParties[idx].headcount = parseFloat(this.value) || 0;
        calculate();
        renderParties();
      });
    });
    
    document.querySelectorAll('.party-cost').forEach(function(input) {
      input.addEventListener('input', function() {
        const idx = parseInt(this.getAttribute('data-index'));
        largeParties[idx].costPerHead = parseFloat(this.value) || DEFAULT_COST_PER_HEAD;
        calculate();
        renderParties();
      });
    });
    
    document.querySelectorAll('.tip-party-remove').forEach(function(btn) {
      btn.addEventListener('click', function() {
        const idx = parseInt(this.getAttribute('data-index'));
        largeParties.splice(idx, 1);
        calculate();
        renderParties();
      });
    });
  }

  function addParty() {
    largeParties.push({ headcount: 0, costPerHead: DEFAULT_COST_PER_HEAD });
    renderParties();
    // Focus on the new headcount input
    setTimeout(function() {
      const inputs = document.querySelectorAll('.party-headcount');
      if (inputs.length > 0) {
        inputs[inputs.length - 1].focus();
      }
    }, 50);
  }

  addPartyBtn.addEventListener('click', addParty);

  // Party modal controls
  openPartyModalBtn.addEventListener('click', function() {
    partyModal.classList.add('show');
  });

  closePartyModalBtn.addEventListener('click', function() {
    partyModal.classList.remove('show');
  });

  partyModal.addEventListener('click', function(e) {
    if (e.target === partyModal) {
      partyModal.classList.remove('show');
    }
  });

  // Percent modal controls
  openPercentModalBtn.addEventListener('click', function() {
    // Load current values into edit fields
    bohPercentEdit.value = bohPercent;
    fohPercentEdit.value = fohPercent;
    percentModal.classList.add('show');
  });

  closePercentModalBtn.addEventListener('click', function() {
    percentModal.classList.remove('show');
  });

  percentModal.addEventListener('click', function(e) {
    if (e.target === percentModal) {
      percentModal.classList.remove('show');
    }
  });

  savePercentsBtn.addEventListener('click', function() {
    const newBoh = parseFloat(bohPercentEdit.value);
    const newFoh = parseFloat(fohPercentEdit.value);
    
    if (isNaN(newBoh) || isNaN(newFoh) || newBoh < 0 || newFoh < 0) {
      alert('Please enter valid percentages (0 or greater).');
      return;
    }
    
    const confirmed = confirm('Save Back of House to ' + newBoh + '% and Support to ' + newFoh + '%?');
    if (!confirmed) return;
    
    bohPercent = newBoh;
    fohPercent = newFoh;
    
    // Update displays
    bohPercentDisplay.textContent = bohPercent + '%';
    fohPercentDisplay.textContent = fohPercent + '%';
    
    // Save to localStorage
    localStorage.setItem('tipCalcPreset', JSON.stringify({
      boh: bohPercent,
      foh: fohPercent
    }));
    
    calculate();
    percentModal.classList.remove('show');
  });

  resetPercentsBtn.addEventListener('click', function() {
    const confirmed = confirm('Reset Back of House to ' + DEFAULT_BOH + '% and Support to ' + DEFAULT_FOH + '%?');
    if (!confirmed) return;
    
    bohPercent = DEFAULT_BOH;
    fohPercent = DEFAULT_FOH;
    
    bohPercentEdit.value = bohPercent;
    fohPercentEdit.value = fohPercent;
    bohPercentDisplay.textContent = bohPercent + '%';
    fohPercentDisplay.textContent = fohPercent + '%';
    
    // Save to localStorage
    localStorage.setItem('tipCalcPreset', JSON.stringify({
      boh: bohPercent,
      foh: fohPercent
    }));
    
    calculate();
  });

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
      validateInput(sales)
    ].every(v => v);

    if (!validInputs) return;

    const o = parseFloat(owed.value) || 0;
    const s = parseFloat(sales.value) || 0;
    const bohP = bohPercent / 100;
    const fohP = fohPercent / 100;
    const c = parseFloat(cash.value) || 0;

    // Calculate total large party deduction
    let largePartyTip = 0;
    largeParties.forEach(function(party) {
      if (party.headcount && party.costPerHead) {
        largePartyTip += (party.headcount * party.costPerHead * 0.01);
      }
    });

    const boh = s * bohP;
    const foh = s * fohP;
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
      bohPercent = preset.boh;
      fohPercent = preset.foh;
    } else {
      bohPercent = DEFAULT_BOH;
      fohPercent = DEFAULT_FOH;
    }
    bohPercentDisplay.textContent = bohPercent + '%';
    fohPercentDisplay.textContent = fohPercent + '%';
    calculate();
  }

  clearBtn.addEventListener('click', function() {
    owed.value = '';
    sales.value = '';
    cash.value = '';
    largeParties = [];
    renderParties();
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

  [owed, sales, cash].forEach(function(el) {
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
  renderParties(); // Initialize party container
}

// ============================================
// HOURS CALCULATOR
// ============================================

function getHoursCalcHTML() {
  return `
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
