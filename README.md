# 🆙 UP Mood

あなたの Universal Profile の「生態」と「種族」を可視化する Tamagotchi ミニアプリ

## 特徴 ✨

- 📱 UniversalEverything Grid で自動検出
- 🔍 手動入力も可能
- 🌱 **Eco Attributes**: トランザクション履歴から 4 つの属性を計算
  - ⚡ Vitality（活発さ）- Transfer 系トランザクション
  - 🧠 Intelligence（知性）- Execute 系トランザクション
  - 🎨 Creativity（表現力）- SetData 系トランザクション
  - 🤝 Sociability（社会性）- 権限付与・相互作用
- 🏷️ **Species**: 属性バランスで「種族」が決定
- ⛓️ LUKSO Blockscout API でオンチェーンデータ取得
- 🚀 Vercel で即デプロイ可能

## デモ 🌐

https://up-mood.vercel.app

## 始め方 🚀

### 1. リポジトリをクローン

```bash
git clone https://github.com/upchan-agent/up-birthday.git
cd up-birthday
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 開発サーバーの起動

```bash
npm run dev
```

http://localhost:3000 にアクセス

## デプロイ 🌍

### Vercel でデプロイ

```bash
npm install -g vercel
vercel --prod
```

## 技術スタック 📦

- **React 19** - UI フレームワーク
- **TypeScript** - 型安全な開発
- **Vite** - ビルドツール
- **@lukso/up-provider** - Universal Profile 接続
- **graphql-request** - LUKSO Indexer API クライアント

## 使い方 💡

### UniversalEverything Grid
UniversalEverything の Grid にミニアプリとして追加すると、自動的に UP が検出されます。

### 手動入力
アドレスを直接入力して Check ボタンをクリック。

### URL 共有
`?address=0x...` を URL に追加して共有可能。

### 種族一覧 🏷️

| 種族 | 条件 | 説明 |
|------|------|------|
| Baby | 総スコア < 5 | まだ生まれたばかり |
| Warrior | Vitality が最高 | 活発に活動するタイプ |
| Scholar | Intelligence が最高 | 知的な契約実行が得意 |
| Artist | Creativity が最高 | メタデータ更新を好む |
| Diplomat | Sociability が最高 | 権限付与・協力を重視 |

## ライセンス

MIT

