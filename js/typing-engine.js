// ===== Core Typing Engine =====

const TypingEngine = (function () {
  let state = null;

  function createSession(text, mode, settings) {
    let tokens;
    if (mode === "pinyin") {
      tokens = PinyinUtils.textToTokens(text);
    } else {
      tokens = [];
      for (const ch of text) {
        tokens.push({ char: ch, type: ch === "\n" ? "newline" : "char" });
      }
    }

    state = {
      tokens,
      mode,
      charStates: tokens.map(() => "pending"),
      typedInputs: tokens.map(() => ""), // 每字位置记录用户实际输入内容（拼音/上屏汉字），供打字显示区一一平行对应
      currentIndex: 0,
      pinyinBuffer: "",
      // 缓冲来源标记："direct"=直输字母（flush 停顿自动分词可用）；"ime"=IME 组合失败恢复
      // （flush 必须跳过——否则组合 quq 无候选结束 → restoreBuffer 还回字母后，800ms
      //  flush 又把 quq 自动分词判对推进：字没选就生成（"只打拼音字自己出来"）+ 字母被清
      //  （"最多三个字母强制清除"）。IME 恢复的缓冲只等用户操作：退格/重新组合上屏/直输转回）
      bufferSource: "direct",
      startTime: null,
      endTime: null,
      errorCount: 0,
      keystrokeCount: 0,
      correctKeystrokes: 0,
      isComplete: false,
      settings: settings || {},
    };

    // Auto-advance past non-typable tokens (space, newline, english; punct only when punctFilter on)
    if (mode === "pinyin") {
      autoAdvance();
    }

    return state;
  }

  // 自动跳过判定：
  // - space / newline / other(英文数字) 始终跳过
  // - punct(中文标点) 仅在 punctFilter 开启时跳过；默认不过滤 → 标点也要输入
  function shouldSkip(token) {
    if (token.type === "space" || token.type === "newline" || token.type === "other") return true;
    if (token.type === "punct") return !!state.settings.punctFilter;
    return false;
  }

  function autoAdvance() {
    while (state.currentIndex < state.tokens.length) {
      const token = state.tokens[state.currentIndex];
      if (shouldSkip(token)) {
        state.charStates[state.currentIndex] = "correct";
        state.currentIndex++;
      } else {
        break;
      }
    }
  }

  function startTimer() {
    if (state.startTime === null) {
      state.startTime = Date.now();
    }
  }

  function processChar(ch) {
    if (!state || state.isComplete) return;
    startTimer();
    state.keystrokeCount++;

    if (state.mode === "pinyin") {
      processPinyinChar(ch);
    } else {
      processDirectChar(ch);
    }

    checkComplete();
  }

  function processDirectChar(ch) {
    const idx = state.currentIndex;
    if (idx >= state.tokens.length) return;

    const target = state.tokens[idx].char;
    const isMatch = ch === target || (ch === " " && target === " ");

    if (isMatch) {
      state.charStates[idx] = "correct";
      state.correctKeystrokes++;
    } else {
      state.charStates[idx] = "incorrect";
      state.errorCount++;
    }
    state.typedInputs[idx] = ch;
    state.currentIndex++;
  }

  function processPinyinChar(ch) {
    const ch_lower = ch.toLowerCase();
    // Only accept a-z in pinyin mode
    if (!/^[a-z]$/.test(ch_lower)) return;

    // 直输字母进入缓冲 → 标记为 direct，flush 自动分词恢复可用
    // （IME 恢复的缓冲在用户继续直输后转回 direct，后续停顿自动分词正常）
    state.bufferSource = "direct";
    state.pinyinBuffer += ch_lower;
    advancePinyinBuffer();
  }

  // 拼接从 idx 起的连续汉字段（遇 punct/space/newline/other 即停），
  // 返回段拼接串与匹配信息供推进/等待判定。
  //   acc:          主读音拼接串
  //   cnt:          拼接的汉字数
  //   boundaryFull: 缓冲恰好完整匹配到的字边界字数（0 = 无）
  //   fullCnt:      缓冲前缀已完整匹配到的字数（可 < 已拼接字数，
  //                 如打 ququzhed → 前 3 字「曲曲折」完整匹配，第 4 字只打了 d）
  //   altSeg:       多音字命中备选读音时的 { idx, seg }
  //   reachedEnd:   段是否拼到了末尾（标点/句尾）
  function buildSegment(idx, buffer) {
    let acc = "", cnt = 0, boundaryFull = 0, altSeg = null, reachedEnd = false;
    let fullCnt = 0;
    let p = idx;
    for (; p < state.tokens.length; p++) {
      const t = state.tokens[p];
      if (t.type !== "hanzi" || !t.plainPinyin || t.plainPinyin === "?") { reachedEnd = true; break; }
      acc += t.plainPinyin;
      cnt++;
      if (acc === buffer) boundaryFull = cnt;
      if (buffer.startsWith(acc)) fullCnt = cnt;
      // 多音字：主读音前缀 + 备选读音 恰好等于/为缓冲前缀 → 字边界
      if (t.altPinyins) {
        const prefix = acc.slice(0, acc.length - t.plainPinyin.length);
        for (const alt of t.altPinyins) {
          const cand = prefix + alt;
          if (cand === buffer) { boundaryFull = cnt; altSeg = { idx: p, seg: alt }; break; }
          if (buffer.startsWith(cand)) { fullCnt = cnt; altSeg = { idx: p, seg: alt }; }
        }
      }
      if (buffer.length < acc.length) {
        // 主读音长度已超过缓冲：无法再精确匹配更多字。
        // 但要确认段是否已到尾（多音字备选读音场景：如「东风来了」打 dongfenglaile，
        // 主读音 acc 是 dongfenglailiao 比缓冲长，但「了」的备选 le 恰好匹配到段尾）。
        // 若 break 点之后紧邻的就是非汉字/结尾 → 已到段尾。
        const q = p + 1;
        if (q >= state.tokens.length || state.tokens[q].type !== "hanzi" ||
            !state.tokens[q].plainPinyin || state.tokens[q].plainPinyin === "?") {
          reachedEnd = true;
        }
        break;
      }
    }
    if (p >= state.tokens.length) reachedEnd = true;
    return { acc, cnt, boundaryFull, altSeg, reachedEnd, fullCnt };
  }

  // 前 n 个字实际消费的拼音长度（多音字最后一个字用备选读音长度）
  function consumedLen(idx, n, altSeg) {
    let len = 0;
    for (let j = 0; j < n; j++) {
      const t = state.tokens[idx + j];
      if (altSeg && idx + j === altSeg.idx) len += altSeg.seg.length;
      else len += t.plainPinyin.length;
    }
    return len;
  }

  // 批量推进 [idx, idx+n) 的字并记录每字的拼音段（多音字用备选读音）
  function commitSegment(idx, n, acc, altSeg) {
    let off = 0;
    for (let j = 0; j < n; j++) {
      const t = state.tokens[idx + j];
      let seg = acc.slice(off, off + t.plainPinyin.length);
      if (altSeg && idx + j === altSeg.idx) seg = altSeg.seg;
      state.typedInputs[idx + j] = seg;
      state.charStates[idx + j] = "correct";
      state.correctKeystrokes += seg.length;
      off += t.plainPinyin.length;
    }
    state.currentIndex = idx + n;
    autoAdvance();
  }

  // ★ 无限连续输入核心（2026-08-12）：
  // 拼音缓冲从 currentIndex 起拼接连续汉字段匹配。**打满字边界不立即锁定推进**
  // （否则打 qu 刚匹配「曲」就被清空切框，用户无法一口气输入），而是延迟分词：
  //   - 缓冲是某段前缀 / 完整匹配到中间字边界 → 等待，继续累积（框里拼音不清零）
  //   - 缓冲完整匹配到段尾（标点/句尾）或跨过段尾 → 批量推进整段
  //   - 停顿（app.js 800ms debounce 调 flushPinyin）→ 把已完整匹配的字推进
  function advancePinyinBuffer() {
    while (state.pinyinBuffer.length > 0) {
      const idx = state.currentIndex;
      if (idx >= state.tokens.length) { state.pinyinBuffer = ""; break; }
      const token = state.tokens[idx];

      if (token.type !== "hanzi") {
        // 目标不是汉字（标点/空格/换行等）：自动判对跳过，保留缓冲继续匹配后续汉字
        // （用户主动打标点时仍走 commitPunct 正常匹配路径）
        state.charStates[idx] = "correct";
        state.currentIndex++;
        continue;
      }

      if (!token.plainPinyin || token.plainPinyin === "?") {
        // 未知字：接受任意输入并推进
        state.typedInputs[idx] = state.pinyinBuffer;
        state.charStates[idx] = "correct";
        state.currentIndex++;
        state.pinyinBuffer = "";
        autoAdvance();
        break;
      }

      const seg = buildSegment(idx, state.pinyinBuffer);

      // ★ 不自动提交（2026-08-13 修复"字母凭空消失"）：
      // 无论缓冲匹配到段尾还是中间字边界，一律不推进、不清缓冲。
      // 用户按空格键时手动调用 flushPinyin() 统一提交。
      // 这样拼音永远留在输入框里，跟聊天软件输入法行为一致。
      // 完整匹配到字边界（段尾或段中）→ 不推进，等待空格键手动提交
      // （如打 qu 匹配「曲」后继续打 q → quq 仍是「曲曲」前缀，不断档不清零）
      if (seg.boundaryFull > 0) break;

      // partial：前缀匹配，等待更多输入（不推进、保留缓冲）。
      // fullCnt>0 也算 partial：用户已完整打对了前面几个字，剩余缓冲只是
      // 下一个字还没打完（如打 ququzhe 后又打了 d → 前 3 字完整，等 flush 推进）
      let partial = seg.fullCnt > 0 || PinyinUtils.matchPinyin(state.pinyinBuffer, seg.acc, state.settings.fuzzy) !== "none";
      // ★ 多音字备选读音前缀（2026-08-12 修复）：主读音与备选读音前缀分歧时
      //   （如 娜 na vs nuo，分歧在第 2 个字母 a/u），逐字母打到备选读音中间
      //   （"nu" 是 "nuo" 前缀但不是 "na" 前缀）主读音前缀判断会误判 none → 判错。
      //   这里额外检查：缓冲是否为「前面字主读音 + 某字备选读音」的前缀 → 等待不判错。
      if (!partial) {
        let pref = "";
        for (let q = idx; q < idx + seg.cnt; q++) {
          const t = state.tokens[q];
          if (t.altPinyins) {
            for (const alt of t.altPinyins) {
              const cand = pref + alt;
              if (state.pinyinBuffer.length > pref.length && cand.startsWith(state.pinyinBuffer)) {
                partial = true;
                break;
              }
            }
            if (partial) break;
          }
          pref += t.plainPinyin;
        }
      }
      if (partial) break;

      // none：判错当前字并推进（缓冲清空，用户重打）
      state.typedInputs[idx] = state.pinyinBuffer;
      state.charStates[idx] = "incorrect";
      state.errorCount++;
      state.currentIndex++;
      state.pinyinBuffer = "";
      autoAdvance();
      break;
    }
  }

  // 停顿自动分词（app.js debounce 调用）：把当前缓冲前缀已完整匹配到的字批量推进，
  // 剩余缓冲（用户已开始打下个字的拼音）保留继续匹配。返回是否发生了推进。
  // ★ IME 恢复的缓冲（bufferSource==="ime"）不自动分词：组合失败还原的字母只等用户
  //   操作（退格修改 / 重新组合选字上屏 / 继续直输），避免"没选字字却自动生成"。
  function flushPinyin() {
    if (!state || state.isComplete || state.mode !== "pinyin") return false;
    if (!state.pinyinBuffer) return false;
    if (state.bufferSource === "ime") return false;
    const idx = state.currentIndex;
    if (idx >= state.tokens.length) return false;
    const token = state.tokens[idx];
    if (token.type !== "hanzi" || !token.plainPinyin || token.plainPinyin === "?") return false;
    const seg = buildSegment(idx, state.pinyinBuffer);
    const n = seg.boundaryFull > 0 ? seg.boundaryFull : seg.fullCnt;
    if (n <= 0) return false;
    commitSegment(idx, n, seg.acc, seg.altSeg);
    if (seg.boundaryFull > 0) {
      // 缓冲恰好完整匹配到边界 → 无剩余
      state.pinyinBuffer = "";
    } else {
      // 用户已开始打下个字的拼音（如打 ququzhe 后又打了 d）→ 剩余缓冲继续匹配
      state.pinyinBuffer = state.pinyinBuffer.slice(consumedLen(idx, n, seg.altSeg));
    }
    return true;
  }

  // IME 组合结束但无汉字/标点上屏（取消组合 / 无候选词 / 上屏的是字母）时，
  // 把组合拼音还给引擎缓冲继续等待——否则输入框被清空、引擎缓冲为空，
  // 用户已打的字母全部丢失（症状："最多三个字母就强制清除"）。
  // 组合期间字母不进引擎（缓冲为空），故直接设为组合拼音；
  // 不立即推进——保持延迟分词，停顿后 flushPinyin 或继续输入自然处理。
  function restoreBuffer(pinyin) {
    if (!state || state.isComplete || state.mode !== "pinyin") return false;
    const p = String(pinyin || "").toLowerCase().replace(/[^a-z]/g, "");
    if (!p) return false;
    state.pinyinBuffer = p;
    // ★ IME 组合失败恢复的缓冲：标记 ime，flush 自动分词跳过（见 flushPinyin）
    state.bufferSource = "ime";
    return true;
  }

  function handleBackspace() {
    if (!state || state.isComplete) return;

    if (state.mode === "pinyin") {
      if (state.pinyinBuffer.length > 0) {
        // Remove last char from buffer
        state.pinyinBuffer = state.pinyinBuffer.slice(0, -1);
      } else {
        // Go back to previous typable character
        goBack();
      }
    } else {
      goBack();
    }
  }

  function goBack() {
    if (state.currentIndex > 0) {
      state.currentIndex--;
      // Go back past auto-advanced tokens
      while (state.currentIndex > 0) {
        if (shouldSkip(state.tokens[state.currentIndex])) {
          state.currentIndex--;
        } else {
          break;
        }
      }
      state.charStates[state.currentIndex] = "pending";
      state.typedInputs[state.currentIndex] = "";
      state.pinyinBuffer = "";
    }
  }

  // IME 上屏两级验证：拼音层（组合期间敲的拼音与目标拼音匹配）＋汉字层（上屏汉字与目标汉字一致）
  // 两层都正确才算对；任一错误（拼音打错或选错候选字）都判错。
  // committed: 上屏汉字；pinyinStr: 组合期间敲的拼音（即时上屏输入法无组合信息时传空，跳过拼音层）
  function commitText(committed, pinyinStr) {
    if (!state || state.isComplete || state.mode !== "pinyin") return;
    startTimer();
    const chars = Array.from(String(committed || "")).filter((c) => /[\u4e00-\u9fff]/.test(c));
    if (chars.length === 0) return;

    // 定位起点：IME 组合期间字母不喂引擎，currentIndex 即正在输入的字
    let cur = state.currentIndex;
    while (cur < state.tokens.length && state.tokens[cur].type !== "hanzi") cur++;
    if (cur >= state.tokens.length) {
      cur = state.currentIndex - 1;
      while (cur >= 0 && state.tokens[cur].type !== "hanzi") cur--;
    }
    if (cur < 0) return;

    // 拼音层：组合拼音（去空格）逐字消费验证——每字匹配主读音或备选读音
    // （最后一字允许只输入前缀），全部能消费且无剩余 → 拼音正确。
    // ★ 兼容多音字（2026-08-12）：如「东风来了」IME 打 dongfenglaile，「了」le 命中备选读音
    const typed = String(pinyinStr || "").toLowerCase().replace(/\s+/g, "");
    let pinyinOK = true;
    if (typed) {
      let rest = typed;
      let p = cur;
      let gotChars = 0;
      while (p < state.tokens.length && gotChars < chars.length && rest.length > 0) {
        if (state.tokens[p].type !== "hanzi") { p++; continue; }
        const t = state.tokens[p];
        const cands = [];
        if (t.plainPinyin && t.plainPinyin !== "?") cands.push(t.plainPinyin);
        if (t.altPinyins) for (const a of t.altPinyins) if (!cands.includes(a)) cands.push(a);
        const isLast = gotChars === chars.length - 1;
        let hitLen = 0;
        for (const c of cands) {
          if (rest.startsWith(c)) { hitLen = c.length; break; }
          if (isLast && c.startsWith(rest)) { hitLen = rest.length; break; } // 最后一字允许前缀
        }
        if (hitLen === 0) { pinyinOK = false; break; }
        rest = rest.slice(hitLen);
        gotChars++;
        p++;
      }
      if (pinyinOK && rest.length > 0) pinyinOK = false; // 全部字已消费但拼音还有剩余 → 打错
    }
    if (typed) {
      state.keystrokeCount += typed.length;
    } else {
      // 无组合拼音直接上屏（insertText/部分输入法直出汉字）：按目标拼音长度计击键，
      // 与下方 correctKeystrokes 累计口径一致，避免正确率失真（如 1300%）
      let p = cur;
      let got = 0;
      while (p < state.tokens.length && got < chars.length) {
        if (state.tokens[p].type === "hanzi") {
          const tp = state.tokens[p].plainPinyin;
          if (tp && tp !== "?") state.keystrokeCount += tp.length;
          got++;
        }
        p++;
      }
    }

    // 汉字层：上屏汉字逐个与目标字对照，两层都过才判对
    let cursor = cur;
    for (let i = 0; i < chars.length && cursor < state.tokens.length; i++) {
      while (cursor < state.tokens.length && state.tokens[cursor].type !== "hanzi") cursor++;
      if (cursor >= state.tokens.length) break;
      const token = state.tokens[cursor];
      const charOK = token.char === chars[i];
      state.typedInputs[cursor] = chars[i]; // 记录上屏汉字，打字显示区展示用户实际输入
      if (charOK && pinyinOK) {
        if (state.charStates[cursor] === "pending") {
          state.charStates[cursor] = "correct";
          const pLen = token.plainPinyin && token.plainPinyin !== "?" ? token.plainPinyin.length : 0;
          if (pLen > 0) state.correctKeystrokes += pLen;
        }
      } else {
        if (state.charStates[cursor] === "correct") {
          // 已判对但上屏复核不符 → 改判错误，扣回已计入的拼音击键
          state.charStates[cursor] = "incorrect";
          state.errorCount++;
          const pLen = (token.plainPinyin || "").length;
          if (pLen > 0) state.correctKeystrokes = Math.max(0, state.correctKeystrokes - pLen);
        } else if (state.charStates[cursor] === "pending") {
          state.charStates[cursor] = "incorrect";
          state.errorCount++;
        }
        // 已是 incorrect（compositionend 与 oninput 双路径重复复核）→ 不重复计数
      }
      cursor++;
    }

    // 上屏即代表输入完成：推进到上屏汉字之后（标点/空格由 autoAdvance 跳过）
    let newIdx = cur;
    for (let i = 0; i < chars.length && newIdx < state.tokens.length; i++) newIdx++;
    if (newIdx > state.currentIndex) {
      state.currentIndex = newIdx;
      state.pinyinBuffer = "";
      autoAdvance();
      checkComplete();
    }
  }

  // 标点上屏提交（pinyin 模式）：目标为标点时，将上屏/直输的标点字符与目标标点
  // 逐个比对后推进（全半角宽容匹配）。返回 "ok"(全对) / "error"(有错) / "none"(未消费)。
  // 若当前字是汉字而输入标点 → 视为误操作，返回 "none" 不推进。
  function commitPunct(punctStr) {
    if (!state || state.isComplete || state.mode !== "pinyin") return "none";
    if (state.settings.punctFilter) return "none";
    startTimer();
    const chars = Array.from(String(punctStr || "")).filter((c) => PinyinUtils.isPunctChar(c));
    if (chars.length === 0) return "none";

    // 定位起点：currentIndex 必须落在标点上（前面只能是被自动跳过的 token）
    let cur = state.currentIndex;
    while (cur < state.tokens.length) {
      const t = state.tokens[cur].type;
      if (t === "punct") break;
      if (t === "space" || t === "newline" || t === "other") { cur++; continue; }
      return "none"; // 遇到汉字：当前不消费标点
    }
    if (cur >= state.tokens.length) return "none";

    state.keystrokeCount += chars.length;
    let hadError = false;
    let cursor = cur;
    for (let i = 0; i < chars.length && cursor < state.tokens.length; i++) {
      const token = state.tokens[cursor];
      if (token.type !== "punct") break; // 中途遇到非标点即停，避免跳过汉字误判
      const ok = token.char === chars[i] || token.char === PinyinUtils.normalizePunct(chars[i]);
      state.typedInputs[cursor] = chars[i];
      if (ok) {
        if (state.charStates[cursor] === "pending") {
          state.charStates[cursor] = "correct";
          state.correctKeystrokes++;
        }
      } else {
        if (state.charStates[cursor] === "pending") {
          state.charStates[cursor] = "incorrect";
          state.errorCount++;
        }
        hadError = true;
      }
      cursor++;
    }

    const newIdx = cursor;
    if (newIdx > state.currentIndex) {
      state.currentIndex = newIdx;
      state.pinyinBuffer = "";
      autoAdvance();
      checkComplete();
    }
    return hadError ? "error" : "ok";
  }

  function checkComplete() {
    if (state.currentIndex >= state.tokens.length) {
      state.isComplete = true;
      state.endTime = Date.now();
    }
  }

  function getElapsedMs() {
    if (!state || state.startTime === null) return 0;
    const end = state.endTime || Date.now();
    return end - state.startTime;
  }

  function getStats() {
    if (!state) return null;

    const elapsedMs = getElapsedMs();
    const elapsedMin = elapsedMs / 60000;

    let correctChars = 0;
    let totalChars = 0;
    let typedChars = 0;

    for (let i = 0; i < state.tokens.length; i++) {
      const token = state.tokens[i];
      // Only count typable characters
      if (state.mode === "pinyin") {
        const isTypable =
          token.type === "hanzi" ||
          (token.type === "punct" && !state.settings.punctFilter); // 未过滤时标点也要输入
        if (isTypable) {
          totalChars++;
          if (i < state.currentIndex) typedChars++;
          if (state.charStates[i] === "correct") correctChars++;
        }
      } else {
        if (token.type === "char") {
          totalChars++;
          if (i < state.currentIndex) typedChars++;
          if (state.charStates[i] === "correct") correctChars++;
        }
      }
    }

    // Speed calculation
    let speed = 0;
    if (elapsedMin > 0) {
      if (state.mode === "pinyin") {
        // CPM (characters per minute) for Chinese
        speed = Math.round(correctChars / elapsedMin);
      } else {
        // WPM (words per minute, 5 chars = 1 word) for English
        speed = Math.round((correctChars / 5) / elapsedMin);
      }
    }

    // Accuracy
    let accuracy = 100;
    if (state.keystrokeCount > 0) {
      accuracy = Math.round((state.correctKeystrokes / state.keystrokeCount) * 100);
    }

    const progress = totalChars > 0 ? Math.round((typedChars / totalChars) * 100) : 0;

    return {
      speed,
      speedUnit: state.mode === "pinyin" ? "字/分" : "WPM",
      accuracy,
      correctChars,
      totalChars,
      typedChars,
      errorCount: state.errorCount,
      keystrokeCount: state.keystrokeCount,
      progress,
      elapsedMs,
      elapsedSec: Math.round(elapsedMs / 1000),
      isComplete: state.isComplete,
    };
  }

  function getCurrentIndex() {
    return state ? state.currentIndex : 0;
  }

  function getPinyinBuffer() {
    return state ? state.pinyinBuffer : "";
  }

  function getState() {
    return state;
  }

  function reset() {
    state = null;
  }

  return {
    createSession,
    processChar,
    handleBackspace,
    commitText,
    commitPunct,
    flushPinyin,
    restoreBuffer,
    getStats,
    getCurrentIndex,
    getPinyinBuffer,
    getState,
    reset,
  };
})();
