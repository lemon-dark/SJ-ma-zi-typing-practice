// ===== Practice Content Data =====

const PracticeData = {

  // ===== English Typing =====
  english: {
    keyDrills: [
      { id: "home-row", title: "基准键位 asdf jkl;", desc: "Home Row", content: "asdf jkl; asdf jkl; sad lad fad dak jak ask all dad fall lass jask kale" },
      { id: "top-row", title: "上排键位 qwerty", desc: "Top Row", content: "qwertyuiop qwer tyui opqw wert yuio poiu rewt youi pipe write quote party quiet" },
      { id: "bottom-row", title: "下排键位 zxcvbn", desc: "Bottom Row", content: "zxcvbnm zxcv bnm bnmc xvzc mnbv zoom cake very buzz maven zone nova move love" },
      { id: "shift-drill", title: "Shift 键练习", desc: "Shift Keys", content: "The Quick Brown Fox Jumps Over The Lazy Dog A B C D E F G H I J K L M N O P Q R S T U V W X Y Z" },
      { id: "number-row", title: "数字键练习", desc: "Number Row", content: "1234567890 1234 5678 9012 3456 7890 1357 2468 0246 8642 9753 1928 3746 5601" },
      { id: "symbol-drill", title: "符号键练习", desc: "Symbols", content: "!@#$%^&*() !@# $%^ &*( )(! #@% ^&* *)@ #!@ $%^ &*() <>? {}| []\\ \"\" '' ;; .. ,, //" },
    ],
    words: [
      { id: "common-100", title: "常用单词 100", desc: "100 Common Words", content: "the be to of and a in that have I it for not on with he as you do at this but his by from they we say her she or an will my one all would there their what so up out if about who get which go me when make can like time no just him know take people into year your good some could them see other than then now look only come its over think also back after use two how our work first well way even new want because any these give day most us" },
      { id: "tech-words", title: "科技词汇", desc: "Technology", content: "computer keyboard monitor processor memory network database algorithm software hardware internet protocol browser server client application function variable compile debug deploy framework library module component interface abstract virtual override inherit constructor delegate async await promise callback event listener render" },
      { id: "business-words", title: "商务词汇", desc: "Business", content: "company market strategy finance investment revenue profit customer service product management development growth opportunity challenge solution innovation quality efficiency productivity collaboration communication negotiation partnership proposal contract budget analysis report" },
    ],
    articles: [
      { id: "pangram", title: "全字母句", desc: "Pangram", content: "The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs. How vexingly quick daft zebras jump! The five boxing wizards jump quickly. Sphinx of black quartz, judge my vow." },
      { id: "earth", title: "The Earth", desc: "Our Planet", content: "The Earth is the third planet from the Sun and the only astronomical object known to harbor life. It is the densest planet in the Solar System and the largest of the four terrestrial planets. Earth revolves around the Sun once every 365.25 days." },
      { id: "tech-future", title: "Technology and Future", desc: "Essay", content: "Technology has transformed the way we live, work, and communicate. From the invention of the wheel to the development of artificial intelligence, each breakthrough has pushed the boundaries of human capability. As we look to the future, we must balance innovation with responsibility, ensuring that technology serves humanity rather than the other way around." },
    ],
  },

  // ===== Pinyin (Chinese) Typing =====
  pinyin: {
    initials: [
      { id: "bpmf", title: "b p m f", desc: "双唇音", content: "爸爸 妈妈 伯伯 伯母 马匹 麻木 米面 模范 佛法 飞奔 发放" },
      { id: "dtnl", title: "d t n l", desc: "舌尖音", content: "大地 搭档 奶奶 牛奶 拿来 流浪 来历 伦理 低头 电梯" },
      { id: "gkh", title: "g k h", desc: "舌根音", content: "哥哥 高贵 开关 看管 喝茶 荷花 哭喊 困惑 感慨 更好" },
      { id: "jqx", title: "j q x", desc: "舌面音", content: "机器 积极 气球 情趣 休息 相信 学习 想象 坚强 精确" },
      { id: "zhchshr", title: "zh ch sh r", desc: "翘舌音", content: "知道 制造 吃饭 迟迟 说话 手术 热闹 如果 认真 知识" },
      { id: "zcs", title: "z c s", desc: "平舌音", content: "自在 子孙 姿色 从来 匆匆 思念 丝竹 色彩 草丛 钻石" },
      { id: "yw", title: "y w", desc: "零声母", content: "爷爷 夜晚 眼睛 牙齿 武术 晚饭 外国 文章 温暖 威武" },
    ],
    finals: [
      { id: "a-o-e", title: "a o e", desc: "单韵母", content: "大伯 拔荷 模特 磨合 突破 沙漠 打磨 发达 可乐 合格" },
      { id: "i-u-v", title: "i u ü", desc: "单韵母", content: "机器 集体 体会 独立 出入 举止 须要 区域 女性 菊花" },
      { id: "ai-ei", title: "ai ei ui", desc: "复韵母", content: "白菜 配对 黑白 飞快 悲哀 回归 退回 美丽 摧毁 灰白" },
      { id: "ao-ou", title: "ao ou iu", desc: "复韵母", content: "早操 逗留 交流 优秀 求救 丢球 牛油 幼苗 招手 高手" },
      { id: "an-en", title: "an en in un ün", desc: "鼻韵母", content: "安稳 担心 勤奋 均匀 信心 昆仑 温存 斑纹 论文 训练" },
      { id: "ang-eng", title: "ang eng ing ong", desc: "后鼻韵母", content: "帮忙 方向 成功 聪明 灯笼 星空 红星 充当 冰凉 隆重" },
    ],
    characters: [
      { id: "freq-1", title: "高频汉字 一", desc: "最常用", content: "的一是不了人在我有他这中大为来上国民个到就义说和地也以子时道你" },
      { id: "freq-2", title: "高频汉字 二", desc: "常用", content: "会出工能下自到生在要行方前所然后起本定事面都多可里正文十明老四" },
      { id: "freq-3", title: "高频汉字 三", desc: "次常用", content: "天化何信合手少性别发力原反受公合牙各九合由听员品判告类总名向" },
      { id: "nature", title: "自然万物", desc: "自然", content: "山水天地日月星辰风雨雷电春夏秋冬花草树木江河湖海云雾冰霜" },
      { id: "body", title: "人体器官", desc: "身体", content: "头手眼耳口鼻舌牙心肝肺胃手脚腿脚皮肤血液骨骼肌肉脑筋" },
      { id: "numbers-cn", title: "数字汉字", desc: "数字", content: "一二三四五六七八九十百千万亿零半两双几第单整点分角元" },
      { id: "colors", title: "颜色汉字", desc: "颜色", content: "红黄蓝绿黑白紫粉灰棕橙青赤金银翠碧丹朱铅黛素彩" },
    ],
    words: [
      { id: "daily-1", title: "日常用语 一", desc: "生活", content: "你好 谢谢 对不起 没关系 再见 早上好 晚安 请问 谢谢您 不客气" },
      { id: "daily-2", title: "日常用语 二", desc: "生活", content: "吃饭 睡觉 工作 学习 锻炼 休息 散步 聊天 购物 旅行 出门 回家" },
      { id: "family", title: "家庭成员", desc: "家庭", content: "爷爷 奶奶 外公 外婆 爸爸 妈妈 哥哥 姐姐 弟弟 妹妹 叔叔 阿姨" },
      { id: "time", title: "时间日期", desc: "时间", content: "今天 明天 昨天 现在 过去 未来 早上 中午 下午 晚上 白天 黑夜" },
      { id: "weather", title: "天气气候", desc: "天气", content: "晴天 阴天 雨天 雪天 刮风 闪电 打雷 大雾 冰雹 寒冷 温暖 凉爽" },
      { id: "emotion", title: "情感表达", desc: "情感", content: "快乐 悲伤 愤怒 惊讶 害怕 喜爱 讨厌 感动 失望 期待 焦虑 平静" },
      { id: "action", title: "动作词语", desc: "动作", content: "行走 奔跑 跳跃 飞翔 游泳 坐下 站立 躺下 转身 抬头 低头 微笑" },
      { id: "transport", title: "交通工具", desc: "交通", content: "汽车 火车 飞机 轮船 自行车 摩托车 公交车 高铁 地铁 出租车" },
    ],
    idioms: [
      { id: "idiom-1", title: "成语精选 一", desc: "成语", content: "一心一意 三心二意 七上八下 九牛一毛 十全十美 百发百中 千军万马 万众一心" },
      { id: "idiom-2", title: "成语精选 二", desc: "成语", content: "画蛇添足 亡羊补牢 守株待兔 拔苗助长 刻舟求剑 掩耳盗铃 买椟还珠 滥竽充数" },
      { id: "idiom-3", title: "成语精选 三", desc: "成语", content: "风调雨顺 山清水秀 鸟语花香 春暖花开 秋高气爽 冰天雪地 晨光熹微 夕阳西下" },
      { id: "idiom-4", title: "成语精选 四", desc: "成语", content: "学而不厌 诲人不倦 温故知新 循序渐进 融会贯通 举一反三 触类旁通 精益求精" },
      { id: "idiom-5", title: "成语精选 五", desc: "成语", content: "锲而不舍 坚持不懈 百折不挠 奋发图强 厚积薄发 大器晚成 后来居上 青出于蓝" },
    ],
    poems: [
      { id: "jingyesi", title: "静夜思", desc: "李白", content: "床前明月光，疑是地上霜。举头望明月，低头思故乡。" },
      { id: "chunxiao", title: "春晓", desc: "孟浩然", content: "春眠不觉晓，处处闻啼鸟。夜来风雨声，花落知多少。" },
      { id: "denggao", title: "登鹳雀楼", desc: "王之涣", content: "白日依山尽，黄河入海流。欲穷千里目，更上一层楼。" },
      { id: "wanglushan", title: "望庐山瀑布", desc: "李白", content: "日照香炉生紫烟，遥看瀑布挂前川。飞流直下三千尺，疑是银河落九天。" },
      { id: "chunri", title: "春日", desc: "朱熹", content: "胜日寻芳泗水滨，无边光景一时新。等闲识得东风面，万紫千红总是春。" },
      { id: "yueye", title: "枫桥夜泊", desc: "张继", content: "月落乌啼霜满天，江枫渔火对愁眠。姑苏城外寒山寺，夜半钟声到客船。" },
      { id: "qingming", title: "清明", desc: "杜牧", content: "清明时节雨纷纷，路上行人欲断魂。借问酒家何处有，牧童遥指杏花村。" },
      { id: "shui", title: "水调歌头", desc: "苏轼", content: "明月几时有，把酒问青天。不知天上宫阙，今夕是何年。人有悲欢离合，月有阴晴圆缺，此事古难全。但愿人长久，千里共婵娟。" },
    ],
    articles: [
      { id: "art-1", title: "荷塘月色(节选)", desc: "朱自清", content: "曲曲折折的荷塘上面，弥望的是田田的叶子。叶子出水很高，像亭亭的舞女的裙。层层的叶子中间，零星地点缀着些白花，有袅娜地开着的，有羞涩地打着朵儿的。月光如流水一般，静静地泻在这一片叶子和花上。" },
      { id: "art-2", title: "春(节选)", desc: "朱自清", content: "盼望着，盼望着，东风来了，春天的脚步近了。一切都像刚睡醒的样子，欣欣然张开了眼。山朗润起来了，水涨起来了，太阳的脸红起来了。小草偷偷地从土里钻出来，嫩嫩的，绿绿的。" },
      { id: "art-3", title: "背影(节选)", desc: "朱自清", content: "我与父亲不相见已二年余了，我最不能忘记的是他的背影。那年冬天，祖母死了，父亲的差使也交卸了，正是祸不单行的日子，我从北京到徐州，打算跟着父亲奔丧回家。" },
      { id: "art-4", title: "少年中国说(节选)", desc: "梁启超", content: "少年智则国智，少年富则国富，少年强则国强，少年独立则国独立，少年自由则国自由，少年进步则国进步，少年胜于欧洲则国胜于欧洲，少年雄于地球则国雄于地球。" },
      { id: "art-5", title: "岳阳楼记(节选)", desc: "范仲淹", content: "至若春和景明，波澜不惊，上下天光，一碧万顷，沙鸥翔集，锦鳞游泳，岸芷汀兰，郁郁青青。而或长烟一空，皓月千里，浮光跃金，静影沉璧，渔歌互答，此乐何极！" },
      { id: "art-6", title: "陋室铭", desc: "刘禹锡", content: "山不在高，有仙则名。水不在深，有龙则灵。斯是陋室，惟吾德馨。苔痕上阶绿，草色入帘青。谈笑有鸿儒，往来无白丁。可以调素琴，阅金经。无丝竹之乱耳，无案牍之劳形。" },
    ],
  },

  // ===== Number & Symbol Typing =====
  number: {
    numbers: [
      { id: "basic-num", title: "基础数字", desc: "0-9", content: "0123456789 0123 4567 89 98 76 54 32 10 12 34 56 78 90" },
      { id: "phone", title: "电话号码", desc: "Phone", content: "138 0013 8000 159 0123 4567 186 8888 9999 400 800 1234 010 1234 5678" },
      { id: "decimal", title: "小数练习", desc: "Decimal", content: "3.14159 2.71828 1.41421 1.73205 0.57721 6.28318 1.61803 0.30103" },
      { id: "large-num", title: "大数字", desc: "Large", content: "123456 789012 345678 901234 567890 999999 100000 500000" },
      { id: "money", title: "金额数字", desc: "Money", content: "1,000.00 9,999.99 12,345.67 100,000.00 0.99 50.50" },
    ],
    symbols: [
      { id: "basic-sym", title: "基础符号", desc: "Basic", content: "!@#$%^&*() -_=+[]{}\\|;:'\",.<>/?`~" },
      { id: "brackets", title: "括号练习", desc: "Brackets", content: "()()() [][][] {}{}{} <><><> (a) [b] {c} <d> (1) [2] {3}" },
      { id: "math-sym", title: "数学符号", desc: "Math", content: "+ - * / = < > <= >= != == && || % ++ -- += -= *= /=" },
      { id: "punct-cn", title: "中文标点", desc: "中文", content: "，。、；：？！「」『』（）【】《》〈〉…—·～" },
      { id: "mixed", title: "混合符号", desc: "Mixed", content: "a1! b2@ c3# d4$ e5% f6^ g7& h8* i9( j0) {1} [2] <3>" },
    ],
  },

  // ===== Custom Text =====
  custom: {
    placeholder: "在此输入你想练习的文字内容...",
  },
};
