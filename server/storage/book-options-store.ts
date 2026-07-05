import { getDb } from "@/server/storage/db";

export type GenreTreeNode = {
  value: string;
  label: string;
  children?: GenreTreeNode[];
};

export type BookOptions = {
  genres: string[];
  platforms: string[];
  genreTree: GenreTreeNode[];
  writingStyles: string[];
  narrativePovs: string[];
  targetAudiences: string[];
  endingTypes: string[];
};


const defaultGenreTree: GenreTreeNode[] = [
  { value: "玄幻", label: "玄幻", children: [
    { value: "东方玄幻", label: "东方玄幻" },
    { value: "异世大陆", label: "异世大陆" },
    { value: "王朝争霸", label: "王朝争霸" },
    { value: "高武世界", label: "高武世界" },
    { value: "远古神话", label: "远古神话" }
  ]},
  { value: "仙侠", label: "仙侠", children: [
    { value: "修真文明", label: "修真文明" },
    { value: "幻想修仙", label: "幻想修仙" },
    { value: "现代修真", label: "现代修真" },
    { value: "古典仙侠", label: "古典仙侠" }
  ]},
  { value: "都市", label: "都市", children: [
    { value: "都市生活", label: "都市生活" },
    { value: "都市异能", label: "都市异能" },
    { value: "商战职场", label: "商战职场" },
    { value: "娱乐明星", label: "娱乐明星" },
    { value: "官场商战", label: "官场商战" }
  ]},
  { value: "历史", label: "历史", children: [
    { value: "历史杂谈", label: "历史杂谈" },
    { value: "架空历史", label: "架空历史" },
    { value: "历史军事", label: "历史军事" },
    { value: "秦汉三国", label: "秦汉三国" },
    { value: "两宋元明", label: "两宋元明" }
  ]},
  { value: "武侠", label: "武侠", children: [
    { value: "传统武侠", label: "传统武侠" },
    { value: "武侠幻想", label: "武侠幻想" },
    { value: "国术武技", label: "国术武技" }
  ]},
  { value: "悬疑", label: "悬疑", children: [
    { value: "推理侦探", label: "推理侦探" },
    { value: "诡秘惊悚", label: "诡秘惊悚" },
    { value: "悬疑探险", label: "悬疑探险" },
    { value: "刑侦网络", label: "刑侦网络" }
  ]},
  { value: "科幻", label: "科幻", children: [
    { value: "未来世界", label: "未来世界" },
    { value: "超级科技", label: "超级科技" },
    { value: "进化变异", label: "进化变异" },
    { value: "星际文明", label: "星际文明" },
    { value: "时空穿梭", label: "时空穿梭" }
  ]},
  { value: "游戏", label: "游戏", children: [
    { value: "虚拟网游", label: "虚拟网游" },
    { value: "电子竞技", label: "电子竞技" },
    { value: "游戏异界", label: "游戏异界" }
  ]},
  { value: "轻小说", label: "轻小说", children: [
    { value: "原生幻想", label: "原生幻想" },
    { value: "衍生同人", label: "衍生同人" },
    { value: "青春日常", label: "青春日常" }
  ]},
  { value: "军事", label: "军事", children: [
    { value: "军事战争", label: "军事战争" },
    { value: "战争幻想", label: "战争幻想" },
    { value: "军旅生涯", label: "军旅生涯" }
  ]}
];

const defaultBookOptions: Omit<BookOptions, "genreTree"> = {
  genres: defaultGenreTree.map((n) => n.value),
  platforms: ["起点", "番茄", "晋江", "知乎盐言", "七猫", "纵横", "掌阅"],
  writingStyles: ["热血爽快", "轻松幽默", "细腻深沉", "简练利落", "沉稳大气"],
  narrativePovs: ["第一人称", "第三人称限知", "第三人称全知", "多视角"],
  targetAudiences: ["男频", "女频", "全年龄"],
  endingTypes: ["HE", "BE", "开放式", "待定"]
};

function normalizeList(values: unknown): string[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
}

function normalizeGenreTree(values: unknown): GenreTreeNode[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .filter((v): v is Record<string, unknown> => v !== null && typeof v === "object")
    .map((v) => {
      const value = typeof v.value === "string" ? v.value : "";
      const label = typeof v.label === "string" ? v.label : value;
      const children = v.children !== undefined ? normalizeGenreTree(v.children) : undefined;
      return children && children.length > 0 ? { value, label, children } : { value, label };
    })
    .filter((n) => n.value);
}


export async function getBookOptions(): Promise<BookOptions> {
  const db = await getDb();

  const keys = ["genres", "platforms", "genre_tree", "writing_styles", "narrative_povs", "target_audiences", "ending_types"];
  const rows = db.prepare(`SELECT key, value FROM book_options WHERE key IN (${keys.map(() => "?").join(",")})`).all(...keys) as Array<{ key: string; value: string }>;

  const rowMap = new Map(rows.map((r) => [r.key, r.value]));

  function getList(key: string, fallback: string[]): string[] {
    const raw = rowMap.get(key);
    if (!raw) return fallback;
    try {
      const parsed = normalizeList(JSON.parse(raw));
      return parsed.length > 0 ? parsed : fallback;
    } catch {
      return fallback;
    }
  }

  function getTree(key: string, fallback: GenreTreeNode[]): GenreTreeNode[] {
    const raw = rowMap.get(key);
    if (!raw) return fallback;
    try {
      const parsed = normalizeGenreTree(JSON.parse(raw));
      return parsed.length > 0 ? parsed : fallback;
    } catch {
      return fallback;
    }
  }

  const genres = getList("genres", defaultBookOptions.genres);
  const platforms = getList("platforms", defaultBookOptions.platforms);
  const genreTree = getTree("genre_tree", defaultGenreTree);
  const writingStyles = getList("writing_styles", defaultBookOptions.writingStyles);
  const narrativePovs = getList("narrative_povs", defaultBookOptions.narrativePovs);
  const targetAudiences = getList("target_audiences", defaultBookOptions.targetAudiences);
  const endingTypes = getList("ending_types", defaultBookOptions.endingTypes);

  // 写入缺失的默认值
  const inserts: Array<{ key: string; value: string }> = [];
  if (!rowMap.has("genres")) inserts.push({ key: "genres", value: JSON.stringify(genres) });
  if (!rowMap.has("platforms")) inserts.push({ key: "platforms", value: JSON.stringify(platforms) });
  if (!rowMap.has("genre_tree")) inserts.push({ key: "genre_tree", value: JSON.stringify(genreTree) });
  if (!rowMap.has("writing_styles")) inserts.push({ key: "writing_styles", value: JSON.stringify(writingStyles) });
  if (!rowMap.has("narrative_povs")) inserts.push({ key: "narrative_povs", value: JSON.stringify(narrativePovs) });
  if (!rowMap.has("target_audiences")) inserts.push({ key: "target_audiences", value: JSON.stringify(targetAudiences) });
  if (!rowMap.has("ending_types")) inserts.push({ key: "ending_types", value: JSON.stringify(endingTypes) });

  if (inserts.length > 0) {
    const stmt = db.prepare(`INSERT OR REPLACE INTO book_options (key, value) VALUES (?, ?)`);
    for (const item of inserts) {
      stmt.run(item.key, item.value);
    }
  }

  return {
    genres,
    platforms,
    genreTree,
    writingStyles,
    narrativePovs,
    targetAudiences,
    endingTypes
  };
}

export async function updateBookOptions(options: Partial<BookOptions>): Promise<void> {
  const db = await getDb();
  const stmt = db.prepare(`INSERT OR REPLACE INTO book_options (key, value) VALUES (?, ?)`);

  if (options.genres) stmt.run("genres", JSON.stringify(options.genres));
  if (options.platforms) stmt.run("platforms", JSON.stringify(options.platforms));
  if (options.genreTree) stmt.run("genre_tree", JSON.stringify(options.genreTree));
  if (options.writingStyles) stmt.run("writing_styles", JSON.stringify(options.writingStyles));
  if (options.narrativePovs) stmt.run("narrative_povs", JSON.stringify(options.narrativePovs));
  if (options.targetAudiences) stmt.run("target_audiences", JSON.stringify(options.targetAudiences));
  if (options.endingTypes) stmt.run("ending_types", JSON.stringify(options.endingTypes));
}
