// ===== Statistics & Storage Module =====

const Stats = (function () {
  const STORAGE_KEY = "mazi_stats_v1";

  const ACHIEVEMENTS = [
    { id: "first_practice", icon: "🌱", name: "初出茅庐", desc: "完成第一次练习" },
    { id: "speed_20", icon: "⚡", name: "小试身手", desc: "速度达到 20" },
    { id: "speed_40", icon: "🚀", name: "渐入佳境", desc: "速度达到 40" },
    { id: "speed_60", icon: "💨", name: "风驰电掣", desc: "速度达到 60" },
    { id: "speed_80", icon: "🔥", name: "炉火纯青", desc: "速度达到 80" },
    { id: "speed_100", icon: "⭐", name: "登峰造极", desc: "速度达到 100" },
    { id: "accuracy_100", icon: "🎯", name: "百发百中", desc: "100% 正确率(至少20字)" },
    { id: "accuracy_95", icon: "✨", name: "精准达人", desc: "95%+ 正确率(至少50字)" },
    { id: "practice_10", icon: "📚", name: "勤奋好学", desc: "完成 10 次练习" },
    { id: "practice_50", icon: "📖", name: "孜孜不倦", desc: "完成 50 次练习" },
    { id: "practice_100", icon: "🏆", name: "百炼成钢", desc: "完成 100 次练习" },
    { id: "total_1000", icon: "✏️", name: "千字斩", desc: "累计输入 1000 字" },
    { id: "total_5000", icon: "📝", name: "五千字关", desc: "累计输入 5000 字" },
    { id: "total_10000", icon: "💎", name: "万字大师", desc: "累计输入 10000 字" },
    { id: "poem_master", icon: "📜", name: "诗词达人", desc: "完成 5 首古诗" },
    { id: "idiom_master", icon: "🀄", name: "成语大王", desc: "完成 5 组成语" },
  ];

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return { history: [], totalXP: 0, achievements: [], totalChars: 0, lastPracticeDate: null };
  }

  function save(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {}
  }

  function getLevel(xp) {
    // Level N requires: 100 * (N-1) * N / 2 XP cumulative
    // Level 1: 0, Level 2: 100, Level 3: 300, Level 4: 600, ...
    let level = 1;
    let needed = 0;
    while (xp >= needed + 100 * level) {
      needed += 100 * level;
      level++;
    }
    const currentLevelXP = xp - needed;
    const nextLevelXP = 100 * level;
    return { level, currentXP: currentLevelXP, nextLevelXP };
  }

  function recordResult(result) {
    const data = load();

    // Calculate XP earned
    const xp = Math.round(
      (result.speed * result.accuracy) / 100 +
        result.correctChars / 10 +
        (result.accuracy >= 95 ? 10 : 0)
    );

    const record = {
      date: Date.now(),
      mode: result.mode,
      category: result.category,
      title: result.title,
      speed: result.speed,
      speedUnit: result.speedUnit,
      accuracy: result.accuracy,
      correctChars: result.correctChars,
      errorCount: result.errorCount,
      duration: result.elapsedMs,
      xp,
    };

    data.history.push(record);
    data.totalXP += xp;
    data.totalChars += result.correctChars;

    // Check daily streak
    const today = new Date().toDateString();
    data.lastPracticeDate = today;

    // Check achievements
    const newAchievements = checkAchievements(data, result);

    save(data);

    return { record, xp, newAchievements, level: getLevel(data.totalXP) };
  }

  function checkAchievements(data, result) {
    const newOnes = [];
    const has = (id) => data.achievements.includes(id);
    const add = (id) => {
      if (!has(id)) {
        data.achievements.push(id);
        newOnes.push(ACHIEVEMENTS.find((a) => a.id === id));
      }
    };

    const practiceCount = data.history.length;
    const bestSpeed = Math.max(...data.history.map((h) => h.speed));

    if (practiceCount >= 1) add("first_practice");
    if (bestSpeed >= 20) add("speed_20");
    if (bestSpeed >= 40) add("speed_40");
    if (bestSpeed >= 60) add("speed_60");
    if (bestSpeed >= 80) add("speed_80");
    if (bestSpeed >= 100) add("speed_100");
    if (result.accuracy === 100 && result.correctChars >= 20) add("accuracy_100");
    if (result.accuracy >= 95 && result.correctChars >= 50) add("accuracy_95");
    if (practiceCount >= 10) add("practice_10");
    if (practiceCount >= 50) add("practice_50");
    if (practiceCount >= 100) add("practice_100");
    if (data.totalChars >= 1000) add("total_1000");
    if (data.totalChars >= 5000) add("total_5000");
    if (data.totalChars >= 10000) add("total_10000");

 // Poem & idiom achievements
    const poemCount = data.history.filter(
      (h) => h.category === "pinyin" && h.title && h.title.includes("诗")
    ).length;
    const idiomCount = data.history.filter(
      (h) => h.category === "pinyin" && h.title && h.title.includes("成语")
    ).length;
    if (poemCount >= 5) add("poem_master");
    if (idiomCount >= 5) add("idiom_master");

    return newOnes;
  }

  function getSummary() {
    const data = load();
    const history = data.history;

    if (history.length === 0) {
      return {
        totalPractices: 0,
        bestSpeed: 0,
        avgSpeed: 0,
        avgAccuracy: 0,
        totalChars: 0,
        totalXP: 0,
        level: getLevel(0),
        achievements: [],
        history: [],
      };
    }

    const speeds = history.map((h) => h.speed);
    const accuracies = history.map((h) => h.accuracy);

    return {
      totalPractices: history.length,
      bestSpeed: Math.max(...speeds),
      avgSpeed: Math.round(speeds.reduce((a, b) => a + b, 0) / speeds.length),
      avgAccuracy: Math.round(
        accuracies.reduce((a, b) => a + b, 0) / accuracies.length
      ),
      totalChars: data.totalChars,
      totalXP: data.totalXP,
      level: getLevel(data.totalXP),
      achievements: data.achievements,
      history: history.slice(-50).reverse(),
    };
  }

  function getAchievements() {
    return ACHIEVEMENTS;
  }

  function clearAll() {
    localStorage.removeItem(STORAGE_KEY);
  }

  return {
    recordResult,
    getSummary,
    getAchievements,
    getLevel,
    clearAll,
  };
})();
