const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const articlesDir = path.join(root, "articles");
const assetsDir = path.join(root, "assets");
const distDir = path.join(root, "dist");

const site = {
  name: "向心クラブ",
  roman: "KOSHIN CLUB",
  subtitle: "延岡市で活動する軟式野球チーム",
  location: "MIYAZAKI / NOBEOKA",
  description:
    "延岡市の野球チーム「向心クラブ」の公式ホームページ。試合予定、活動報告、メンバー募集のお知らせを掲載しています。"
};

const navigation = [
  ["NEWS", "news"],
  ["GAME", "game"],
  ["TEAM", "team"],
  ["SCHEDULE", "schedule"],
  ["CLUB", "club"],
  ["RECRUIT", "recruit"],
  ["PARTNER", "partner"],
  ["CONTACT", "contact"]
];

const gameCards = [
  {
    label: "NEXT GAME",
    title: "次回試合は調整中",
    body: "公式戦・練習試合の予定が決まり次第、NEWSでお知らせします。"
  },
  {
    label: "REPORT",
    title: "試合結果・活動報告",
    body: "試合後のスコア、活動写真、チームの近況を記事として更新できます。"
  },
  {
    label: "JOIN",
    title: "対戦・合同練習歓迎",
    body: "練習試合や合同練習のお誘いも受け付けています。CONTACTよりご相談ください。"
  }
];

const scheduleItems = [
  ["練習", "毎週の活動予定をNEWSで更新", "グラウンド確保状況により調整"],
  ["試合", "公式戦・練習試合", "決定後に日程を掲載"],
  ["募集", "メンバー・マネージャー", "見学、体験参加から歓迎"]
];

const teamValues = [
  ["Respect", "相手、仲間、審判、グラウンドへの敬意を大切にします。"],
  ["Challenge", "勝ちにこだわりながら、各自の目標にも挑戦します。"],
  ["Community", "延岡の地域スポーツを盛り上げるチームを目指します。"]
];

const profileRows = [
  ["チーム名", "向心クラブ"],
  ["活動地域", "宮崎県延岡市"],
  ["競技", "軟式野球"],
  ["掲載情報", "お知らせ / 試合予定 / 活動報告 / メンバー募集"]
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function emptyDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  ensureDir(dir);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function slugFromFile(file) {
  return path.basename(file, path.extname(file)).replace(/[^a-zA-Z0-9_-]+/g, "-");
}

function parseArticle(filePath) {
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  const slug = slugFromFile(filePath);
  let meta = {};
  let body = raw.trim();

  const frontMatter = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (frontMatter) {
    meta = Object.fromEntries(
      frontMatter[1]
        .split(/\r?\n/)
        .map((line) => line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/))
        .filter(Boolean)
        .map((match) => [match[1], match[2].trim()])
    );
    body = frontMatter[2].trim();
  }

  const title = meta.title || slug;
  const date = meta.date || "未日付";
  const category = meta.category || "お知らせ";
  const plainBody = body
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^-\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  const excerpt = (meta.excerpt || plainBody).slice(0, 120);

  return {
    slug,
    title,
    date,
    category,
    body,
    excerpt,
    source: path.relative(root, filePath)
  };
}

function getArticles() {
  if (!fs.existsSync(articlesDir)) return [];

  return fs
    .readdirSync(articlesDir)
    .filter((file) => file.toLowerCase().endsWith(".txt"))
    .map((file) => parseArticle(path.join(articlesDir, file)))
    .sort((a, b) => {
      const byDate = String(b.date).localeCompare(String(a.date));
      return byDate || a.title.localeCompare(b.title, "ja");
    });
}

function formatDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return escapeHtml(date);
  const parsed = new Date(`${date}T00:00:00+09:00`);
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Tokyo"
  }).format(parsed);
}

function inlineHtml(value) {
  return escapeHtml(value).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function articleBodyHtml(body) {
  if (!body) {
    return "<p>本文はまだありません。</p>";
  }

  return body
    .split(/\r?\n\s*\r?\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      if (block.startsWith("### ")) {
        return `<h3>${inlineHtml(block.slice(4))}</h3>`;
      }
      if (block.startsWith("## ")) {
        return `<h2>${inlineHtml(block.slice(3))}</h2>`;
      }

      const lines = block.split(/\r?\n/).map((line) => line.trim());
      if (lines.every((line) => line.startsWith("- "))) {
        return `<ul>${lines
          .map((line) => `<li>${inlineHtml(line.slice(2))}</li>`)
          .join("")}</ul>`;
      }

      return `<p>${inlineHtml(block).replace(/\r?\n/g, "<br>")}</p>`;
    })
    .join("\n");
}

function layout({ title, description, body, pageClass = "", basePath = "" }) {
  const fullTitle = title === site.name ? `${site.name} | ${site.subtitle}` : `${title} | ${site.name}`;
  const ogImage = `${basePath}assets/hero-baseball.jpg`;

  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(fullTitle)}</title>
  <meta name="description" content="${escapeHtml(description || site.description)}">
  <meta property="og:title" content="${escapeHtml(fullTitle)}">
  <meta property="og:description" content="${escapeHtml(description || site.description)}">
  <meta property="og:type" content="website">
  <meta property="og:image" content="${ogImage}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="${basePath}assets/site.css">
</head>
<body class="${pageClass}">
${body}
</body>
</html>`;
}

function siteHeader(basePath = "") {
  const navLinks = navigation
    .map(([label, id]) => `<a href="${basePath}#${id}">${label}</a>`)
    .join("");

  return `<header class="site-header">
  <a class="brand" href="${basePath}" aria-label="${escapeHtml(site.name)} トップページ">
    <span class="brand-mark">向</span>
    <span class="brand-text">
      <strong>${escapeHtml(site.name)}</strong>
      <small>${escapeHtml(site.roman)}</small>
    </span>
  </a>
  <nav class="site-nav" aria-label="メインナビゲーション">
    ${navLinks}
  </nav>
</header>`;
}

function sectionTitle(en, ja, lead = "") {
  return `<div class="section-title">
  <p class="eyebrow">${escapeHtml(en)}</p>
  <h2>${escapeHtml(ja)}</h2>
  ${lead ? `<p>${escapeHtml(lead)}</p>` : ""}
</div>`;
}

function articleCard(article) {
  return `<article class="news-card">
  <a href="posts/${escapeHtml(article.slug)}/" class="news-card-link" aria-label="${escapeHtml(article.title)} を読む">
    <div class="news-meta">
      <time datetime="${escapeHtml(article.date)}">${formatDate(article.date)}</time>
      <span>${escapeHtml(article.category)}</span>
    </div>
    <h3>${escapeHtml(article.title)}</h3>
    <p>${escapeHtml(article.excerpt)}${article.excerpt.length >= 120 ? "..." : ""}</p>
    <span class="read-more">READ MORE</span>
  </a>
</article>`;
}

function stat(label, value) {
  return `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function homePage(articles) {
  const latestArticles = articles.slice(0, 6);
  const articleCards = latestArticles.length
    ? latestArticles.map(articleCard).join("\n")
    : `<div class="empty-state">
        <p>まだ記事がありません。</p>
        <span>articles フォルダに txt ファイルを追加すると、ここにNEWSとして表示されます。</span>
      </div>`;

  return layout({
    title: site.name,
    body: `${siteHeader()}
<main>
  <section class="hero" id="top">
    <div class="hero-background-word" aria-hidden="true">KOSHIN</div>
    <div class="hero-copy">
      <p class="eyebrow">BASEBALL CLUB / NOBEOKA</p>
      <h1>向心クラブ</h1>
      <p class="hero-lead">延岡から、まっすぐ熱く。仲間と声を掛け合い、一球ごとに前へ進む軟式野球チームです。</p>
      <div class="hero-actions">
        <a class="button primary" href="#news">最新情報を見る</a>
        <a class="button secondary" href="#recruit">参加について</a>
      </div>
    </div>
    <div class="hero-visual" aria-label="${escapeHtml(site.name)} のチームビジュアル">
      <div class="scoreboard">
        <span>HOME</span>
        <strong>KOSHIN</strong>
        <em>NOBEOKA</em>
      </div>
      <div class="diamond" aria-hidden="true">
        <span></span><span></span><span></span><span></span>
      </div>
      <p>Play hard.<br>Respect always.</p>
    </div>
  </section>

  <section class="stats-strip" aria-label="チーム概要">
    ${stat("AREA", "NOBEOKA")}
    ${stat("STYLE", "RUBBER BASEBALL")}
    ${stat("NEWS", `${articles.length} POSTS`)}
    ${stat("RECRUIT", "OPEN")}
  </section>

  <section class="section section-news" id="news">
    <div class="section-head">
      ${sectionTitle("NEWS", "お知らせ", "試合予定、活動報告、メンバー募集などを更新します。")}
      <a class="text-link" href="#contact">CONTACT</a>
    </div>
    <div class="news-grid">
      ${articleCards}
    </div>
  </section>

  <section class="section section-game" id="game">
    ${sectionTitle("GAME", "試合情報", "次回試合、試合結果、練習試合の募集をまとめて見せるエリアです。")}
    <div class="game-grid">
      ${gameCards
        .map(
          (card) => `<article class="feature-card">
        <span>${escapeHtml(card.label)}</span>
        <h3>${escapeHtml(card.title)}</h3>
        <p>${escapeHtml(card.body)}</p>
      </article>`
        )
        .join("\n")}
    </div>
  </section>

  <section class="section section-team" id="team">
    <div class="team-copy">
      ${sectionTitle("TEAM", "チーム紹介", "仕事や生活と両立しながら、野球を本気で楽しむチームです。")}
      <p>向心クラブは、宮崎県延岡市を拠点に活動しています。技術だけでなく、声掛け、準備、片付けまで含めたチームワークを大切にし、地域に根ざした活動を続けています。</p>
    </div>
    <div class="value-grid">
      ${teamValues
        .map(
          ([title, body]) => `<article>
        <strong>${escapeHtml(title)}</strong>
        <p>${escapeHtml(body)}</p>
      </article>`
        )
        .join("\n")}
    </div>
  </section>

  <section class="section section-schedule" id="schedule">
    <div class="section-head">
      ${sectionTitle("SCHEDULE", "活動予定", "日程が決まり次第、NEWSとあわせて更新できます。")}
    </div>
    <div class="schedule-list">
      ${scheduleItems
        .map(
          ([type, title, note]) => `<article>
        <span>${escapeHtml(type)}</span>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(note)}</p>
      </article>`
        )
        .join("\n")}
    </div>
  </section>

  <section class="section section-club" id="club">
    <div>
      ${sectionTitle("CLUB", "クラブ概要")}
      <dl class="profile-list">
        ${profileRows
          .map(([term, desc]) => `<div><dt>${escapeHtml(term)}</dt><dd>${escapeHtml(desc)}</dd></div>`)
          .join("\n")}
      </dl>
    </div>
    <div class="club-message">
      <p class="large-copy">地域に愛され、応援されるチームへ。</p>
      <p>活動内容や募集情報は、必要に応じて記事として追加できます。写真素材を追加すると、さらにチームらしさのあるページに仕上げられます。</p>
    </div>
  </section>

  <section class="section section-recruit" id="recruit">
    <div>
      <p class="eyebrow">RECRUIT</p>
      <h2>一緒に野球を楽しむ仲間を募集しています。</h2>
      <p>経験者、ブランクのある方、チーム運営を手伝ってくれる方も歓迎です。まずは見学・体験参加からご相談ください。</p>
    </div>
    <a class="button primary light" href="#contact">問い合わせる</a>
  </section>

  <section class="section section-partner" id="partner">
    ${sectionTitle("PARTNER", "応援・協力", "スポンサー、地域協力、活動支援などを掲載できるセクションです。")}
    <div class="partner-row">
      <span>LOCAL SUPPORT</span>
      <span>BASEBALL COMMUNITY</span>
      <span>NOBEOKA</span>
    </div>
  </section>

  <section class="section section-contact" id="contact">
    <div>
      <p class="eyebrow">CONTACT</p>
      <h2>お問い合わせ</h2>
      <p>練習参加、試合のお誘い、掲載内容の確認などは、チーム関係者までご連絡ください。公開用メールアドレスやSNSが決まり次第、ここに差し替えできます。</p>
    </div>
    <div class="contact-card">
      <span>CONTACT INFO</span>
      <strong>準備中</strong>
      <p>連絡先を設定すると、ボタンやSNSリンクも追加できます。</p>
    </div>
  </section>
</main>
<footer class="site-footer">
  <strong>${escapeHtml(site.name)}</strong>
  <small>&copy; ${new Date().getFullYear()} ${escapeHtml(site.roman)}. All Rights Reserved.</small>
</footer>`,
    pageClass: "home"
  });
}

function articlePage(article) {
  return layout({
    title: article.title,
    description: article.excerpt || site.description,
    body: `${siteHeader("../../")}
<main class="article-shell">
  <article class="article-detail">
    <a class="back-link" href="../../#news">NEWS 一覧へ</a>
    <div class="news-meta">
      <time datetime="${escapeHtml(article.date)}">${formatDate(article.date)}</time>
      <span>${escapeHtml(article.category)}</span>
    </div>
    <h1>${escapeHtml(article.title)}</h1>
    <div class="article-body">
      ${articleBodyHtml(article.body)}
    </div>
  </article>
</main>
<footer class="site-footer">
  <strong>${escapeHtml(site.name)}</strong>
  <small>&copy; ${new Date().getFullYear()} ${escapeHtml(site.roman)}.</small>
</footer>`,
    pageClass: "article-page",
    basePath: "../../"
  });
}

function copyAssets() {
  const outputAssets = path.join(distDir, "assets");
  ensureDir(outputAssets);
  if (!fs.existsSync(assetsDir)) return;

  for (const file of fs.readdirSync(assetsDir)) {
    const from = path.join(assetsDir, file);
    const to = path.join(outputAssets, file);
    if (fs.statSync(from).isFile()) {
      fs.copyFileSync(from, to);
    }
  }
}

function build() {
  const articles = getArticles();
  emptyDir(distDir);
  copyAssets();
  fs.writeFileSync(path.join(distDir, ".nojekyll"), "", "utf8");
  fs.writeFileSync(path.join(distDir, "index.html"), homePage(articles), "utf8");

  for (const article of articles) {
    const articleDir = path.join(distDir, "posts", article.slug);
    ensureDir(articleDir);
    fs.writeFileSync(path.join(articleDir, "index.html"), articlePage(article), "utf8");
  }

  fs.writeFileSync(
    path.join(distDir, "posts.json"),
    JSON.stringify(articles, null, 2),
    "utf8"
  );

  console.log(`Built ${articles.length} article(s) into ${path.relative(root, distDir)}`);
}

build();

if (process.argv.includes("--watch")) {
  ensureDir(articlesDir);
  ensureDir(assetsDir);
  console.log("Watching articles and assets...");
  fs.watch(articlesDir, { persistent: true }, build);
  fs.watch(assetsDir, { persistent: true }, build);
}
