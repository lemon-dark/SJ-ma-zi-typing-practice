// ===== UI Rendering Module =====

const UI = (function () {
  const mainContent = () => document.getElementById("mainContent");

  function clear() {
    mainContent().innerHTML = "";
  }

  function setHTML(html) {
    mainContent().innerHTML = html;
    mainContent().scrollTop = 0;
  }

  // ===== Home Dashboard =====
  function renderHome(summary) {
    const greeting = getGreeting();
    const level = summary.level;
    const levelPct = Math.round((level.currentXP / level.nextLevelXP) * 100);

    setHTML(`
      <div class="fade-in">
        <div class="dashboard-hero">
          <h1>${greeting}</h1>
          <p>欢迎来到码字打字练习,选择一个模块开始今天的训练吧</p>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-card-label">最高速度</div>
            <div class="stat-card-value">${summary.bestSpeed}<span class="stat-card-unit">字/分</span></div>
          </div>
          <div class="stat-card">
            <div class="stat-card-label">平均正确率</div>
            <div class="stat-card-value">${summary.avgAccuracy}<span class="stat-card-unit">%</span></div>
          </div>
          <div class="stat-card">
            <div class="stat-card-label">练习次数</div>
            <div class="stat-card-value">${summary.totalPractices}<span class="stat-card-unit">次</span></div>
          </div>
          <div class="stat-card">
            <div class="stat-card-label">当前等级</div>
            <div class="stat-card-value">Lv.${level.level}<span class="stat-card-unit">${level.currentXP}/${level.nextLevelXP} XP</span></div>
          </div>
        </div>

        <h2 class="section-title">快捷入口</h2>
        <div class="quick-entry">
          <div class="entry-card" data-quick="english">
            <div class="entry-card-icon" style="background:var(--accent-light);color:var(--accent)">EN</div>
            <h3>英文打字</h3>
            <p>键位练习、单词、文章</p>
          </div>
          <div class="entry-card" data-quick="pinyin">
            <div class="entry-card-icon" style="background:var(--success-light);color:var(--success)">拼</div>
            <h3>拼音打字</h3>
            <p>声韵母、单字、词组、古诗</p>
          </div>
          <div class="entry-card" data-quick="number">
            <div class="entry-card-icon" style="background:var(--warning-light);color:var(--warning)">123</div>
            <h3>数字符号</h3>
            <p>数字、符号、混合练习</p>
          </div>
          <div class="entry-card" data-quick="test">
            <div class="entry-card-icon" style="background:var(--danger-light);color:var(--danger)">测</div>
            <h3>打字测试</h3>
            <p>限时测试,挑战自我</p>
          </div>
          <div class="entry-card" data-quick="game">
            <div class="entry-card-icon" style="background:var(--accent-light);color:var(--accent)">游戏</div>
            <h3>打字游戏</h3>
            <p>字母雨、趣味练习</p>
          </div>
          <div class="entry-card" data-quick="stats">
            <div class="entry-card-icon" style="background:var(--bg-soft);color:var(--text-secondary)">统计</div>
            <h3>统计中心</h3>
            <p>历史成绩、成就</p>
          </div>
        </div>
      </div>
    `);
  }

  function getGreeting() {
    const h = new Date().getHours();
    if (h < 6) return "夜深了,注意休息";
    if (h < 12) return "早上好!";
    if (h < 14) return "中午好!";
    if (h < 18) return "下午好!";
    if (h < 22) return "晚上好!";
    return "夜深了,注意休息";
  }

  // ===== Practice Page (English / Pinyin / Number) =====
  function renderPracticePage(pageId, pageConfig) {
    const tabsHTML = pageConfig.tabs
      .map(
        (tab, i) =>
          `<button class="mode-tab ${i === 0 ? "active" : ""}" data-tab="${tab.id}">${tab.title}</button>`
      )
      .join("");

    setHTML(`
      <div class="fade-in">
        <h2 class="section-title">${pageConfig.title}</h2>
        <p class="section-desc">${pageConfig.desc}</p>
        <div class="mode-tabs">${tabsHTML}</div>
        <div id="contentPicker"></div>
        <div id="typingContainer"></div>
      </div>
    `);
  }

  function renderContentPicker(items) {
    const picker = document.getElementById("contentPicker");
    if (!picker) return;

    const cards = items
      .map(
        (item) => `
      <div class="content-card" data-content-id="${item.id}">
        <h4>${item.title}</h4>
        <p>${item.desc}</p>
        <div class="content-card-meta">
          <span>${item.content.length} 字符</span>
        </div>
      </div>
    `
      )
      .join("");

    picker.innerHTML = cards;
    document.getElementById("typingContainer").innerHTML = "";
  }

  // ===== Typing Area =====
  function renderTypingArea(content, mode, settings) {
    const container = document.getElementById("typingContainer");
    if (!container) return;

    const isPinyin = mode === "pinyin";

    container.innerHTML = `
      <div class="typing-area">
        <div class="typing-toolbar">
          <div class="live-stats">
            <div class="live-stat">
              <div class="live-stat-label">速度</div>
              <div class="live-stat-value" id="liveSpeed">0</div>
            </div>
            <div class="live-stat">
              <div class="live-stat-label">正确率</div>
              <div class="live-stat-value success" id="liveAccuracy">100%</div>
            </div>
            <div class="live-stat">
              <div class="live-stat-label">用时</div>
              <div class="live-stat-value" id="liveTime">0s</div>
            </div>
            <div class="live-stat">
              <div class="live-stat-label">进度</div>
              <div class="live-stat-value" id="liveProgress">0/0</div>
            </div>
          </div>
          <button class="btn btn-outline" id="restartBtn">重新开始</button>
        </div>

        <div class="text-display ${isPinyin ? "pinyin-mode" : "direct-mode"}" id="textDisplay"></div>

        <div class="progress-bar-container">
          <div class="progress-bar-fill" id="progressBar" style="width:0%"></div>
        </div>

        ${settings.keyboardHint ? renderKeyboard() : ""}
      </div>
    `;
  }

  function renderKeyboard() {
    const rows = [
      ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
      ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
      ["z", "x", "c", "v", "b", "n", "m"],
    ];
    return `
      <div class="keyboard-hint" id="keyboardHint">
        ${rows
          .map(
            (row) =>
              `<div class="keyboard-row">${row
                .map((k) => `<div class="key" data-key="${k}">${k}</div>`)
                .join("")}</div>`
          )
          .join("")}
      </div>
    `;
  }

  // ===== Update Typing Display =====
  function updateTypingDisplay(state, mode) {
    const display = document.getElementById("textDisplay");
    if (!display || !state) return;

    const lines = splitLines(state);
    display.querySelectorAll(".line-block").forEach((block, i) => {
      const textEl = block.querySelector(".line-text");
      if (!textEl || !lines[i]) return;
      const { start, end } = lines[i];
      textEl.innerHTML = mode === "pinyin" ? renderPinyinLine(state, start, end) : renderDirectLine(state, start, end);
    });
  }

  // ===== 每行一个输入框（2026-08-12 用户诉求：按自然断点分行，不硬切 10 字）=====

  // 按自然断点切分 token 索引范围：[{start, end}, ...]
  // 断点：换行符(\n)、句号(。)、感叹号(！)、问号(？)
  function splitLines(state) {
    const tokens = state.tokens;
    const lines = [];
    let start = 0;
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      const isBreak =
        t.type === "newline" ||
        (t.type === "char" && t.char === "\n") ||
        (t.type === "punct" && "。！？".includes(t.char));
      if (isBreak) {
        lines.push({ start, end: i + 1 }); // 标点属于当前行
        start = i + 1;
      }
    }
    if (start < tokens.length) lines.push({ start, end: tokens.length });
    return lines;
  }

  // token 索引所在行号
  function getLineOfIndex(state, idx) {
    const lines = splitLines(state);
    for (let i = 0; i < lines.length; i++) {
      if (idx >= lines[i].start && idx < lines[i].end) return i;
    }
    return lines.length - 1;
  }

  // 该行已输入内容拼接：typedInputs 有记录用它（拼音段/上屏汉字/直输字符）；已推进但无记录
  // （标点 commitPunct / 自动跳过项）用目标字符——行输入框实时反映这一行打了什么
  function getLineTypedContent(state, ln) {
    const lines = splitLines(state);
    const line = lines[ln];
    if (!line) return "";
    let out = "";
    for (let i = line.start; i < line.end; i++) {
      const t = state.tokens[i];
      if (t.type === "space" || t.type === "newline" || (t.type === "char" && t.char === " ")) continue;
      const typed = state.typedInputs[i];
      if (typed) { out += typed; continue; }
      if (state.charStates[i] !== "pending" && i < state.currentIndex) out += t.char;
    }
    return out;
  }

  // 一次性渲染所有行块（每行：文字行 .line-text + 输入框 .line-input），
  // 之后 updateTypingDisplay 只更新 .line-text 内容，输入框 DOM 稳定（焦点/IME 不丢）
  function renderLineBlocks(state, mode) {
    const display = document.getElementById("textDisplay");
    if (!display || !state) return;
    const lines = splitLines(state);
    display.innerHTML = lines
      .map(
        (_, i) => `
        <div class="line-block" data-line="${i}">
          <div class="line-text"></div>
          <input type="text" class="line-input" data-line="${i}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="在此输入…">
        </div>`
      )
      .join("");
  }

  // 金山打字通风格：无小字行，打字结果直接靠汉字变色体现（按行渲染 [start, end)）
  function renderPinyinLine(state, start, end) {
    const tokens = state.tokens;
    const buffer = state.pinyinBuffer;
    const idx = state.currentIndex;

    let html = "";
    for (let i = start; i < end; i++) {
      const token = tokens[i];
      const charState = state.charStates[i];

      if (token.type === "space") {
        html += `<span class="pinyin-char space"></span>`;
        continue;
      }
      if (token.type === "newline") {
        html += "<br>";
        continue;
      }

      const isPunct = token.type === "punct" || token.type === "other";
      const classes = ["pinyin-char"];

      if (isPunct) classes.push("punct");
      if (charState === "correct") classes.push("correct");
      if (charState === "incorrect") classes.push("incorrect");
      if (i === idx) classes.push("current");
      if (charState === "pending" && i !== idx) classes.push("pending");

      // Pinyin label
      let labelHTML = "";
      if (token.type === "hanzi" && token.pinyin && token.pinyin !== "?") {
        if (charState === "correct") {
          labelHTML = `<span class="pinyin-label completed">${token.pinyin}</span>`;
        } else if (charState === "incorrect") {
          labelHTML = `<span class="pinyin-label error">${token.pinyin}</span>`;
        } else if (i === idx) {
          // Current character - show typed/untyped parts
          if (buffer.length > 0) {
            const typedPart = token.pinyin.slice(0, buffer.length);
            const untypedPart = token.pinyin.slice(buffer.length);
            labelHTML = `<span class="pinyin-label active"><span class="typed-part">${typedPart}</span><span class="untyped-part">${untypedPart}</span></span>`;
          } else {
            labelHTML = `<span class="pinyin-label active">${token.pinyin}</span>`;
          }
        } else {
          labelHTML = `<span class="pinyin-label">${token.pinyin}</span>`;
        }
      } else if (token.type === "hanzi") {
        labelHTML = `<span class="pinyin-label">?</span>`;
      }

      html += `<span class="${classes.join(" ")}">${labelHTML}<span class="hanzi">${escapeHTML(token.char)}</span></span>`;
    }
    return html;
  }

  function renderDirectLine(state, start, end) {
    const tokens = state.tokens;
    const idx = state.currentIndex;

    let html = "";
    for (let i = start; i < end; i++) {
      const token = tokens[i];
      const charState = state.charStates[i];

      if (token.char === "\n") {
        html += "<br>";
        continue;
      }
      if (token.char === " ") {
        if (charState === "incorrect") {
          html += `<span class="char-span space-incorrect">&nbsp;</span>`;
        } else if (i === idx) {
          html += `<span class="char-span current">&nbsp;</span>`;
        } else {
          html += `<span class="char-span">&nbsp;</span>`;
        }
        continue;
      }

      const classes = ["char-span"];
      if (charState === "correct") classes.push("correct");
      if (charState === "incorrect") classes.push("incorrect");
      if (i === idx) classes.push("current");
      if (charState === "pending" && i !== idx) classes.push("pending");

      html += `<span class="${classes.join(" ")}">${escapeHTML(token.char)}</span>`;
    }
    return html;
  }

  // ===== Update Live Stats =====
  function updateLiveStats(stats) {
    if (!stats) return;
    const speedEl = document.getElementById("liveSpeed");
    const accEl = document.getElementById("liveAccuracy");
    const timeEl = document.getElementById("liveTime");
    const progEl = document.getElementById("liveProgress");
    const barEl = document.getElementById("progressBar");

    if (speedEl) speedEl.textContent = stats.speed;
    if (accEl) {
      accEl.textContent = stats.accuracy + "%";
      accEl.className = "live-stat-value " + (stats.accuracy >= 95 ? "success" : stats.accuracy < 80 ? "danger" : "");
    }
    if (timeEl) timeEl.textContent = stats.elapsedSec + "s";
    // 进度按「字」为单位实时显示：已打字数/总字数；进度条宽度按百分比填充
    if (progEl) progEl.textContent = stats.typedChars + "/" + stats.totalChars;
    if (barEl) barEl.style.width = stats.progress + "%";
  }

  // ===== Result Panel =====
  function renderResultPanel(stats, result) {
    const container = document.getElementById("typingContainer");
    if (!container) return;

    const grade = getGrade(stats.speed, stats.accuracy);
    const newAch = result.newAchievements || [];

    container.innerHTML = `
      <div class="result-panel fade-in">
        <h2>${grade.title}</h2>
        <div class="result-stats">
          <div class="result-stat">
            <div class="result-stat-value">${stats.speed}</div>
            <div class="result-stat-label">${stats.speedUnit}</div>
          </div>
          <div class="result-stat">
            <div class="result-stat-value ${stats.accuracy >= 95 ? "success" : stats.accuracy < 80 ? "danger" : ""}">${stats.accuracy}%</div>
            <div class="result-stat-label">正确率</div>
          </div>
          <div class="result-stat">
            <div class="result-stat-value">${stats.correctChars}</div>
            <div class="result-stat-label">正确字数</div>
          </div>
          <div class="result-stat">
            <div class="result-stat-value danger">${stats.errorCount}</div>
            <div class="result-stat-label">错误次数</div>
          </div>
          <div class="result-stat">
            <div class="result-stat-value">+${result.xp}</div>
            <div class="result-stat-label">获得经验</div>
          </div>
        </div>
        ${newAch.length > 0 ? renderNewAchievements(newAch) : ""}
        <div class="result-actions">
          <button class="btn btn-primary" id="retryBtn">再练一次</button>
          <button class="btn btn-secondary" id="backBtn">返回列表</button>
        </div>
      </div>
    `;
  }

  function renderNewAchievements(achievements) {
    const items = achievements
      .map(
        (a) =>
          `<div style="text-align:center"><div style="font-size:32px">${a.icon}</div><div style="font-size:12px;color:var(--text-muted)">${a.name}</div></div>`
      )
      .join("");
    return `
      <div style="margin:20px 0;padding:16px;background:var(--accent-light);border-radius:var(--radius-sm)">
        <div style="font-size:13px;color:var(--accent);margin-bottom:12px">🎉 解锁新成就!</div>
        <div style="display:flex;gap:24px;justify-content:center">${items}</div>
      </div>
    `;
  }

  function getGrade(speed, accuracy) {
    if (speed >= 80 && accuracy >= 95) return { title: "🏆 大师级!", color: "var(--accent)" };
    if (speed >= 60 && accuracy >= 90) return { title: "⭐ 优秀!", color: "var(--success)" };
    if (speed >= 40 && accuracy >= 85) return { title: "👍 很好!", color: "var(--success)" };
    if (speed >= 20 && accuracy >= 80) return { title: "✅ 不错!", color: "var(--warning)" };
    return { title: "💪 继续努力!", color: "var(--warning)" };
  }

  // ===== Test Page =====
  function renderTestPage() {
    setHTML(`
      <div class="fade-in">
        <h2 class="section-title">打字测试</h2>
        <p class="section-desc">选择测试模式,挑战你的打字极限</p>

        <div class="mode-tabs">
          <button class="mode-tab active" data-test-type="timed">限时测试</button>
          <button class="mode-tab" data-test-type="wordcount">限字测试</button>
        </div>

        <div id="testConfig"></div>
        <div id="typingContainer"></div>
      </div>
    `);
  }

  function renderTestConfig(testType) {
    const config = document.getElementById("testConfig");
    if (!config) return;

    if (testType === "timed") {
      config.innerHTML = `
        <div class="content-picker">
          <div class="content-card selected" data-time="1"><h4>1 分钟</h4><p>快速测试</p></div>
          <div class="content-card" data-time="2"><h4>2 分钟</h4><p>短时测试</p></div>
          <div class="content-card" data-time="5"><h4>5 分钟</h4><p>标准测试</p></div>
          <div class="content-card" data-time="10"><h4>10 分钟</h4><p>耐力测试</p></div>
        </div>
        <div class="mode-tabs" style="margin-top:16px">
          <button class="mode-tab active" data-test-lang="pinyin">中文</button>
          <button class="mode-tab" data-test-lang="english">英文</button>
        </div>
        <div style="margin-top:16px">
          <button class="btn btn-primary" id="startTestBtn">开始测试</button>
        </div>
      `;
    } else {
      config.innerHTML = `
        <div class="content-picker">
          <div class="content-card selected" data-words="50"><h4>50 字</h4><p>短文</p></div>
          <div class="content-card" data-words="100"><h4>100 字</h4><p>中篇</p></div>
          <div class="content-card" data-words="300"><h4>300 字</h4><p>长文</p></div>
          <div class="content-card" data-words="500"><h4>500 字</h4><p>超长</p></div>
        </div>
        <div class="mode-tabs" style="margin-top:16px">
          <button class="mode-tab active" data-test-lang="pinyin">中文</button>
          <button class="mode-tab" data-test-lang="english">英文</button>
        </div>
        <div style="margin-top:16px">
          <button class="btn btn-primary" id="startTestBtn">开始测试</button>
        </div>
      `;
    }
    document.getElementById("typingContainer").innerHTML = "";
  }

  // ===== Game Page =====
  function renderGamePage() {
    setHTML(`
      <div class="fade-in">
        <h2 class="section-title">打字游戏</h2>
        <p class="section-desc">在游戏中提升打字速度</p>

        <div class="content-picker">
          <div class="content-card selected" data-game="rain">
            <h4>🌧️ 字母雨</h4>
            <p>字母从天而降,快速输入消灭它们</p>
          </div>
          <div class="content-card" data-game="word">
            <h4>🎯 单词射击</h4>
            <p>输入完整单词击落目标</p>
          </div>
          <div class="content-card" data-game="pinyin-rain">
            <h4>🌧️ 拼音雨</h4>
            <p>汉字降落,输入拼音消灭它们</p>
          </div>
        </div>

        <div id="gameContainer"></div>
      </div>
    `);
  }

  function renderGameArea(gameType) {
    const container = document.getElementById("gameContainer");
    if (!container) return;

    const titles = { rain: "字母雨", word: "单词射击", "pinyin-rain": "拼音雨" };

    container.innerHTML = `
      <div class="game-area">
        <div class="game-hud">
          <div class="live-stats">
            <div class="live-stat"><div class="live-stat-label">得分</div><div class="live-stat-value" id="gameScore">0</div></div>
            <div class="live-stat"><div class="live-stat-label">生命</div><div class="live-stat-value danger" id="gameLives">3</div></div>
            <div class="live-stat"><div class="live-stat-label">关卡</div><div class="live-stat-value" id="gameLevel">1</div></div>
          </div>
          <button class="btn btn-outline" id="gameExitBtn">退出</button>
        </div>
        <div class="game-canvas-wrapper">
          <canvas id="gameCanvas"></canvas>
          <div class="game-overlay" id="gameOverlay">
            <h2>${titles[gameType] || "游戏"}</h2>
            <p>准备好了吗?</p>
            <button class="btn btn-primary" id="gameStartBtn">开始游戏</button>
          </div>
        </div>
      </div>
    `;
  }

  // ===== Stats Page =====
  function renderStatsPage(summary) {
    const allAchievements = Stats.getAchievements();
    const level = summary.level;

    const achievementHTML = allAchievements
      .map((a) => {
        const unlocked = summary.achievements.includes(a.id);
        return `
        <div class="achievement ${unlocked ? "unlocked" : ""}">
          <div class="achievement-icon">${a.icon}</div>
          <div class="achievement-name">${a.name}</div>
          <div class="achievement-desc">${a.desc}</div>
        </div>
      `;
      })
      .join("");

    const historyHTML =
      summary.history.length > 0
        ? summary.history
            .slice(0, 30)
            .map((h) => {
              const date = new Date(h.date);
              const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;
              return `
            <tr>
              <td>${dateStr}</td>
              <td>${h.title || "-"}</td>
              <td>${h.speed} ${h.speedUnit}</td>
              <td>${h.accuracy}%</td>
              <td>${h.correctChars}</td>
              <td>+${h.xp}</td>
            </tr>
          `;
            })
            .join("")
        : '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted)">还没有练习记录,快去练习吧!</td></tr>';

    // Simple chart data (last 20 practices)
    const chartData = summary.history.slice(0, 20).reverse();
    const chartHTML = renderChart(chartData);

    setHTML(`
      <div class="fade-in">
        <h2 class="section-title">统计中心</h2>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-card-label">总练习次数</div>
            <div class="stat-card-value">${summary.totalPractices}</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-label">最高速度</div>
            <div class="stat-card-value">${summary.bestSpeed}<span class="stat-card-unit">${summary.bestSpeed > 0 ? "字/分" : ""}</span></div>
          </div>
          <div class="stat-card">
            <div class="stat-card-label">平均速度</div>
            <div class="stat-card-value">${summary.avgSpeed}<span class="stat-card-unit">${summary.avgSpeed > 0 ? "字/分" : ""}</span></div>
          </div>
          <div class="stat-card">
            <div class="stat-card-label">平均正确率</div>
            <div class="stat-card-value">${summary.avgAccuracy}<span class="stat-card-unit">%</span></div>
          </div>
          <div class="stat-card">
            <div class="stat-card-label">总输入字数</div>
            <div class="stat-card-value">${summary.totalChars}</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-label">总经验值</div>
            <div class="stat-card-value">${summary.totalXP}<span class="stat-card-unit">XP</span></div>
          </div>
        </div>

        ${chartHTML}

        <h3 class="section-title" style="margin-top:24px">历史记录</h3>
        <div class="chart-container">
          <table class="history-table">
            <thead>
              <tr><th>日期</th><th>内容</th><th>速度</th><th>正确率</th><th>字数</th><th>经验</th></tr>
            </thead>
            <tbody>${historyHTML}</tbody>
          </table>
        </div>

        <h3 class="section-title" style="margin-top:24px">成就墙</h3>
        <div class="achievement-grid">${achievementHTML}</div>
      </div>
    `);

    drawChart(chartData);
  }

  function renderChart(data) {
    if (data.length === 0) return "";
    return `
      <div class="chart-container">
        <h3>速度趋势 (最近 ${data.length} 次)</h3>
        <canvas class="chart-canvas" id="speedChart"></canvas>
      </div>
    `;
  }

  function drawChart(data) {
    const canvas = document.getElementById("speedChart");
    if (!canvas || data.length === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const padding = { top: 20, right: 20, bottom: 30, left: 40 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    const speeds = data.map((d) => d.speed);
    const maxSpeed = Math.max(...speeds, 10);
    const minSpeed = 0;

    // Grid lines
    ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue("--border");
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();
      const val = Math.round(maxSpeed - (maxSpeed / 4) * i);
      ctx.fillStyle = getComputedStyle(document.body).getPropertyValue("--text-muted");
      ctx.font = "11px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(val, padding.left - 5, y + 3);
    }

    // Line chart
    const accent = getComputedStyle(document.body).getPropertyValue("--accent").trim();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    data.forEach((d, i) => {
      const x = padding.left + (chartW / Math.max(data.length - 1, 1)) * i;
      const y = padding.top + chartH - (d.speed / maxSpeed) * chartH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Points
    ctx.fillStyle = accent;
    data.forEach((d, i) => {
      const x = padding.left + (chartW / Math.max(data.length - 1, 1)) * i;
      const y = padding.top + chartH - (d.speed / maxSpeed) * chartH;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // ===== Custom Text Input =====
  function renderCustomTextInput(mode) {
    const container = document.getElementById("contentPicker");
    if (!container) return;

    container.innerHTML = `
      <div style="background:var(--bg-elevated);border-radius:var(--radius);padding:24px;box-shadow:var(--shadow)">
        <h4 style="margin-bottom:12px">自定义文本</h4>
        <textarea id="customTextInput" placeholder="在此输入你想练习的文字内容...（也可直接拖拽 .txt / .md 文件到此处）" rows="4"
          style="width:100%;padding:12px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg);color:var(--text);font-size:14px;resize:vertical;font-family:inherit"></textarea>
        <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
          <button class="btn btn-primary" id="customStartBtn">开始练习</button>
          <button class="btn btn-outline" id="customImportBtn">📂 导入文本文件</button>
        </div>
        <p style="margin-top:10px;font-size:12px;color:var(--text-secondary)">支持 .txt / .md 文件，也可直接把文件拖到上方输入框</p>
        <input type="file" id="customFileInput" accept=".txt,.md,.text,text/plain,text/markdown" style="display:none">
      </div>
    `;
    document.getElementById("typingContainer").innerHTML = "";
  }

  // ===== Helpers =====
  function escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function updateLevelDisplay(summary) {
    const level = summary.level;
    const badge = document.getElementById("levelBadge");
    const fill = document.getElementById("levelProgressFill");
    const text = document.getElementById("levelText");
    if (badge) badge.textContent = "Lv." + level.level;
    if (fill) fill.style.width = Math.round((level.currentXP / level.nextLevelXP) * 100) + "%";
    if (text) text.textContent = `${level.currentXP} / ${level.nextLevelXP} 经验`;
  }

  return {
    renderHome,
    renderPracticePage,
    renderContentPicker,
    renderTypingArea,
    renderCustomTextInput,
    updateTypingDisplay,
    renderLineBlocks,
    getLineOfIndex,
    getLineTypedContent,
    updateLiveStats,
    renderResultPanel,
    renderTestPage,
    renderTestConfig,
    renderGamePage,
    renderGameArea,
    renderStatsPage,
    updateLevelDisplay,
    escapeHTML,
  };
})();
