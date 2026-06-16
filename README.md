# 向心クラブ ホームページ

延岡市の野球チーム「向心クラブ」の公式ホームページです。

## 記事投稿

`articles/` フォルダに `.txt` ファイルを1記事1ファイルで追加します。

```txt
---
title: 記事タイトル
date: 2026-06-16
category: お知らせ
---
本文をここに書きます。
```

GitHubへpushすると、GitHub Actionsが `dist/` を生成してGitHub Pagesへ公開します。

## ローカル確認

```bash
npm run build
```

生成された `dist/index.html` をブラウザで開くと確認できます。

## GitHub Pages

`.github/workflows/pages.yml` が、`main` ブランチへのpush時にサイトをビルドしてPagesへデプロイします。

リポジトリ設定の Pages は、Source を `GitHub Actions` にしてください。
