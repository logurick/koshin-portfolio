const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const articlesDir = path.join(root, "articles");
const assetsDir = path.join(root, "assets");
const distDir = path.join(root, "dist");

const site = {
  name: "向心クラブ",
  subtitle: "延岡市で活動する軟式野球チーム",
  description:
    "延岡市の野球チーム「向心クラブ」の公式ホームページ。試合予定、活動報告、メンバー募集のお知らせを掲載しています。"
};

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

  return {
    slug,
    title,
    date,
    category,
    body,
    excerpt: body.replace(/\s+/g, " ").slice(0, 110),
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
    month: "long",
    day: "numeric",
    timeZone: "Asia/Tokyo"
  }).format(parsed);
}

function articleBodyHtml(body) {
  if (!body) {
    return "<p>本文はまだありません。</p>";
  }

  return body
    .split(/\r?\n\s*\r?\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\r?\n/g, "<br>")}</p>`)
    .join("\n");
}

function layout({ title, description, body, pageClass = "", basePath = "" }) {
  const fullTitle = title === site.name ? site.name : `${title} | ${site.name}`;
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
  <meta property="og:image" content="${basePath}assets/hero-baseball.jpg">
  <link rel="stylesheet" href="${basePath}assets/site.css">
</head>
<body class="${pageClass}">
${body}
</body>
</html>`;
}

function siteHeader(basePath = "") {
  return `<header class="site-header">
  <a class="brand" href="${basePath}" aria-label="${escapeHtml(site.name)} トップページ">
    <span class="brand-mark">K</span>
    <span>
      <strong>${escapeHtml(site.name)}</strong>
      <small>Koshin Club</small>
    </span>
  </a>
  <nav class="site-nav" aria-label="メインナビゲーション">
    <a href="${basePath}#news">お知らせ</a>
    <a href="${basePath}#about">チーム紹介</a>
    <a href="${basePath}#join">メンバー募集</a>
  </nav>
</header>`;
}

function articleCard(article) {
  return `<article class="news-card">
  <div class="news-meta">
    <time datetime="${escapeHtml(article.date)}">${formatDate(article.date)}</time>
    <span>${escapeHtml(article.category)}</span>
  </div>
  <h3><a href="posts/${escapeHtml(article.slug)}/">${escapeHtml(article.title)}</a></h3>
  <p>${escapeHtml(article.excerpt)}${article.excerpt.length >= 110 ? "..." : ""}</p>
</article>`;
}

function homePage(articles) {
  const articleCards = articles.length
    ? articles.map(articleCard).join("\n")
    : `<p class="empty-state">まだ記事がありません。</p>`;

  return layout({
    title: site.name,
    body: `${siteHeader()}
<main>
  <section class="hero">
    <div class="hero-copy">
      <p class="eyebrow">Nobeoka Baseball Team</p>
      <h1>向心クラブ</h1>
      <p>${escapeHtml(site.subtitle)}。一球ごとに声を掛け合い、地域に根ざしたチームづくりを続けています。</p>
      <div class="hero-actions">
        <a class="button primary" href="#news">最新情報</a>
        <a class="button secondary" href="#join">参加について</a>
      </div>
    </div>
    <figure class="hero-media">
      <img src="assets/hero-baseball.jpg" alt="野球道具とグラウンド">
    </figure>
  </section>

  <section class="section about" id="about">
    <div>
      <p class="eyebrow">About</p>
      <h2>延岡で野球を楽しみ、強くなる。</h2>
    </div>
    <p>向心クラブは、宮崎県延岡市を拠点に活動する野球チームです。仕事や生活と両立しながら、試合と練習を通じて技術とチームワークを磨いています。</p>
  </section>

  <section class="section split" id="join">
    <div>
      <p class="eyebrow">Join</p>
      <h2>メンバー・練習参加を歓迎しています。</h2>
      <p>経験者はもちろん、久しぶりに野球を再開したい方も歓迎します。活動予定はお知らせで随時更新します。</p>
    </div>
    <div class="info-panel">
      <dl>
        <div><dt>活動拠点</dt><dd>宮崎県延岡市</dd></div>
        <div><dt>種目</dt><dd>軟式野球</dd></div>
        <div><dt>掲載内容</dt><dd>試合予定・活動報告・募集案内</dd></div>
      </dl>
    </div>
  </section>

  <section class="section news" id="news">
    <div class="section-heading">
      <div>
        <p class="eyebrow">News</p>
        <h2>お知らせ</h2>
      </div>
      <span>${articles.length}件の記事</span>
    </div>
    <div class="news-grid">
      ${articleCards}
    </div>
  </section>
</main>
<footer class="site-footer">
  <small>&copy; ${new Date().getFullYear()} ${escapeHtml(site.name)}</small>
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
    <a class="back-link" href="../../#news">お知らせ一覧へ</a>
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
  <small>&copy; ${new Date().getFullYear()} ${escapeHtml(site.name)}</small>
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
  console.log("Watching articles and assets...");
  fs.watch(articlesDir, { persistent: true }, build);
  fs.watch(assetsDir, { persistent: true }, build);
}
