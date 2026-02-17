# PARP: Public Sector AI Readiness Platform

## 🌍 Overview
PARP is a digital prototype designed to assess and improve AI readiness within Kenya's public sector. Built as part of a Master's Thesis, this platform leverages the Technology-Organization-Environment (TOE) framework to provide personalized assessments, real-time market insights, and an AI-powered advisory chatbot.

This platform addresses the critical gap in structured AI adoption strategies for government entities, offering a data-driven approach to readiness evaluation.

## ✨ Key Features

### 1. TOE Readiness Assessment
- **Structured Questionnaire**: 30-question assessment based on Technology, Organization, and Environment dimensions.
- **Instant Scoring**: Real-time calculation of readiness scores (Low, Moderate, High).
- **Draft Saving**: Auto-save functionality ensures progress is never lost.
- **Visual Analytics**: Radar and Bar charts visualizing strengths and weaknesses.

### 2. AI Advisory Chatbot
- **Context-Aware**: Trained on Kenya's Data Protection Act (2019) and National AI Strategy.
- **Dual Mode**: Supports both Cloud (OpenAI) and Local (Ollama - Llama 3.1 / Qwen 2.5) inference for offline privacy.
- **Multilingual**: Capable of switching between English and Kiswahili/Sheng to increase accessibility.
- **Animated Avatar**: A toggleable 3D-style talking avatar (Web Speech API) for a more engaging, culturally relevant interaction.
- **Ethical Guardrails**: Real-time keyword scanning to flag academic dishonesty or bias.

### 3. Real-Time Dashboard
- **Market Insights**: Live feed of AI adoption rates in Kenyan businesses (via Supabase Realtime).
- **Policy Updates**: Instant notifications on relevant government policy changes.
- **Dynamic Widgets**: "Kenya AI Adoption Insight" card highlighting key trends.

### 4. Enterprise-Grade Security
- **Authentication**: Secure email/password login via Supabase Auth.
- **Role-Based Access**: Public landing page vs. Protected dashboard routes.
- **Data Privacy**: Local LLM support explicitly designed for processing sensitive government data on-premise.

## 🚀 Tech Stack

- **Frontend**: Next.js 14 (App Router), TailwindCSS, Framer Motion
- **Backend/Database**: Supabase (PostgreSQL, Auth, Realtime)
- **AI/ML**: OpenAI API (Cloud), Ollama (Local), Web Speech API (TTS)
- **Visualization**: Recharts
- **Deployment**: Vercel (Web), Electron (Desktop - Experimental)

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 18+
- Supabase Account
- (Optional) Ollama running locally for offline chat

### Steps
1.  **Clone the Repository**
    ```bash
    git clone https://github.com/your-username/parp-platform.git
    cd parp-platform
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    # for electron support
    npm install electron electron-builder -D
    ```

3.  **Environment Variables**
    Create a `.env.local` file:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    OPENAI_API_KEY=your_openai_key_optional
    ```

4.  **Database Migration**
    Run the SQL migrations in Supabase SQL Editor (found in `supabase/migrations`) to create `assessments` and `market_stats` tables.

5.  **Run Development Server**
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000).

6.  **Run Desktop App (Experimental)**
    ```bash
    npm run electron-dev
    ```

## 🎥 Demo
[Link to Demo Video Placeholder]

## 📜 Thesis Context
This artifact supports the thesis "Assessing AI Readiness in Kenya's Public Sector: A Framework for Strategic Adoption." It operationalizes the theoretical TOE framework into a usable software tool.

**Author**: Bradley Robin
**Date**: February 2026
