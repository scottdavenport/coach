# PRD: Conversational Health & Fitness Coach App (MVP)

---

## 1. Product Vision
A **chat-first personal health coach** that logs daily check-ins, biometrics, and workouts through **natural conversation** (typed or voice-dictated).  

- Feels like texting with a **proactive coach/companion**.  
- Stores conversations + structured data in a **persistent database**.  
- Generates **daily workout plans**, logs execution, and adapts to user readiness and available equipment.  
- Produces **daily log cards** and later **weekly dashboards** for insights.  
- Built for **single users at first**, with future scalability for freemium monetization.  

---

## 2. Primary MVP Scope
- **Conversational Input**: text or voice dictation (via native device or Wispr Flow).  
- **Daily Check-Ins**: sleep, mood, energy, soreness, clarity, hydration, bowel, intake, readiness.  
- **Biometric Screenshot Uploads**: OCR parses health data (Oura, Apple Health, Signos, Strava, etc.), user confirms/edits before storing.  
- **Adaptive Workout Generation**: suggest daily workouts based on readiness + context; user can adapt on the fly.  
- **Workout Logging**: conversational “I did X, swapped Y” + optional screenshot upload; system confirms structured log.  
- **Daily Log Card**: snapshot of the day, editable, scrollable timeline.  
- **Authentication**: Supabase auth (magic link), sync across web + mobile.  
- **Dashboard (Web & Mobile)**:  
  - Web: timeline feed + expandable metrics.  
  - Mobile: daily cards + lightweight summaries.  

---

## 3. Future Scope (v2+)
- Weekly rollups + trend dashboards.  
- Adaptive coaching insights (“noticed pattern between sleep & caffeine”).  
- Streaks & consistency tracking + performance progression.  
- Expanded workout library + equipment adaptation.  
- Optional calendar integration for smart nudging.  
- Feature flags → freemium tiers (logging free, insights/workouts premium).  

---

## 4. Core User Stories
- **As a user**, I can log my **morning check-in** via chat, so I don’t have to fill forms.  
- **As a user**, I can upload **screenshots** (biometric apps, workout trackers), so the system pulls structured data for me.  
- **As a user**, I can **confirm/edit structured logs** from conversations, so my data stays accurate.  
- **As a user**, I can receive an **adaptive workout plan** each day, so I know exactly what to do.  
- **As a user**, I can say “I finished my workout” and the system will log it, so I don’t need to manually update fields.  
- **As a user**, I can scroll through my **daily log cards** as a timeline, so I can reflect on my health journey.  
- **As a user**, I can view my data on both **mobile and web**, so I can chat anywhere and analyze trends on a bigger screen.  

---

## 5. Data Model (MVP Hybrid)
- **Users**  
  - id, email, profile (equipment, injuries, goals).  
- **Conversations**  
  - raw chat logs (JSON), timestamp, message type (text/image).  
- **Events (structured logs)**  
  - type: check-in, workout, biometric, meal, note.  
  - data: JSON (flexible schema: sleep=6, energy=4, mood=7, glucose=110 → 140).  
  - linked_conversation_id.  
- **Daily Log Cards**  
  - references all events per day, aggregates summary.  

---

## 6. UX Flow (MVP)

### Input
- User chats → app parses → draft structured log.  
- User uploads screenshot → OCR parse → draft structured log.  
- User confirms/edits → final save.  

### Output
- **Chat** → companion gives narrative feedback + proactive nudges.  
- **Dashboard** → timeline feed of daily cards → expand to see workouts, biometrics, check-ins.  
- **Review** → edit logs in dashboard as needed.  

---

## 7. Tech Stack
- **Frontend**: React (web), mobile-ready (Expo/React Native wrapper later).  
- **Backend**: Supabase (auth + Postgres + file storage for screenshots).  
- **OCR/Parsing**: Tesseract.js or external OCR API (Google Vision, AWS Textract).  
- **AI/Coach Logic**: OpenAI GPT-5 (LLM for conversation + insights).  
- **Deployment**: Vercel (web), App Store/Play Store (v2).  

---

## 8. Roadmap

### Phase 1 (MVP: Personal Use)
- Conversational chat input (text + dictation).  
- Daily check-ins + biometric screenshot parsing.  
- Adaptive workout generation + conversational workout logging.  
- Supabase auth + persistent database.  
- Daily log cards (timeline feed).  

### Phase 2 (Early Adopters)
- Weekly rollups + dashboards.  
- Proactive insights (patterns between habits + outcomes).  
- Notifications (user-controlled nudges).  
- Expanded equipment handling (adaptive workouts for travel).  
- Web + mobile app parity (Expo wrapper).  

### Phase 3 (Public Beta / Monetization)
- Freemium tiers (basic logging free, insights + adaptive workouts premium).  
- Calendar-aware nudging.  
- Community features (optional).  
- Third-party integrations (Apple Health, Oura, Peloton, Strava).  

---