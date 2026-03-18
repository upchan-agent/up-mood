# 🆙 UP Mood

**Universal Profile Ecosystem Attributes Visualizer**

Discover your Universal Profile's ecosystem attributes and species based on on-chain activity on LUKSO.

---

## 🌐 Live Demo

https://up-mood.vercel.app

---

## ✨ Features

### 🌱 Ecosystem Attributes

5 attributes calculated from your transaction history:

| Attribute | Description |
|-----------|-------------|
| 💰 **Wealth** | Transactions involving LYX or token transfers (LSP-7, ERC-20) |
| ⚡ **Vitality** | General execute operations and contract interactions |
| 🧠 **Intelligence** | Complex contract executions and advanced operations |
| 🎨 **Creativity** | Profile metadata updates and claims (LSP-3, LSP-12) |
| 🤝 **Sociability** | Follow actions and permission management (LSP-6, LSP-26) |

### 🏷️ Species System

Your dominant attribute determines your species:

| Species | Attribute | Emoji |
|---------|-----------|-------|
| 🐣 **Baby** | Total < 5 points | Just getting started |
| 🦊 **Merchant** | Wealth (highest) | Asset transfer focused |
| 🦁 **Warrior** | Vitality (highest) | High activity |
| 🦉 **Scholar** | Intelligence (highest) | Complex operations |
| 🦋 **Artist** | Creativity (highest) | Self-expression focused |
| 🕊️ **Diplomat** | Sociability (highest) | Relationship building |
| 🦄 **Explorer** | Balanced attributes | Well-rounded |

---

## 🚀 Usage

1. Open the app
2. Enter your Universal Profile address (or connect via UniversalEverything Grid)
3. Click "Analyze"
4. View your ecosystem attributes and species!

**No installation required** - works directly in your browser!

---

## 🛠️ Tech Stack

- **React 19** + **TypeScript**
- **Vite** - Build tool
- **@lukso/up-provider** - Universal Profile connection
- **LUKSO Blockscout API** - On-chain data retrieval
- **LUKSO Indexer API** - Profile metadata

---

## 📊 How It Works

1. **Fetch Transactions**: Retrieves your UP's transaction history from Blockscout API
2. **Classify**: Each transaction is classified based on:
   - Method name (decoded by Blockscout)
   - Target contract address (e.g., LSP-26 Follower System)
   - Function selector in calldata
3. **Calculate**: Each classified transaction adds +1 point to the corresponding attribute
4. **Determine Species**: Your highest attribute determines your species

---

## 📄 License

MIT

---

**Made with ❤️ by 🆙chan**

[🆙chan's UP](https://profile.link/🆙chan@bcA4) | [Follow on 𝕏](https://x.com/UPchan_lyx)
