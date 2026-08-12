// ===== Pinyin Utility Functions =====

const PinyinUtils = (function () {
  // Tone mark -> plain letter mapping
  const TONE_MAP = {
    ā: "a", á: "a", ǎ: "a", à: "a",
    ē: "e", é: "e", ě: "e", è: "e",
    ī: "i", í: "i", ǐ: "i", ì: "i",
    ō: "o", ó: "o", ǒ: "o", ò: "o",
    ū: "u", ú: "u", ǔ: "u", ù: "u",
    ǖ: "v", ǘ: "v", ǚ: "v", ǜ: "v", ü: "v",
    ḿ: "m", m̀: "m",
    ń: "n", ň: "n", ǹ: "n",
  };

  // Reverse: plain letter with tone number -> toned letter (for display if needed)
  const TONE_DISPLAY = {
    a: ["ā", "á", "ǎ", "à"],
    e: ["ē", "é", "ě", "è"],
    i: ["ī", "í", "ǐ", "ì"],
    o: ["ō", "ó", "ǒ", "ò"],
    u: ["ū", "ú", "ǔ", "ù"],
    v: ["ǖ", "ǘ", "ǚ", "ǜ"],
  };

  // Remove tone marks, convert ü to v
  function stripTone(py) {
    let result = "";
    for (const ch of py) {
      result += TONE_MAP[ch] || ch;
    }
    return result.toLowerCase();
  }

  // Check if a character is a CJK Han character
  function isHanzi(ch) {
    const code = ch.charCodeAt(0);
    return (
      (code >= 0x4e00 && code <= 0x9fff) ||
      (code >= 0x3400 && code <= 0x4dbf) ||
      (code >= 0x20000 && code <= 0x2a6df)
    );
  }

  // Check if a character is Chinese punctuation
  function isCJKPunct(ch) {
    const commonPunct = "，。、；：？！「」『』（）【】《》〈〉…—·～¥";
    return commonPunct.includes(ch) || /[\u3000-\u303f\uff00-\uffef]/.test(ch);
  }

  // ASCII punctuation ranges: !-/  :-@  [-`  {-~
  const ASCII_PUNCT_RE = /[\x21-\x2F\x3A-\x40\x5B-\x60\x7B-\x7E]/;

  // Check if a character is a typable punctuation (Chinese or ASCII)
  function isPunctChar(ch) {
    return isCJKPunct(ch) || ASCII_PUNCT_RE.test(ch);
  }

  // Half-width -> full-width punctuation mapping (lenient match for pinyin mode)
  const PUNCT_FULLWIDTH = {
    ",": "，", ".": "。", "?": "？", "!": "！", ":": "：", ";": "；",
    "(": "（", ")": "）", "[": "【", "]": "】", "{": "｛", "}": "｝",
    '"': "“", "'": "‘", "<": "《", ">": "》", "~": "～", "-": "—", "|": "丨",
  };

  // Normalize a punctuation char to its full-width form (itself if no mapping)
  function normalizePunct(ch) {
    return PUNCT_FULLWIDTH[ch] || ch;
  }

  // Look up pinyin for a single character
  function getCharPinyin(ch) {
    if (typeof PINYIN_DATA !== "undefined" && PINYIN_DATA[ch]) {
      return PINYIN_DATA[ch];
    }
    return null;
  }

  // ★ 常见多音字备选读音（2026-08-12）：
  // PINYIN_DATA 每字只存一个读音（部分取了生僻音），文章练习里用户打常用音会被判错。
  // 这里补常用备选读音（无音调），匹配时任一命中即算对。
  // 注意：只补「拼写不同」的多音字（如 了 liao/le）；同拼异调（如 曲 qǔ/qū）无需补。
  const MULTI_TONE_ALT = {
    "了": ["le"],
    "地": ["de"],
    "娜": ["nuo"],
    "行": ["hang"],
    "长": ["zhang"],
    "乐": ["yue"],
    "觉": ["jiao"],
    "重": ["chong"],
    "还": ["hai"],
    "得": ["dei"],
    "都": ["dou"],
    "只": ["zhi"],
    "教": ["jiao"],
    "降": ["xiang"],
    "处": ["chu"],
    "薄": ["bao"],
    "调": ["tiao"],
    "弹": ["dan"],
    "传": ["zhuan"],
    "奇": ["ji"],
    "数": ["shu"],
    "读": ["dou"],
    "盛": ["cheng"],
    "藏": ["zang"],
    "系": ["ji"],
    "鲜": ["xian"],
    "宿": ["xiu"],
    "好": ["hao"],
    "号": ["hao"],
    "称": ["chen"],
    "难": ["nan"],
    "量": ["liang"],
    "强": ["qiang"],
    "血": ["xie"],
    "给": ["gei"],
    "供": ["gong"],
    "划": ["hua"],
    "华": ["hua"],
    "和": ["huo"],
    "吓": ["xia"],
    "奔": ["ben"],
    "闷": ["men"],
    "担": ["dan"],
    "扫": ["sao"],
    "折": ["she"],
    "挣": ["zheng"],
    "挨": ["ai"],
    "把": ["ba"],
    "背": ["bei"],
    "奔": ["ben"],
    "薄": ["bo"],
    "差": ["cha"],
    "长": ["chang"],
    "场": ["chang"],
    "朝": ["chao"],
    "车": ["ju"],
    "称": ["cheng"],
    "乘": ["cheng"],
    "臭": ["xiu"],
    "处": ["chu"],
    "畜": ["xu"],
    "创": ["chuang"],
    "大": ["dai"],
    "逮": ["dai"],
    "弹": ["dan"],
    "当": ["dang"],
    "倒": ["dao"],
    "得": ["de"],
    "的": ["di", "de"],
    "地": ["di"],
    "钉": ["ding"],
    "度": ["duo"],
    "恶": ["wu"],
    "发": ["fa"],
    "坊": ["fang"],
    "分": ["fen"],
    "缝": ["feng"],
    "服": ["fu"],
    "干": ["gan"],
    "岗": ["gang"],
    "给": ["gei"],
    "更": ["geng"],
    "供": ["gong"],
    "冠": ["guan"],
    "观": ["guan"],
    "龟": ["jun"],
    "过": ["guo"],
    "好": ["hao"],
    "喝": ["he"],
    "荷": ["he"],
    "核": ["hu"],
    "横": ["heng"],
    "哄": ["hong"],
    "糊": ["hu"],
    "华": ["hua"],
    "划": ["hua"],
    "晃": ["huang"],
    "会": ["kuai"],
    "混": ["hun"],
    "豁": ["huo"],
    "几": ["ji"],
    "奇": ["ji"],
    "济": ["ji"],
    "系": ["ji"],
    "假": ["jia"],
    "间": ["jian"],
    "监": ["jian"],
    "将": ["jiang"],
    "降": ["jiang"],
    "教": ["jiao"],
    "角": ["jue"],
    "觉": ["jue"],
    "解": ["jie"],
    "尽": ["jin"],
    "劲": ["jing"],
    "据": ["ju"],
    "卷": ["juan"],
    "觉": ["jiao"],
    "卡": ["ka"],
    "看": ["kan"],
    "壳": ["ke"],
    "可": ["ke"],
    "空": ["kong"],
    "溃": ["hui"],
    "乐": ["le"],
    "累": ["lei"],
    "擂": ["lei"],
    "棱": ["leng"],
    "笼": ["long"],
    "露": ["lou"],
    "率": ["lv"],
    "埋": ["man"],
    "脉": ["mo"],
    "没": ["mo"],
    "蒙": ["meng"],
    "秘": ["mi"],
    "模": ["mu"],
    "难": ["nan"],
    "泥": ["ni"],
    "宁": ["ning"],
    "弄": ["long"],
    "女": ["nv"],
    "胖": ["pang"],
    "泡": ["pao"],
    "跑": ["pao"],
    "片": ["pian"],
    "漂": ["piao"],
    "铺": ["pu"],
    "仆": ["pu"],
    "期": ["ji"],
    "奇": ["ji"],
    "砌": ["qie"],
    "强": ["qiang"],
    "悄": ["qiao"],
    "翘": ["qiao"],
    "切": ["qie"],
    "亲": ["qing"],
    "曲": ["qu"],
    "圈": ["juan"],
    "任": ["ren"],
    "散": ["san"],
    "丧": ["sang"],
    "色": ["shai"],
    "塞": ["sai"],
    "刹": ["sha"],
    "扇": ["shan"],
    "少": ["shao"],
    "舍": ["she"],
    "省": ["xing"],
    "什": ["shi"],
    "石": ["dan"],
    "识": ["zhi"],
    "似": ["si"],
    "熟": ["shou"],
    "数": ["shuo"],
    "衰": ["cui"],
    "帅": ["shuai"],
    "说": ["shui"],
    "宿": ["su"],
    "遂": ["sui"],
    "苔": ["tai"],
    "提": ["ti"],
    "体": ["ti"],
    "挑": ["tiao"],
    "帖": ["tie"],
    "通": ["tong"],
    "同": ["tong"],
    "吐": ["tu"],
    "瓦": ["wa"],
    "万": ["mo"],
    "亡": ["wu"],
    "为": ["wei"],
    "尾": ["yi"],
    "委": ["wei"],
    "鲜": ["xian"],
    "相": ["xiang"],
    "削": ["xue"],
    "校": ["xiao"],
    "兴": ["xing"],
    "畜": ["chu"],
    "血": ["xu"],
    "压": ["ya"],
    "咽": ["yan"],
    "要": ["yao"],
    "遗": ["wei"],
    "饮": ["yin"],
    "应": ["ying"],
    "佣": ["yong"],
    "与": ["yu"],
    "予": ["yu"],
    "载": ["zai"],
    "脏": ["zang"],
    "扎": ["za"],
    "炸": ["zha"],
    "占": ["zhan"],
    "着": ["zhao", "zhuo"],
    "爪": ["zhua"],
    "正": ["zheng"],
    "挣": ["zheng"],
    "症": ["zheng"],
    "只": ["zhi"],
    "中": ["zhong"],
    "种": ["zhong"],
    "轴": ["zhou"],
    "转": ["zhuan"],
    "著": ["zhu"],
    "琢": ["zuo"],
    "仔": ["zai"],
    "钻": ["zuan"],
  };

  // Convert a text string to an array of token objects
  // Each token: { char, pinyin (with tones), plainPinyin (no tones), type: 'hanzi'|'punct'|'other' }
  function textToTokens(text) {
    const tokens = [];
    for (const ch of text) {
      if (isHanzi(ch)) {
        const py = getCharPinyin(ch);
        const alt = MULTI_TONE_ALT[ch];
        tokens.push({
          char: ch,
          pinyin: py || "?",
          plainPinyin: py ? stripTone(py) : "?",
          altPinyins: alt ? alt.slice() : null, // 备选读音（无音调），匹配时任一命中算对
          type: "hanzi",
        });
      } else if (isCJKPunct(ch)) {
        tokens.push({
          char: ch,
          pinyin: "",
          plainPinyin: "",
          type: "punct",
        });
      } else if (ch === " " || ch === "\n" || ch === "\r" || ch === "\t") {
        tokens.push({
          char: ch,
          pinyin: "",
          plainPinyin: "",
          type: "space",
        });
      } else {
        tokens.push({
          char: ch,
          pinyin: ch,
          plainPinyin: ch.toLowerCase(),
          type: "other",
        });
      }
    }
    return tokens;
  }

  // Normalize user input for matching (v stays as v, lowercase)
  function normalizeInput(input) {
    return input.toLowerCase().replace(/ü/g, "v");
  }

  // Fuzzy pinyin pairs for optional fuzzy matching
  const FUZZY_PAIRS = [
    ["z", "zh"], ["c", "ch"], ["s", "sh"],
    ["n", "l"], ["r", "l"],
    ["an", "ang"], ["en", "eng"], ["in", "ing"],
  ];

  function applyFuzzy(py) {
    let result = py;
    for (const [a, b] of FUZZY_PAIRS) {
      if (result.startsWith(a)) {
        result = b + result.slice(a.length);
        break;
      }
      if (result.startsWith(b)) {
        result = a + result.slice(b.length);
        break;
      }
    }
    return result;
  }

  // Check if typed buffer matches the beginning of target pinyin
  // Returns: 'full' (exact match), 'partial' (prefix match), 'none' (no match)
  function matchPinyin(buffer, targetPlain, fuzzy) {
    const buf = normalizeInput(buffer);
    const tgt = normalizeInput(targetPlain);

    if (buf === tgt) return "full";
    if (tgt.startsWith(buf)) return "partial";

    if (fuzzy) {
      // Try fuzzy matching
      const fuzzyTgt = applyFuzzy(tgt);
      if (buf === fuzzyTgt) return "full";
      if (fuzzyTgt.startsWith(buf)) return "partial";

      const fuzzyBuf = applyFuzzy(buf);
      if (fuzzyBuf === tgt) return "full";
      if (tgt.startsWith(fuzzyBuf)) return "partial";
    }

    return "none";
  }

  // Split a plain pinyin string into typed and untyped parts
  function splitPinyin(buffer, targetPlain) {
    const buf = normalizeInput(buffer);
    const tgt = normalizeInput(targetPlain);
    if (tgt.startsWith(buf)) {
      return { typed: buf, untyped: tgt.slice(buf.length) };
    }
    return { typed: buf, untyped: "" };
  }

  return {
    stripTone,
    isHanzi,
    isCJKPunct,
    isPunctChar,
    normalizePunct,
    getCharPinyin,
    textToTokens,
    normalizeInput,
    matchPinyin,
    splitPinyin,
    applyFuzzy,
  };
})();
