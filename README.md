# レッシング書簡集ビューア

レッシング書簡集の日本語翻訳Markdownをブラウザで閲覧・検索する静的サイトです。

## 機能

- 書簡一覧と本文表示
- 語彙検索
- 期間検索
- 検索結果CSVのダウンロード
- 原稿Markdownファイルのダウンロード

## ローカル確認

```bash
npm run dev
```

ブラウザで `http://localhost:4173` を開きます。

## Render

RenderではStatic Siteとして作成し、このリポジトリを接続してください。ビルド不要の静的サイトです。`render.yaml` を含めているので、Blueprintからもデプロイできます。
