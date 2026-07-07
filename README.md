# 🤖 WA AI Assistant

AI Personal Assistant untuk WhatsApp — dibangun dengan Node.js, TypeScript, Baileys, PostgreSQL, dan OpenRouter.

Bukan sekadar auto-reply bot, tapi **asisten pribadi cerdas** yang bisa mengingat percakapan, membuat reminder, mencatat, menghitung, membaca gambar (OCR), meringkas PDF, dan banyak lagi.

---

## ✨ Fitur

| Fitur | Deskripsi |
|---|---|
| 💬 **AI Chat** | Percakapan natural menggunakan bahasa Indonesia |
| 🧠 **Memory** | Bot mengingat informasi penting tentang kamu |
| ⏰ **Reminder** | Buat, lihat, update, dan hapus reminder |
| 📋 **Notes** | Simpan dan kelola catatan |
| 🔢 **Calculator** | Hitung ekspresi matematika |
| 📸 **OCR** | Baca teks dari gambar |
| 🎙️ **Voice Note** | Transkripsi voice note (coming soon) |
| 📄 **PDF Summary** | Ringkas dokumen PDF |
| 🔧 **Tool Calling** | Arsitektur tool yang mudah diperluas |
| 👥 **Multi-User** | Setiap nomor WhatsApp punya data terisolasi |

---

## 🏗️ Arsitektur

```
Message Masuk
     ↓
Identifikasi Tipe (Text/Image/Voice/PDF)
     ↓
Bangun Context (Memory + History)
     ↓
Kirim ke OpenRouter LLM
     ↓
┌─── LLM minta Tool? ───┐
│  Ya                    │  Tidak
│  ↓                     │  ↓
│  Validasi & Eksekusi   │  Jawaban Akhir
│  ↓                     │
│  Kirim Hasil ke LLM    │
│  ↓                     │
│  Jawaban Akhir         │
└────────────────────────┘
     ↓
Kirim ke WhatsApp
```

> **Prinsip:** LLM tidak pernah mengeksekusi aksi langsung. LLM hanya *meminta* tool, backend memvalidasi dan mengeksekusi, lalu mengirim hasil kembali ke LLM.

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 16+
- NPM atau Yarn

### 1. Clone & Install

```bash
git clone <repo-url>
cd wa-chatbot-assistant
npm install
```

### 2. Setup Environment

```bash
cp .env.example .env
```

Edit `.env` dan isi:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/wa_assistant
OPENROUTER_API_KEY=sk-or-your-key-here
OPENROUTER_MODEL=qwen/qwen3-235b-a22b:free
```

> 💡 Dapatkan API key gratis di [openrouter.ai](https://openrouter.ai)

### 3. Setup Database

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 4. Jalankan

```bash
npm run dev
```

### 5. Scan QR Code

Setelah aplikasi berjalan, scan QR code yang muncul di terminal menggunakan WhatsApp kamu:
1. Buka WhatsApp → Settings → Linked Devices
2. Tap "Link a Device"
3. Scan QR code

---

## 🐳 Docker

### Menggunakan Docker Compose (Recommended)

```bash
# Copy environment file
cp .env.example .env
# Edit .env dan isi OPENROUTER_API_KEY

# Build dan jalankan
docker compose up -d

# Lihat logs (untuk scan QR code)
docker compose logs -f app
```

### Build Manual

```bash
docker build -t wa-ai-assistant .
```

---

## 📁 Struktur Project

```
src/
├── ai/                     # AI/LLM layer
│   ├── openrouter.service  # OpenRouter API client
│   ├── prompts             # System prompt templates
│   ├── memory.service      # Long-term memory management
│   └── tool-executor       # Tool validation & execution
├── whatsapp/               # WhatsApp layer
│   ├── client              # Baileys client setup
│   ├── message-handler     # Core message orchestrator
│   ├── media-handler       # Media download & processing
│   └── sender              # Message sending utilities
├── scheduler/              # Background jobs
│   ├── reminder-scheduler  # Cron for due reminders
│   └── worker              # Scheduler bootstrap
├── tools/                  # Modular tools
│   ├── base-tool           # Tool interface
│   ├── registry            # Tool registration
│   ├── reminder/           # Reminder CRUD tools
│   ├── notes/              # Notes CRUD tools
│   ├── calculator/         # Math calculator
│   ├── memory/             # Memory save tool
│   ├── ocr/                # Image text extraction
│   ├── voice/              # Voice transcription
│   └── pdf/                # PDF summarization
├── services/               # Business services
│   ├── user.service        # User management
│   └── chat.service        # Chat history
├── config/                 # Configuration
│   ├── env                 # Zod-validated env vars
│   └── logger              # Pino logger
├── database/               # Database
│   └── prisma              # Prisma client singleton
├── routes/                 # HTTP routes
│   └── health.route        # Health check
├── utils/                  # Utilities
│   ├── error-handler       # Error handling
│   └── date-parser         # Date parsing
└── app.ts                  # Entry point
```

---

## 🔧 Menambah Tool Baru

Menambah tool baru sangat mudah. Contoh menambah tool **weather**:

### 1. Buat folder `src/tools/weather/`

### 2. Buat `weather.tool.ts`

```typescript
import { z } from 'zod';
import type { ITool } from '../base-tool';
import { zodToJsonSchema } from '../base-tool';
import type { ToolResult } from '../../ai/tool-executor';

const weatherSchema = z.object({
  city: z.string().describe('Nama kota'),
});

export const weatherTool: ITool = {
  name: 'get_weather',
  description: 'Cek cuaca di suatu kota',
  inputSchema: weatherSchema,
  parameters: zodToJsonSchema(weatherSchema),

  async execute(input: unknown): Promise<ToolResult> {
    const { city } = input as { city: string };
    // Implementasi API cuaca di sini
    return {
      success: true,
      data: { city, temperature: '28°C', condition: 'Cerah' },
    };
  },
};
```

### 3. Register di `src/tools/registry.ts`

```typescript
import { weatherTool } from './weather/weather.tool';

// Di dalam registerAllTools():
toolRegistry.register(weatherTool);
```

**Selesai!** Tool otomatis tersedia untuk LLM.

---

## 💬 Contoh Penggunaan

| Pesan | Respon Bot |
|---|---|
| "Halo!" | Sapaan ramah |
| "Aku kuliah di Telkom" | Menyimpan ke memory |
| "Aku kuliah dimana?" | "Kamu kuliah di Telkom University" |
| "Ingatkan aku besok jam 9 sidang" | Membuat reminder |
| "Apa reminderku?" | Menampilkan daftar reminder |
| "Hapus reminder nomor 1" | Menghapus reminder |
| "123 x 928" | Menggunakan calculator: 114,144 |
| "Catat password wifi abc123" | Menyimpan note |
| "Tampilkan catatanku" | Menampilkan daftar catatan |
| *kirim gambar* | Membaca teks (OCR) |
| *kirim PDF* | Meringkas isi PDF |

---

## 🔒 Environment Variables

| Variable | Deskripsi | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | — |
| `OPENROUTER_API_KEY` | API key OpenRouter | — |
| `OPENROUTER_MODEL` | Model LLM | `qwen/qwen3-235b-a22b:free` |
| `OPENROUTER_BASE_URL` | OpenRouter base URL | `https://openrouter.ai/api/v1` |
| `NODE_ENV` | Environment | `development` |
| `PORT` | HTTP port | `3000` |
| `LOG_LEVEL` | Log level | `info` |
| `WA_SESSION_NAME` | WhatsApp session name | `wa-assistant` |
| `MEDIA_DIR` | Media storage directory | `./media` |
| `REMINDER_CHECK_INTERVAL_SECONDS` | Reminder check interval | `30` |

---

## 📊 Database

Schema dikelola dengan Prisma ORM. Model utama:

- **User** — setiap nomor WA = 1 user
- **ChatMessage** — histori percakapan
- **Memory** — ringkasan informasi penting user
- **Reminder** — pengingat terjadwal
- **Note** — catatan user
- **ToolExecution** — audit log tool calls
- **Attachment** — file terlampir

### Useful Commands

```bash
# Buat migration baru
npx prisma migrate dev --name <nama>

# Push schema ke DB (tanpa migration)
npx prisma db push

# Buka Prisma Studio (GUI)
npx prisma studio

# Reset database
npx prisma migrate reset
```

---

## 🛣️ Roadmap

- [ ] Google Calendar integration
- [ ] Gmail integration
- [ ] GitHub integration
- [ ] Weather API
- [ ] Web search
- [ ] Image generation
- [ ] Admin dashboard
- [ ] Group chat support
- [ ] BullMQ + Redis scheduler
- [ ] Voice note transcription (Groq Whisper)

---

## 📝 License

MIT
