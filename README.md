# 🥗 健康飲食管家 (AI Diet Manager)

結合 **AI YOLO 視覺辨識**與**大語言模型 (LLM)** 的智能飲食追蹤系統。使用者只需上傳食物照片，系統即可自動辨識食物種類、估算熱量與營養組成，並結合使用者的生理數據與病史，提供客製化的 AI 營養師點評。

![Project Banner](https://via.placeholder.com/1200x400?text=AI+Diet+Manager+Dashboard) ## ✨ 核心功能

* 📸 **AI YOLO 視覺辨識**：前端內建圖片壓縮引擎，上傳食物照片後，後端透過 YOLO 模型自動框選食物、預估重量並計算卡路里。
* 📊 **智能健康儀表板**：
    * 自動計算精準的 **BMI** 與 **BMR (基礎代謝率)**，並支援詳細公式的互動式翻牌顯示。
    * 提供雷達圖 (六大類食物比例)、圓餅圖 (最新一餐結構) 與折線圖 (AI 評分趨勢)。
* 💬 **AI 專屬營養師**：根據使用者的飲食紀錄與個人設定檔案，給予針對性的健康評語。
* ⚙️ **高度客製化個人檔案**：可設定疾病史、過敏源與飲食禁忌，讓 AI 評估更加精準。
* 🔒 **完善的會員系統**：基於 JWT (JSON Web Tokens) 的安全登入驗證機制。
* 🛡️ **展示模式防護**：內建「測試猿」展示帳號（具備唯讀防護機制），確保 Demo 資料的一致性。
* 📈 **流量監控**：即時統計並繪製網站的近 30 天造訪人次走勢圖。

## 🛠️ 技術棧 (Tech Stack)

### 前端 (Frontend)
* **框架**: React.js (Vite)
* **路由**: React Router v6
* **樣式**: Tailwind CSS
* **圖表**: Recharts (LineChart, PieChart, RadarChart)
* **UI 組件**: Lucide React (Icons), shadcn/ui (Sidebar, Tooltips)
* **特點**: 實作前端圖片自動壓縮 (Canvas API)、響應式設計 (RWD)、複雜狀態管理。

### 後端 (Backend)
* **語言**: Rust
* **框架**: Axum (高效能非同步 Web 框架)
* **資料庫**: PostgreSQL + SQLx (非同步 SQL 工具)
* **驗證**: jsonwebtoken (JWT)
* **特點**: 高效能併發處理、Base64 圖片流傳輸、自定義 Error Response 處理機制。

### 人工智慧 (AI & ML)
* **電腦視覺**: YOLO (You Only Look Once) 用於物件偵測與熱量估算。
* **LLM 分析**: 結合 Prompt Engineering 產生 `ai_evaluation` 健康評分與建議。

---

## 🚀 快速開始 (Getting Started)

### 1. 啟動前端伺服器

確保你的電腦已安裝 Node.js。

```bash

# 安裝依賴套件
npm install

# 啟動開發伺服器
npm run dev

```
