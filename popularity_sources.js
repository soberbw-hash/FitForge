/* ═══════════════════════════════════════════════════════════
   FitForge — 热门度原始调研数据（构建期输入，不参与页面运行）
   ---------------------------------------------------------------
   调研日期：2026-11-07
   用途：把这些公开榜单在构建时固化成 popularity.js，网站运行时
        完全离线、不联网、不实时更新、不读取任何使用者数据。
   规则：
     · 每条 rows = [榜单动作名, 榜单数值, 对应本库动作 id 列表, 可选备注]
     · 数值含义见 board.unit 与 board.kind：
         value  —— 占比(%) 或次数，照抄来源页面
         rank   —— 来源只给了名次，此处存原始名次（1 = 第 1 名），
                   构建时按 (count - rank + 1) 转成线性强度，不做其他外推
     · id 列表第一个是主项（全权重），其余是同族近亲（0.45 权重）
     · 备注 '近似' = 本库没有精确条目，映射到最接近的同族动作
     · 完全找不到对应动作的条目直接不收录，在 POP_UNMAPPED 中如实列出
   所有原始数值均照抄来源页面；权重只用于跨源合成，不改动原始数字。
   ═══════════════════════════════════════════════════════════ */

const POP_SOURCES = [
  {
    id: 'strengthlog', short: 'StrengthLog', w: 1.00,
    name: 'The Most Popular Gym Exercises for Men & Women in 2025',
    date: '2025-11-26', sample: '70 万+ 用户、数百万次训练记录',
    metric: '各动作训练组数占总训练组数的百分比',
    url: 'https://www.strengthlog.com/most-popular-exercises/',
    note: '样本最大、口径最明确，作为主锚；原站允许注明出处引用'
  },
  {
    id: 'trainera', short: 'Trainera', w: 0.85,
    name: 'The State of Personal Training 2026',
    date: '2026-08', sample: '159 份专业训练计划、13,184 次动作处方',
    metric: '教练编排动作的出现次数',
    url: 'https://trainera.fit/state-of-personal-training-2026',
    note: '教练视角，补足自重与核心动作；原站允许注明出处引用'
  },
  {
    id: 'burnfit', short: 'BurnFit', w: 0.68,
    name: '各部位健身動作推薦：BurnFit 數據解析熱門 TOP 5',
    date: '2025', sample: '近 3 个月 BurnFit 用户真实训练数据',
    metric: '六大部位各自 Top 5 的部位内占比',
    url: 'https://burnfit.io/zh-hant?p=11459',
    note: '繁中市场视角、器械动作覆盖完整；但口径是「部位内占比」而非全站占比，量级偏大，权重下调'
  },
  {
    id: 'jefit', short: 'Jefit', w: 0.70,
    name: 'Most Often Selected Exercises for Jefit App',
    date: '2021 / 2023', sample: '1,000 万+ 用户、1,400+ 动作库',
    metric: '最常被选动作 Top 3；器械类动作被加入计划的次数',
    url: 'https://www.jefit.com/wp/workout-tips/here-are-the-most-often-selected-exercises-for-jefit',
    note: '样本大但公布的是名次/次数而非占比，年份较早，权重下调'
  },
  {
    id: 'sisulift', short: 'SisuLift', w: 0.50,
    name: 'Most-logged bodyweight exercises',
    date: '2025', sample: 'SisuLift 用户记录量（未公布样本数）',
    metric: '自重动作记录量前 8 名',
    url: 'https://www.sisulift.app/en/exercises/bodyweight-exercises',
    note: '专门补足徒手/居家动作；未公布样本量，权重较低'
  },
  {
    id: 'ageuk', short: 'Age UK', w: 0.30,
    name: 'Act Now, Age Better 国民动作态度调查',
    date: '2025', sample: '2,075 名英国成年人民意调查',
    metric: '动作被提及/喜好比例（认知度，不是训练频次）',
    url: 'https://www.dailymail.co.uk/news/article-14987825/Britains-hated-loved-exercises.html',
    note: '衡量的是认知与喜好，不等于训练量，仅作自重动作的低权重佐证'
  }
];

/* 本库没有精确条目的榜单项（如实记录，不硬凑、不假装精确命中） */
const POP_UNMAPPED = [
  ['Bodyweight Squat / 标准自重深蹲', 'trainera', '本库只有自重深蹲划船、跳深蹲等变式，该行整条剔除不计分'],
  ['Face Pull / 面拉', 'strengthlog, burnfit', '本库无面拉，映射到绳索后束划船并标注「近似」'],
  ['Plank / 标准平板支撑', 'trainera, sisulift', '本库只有平板变式，映射到前平板支撑并标注「近似」'],
  ['Hip Thrust / 标准臀冲', 'strengthlog, trainera', '本库以杠铃臀桥 / 弹力带髋推近似'],
  ['Bulgarian Split Squat / 保加利亚分腿蹲', 'strengthlog', '以分腿深蹲近似']
];

const POP_BOARDS = [
  {
    src: 'strengthlog', title: '全用户 Top 25', unit: '% 占总训练组数',
    rows: [
      ['Bench Press / 卧推', 9.7, ['0025', '0289']],
      ['Squat / 深蹲', 7.0, ['0043', '0770']],
      ['Deadlift / 硬拉', 5.0, ['0032', '0300']],
      ['Lat Pulldown / 高位下拉', 3.8, ['0198', '0579']],
      ['Overhead Press / 过顶推举', 3.4, ['0091', '0426']],
      ['Barbell Row / 杠铃划船', 3.2, ['0027', '0118']],
      ['Dumbbell Lateral Raise / 哑铃侧平举', 2.7, ['0334', '0178']],
      ['Leg Extension / 腿屈伸', 2.5, ['0585']],
      ['Leg Press / 腿举', 2.2, ['0739', '0760']],
      ['Barbell Curl / 杠铃弯举', 2.1, ['0031', '0447']],
      ['Tricep Pushdown (Bar) / 三头下压', 2.0, ['0201', '0241']],
      ['Incline Dumbbell Press / 上斜哑铃卧推', 1.9, ['0314']],
      ['Dumbbell Curl / 哑铃弯举', 1.7, ['0294', '0391']],
      ['Pull-Up / 引体向上', 1.7, ['0652', '1326']],
      ['Cable Close Grip Seated Row / 坐姿划船', 1.6, ['0861', '1350']],
      ['Tricep Pushdown (Rope) / 绳索三头下压', 1.5, ['0200']],
      ['Lying Leg Curl / 俯卧腿弯举', 1.3, ['0586']],
      ['Dumbbell Row / 哑铃划船', 1.3, ['0293', '0292']],
      ['Dumbbell Shoulder Press / 哑铃肩推', 1.3, ['0405']],
      ['Romanian Deadlift / 罗马尼亚硬拉', 1.3, ['0085', '1459']],
      ['Seated Leg Curl / 坐姿腿弯举', 1.2, ['0599']],
      ['Hammer Curl / 锤式弯举', 1.1, ['0313']],
      ['Standing Cable Chest Fly / 绳索夹胸', 1.1, ['0227', '0188']],
      ['Dumbbell Chest Press / 哑铃卧推', 1.0, ['0289']],
      ['Face Pull / 面拉', 1.0, ['0203'], '近似']
    ]
  },
  {
    src: 'strengthlog', title: '男女分榜特有动作', unit: '% 占总训练组数', scale: 9.7,
    rows: [
      ['Hip Thrust / 臀冲（女性榜）', 2.0, ['1409', '3236'], '近似'],
      ['Bulgarian Split Squat / 保加利亚分腿蹲', 1.4, ['2368'], '近似'],
      ['Stiff-Legged Deadlift / 直腿硬拉', 1.1, ['0116', '0432']],
      ['Hip Abduction Machine / 髋外展机', 1.0, ['0597']],
      ['Close-Grip Bench Press / 窄距卧推', 1.1, ['0030']]
    ]
  },
  {
    src: 'trainera', title: '教练最常编排 Top 15', unit: '次处方',
    rows: [
      ['Plank / 平板支撑', 499, ['0464', '3239'], '近似'],
      ['Russian Twist / 俄罗斯转体', 290, ['0687', '0846']],
      ['Hanging Leg Raise / 悬垂举腿', 265, ['0472', '0475']],
      ['Romanian Deadlift / 罗马尼亚硬拉', 245, ['0085']],
      ['Machine Calf Raise / 器械提踵', 235, ['0594', '1372']],
      ['Push Ups / 俯卧撑', 221, ['0662', '0283']],
      ['Squat / 深蹲', 213, ['0043']],
      ['Seated Cable Row / 坐姿绳索划船', 204, ['0861']],
      ['Goblet Squat / 高脚杯深蹲', 204, ['0534', '1760']],
      ['Dumbbell Lateral Raise / 哑铃侧平举', 203, ['0334']],
      ['Hip Thrust / 臀冲', 202, ['1409', '3013'], '近似'],
      ['Tricep Pushdown / 三头下压', 195, ['0201']],
      ['Kettlebell Swing / 壶铃摆荡', 187, ['0549']],
      ['Leg Extension / 腿屈伸', 183, ['0585']]
    ]
  },
  {
    src: 'burnfit', title: '胸部 Top 5', unit: '% 部位内占比',
    rows: [
      ['槓鈴臥推', 15.65, ['0025']],
      ['坐姿胸推機', 9.57, ['0576', '2144']],
      ['蝴蝶機飛鳥', 7.83, ['0596', '0308']],
      ['上斜啞鈴臥推', 7.69, ['0314']],
      ['史密斯機上斜臥推', 5.56, ['0757']]
    ]
  },
  {
    src: 'burnfit', title: '背部 Top 5', unit: '% 部位内占比',
    rows: [
      ['滑輪下拉', 16.53, ['0198', '1325']],
      ['坐姿滑輪划船', 10.48, ['0861', '1350']],
      ['引體向上', 8.77, ['0652', '1326']],
      ['直臂滑輪下拉', 5.85, ['0238']],
      ['坐姿划船機', 4.89, ['1350']]
    ]
  },
  {
    src: 'burnfit', title: '下半身 Top 5', unit: '% 部位内占比',
    rows: [
      ['坐姿腿屈伸', 11.20, ['0585']],
      ['槓鈴後深蹲', 9.49, ['0043']],
      ['腿推機', 9.36, ['0739']],
      ['腿彎舉機', 7.52, ['0586', '0599']],
      ['臀部外展機', 6.64, ['0597']]
    ]
  },
  {
    src: 'burnfit', title: '肩膀 Top 5', unit: '% 部位内占比',
    rows: [
      ['啞鈴側平舉', 18.17, ['0334']],
      ['坐姿肩推機', 10.22, ['0603', '0405']],
      ['反向蝴蝶機', 8.98, ['0602', '0383']],
      ['面拉 Face Pull', 5.96, ['0203'], '近似'],
      ['肩推 Overhead Press', 5.31, ['0091']]
    ]
  },
  {
    src: 'burnfit', title: '手臂 Top 5', unit: '% 部位内占比',
    rows: [
      ['滑輪三頭下壓', 12.52, ['0200', '0201']],
      ['啞鈴鎚式彎舉', 7.02, ['0313']],
      ['上斜啞鈴彎舉', 6.87, ['0318', '0315']],
      ['啞鈴彎舉', 6.22, ['0294']],
      ['EZ 槓彎舉', 5.58, ['0447']]
    ]
  },
  {
    src: 'burnfit', title: '腹肌 Top 5', unit: '% 部位内占比',
    rows: [
      ['捲腹訓練機', 14.58, ['1452', '0212']],
      ['懸垂抬腿', 10.23, ['0472']],
      ['仰臥抬腿', 8.20, ['0620']],
      ['捲腹', 7.44, ['0274', '0267']],
      ['健腹輪', 6.85, ['0857', '0084']]
    ]
  },
  {
    src: 'jefit', title: '全站最常选 Top 3', unit: '名次', kind: 'rank', count: 3,
    rows: [
      ['Barbell Bench Press / 杠铃卧推', 1, ['0025']],
      ['Barbell Bicep Curl / 杠铃弯举', 2, ['0031']],
      ['Wide Grip Lat Pull-Down / 宽握高位下拉', 3, ['0198', '1325']]
    ]
  },
  {
    src: 'jefit', title: '器械类动作 Top 6', unit: '次被加入计划',
    rows: [
      ['Wide Grip Lat Pulldown', 1663167, ['0198', '1325']],
      ['Dip / 双杠臂屈伸', 1553837, ['0251', '0677']],
      ['Prone Leg Curl / 俯卧腿弯举', 1479854, ['0586']],
      ['Decline Crunch / 下斜卷腹', 1351466, ['0277']],
      ['Cable Rope Triceps Pushdown / 绳索三头下压', 1324182, ['0200']],
      ['Machine Fly / 蝴蝶机飞鸟', 1305333, ['0596']]
    ]
  },
  {
    src: 'sisulift', title: '自重动作记录量 Top 8', unit: '名次', kind: 'rank', count: 8,
    rows: [
      ['Dead Bug / 死虫式', 1, ['0276']],
      ['Plank / 平板支撑', 2, ['0464', '3239'], '近似'],
      ['Decline Crunch / 下斜卷腹', 3, ['0277']],
      ['Pull-up / 引体向上', 4, ['0652']],
      ["Captain's Chair Leg Raise / 悬垂举腿", 5, ['2963']],
      ['Glute Bridge / 臀桥', 6, ['3013', '1409']],
      ['Hanging Knees to Elbows / 悬垂抬膝', 7, ['0011'], '近似'],
      ['Push-up / 俯卧撑', 8, ['0662']]
    ]
  },
  {
    src: 'ageuk', title: '国民动作认知度调查', unit: '% 受访者提及',
    rows: [
      ['Push-ups / 俯卧撑', 36, ['0662']],
      ['Burpees / 波比跳', 29, ['1160']],
      ['Planks / 平板支撑', 24, ['0464'], '近似'],
      ['Chin-ups / 引体向上', 24, ['1326']],
      ['Crunches / 卷腹', 22, ['0274']],
      ['Squats / 深蹲', 20, ['0043']],
      ['Lunges / 箭步蹲', 14, ['0054', '1460']]
    ]
  }
];

if (typeof module !== 'undefined') {
  module.exports = { POP_SOURCES, POP_BOARDS, POP_UNMAPPED };
}
