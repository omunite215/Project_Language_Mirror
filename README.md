# 🪞 Language Mirror

> **An immersive AI-powered language tutor that helps you learn by conversing with native speakers in authentic regional dialects.**

Built for the **Google Cloud + ElevenLabs Hackathon** 🏆

![Language Mirror Demo](./demo.gif)

---

## ✨ Features

### 🎯 Core Experience
- **Real-time voice conversations** - Speak naturally and get instant feedback
- **Native accent responses** - Hear responses in authentic regional dialects using ElevenLabs Multilingual v2
- **Honest tutor feedback** - Not a cheerleader! Get real corrections and constructive criticism
- **Language mismatch detection** - Automatically detects if you're speaking the wrong language
- **Live subtitles** - See translations in real-time as you converse

### 🌍 Supported Languages & Dialects

| Language | Dialects | Tutors |
|----------|----------|--------|
| 🇮🇹 Italian | Tuscan, Roman, Neapolitan | Sofia, Marco, Giuseppe |
| 🇪🇸 Spanish | Castilian, Mexican, Argentine | Carmen, Carlos, Martín |
| 🇫🇷 French | Parisian, Quebec, Southern | Amélie, Jean-Pierre, Pierre |
| 🇩🇪 German | Hochdeutsch, Bavarian, Austrian | Anna, Hans, Wolfgang |
| 🇯🇵 Japanese | Tokyo, Osaka, Kyoto | Yuki, Kenji, Haruka |

### 🎭 Humanistic Tutor Personas
Each tutor has a unique personality:
- **Sofia (Tuscan)** - Cultured art historian, high standards, direct feedback
- **Marco (Roman)** - Street-smart, uses Roman slang, laughs at your mistakes
- **Kenji (Osaka)** - Comedian, blunt Osaka humor, says "Wrong wrong!" playfully
- *...and 12 more unique personalities!*

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Bun + Next.js)               │
│  • Real-time audio recording    • GSAP animations           │
│  • Material UI components       • Dark/Light/System themes  │
│  • React Query caching          • Responsive design         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ SSE (Server-Sent Events)
┌─────────────────────────────────────────────────────────────┐
│                    Backend (FastAPI + Python)               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Google    │  │   Google    │  │      Google         │ │
│  │ Speech-to-  │  │  Translate  │  │      Gemini         │ │
│  │    Text     │  │     API     │  │       API           │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              ElevenLabs Multilingual v2              │   │
│  │           (Native accent voice synthesis)            │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Google Cloud Platform                     │
│         Cloud Run │ Speech API │ Translate API              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| ⚡ **Bun** | Ultra-fast JavaScript runtime & package manager |
| **Next.js 15** | React framework with App Router |
| **TypeScript** | Type-safe development |
| **Material UI v6** | Google's Material Design components |
| **GSAP** | Professional-grade animations |
| **React Query** | Server state management & caching |
| **Xior** | Lightweight HTTP client (2kb) |

### Backend
| Technology | Purpose |
|------------|---------|
| **Python 3.11** | Backend runtime |
| **FastAPI** | High-performance async API framework |
| **Google Cloud Speech-to-Text** | Voice transcription |
| **Google Cloud Translate** | Real-time translation & language detection |
| **Google Gemini API** | AI-powered conversation & grammar correction |
| **ElevenLabs API** | Multilingual voice synthesis |
| **SSE (Server-Sent Events)** | Real-time progress streaming |

### Infrastructure
| Service | Purpose |
|---------|---------|
| **Google Cloud Run** | Serverless backend hosting |
| **Vercel** | Frontend hosting (optional) |

---

## 📦 Installation

### Prerequisites
- [Bun](https://bun.sh/) v1.0+ (for frontend)
- [Python](https://python.org/) 3.11+ (for backend)
- [Google Cloud Account](https://console.cloud.google.com/)
- [ElevenLabs Account](https://elevenlabs.io/)

### Backend Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/Project_Language_Mirror.git
cd Project_Language_Mirror/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Run the server
python main.py
```

### Frontend Setup

```bash
cd Project_Language_Mirror/frontend

# Install dependencies with Bun (blazing fast!)
bun install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your backend URL

# Run development server
bun dev
```

---

## ⚙️ Environment Variables

### Backend (`.env`)
```env
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
GEMINI_API_KEY=your-gemini-api-key
ELEVENLABS_API_KEY=your-elevenlabs-api-key
```

### Frontend (`.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

---

## 🎮 Usage

1. **Select a language** - Choose from Italian, Spanish, French, German, or Japanese
2. **Pick a dialect** - Each language has 3 regional dialects with unique accents
3. **Meet your tutor** - Click the speaker icon to hear their greeting
4. **Start speaking** - Tap the microphone and speak in your target language
5. **Get feedback** - Receive honest corrections and hear native responses
6. **Keep practicing** - The tutor remembers your conversation context!

---

## 🎨 UI Features

- **🌙 Dark/Light/System themes** - Automatic theme switching
- **📱 Fully responsive** - Works on mobile, tablet, and desktop
- **✨ Smooth animations** - GSAP-powered entrance/exit animations
- **🎤 Audio visualizer** - Real-time audio bars while recording
- **📊 Progress indicator** - Step-by-step processing status
- **⚠️ Smart error handling** - User-friendly error toasts with retry

---

## 🔧 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/languages` | GET | List all supported languages |
| `/dialects/{language}` | GET | Get dialects for a language |
| `/greeting` | GET | Get tutor's greeting |
| `/converse` | POST | Main conversation endpoint (SSE) |

---

## 📈 Performance Optimizations

- **Connection pooling** - Reuses HTTP clients for API calls
- **Rate limiting** - 20 requests/minute per IP
- **Aggressive caching** - React Query prevents duplicate fetches
- **Lazy audio loading** - Greeting audio only loads on demand
- **Optimized prompts** - Minimal token usage for Gemini API

---

## 🚀 Deployment

### Backend (Google Cloud Run)
```bash
gcloud run deploy language-mirror-api \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "GEMINI_API_KEY=xxx,ELEVENLABS_API_KEY=xxx"
```

### Frontend (Vercel)
```bash
bunx vercel --prod
```

---

## 🏆 Hackathon Highlights

- **5 languages, 15 unique dialect voices** - Authentic regional accents
- **Real-time language detection** - Catches wrong language immediately  
- **Humanistic AI tutors** - Personalities, not chatbots
- **Honest feedback system** - Real corrections, not constant praise
- **Production-ready** - Rate limiting, error handling, graceful degradation

---

## 📄 License

MIT License - feel free to use this for your own projects!

---

## 👥 Team

Built with ❤️ for the Google Cloud + ElevenLabs Hackathon

---

## 🙏 Acknowledgments

- [Google Cloud](https://cloud.google.com/) - Speech, Translate, and Gemini APIs
- [ElevenLabs](https://elevenlabs.io/) - Incredible multilingual voice synthesis
- [Anthropic Claude](https://anthropic.com/) - AI pair programming assistant

---

<p align="center">
  <b>🪞 Language Mirror - Learn languages the way they're really spoken 🪞</b>
</p>