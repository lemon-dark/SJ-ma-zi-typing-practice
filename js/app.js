// ===== Main Application Controller =====

const App = (function () {
  let currentPage = "home";
  let currentMode = null;
  let currentCategory = null;
  let currentContent = null;
  let currentTabId = null;
  let prevInputValueMap = {}; // 按行记录各输入框上一次内容（onInput 增量计算基准）
  let imePinyin = ""; // IME 组合期间敲的拼音，上屏后用于两级验证
  let composeBaseValueMap = {}; // 按行记录组合开始前输入框的普通文本（IME 组合期间 imePinyin 只取增量）
  let flushTimer = null; // 拼音连续输入：停顿 800ms 后自动分词推进
  // IME 组合结束处理（见 handleCompositionEnd）：用 addEventListener 绑定而非 oncompositionend 属性
  // （Electron/Chromium 中属性 handler 实测可能不触发，addEventListener 正常触发）
  // 每行一个输入框：e.target 即当前行的 .line-input（事件按 data-line 归属各行）
  function handleCompositionEnd(e) {
    const input = e.target;
    if (!input || !input.classList || !input.classList.contains("line-input")) return;
    const ln = parseInt(input.dataset.line, 10);
    if (currentMode !== "pinyin") {
      input.value = "";
      return;
    }
    // ★ 去重守卫（2026-08-13 每行输入框引入的重复提交 bug）：onInput 的 hanziStr/punctStr
    // 分支已把本次上屏提交给引擎（并 updateDisplay → syncLineInputs 把行已输入内容回写到
    // 输入框），此时 value 不再是"待提交的上屏文本"，兜底再提交会把回写内容误判为新输入。
    if (input.dataset.imeDone) { delete input.dataset.imeDone; return; }
    // 只读 input.value（事件 data 在部分环境为空；且若 onInput 已处理，value 已被清空，天然去重防重复提交）
    // ★ 2026-08-13 每行一个输入框修复：input.value 含整行历史已输入内容（如已打"床"、
    //   本次上屏"前" → value="床前"）。必须只取本次组合的增量（减去组合开始前的 base），
    //   否则历史字被重复提交（症状："床床前"、第 2 字被判错）。
    const commitFromValue = () => {
      const base = composeBaseValueMap[ln] || "";
      let v = input.value || "";
      if (base && v.startsWith(base)) v = v.slice(base.length);
      // 汉字优先（两级验证），无汉字则提交标点
      const hanzi = Array.from(v).filter((c) => /[\u4e00-\u9fff]/.test(c)).join("");
      if (hanzi) {
        if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
        TypingEngine.commitText(hanzi, imePinyin);
        imePinyin = "";
        updateDisplay();
        const st = TypingEngine.getState();
        if (st && st.isComplete) handleComplete();
        return true;
      }
      const punct = Array.from(v).filter((c) => PinyinUtils.isPunctChar(c)).join("");
      if (punct) {
        if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
        TypingEngine.commitPunct(punct);
        imePinyin = "";
        updateDisplay();
        const st = TypingEngine.getState();
        if (st && st.isComplete) handleComplete();
        return true;
      }
      // ★ 组合结束但无汉字/标点上屏（取消组合 / 无候选词 / 上屏的是字母）：
      //   把组合拼音还给引擎缓冲继续等待，避免已打的字母被全部丢弃
      //   （输入框被清空 + 引擎缓冲为空 = 用户看到的"最多三个字母强制清除"）
      if (imePinyin) {
        if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
        TypingEngine.restoreBuffer(imePinyin);
        imePinyin = "";
        updateDisplay();
        // ★ 不调用 scheduleFlush：IME 恢复的缓冲不自动分词（flushPinyin 对 ime 缓冲返回 false），
        //   只等用户操作（退格修改 / 重新组合上屏 / 直输转回 direct 后自动分词才恢复）
        return true;
      }
      return false;
    };
    if (!commitFromValue()) {
      // 兜底：部分输入法在 compositionend 触发后才把上屏文本写入 input.value
      setTimeout(commitFromValue, 0);
    }
  }
  let statInterval = null;
  let testConfig = { type: "timed", time: 1, lang: "pinyin", words: 50 };
  let gameType = "rain";
  let audioCtx = null;

  const settings = {
    theme: "light",
    fontSize: 28,
    sound: true,
    keyboardHint: false,
    fuzzy: false,
    punctFilter: false, // 默认不过滤：标点符号也要输入（勾选=跳过标点）
  };

  const pageConfigs = {
    english: {
      title: "英文打字",
      desc: "从基础键位到文章练习,全面提升英文打字能力",
      mode: "direct",
      tabs: [
        { id: "keyDrills", title: "键位练习", data: PracticeData.english.keyDrills },
        { id: "words", title: "单词练习", data: PracticeData.english.words },
        { id: "articles", title: "文章练习", data: PracticeData.english.articles },
        { id: "custom", title: "自定义", data: null },
      ],
    },
    pinyin: {
      title: "拼音打字",
      desc: "带拼音提示的汉字打字练习,以拼音输入追踪进度",
      mode: "pinyin",
      tabs: [
        { id: "initials", title: "声母", data: PracticeData.pinyin.initials },
        { id: "finals", title: "韵母", data: PracticeData.pinyin.finals },
        { id: "characters", title: "单字", data: PracticeData.pinyin.characters },
        { id: "words", title: "词组", data: PracticeData.pinyin.words },
        { id: "idioms", title: "成语", data: PracticeData.pinyin.idioms },
        { id: "poems", title: "古诗", data: PracticeData.pinyin.poems },
        { id: "articles", title: "文章", data: PracticeData.pinyin.articles },
        { id: "custom", title: "自定义", data: null },
      ],
    },
    number: {
      title: "数字符号",
      desc: "数字和符号输入练习,提升综合打字能力",
      mode: "direct",
      tabs: [
        { id: "numbers", title: "数字练习", data: PracticeData.number.numbers },
        { id: "symbols", title: "符号练习", data: PracticeData.number.symbols },
      ],
    },
  };

  // ===== Sound =====
  function initAudio() {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {}
  }

  function playSound(type) {
    if (!settings.sound || !audioCtx) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      if (type === "correct") {
        osc.frequency.value = 880;
        gain.gain.value = 0.03;
        osc.type = "sine";
      } else if (type === "incorrect") {
        osc.frequency.value = 200;
        gain.gain.value = 0.08;
        osc.type = "square";
      } else if (type === "complete") {
        osc.frequency.value = 660;
        gain.gain.value = 0.06;
        osc.type = "sine";
      }
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {}
  }

  // ===== Settings =====
  function loadSettings() {
    try {
      const raw = localStorage.getItem("mazi_settings");
      if (raw) Object.assign(settings, JSON.parse(raw));
    } catch (e) {}
    applyTheme();
    applyFontSize();
  }

  function saveSettings() {
    try {
      localStorage.setItem("mazi_settings", JSON.stringify(settings));
    } catch (e) {}
  }

  function applyTheme() {
    document.documentElement.setAttribute("data-theme", settings.theme);
  }

  function applyFontSize() {
    const display = document.getElementById("textDisplay");
    if (display) display.style.fontSize = settings.fontSize + "px";
  }

  // ===== Custom Text (自定义文本：手输 / 文件导入 / 拖拽) =====
  function startCustomPractice() {
    const text = document.getElementById("customTextInput").value.trim();
    if (text.length < 2) return;
    startPractice({ id: "custom", title: "自定义文本", desc: "", content: text }, pageConfigs[currentPage].mode, currentPage);
  }

  function readTextFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file, "UTF-8");
    });
  }

  // 自定义文本 tab：开始练习 / 导入文件按钮 / 拖拽文件到输入框
  function bindCustomTextEvents() {
    const startBtn = document.getElementById("customStartBtn");
    if (startBtn) startBtn.onclick = startCustomPractice;

    const importBtn = document.getElementById("customImportBtn");
    const fileInput = document.getElementById("customFileInput");
    if (importBtn && fileInput) {
      importBtn.onclick = () => fileInput.click();
      fileInput.onchange = (e) => {
        const f = e.target.files && e.target.files[0];
        if (!f) return;
        readTextFile(f)
          .then((txt) => {
            const ta = document.getElementById("customTextInput");
            if (ta) ta.value = txt;
          })
          .catch(() => {});
        fileInput.value = ""; // 允许重复选择同一文件
      };
    }

    const ta = document.getElementById("customTextInput");
    if (ta) {
      ["dragenter", "dragover"].forEach((ev) => ta.addEventListener(ev, (e) => e.preventDefault()));
      ta.addEventListener("drop", (e) => {
        e.preventDefault();
        const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (!f) return;
        readTextFile(f)
          .then((txt) => { ta.value = txt; })
          .catch(() => {});
      });
    }
  }

  // ===== Navigation =====
  function navigate(page) {
    currentPage = page;
    stopStatInterval();
    Game.stop();
    document.querySelectorAll(".nav-item").forEach((el) => {
      el.classList.toggle("active", el.dataset.page === page);
    });
    switch (page) {
      case "home":
        UI.renderHome(Stats.getSummary());
        break;
      case "english":
      case "pinyin":
      case "number":
        UI.renderPracticePage(page, pageConfigs[page]);
        selectTab(pageConfigs[page].tabs[0]);
        break;
      case "test":
        UI.renderTestPage();
        UI.renderTestConfig("timed");
        break;
      case "game":
        UI.renderGamePage();
        break;
      case "stats":
        UI.renderStatsPage(Stats.getSummary());
        break;
    }
    bindPageEvents();
    UI.updateLevelDisplay(Stats.getSummary());
  }

  function bindPageEvents() {
    document.querySelectorAll(".nav-item").forEach((el) => {
      el.onclick = () => navigate(el.dataset.page);
    });
    document.querySelectorAll("[data-quick]").forEach((el) => {
      el.onclick = () => navigate(el.dataset.quick);
    });
    document.querySelectorAll(".mode-tab[data-tab]").forEach((el) => {
      el.onclick = () => {
        document.querySelectorAll(".mode-tab[data-tab]").forEach((t) => t.classList.remove("active"));
        el.classList.add("active");
        const tab = pageConfigs[currentPage].tabs.find((t) => t.id === el.dataset.tab);
        if (tab) selectTab(tab);
      };
    });
    document.querySelectorAll("[data-content-id]").forEach((el) => {
      el.onclick = () => {
        document.querySelectorAll("[data-content-id]").forEach((c) => c.classList.remove("selected"));
        el.classList.add("selected");
        const tab = pageConfigs[currentPage].tabs.find((t) => t.id === currentTabId);
        if (tab && tab.data) {
          const content = tab.data.find((c) => c.id === el.dataset.contentId);
          if (content) startPractice(content, pageConfigs[currentPage].mode, currentPage);
        }
      };
    });
    const customBtn = document.getElementById("customStartBtn");
    if (customBtn) customBtn.onclick = startCustomPractice;
    const restartBtn = document.getElementById("restartBtn");
    if (restartBtn) restartBtn.onclick = () => { if (currentContent) startPractice(currentContent, currentMode, currentCategory); };
    const retryBtn = document.getElementById("retryBtn");
    if (retryBtn) retryBtn.onclick = () => { if (currentContent) startPractice(currentContent, currentMode, currentCategory); };
    const backBtn = document.getElementById("backBtn");
    if (backBtn) backBtn.onclick = () => navigate(currentPage);
    bindTestEvents();
    bindGameEvents();
  }

  function selectTab(tab) {
    currentTabId = tab.id;
    if (tab.id === "custom") {
      UI.renderCustomTextInput(currentMode);
      bindCustomTextEvents();
    } else if (tab.data) {
      UI.renderContentPicker(tab.data);
      document.querySelectorAll("[data-content-id]").forEach((el) => {
        el.onclick = () => {
          document.querySelectorAll("[data-content-id]").forEach((c) => c.classList.remove("selected"));
          el.classList.add("selected");
          const content = tab.data.find((c) => c.id === el.dataset.contentId);
          if (content) startPractice(content, pageConfigs[currentPage].mode, currentPage);
        };
      });
    }
  }

  // ===== Practice =====
  function startPractice(content, mode, category) {
    currentMode = mode;
    currentCategory = category;
    currentContent = content;
    if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
    TypingEngine.reset();
    TypingEngine.createSession(content.content, mode, { fuzzy: settings.fuzzy, punctFilter: settings.punctFilter });
    UI.renderTypingArea(content, mode, settings);
    UI.renderLineBlocks(TypingEngine.getState(), mode); // 每行一个输入框：先生成行块 DOM（稳定），再填行文字
    applyFontSize();
    UI.updateTypingDisplay(TypingEngine.getState(), mode);
    UI.updateLiveStats(TypingEngine.getStats());
    setupTypingInput();
    // restartBtn 由 renderTypingArea 动态创建，bindPageEvents 时机太早（navigate 时按钮还不存在），这里重新绑定
    const restartBtn = document.getElementById("restartBtn");
    if (restartBtn) restartBtn.onclick = () => { if (currentContent) startPractice(currentContent, currentMode, currentCategory); };
    startStatInterval();
  }

  // 每行一个输入框：事件绑定到每个 .line-input（行块 DOM 稳定，跨行只切换 disabled/focus）
  function setupTypingInput() {
    const inputs = document.querySelectorAll(".line-input");
    if (!inputs.length) return;
    prevInputValueMap = {};
    composeBaseValueMap = {};
    inputs.forEach((input) => {
      const ln = parseInt(input.dataset.line, 10);
      input.onkeydown = onKeyDown;
      input.oninput = onInput;
      input.oncompositionend = null;
      input.removeEventListener("compositionend", handleCompositionEnd);
      input.addEventListener("compositionend", handleCompositionEnd);
      // 组合开始：记录该行输入框已有文本（可能是 restoreBuffer 写回的普通字母），
      // 组合期间 imePinyin 只取增量，避免与已有文本拼接（如保留 chuan 后重新组合
      // chuang → 整框值 chuanchuang，拼音层消费不完误判错）
      input.removeEventListener("compositionstart", onCompositionStart);
      input.addEventListener("compositionstart", onCompositionStart);
      prevInputValueMap[ln] = "";
    });
    syncLineInputs();
  }

  function onCompositionStart(e) {
    const input = e.target;
    if (!input || !input.classList || !input.classList.contains("line-input")) return;
    const ln = parseInt(input.dataset.line, 10);
    composeBaseValueMap[ln] = input.value || "";
    delete input.dataset.imeDone; // 清掉上一次组合的已处理标记（防残留）
    // 组合期间暂停 flush（防停顿自动分词把恢复的缓冲切走）
    if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
  }

  // 重绘后同步各行输入框：当前行 enabled（拼音模式回写引擎缓冲 + focus + 光标末尾），
  // 已完成/未到行 disabled 显示该行已输入内容；direct 模式不干预输入框内容
  // （用户打什么留什么，判对/判错反馈靠上方字色），只保证焦点
  function syncLineInputs() {
    const state = TypingEngine.getState();
    if (!state) return;
    const curLine = UI.getLineOfIndex(state, state.currentIndex);
    document.querySelectorAll(".line-input").forEach((input) => {
      const ln = parseInt(input.dataset.line, 10);
      const isCur = ln === curLine;
      let val = UI.getLineTypedContent(state, ln);
      if (isCur && currentMode === "pinyin") val += state.pinyinBuffer || "";
      input.value = val;
      input.disabled = !isCur;
      if (isCur) {
        prevInputValueMap[ln] = input.value; // 记录当前框内容，onInput 增量据此计算
        // ⚠️ 关键：focus() 会把光标重置到开头（Chromium 行为），逐字母直输时
        // 第二个字母会被插到前面（如 "c"+"h" → "hc"），导致增量错乱、判错清空。
        // 必须把光标移到末尾，保证后续按键追加在拼音缓冲之后。
        if (document.activeElement !== input) {
          input.focus();
          try { input.setSelectionRange(input.value.length, input.value.length); } catch (err) {}
        }
      }
    });
  }

  function onKeyDown(e) {
    const t = e.target;
    if (!t || !t.classList || !t.classList.contains("line-input")) return;
    if (e.isComposing) return;
    if (e.key === "Backspace") {
      e.preventDefault();
      if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
      TypingEngine.handleBackspace();
      updateDisplay();
      return;
    }
    if (e.key === "Tab") { e.preventDefault(); return; }
    // 可打印字符：按键时立即处理，逐键即时反馈（不等 input 事件）
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // 拼音模式：字母与标点一律不 preventDefault，交给 IME/input 事件处理
      // （preventDefault 会挡住输入法上屏汉字/标点；字母还要启动组合弹候选）
      if (currentMode === "pinyin") {
        // 空格键：手动提交当前拼音缓冲（"字母凭空消失"修复：不再自动清缓冲）
        if (e.key === " ") {
          e.preventDefault();
          if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
          if (TypingEngine.flushPinyin()) {
            updateDisplay();
            const st = TypingEngine.getState();
            if (st && st.isComplete) handleComplete();
          }
        }
        return;
      }
      e.preventDefault();
      const hadError = processAddedChars(e.key);
      playSound(hadError ? "incorrect" : "correct");
      updateDisplay();
      const state = TypingEngine.getState();
      if (state && state.isComplete) handleComplete();
    }
  }

  // 将新增字符逐个喂给引擎，返回本次击键是否有错误
  function processAddedChars(added) {
    let hadError = false;
    let prevState = TypingEngine.getState();
    let prevIdx = prevState ? prevState.currentIndex : 0;

    // 拼音模式：先提交标点（目标为标点时消费；误操作返回 "none" 无副作用）
    if (currentMode === "pinyin") {
      const punctStr = Array.from(added).filter((c) => PinyinUtils.isPunctChar(c)).join("");
      if (punctStr) {
        const res = TypingEngine.commitPunct(punctStr);
        if (res === "error") hadError = true;
        const st = TypingEngine.getState();
        prevIdx = st ? st.currentIndex : prevIdx;
      }
    }

    for (const ch of added) {
      // 拼音模式只接受 a-z（IME 组合/粘贴内容可能夹带汉字等非字母）
      if (currentMode === "pinyin" && !/^[a-z]$/i.test(ch)) continue;
      TypingEngine.processChar(ch);
      const state = TypingEngine.getState();
      if (state.currentIndex > prevIdx) {
        if (state.charStates[prevIdx] === "incorrect") hadError = true;
        prevIdx = state.currentIndex;
      }
    }
    // 拼音模式：不自动分词，用户按空格键手动提交（见 onKeyDown 空格分支）
    return hadError;
  }

  // ★ 停顿自动分词（2026-08-12）：拼音连续输入时引擎延迟分词——打满字边界不立即
  // 锁定推进（否则打 qu 刚匹配「曲」就被清空切框，用户无法一口气输入）。
  // 这里做 800ms debounce：用户停顿 800ms 后，把当前缓冲已完整匹配的字批量推进。
  function scheduleFlush() {
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(() => {
      flushTimer = null;
      if (TypingEngine.flushPinyin()) {
        updateDisplay();
        const state = TypingEngine.getState();
        if (state && state.isComplete) handleComplete();
      }
    }, 500);
  }

  function onInput(e) {
    const input = e.target;
    if (!input || !input.classList || !input.classList.contains("line-input")) return;
    const ln = parseInt(input.dataset.line, 10);
    const newValue = input.value;
    const prev = prevInputValueMap[ln] || "";
    // ⚠️ 增量计算（每行输入框改造后必须）：syncLineInputs 会把该行已输入内容回写到输入框
    // （含标点/上屏汉字），下次输入时整框 value 含有历史标点/汉字——若按整框提取会
    // 把历史内容当新输入重复提交（如打字母 y 时 value="…光，y" 里的 "，" 触发 commitPunct）。
    // 必须只取相对上一次记录内容的**新增部分**。
    let addedStr = newValue;
    if (prev && newValue.startsWith(prev) && newValue.length > prev.length) {
      addedStr = newValue.slice(prev.length);
    } else if (prev && newValue.length <= prev.length) {
      // 删除/清空（退格走 onKeyDown，这里只同步记录，不处理）
      addedStr = "";
      prevInputValueMap[ln] = newValue;
    }

    // IME 组合期间：字母不喂引擎（引擎停在当前字，避免先判对/推进导致上屏复核错位），
    // 只记录组合拼音，供上屏后两级验证；同时取消停顿 flush（组合结束统一处理）。
    // ⚠️ value 为空（组合结束清空组合文本的 input 事件）时**不覆盖** imePinyin：
    // 否则 compositionend 时 imePinyin 已被清空，无法把组合拼音还给引擎
    // （症状："最多三个字母就强制清除"——取消组合/无候选词时已打字母全部丢失）。
    // ★ 2026-08-13 修复"字母凭空消失"（自动上屏丢字母）：组合期间（isComposing=true）
    //   绝不 commit / syncLineInputs。否则真实输入法自动上屏（打 chuangqian 时 chuang
    //   自动上屏"床"、组合继续 q）会触发 updateDisplay→syncLineInputs 重写 input.value，
    //   把刚打的新组合字母 q 清掉、破坏 IME 组合。上屏统一交给 compositionend 处理。
    if (e.isComposing) {
      if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
      if (currentMode === "pinyin" && newValue) {
        // 只取组合区增量（减去组合开始前该行的普通文本），防止与保留字母拼接
        let compText = newValue;
        const base = composeBaseValueMap[ln] || "";
        if (base && newValue.startsWith(base)) {
          compText = newValue.slice(base.length);
        }
        if (/^[a-z]*$/i.test(compText) && compText) imePinyin = compText;
      }
      return;
    }

    // 非组合：上屏汉字/标点优先处理（即时上屏输入法，无 composition 事件；
    // 或英文直输半角标点）。只要增量含汉字就做两级验证并清空该字输入框。
    if (addedStr && currentMode === "pinyin") {
      const hanziStr = Array.from(addedStr).filter((c) => /[\u4e00-\u9fff]/.test(c)).join("");
      if (hanziStr) {
        if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
        TypingEngine.commitText(hanziStr, imePinyin);
        imePinyin = "";
        input.dataset.imeDone = "1"; // 已处理标记：compositionend 兜底不再重复提交
        updateDisplay();
        const state = TypingEngine.getState();
        if (state && state.isComplete) handleComplete();
        return;
      }
      // 标点上屏（中文输入法敲标点键直接上屏，或英文直输半角标点）：
      // 目标为标点时提交并推进；误操作由 commitPunct 返回 "none" 不推进
      const punctStr = Array.from(addedStr).filter((c) => PinyinUtils.isPunctChar(c)).join("");
      if (punctStr) {
        if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
        TypingEngine.commitPunct(punctStr);
        imePinyin = "";
        input.dataset.imeDone = "1"; // 已处理标记：compositionend 兜底不再重复提交
        updateDisplay();
        const state = TypingEngine.getState();
        if (state && state.isComplete) handleComplete();
        return;
      }
    }

    // 非组合：增量计算新增字符。
    // ⚠️ 不能用整框内容直接喂引擎：syncLineInputs 会把引擎的 pinyinBuffer 回写到输入框，
    // 逐字母直输时（无输入法组合）整框重喂会把已处理的 buffer 重复累加 → 超长判错清空
    // （症状：只能一个字一个字打、超出拼音限制就被清空）。
    if (addedStr) {
      const hadError = processAddedChars(addedStr);
      playSound(hadError ? "incorrect" : "correct");
      updateDisplay();
      const state = TypingEngine.getState();
      if (state && state.isComplete) handleComplete();
    }
  }

  function updateDisplay() {
    const state = TypingEngine.getState();
    if (!state) return;
    UI.updateTypingDisplay(state, currentMode);
    syncLineInputs();
    UI.updateLiveStats(TypingEngine.getStats());
    if (settings.keyboardHint) updateKeyboardHint(state);
  }

  function updateKeyboardHint(state) {
    document.querySelectorAll(".key.active, .key.next").forEach((k) => k.classList.remove("active", "next"));
    if (state.currentIndex >= state.tokens.length) return;
    const token = state.tokens[state.currentIndex];
    let nextChar = "";
    if (currentMode === "pinyin") {
      if (token.type === "hanzi") {
        const buffer = state.pinyinBuffer;
        const plain = token.plainPinyin;
        if (buffer.length < plain.length) nextChar = plain[buffer.length];
      }
    } else {
      nextChar = token.char.toLowerCase();
    }
    if (nextChar && /^[a-z]$/.test(nextChar)) {
      const key = document.querySelector('.key[data-key="' + nextChar + '"]');
      if (key) key.classList.add("next");
    }
  }

  function handleComplete() {
    stopStatInterval();
    playSound("complete");
    const stats = TypingEngine.getStats();
    const result = Stats.recordResult({ ...stats, mode: currentMode, category: currentCategory, title: currentContent ? currentContent.title : "" });
    UI.renderResultPanel(stats, result);
    UI.updateLevelDisplay(Stats.getSummary());
    const retryBtn = document.getElementById("retryBtn");
    if (retryBtn) retryBtn.onclick = () => { if (currentContent) startPractice(currentContent, currentMode, currentCategory); };
    const backBtn = document.getElementById("backBtn");
    if (backBtn) backBtn.onclick = () => navigate(currentPage);
  }

  function startStatInterval() {
    stopStatInterval();
    statInterval = setInterval(() => { const stats = TypingEngine.getStats(); if (stats) UI.updateLiveStats(stats); }, 200);
  }

  function stopStatInterval() {
    if (statInterval) { clearInterval(statInterval); statInterval = null; }
  }

  // ===== Typing Test =====
  function bindTestEvents() {
    document.querySelectorAll(".mode-tab[data-test-type]").forEach((el) => {
      el.onclick = () => {
        document.querySelectorAll(".mode-tab[data-test-type]").forEach((t) => t.classList.remove("active"));
        el.classList.add("active");
        testConfig.type = el.dataset.testType;
        UI.renderTestConfig(testConfig.type);
        bindTestConfigEvents();
      };
    });
    bindTestConfigEvents();
  }

  function bindTestConfigEvents() {
    document.querySelectorAll("[data-time]").forEach((el) => {
      el.onclick = () => { document.querySelectorAll("[data-time]").forEach((c) => c.classList.remove("selected")); el.classList.add("selected"); testConfig.time = parseInt(el.dataset.time); };
    });
    document.querySelectorAll("[data-words]").forEach((el) => {
      el.onclick = () => { document.querySelectorAll("[data-words]").forEach((c) => c.classList.remove("selected")); el.classList.add("selected"); testConfig.words = parseInt(el.dataset.words); };
    });
    document.querySelectorAll(".mode-tab[data-test-lang]").forEach((el) => {
      el.onclick = () => { document.querySelectorAll(".mode-tab[data-test-lang]").forEach((t) => t.classList.remove("active")); el.classList.add("active"); testConfig.lang = el.dataset.testLang; };
    });
    const startBtn = document.getElementById("startTestBtn");
    if (startBtn) startBtn.onclick = () => startTest();
  }

  let testTimerInterval = null;
  let testEndTime = null;

  function startTest() {
    const isPinyin = testConfig.lang === "pinyin";
    const mode = isPinyin ? "pinyin" : "direct";
    let text;
    if (isPinyin) text = generateChineseText(testConfig.type === "timed" ? 200 : testConfig.words);
    else text = generateEnglishText(testConfig.type === "timed" ? 200 : testConfig.words);
    currentMode = mode;
    currentCategory = "test";
    currentContent = { id: "test", title: "打字测试", desc: "", content: text };
    TypingEngine.reset();
    TypingEngine.createSession(text, mode, { fuzzy: settings.fuzzy, punctFilter: settings.punctFilter });
    UI.renderTypingArea(currentContent, mode, settings);
    UI.renderLineBlocks(TypingEngine.getState(), mode); // 每行一个输入框
    applyFontSize();
    UI.updateTypingDisplay(TypingEngine.getState(), mode);
    setupTypingInput();
    startStatInterval();
    if (testConfig.type === "timed") startTestTimer(testConfig.time);
  }

  function startTestTimer(minutes) {
    testEndTime = Date.now() + minutes * 60000;
    if (testTimerInterval) clearInterval(testTimerInterval);
    testTimerInterval = setInterval(() => {
      const remaining = testEndTime - Date.now();
      if (remaining <= 0) {
        clearInterval(testTimerInterval);
        testTimerInterval = null;
        const state = TypingEngine.getState();
        if (state) { state.isComplete = true; state.endTime = Date.now(); handleComplete(); }
      } else {
        const sec = Math.ceil(remaining / 1000);
        const timeEl = document.getElementById("liveTime");
        if (timeEl) timeEl.textContent = sec + "s";
      }
    }, 100);
  }

  function generateChineseText(targetChars) {
    const sources = [...PracticeData.pinyin.words, ...PracticeData.pinyin.idioms, ...PracticeData.pinyin.articles, ...PracticeData.pinyin.poems];
    let text = "";
    while (text.length < targetChars) { const src = sources[Math.floor(Math.random() * sources.length)]; text += src.content + " "; }
    return text.slice(0, targetChars + 20);
  }

  function generateEnglishText(targetWords) {
    const sources = [...PracticeData.english.words, ...PracticeData.english.articles];
    let text = "";
    while (text.split(" ").length < targetWords) { const src = sources[Math.floor(Math.random() * sources.length)]; text += src.content + " "; }
    return text;
  }

  // ===== Game =====
  function bindGameEvents() {
    document.querySelectorAll("[data-game]").forEach((el) => {
      el.onclick = () => {
        document.querySelectorAll("[data-game]").forEach((c) => c.classList.remove("selected"));
        el.classList.add("selected");
        gameType = el.dataset.game;
        UI.renderGameArea(gameType);
        bindGameAreaEvents();
      };
    });
  }

  function bindGameAreaEvents() {
    const startBtn = document.getElementById("gameStartBtn");
    if (startBtn) startBtn.onclick = () => Game.start(gameType);
    const exitBtn = document.getElementById("gameExitBtn");
    if (exitBtn) exitBtn.onclick = () => { Game.stop(); navigate("game"); };
  }

  const Game = {
    canvas: null, ctx: null, items: [], score: 0, lives: 3, level: 1,
    spawnTimer: 0, spawnInterval: 2000, fallSpeed: 60, running: false,
    rafId: null, lastTime: 0, gameType: "rain", inputBuffer: "", destroyed: 0,

    start(type) {
      this.gameType = type;
      this.canvas = document.getElementById("gameCanvas");
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext("2d");
      this.resize();
      this.items = []; this.score = 0; this.lives = 3; this.level = 1;
      this.spawnTimer = 0; this.spawnInterval = 2000; this.fallSpeed = 60;
      this.running = true; this.inputBuffer = ""; this.destroyed = 0;
      this.lastTime = performance.now();
      const overlay = document.getElementById("gameOverlay");
      if (overlay) overlay.style.display = "none";
      this.updateHUD(); this.spawn();
      this.keyHandler = (e) => {
        if (e.isComposing) return;
        if (e.key === "Backspace") { this.inputBuffer = this.inputBuffer.slice(0, -1); return; }
        if (e.key === "Escape") { this.stop(); navigate("game"); return; }
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) { e.preventDefault(); this.handleInput(e.key); }
      };
      document.addEventListener("keydown", this.keyHandler, true);
      this.loop();
    },

    stop() {
      this.running = false;
      if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; }
      if (this.keyHandler) { document.removeEventListener("keydown", this.keyHandler, true); this.keyHandler = null; }
    },

    loop() {
      if (!this.running) return;
      const now = performance.now();
      const dt = (now - this.lastTime) / 1000;
      this.lastTime = now;
      this.update(dt); this.render();
      this.rafId = requestAnimationFrame(() => this.loop());
    },

    update(dt) {
      this.spawnTimer += dt * 1000;
      if (this.spawnTimer >= this.spawnInterval) { this.spawnTimer = 0; this.spawn(); }
      const h = this.canvas.height / (window.devicePixelRatio || 1);
      for (let i = this.items.length - 1; i >= 0; i--) {
        const item = this.items[i];
        item.y += this.fallSpeed * dt * item.speedMult;
        if (item.y > h - 30) {
          this.items.splice(i, 1); this.lives--;
          playSound("incorrect"); this.updateHUD();
          if (this.lives <= 0) { this.gameOver(); return; }
        }
      }
    },

    spawn() {
      const w = this.canvas.width / (window.devicePixelRatio || 1);
      let char, pinyin;
      if (this.gameType === "rain") {
        const letters = "abcdefghijklmnopqrstuvwxyz";
        char = letters[Math.floor(Math.random() * letters.length)];
      } else if (this.gameType === "pinyin-rain") {
        const chars = "你好谢谢再见学习工作生活快乐美丽山水天地日月风雨花草树木春夏秋冬";
        char = chars[Math.floor(Math.random() * chars.length)];
        const py = PinyinUtils.getCharPinyin(char);
        pinyin = py ? PinyinUtils.stripTone(py) : "";
      } else {
        const words = ["cat", "dog", "sun", "run", "jump", "code", "type", "fast", "word", "game"];
        char = words[Math.floor(Math.random() * words.length)];
      }
      this.items.push({ char, pinyin: pinyin || null, x: 30 + Math.random() * (w - 60), y: -20, speedMult: 0.8 + Math.random() * 0.4, typedBuffer: "" });
    },

    handleInput(ch) {
      const lower = ch.toLowerCase();
      for (let i = 0; i < this.items.length; i++) {
        const item = this.items[i];
        if (this.gameType === "rain") {
          if (item.char === lower) {
            this.items.splice(i, 1); this.score += 10 * this.level; this.destroyed++;
            playSound("correct"); this.checkLevelUp(); this.updateHUD(); return;
          }
        } else if (this.gameType === "pinyin-rain" || this.gameType === "word") {
          if (!item.pinyin && this.gameType === "pinyin-rain") continue;
          item.typedBuffer += lower;
          const target = this.gameType === "pinyin-rain" ? item.pinyin : item.char;
          if (target === item.typedBuffer) {
            this.items.splice(i, 1); this.score += (this.gameType === "word" ? 20 : 15) * this.level;
            this.destroyed++; playSound("correct"); this.checkLevelUp(); this.updateHUD(); return;
          } else if (!target.startsWith(item.typedBuffer)) {
            item.typedBuffer = "";
          } else { return; }
        }
      }
    },

    checkLevelUp() {
      if (this.destroyed > 0 && this.destroyed % 10 === 0) {
        this.level++; this.fallSpeed += 15;
        this.spawnInterval = Math.max(800, this.spawnInterval - 150);
      }
    },

    render() {
      const ctx = this.ctx;
      const w = this.canvas.width / (window.devicePixelRatio || 1);
      const h = this.canvas.height / (window.devicePixelRatio || 1);
      const bgColor = getComputedStyle(document.body).getPropertyValue("--bg-soft").trim();
      ctx.fillStyle = bgColor || "#e8eaed";
      ctx.fillRect(0, 0, w, h);
      const accentColor = getComputedStyle(document.body).getPropertyValue("--accent").trim();
      for (const item of this.items) {
        const fontSize = this.gameType === "word" ? 18 : 28;
        ctx.font = "bold " + fontSize + 'px "Microsoft YaHei", sans-serif';
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        const radius = this.gameType === "word" ? item.char.length * 8 + 12 : 22;
        ctx.fillStyle = accentColor;
        ctx.beginPath(); ctx.arc(item.x, item.y, radius, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.fillText(item.char, item.x, item.y);
        if ((item.pinyin && this.gameType === "pinyin-rain") || (item.typedBuffer && this.gameType === "word")) {
          ctx.font = "11px monospace";
          ctx.fillStyle = "rgba(255,255,100,0.9)";
          const label = item.typedBuffer || (item.pinyin || "");
          ctx.fillText(label, item.x, item.y - 20);
        }
      }
    },

    updateHUD() {
      const scoreEl = document.getElementById("gameScore");
      const livesEl = document.getElementById("gameLives");
      const levelEl = document.getElementById("gameLevel");
      if (scoreEl) scoreEl.textContent = this.score;
      if (livesEl) livesEl.textContent = this.lives;
      if (levelEl) levelEl.textContent = this.level;
    },

    gameOver() {
      this.stop();
      const overlay = document.getElementById("gameOverlay");
      if (overlay) {
        overlay.style.display = "flex";
        overlay.innerHTML = '<h2>游戏结束</h2><p>得分: ' + this.score + ' | 消灭: ' + this.destroyed + ' | 关卡: ' + this.level + '</p><button class="btn btn-primary" id="gameStartBtn">再来一局</button>';
        const startBtn = document.getElementById("gameStartBtn");
        if (startBtn) startBtn.onclick = () => Game.start(gameType);
      }
    },

    resize() {
      if (!this.canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = this.canvas.getBoundingClientRect();
      this.canvas.width = rect.width * dpr;
      this.canvas.height = rect.height * dpr;
      this.ctx.scale(dpr, dpr);
    },
  };

  // ===== Settings Modal =====
  function setupSettingsModal() {
    const modal = document.getElementById("settingsModal");
    const openBtn = document.getElementById("settingsBtn");
    const closeBtn = document.getElementById("settingsClose");
    openBtn.onclick = () => {
      modal.classList.add("show");
      document.getElementById("fontSizeSlider").value = settings.fontSize;
      document.getElementById("fontSizeValue").textContent = settings.fontSize + "px";
      document.getElementById("soundToggle").checked = settings.sound;
      document.getElementById("keyboardHintToggle").checked = settings.keyboardHint;
      document.getElementById("fuzzyToggle").checked = settings.fuzzy;
      document.getElementById("punctFilterToggle").checked = settings.punctFilter;
    };
    closeBtn.onclick = () => modal.classList.remove("show");
    modal.onclick = (e) => { if (e.target === modal) modal.classList.remove("show"); };
    document.getElementById("fontSizeSlider").oninput = (e) => {
      settings.fontSize = parseInt(e.target.value);
      document.getElementById("fontSizeValue").textContent = settings.fontSize + "px";
      applyFontSize(); saveSettings();
    };
    document.getElementById("soundToggle").onchange = (e) => { settings.sound = e.target.checked; saveSettings(); };
    document.getElementById("keyboardHintToggle").onchange = (e) => { settings.keyboardHint = e.target.checked; saveSettings(); };
    document.getElementById("fuzzyToggle").onchange = (e) => { settings.fuzzy = e.target.checked; saveSettings(); };
    document.getElementById("punctFilterToggle").onchange = (e) => { settings.punctFilter = e.target.checked; saveSettings(); };
    document.getElementById("clearDataBtn").onclick = () => {
      if (confirm("确定要清空所有练习记录吗?此操作不可撤销。")) { Stats.clearAll(); navigate("home"); modal.classList.remove("show"); }
    };
  }

  function setupThemeToggle() {
    document.getElementById("themeToggle").onclick = () => {
      settings.theme = settings.theme === "light" ? "dark" : "light";
      applyTheme(); saveSettings();
    };
  }

  function setupSidebarToggle() {
    const toggle = document.getElementById("sidebarToggle");
    const sidebar = document.getElementById("sidebar");
    if (toggle && sidebar) toggle.onclick = () => sidebar.classList.toggle("open");
  }

  function init() {
    initAudio();
    loadSettings();
    setupSettingsModal();
    setupThemeToggle();
    setupSidebarToggle();
    navigate("home");
    UI.updateLevelDisplay(Stats.getSummary());
  }

  return { init, navigate };
})();

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", App.init);
else App.init();
