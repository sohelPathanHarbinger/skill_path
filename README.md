# SkillPath — adaptive learning coach

A frontend-only web app that works out what a learner already knows about a technical skill, then teaches it at the right level through a two-way conversation.

It works with **many AI providers**, not only Claude. Claude (Sonnet 5, low effort) is the default. Learners can switch in the app's **Settings** popup to Google Gemini, Groq, OpenRouter, Mistral, Cerebras, Hugging Face, Cohere, OpenAI, DeepSeek or xAI, or to any **custom** OpenAI-compatible service. Several of these have **free tiers or free credits**; see [Choosing an AI](#choosing-an-ai).

1. **Skill check.** An adaptive conversation of about 6–10 questions (multiple choice, short answer, code, experience). Each question depends on the previous answers: it gets harder after correct ones and easier after wrong ones.
2. **Skill profile.** Overall level, mastery per sub-topic (0–100), strengths, gaps and misconceptions.
3. **Learning plan.** Ordered modules that skip what the learner already knows and start with the gaps that block their goal.
4. **Courses & materials.** Video courses, websites, books, docs and practice on different platforms, picked for the learner's goal and gaps.
5. **Lessons.** A streamed tutor chat per module that explains, gives examples, asks questions and adapts ("explain another way", "go faster", …).
6. **Quizzes.** Four questions per module, graded with feedback. Scoring 70% or more completes the module, and the results update the skill profile.

---

## Getting started (running the app)

### Prerequisites

- **Node.js 20.19+ or 22.12+** (check with `node --version`)
- An API key for at least one AI provider. No key yet? The quickest free start is a [Google Gemini key](https://aistudio.google.com/apikey) or a [Groq key](https://console.groq.com/keys).

### 1. Install and start

```bash
npm install
npm run dev
```

Open the URL it prints, usually **http://localhost:5173**. Press `Ctrl + C` in the terminal to stop the app.

### 2. Choose your AI in the Settings popup

When the app opens, the **AI settings** popup appears:

| Setting | What it does |
|---|---|
| **AI provider** | Which service does the teaching. The box underneath shows its free tier or pricing, setup tips, and a **Get an API key ↗** link |
| **API URL** | Only for **Custom**: where the service lives |
| **API key** | Your key for that provider (**Show** reveals it). Each provider remembers its own key |
| **Model** | Type a model id, click one of the suggestion chips, or click **Load models** to fetch the provider's current list |
| **Effort** | How much the model thinks per request, for models that support it. Lower means fewer tokens |

Click **Save** to use your choices, or **Use defaults** (or ✕ / `Esc`) to close without changes. Saved settings take effect immediately and are remembered in this browser. The provider's name in the top-right corner reopens Settings any time, and **Reset to defaults** clears everything you saved. The footer shows the AI, model and effort in use.

### Optional: set defaults in `.env.local`

To avoid typing keys into the popup, or to change the default AI, copy the example file and fill in what you need:

```bash
# macOS / Linux / Git Bash
cp .env.example .env.local
```

```powershell
# Windows PowerShell
Copy-Item .env.example .env.local
```

```
VITE_AI_PROVIDER=anthropic        # the default AI (see the tables below for ids)
VITE_AI_MODEL=                    # empty = that AI's recommended model
VITE_AI_EFFORT=low
VITE_ANTHROPIC_API_KEY=sk-ant-...
VITE_GEMINI_API_KEY=...           # one variable per provider; fill in only what you use
```

Restart `npm run dev` after changing it, because this file is read only at startup.

**Which setting wins:** a value saved in the Settings popup → otherwise `.env.local` → otherwise the built-in default.

### Optional: production build

```bash
npm run build     # type-checks, then builds into dist/
npm run preview   # serves the built app locally
```

> **About API keys.** Keys in `.env.local` are baked into the JavaScript bundle at build time, and keys entered in Settings are stored in this browser's localStorage. `.env.local` is git-ignored, but anyone who can open the running app could read the keys. **Use this only on your own machine** and don't deploy `dist/` publicly with keys in it. Before sharing the app, move the AI calls behind a small server function (see "Next steps").

---

## Choosing an AI

Free tiers, credits and model names change often. The details below were checked in **September 2026**, so confirm them on each provider's site. All of these accept requests directly from a browser.

### Free tiers and free credits

| Provider (`id`) | What's free | Default model | Get a key |
|---|---|---|---|
| **Google Gemini** (`gemini`) | Free tier, no credit card, rate-limited. Google may use free-tier prompts to improve its products | `gemini-3.8-flash` | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| **Groq** (`groq`) | Free tier, no credit card, about 30 requests/minute. Very fast | `openai/gpt-oss-120b` | [console.groq.com/keys](https://console.groq.com/keys) |
| **OpenRouter** (`openrouter`) | Free models (ids ending in `:free`), no credit card, about 50 requests/day. `openrouter/free` picks one automatically | `openrouter/free` | [openrouter.ai/settings/keys](https://openrouter.ai/settings/keys) |
| **Mistral AI** (`mistral`) | Free Experiment plan (phone verification). You must let Mistral train on your data | `mistral-small-latest` | [console.mistral.ai/api-keys](https://console.mistral.ai/api-keys) |
| **Cerebras** (`cerebras`) | Free trial tier, rate-limited, shorter context. Extremely fast | `gpt-oss-120b` | [cloud.cerebras.ai](https://cloud.cerebras.ai) |
| **Hugging Face** (`huggingface`) | Small monthly credit on free accounts; many open models | `openai/gpt-oss-120b:fastest` | [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) (fine-grained token with "Make calls to Inference Providers") |
| **Cohere** (`cohere`) | Free trial keys, rate-limited, not for production | `command-a-03-2025` | [dashboard.cohere.com/api-keys](https://dashboard.cohere.com/api-keys) |

### Paid

| Provider (`id`) | Notes | Default model |
|---|---|---|
| **Anthropic Claude** (`anthropic`, default) | Haiku 4.5 $1/$5, Sonnet 5 $2/$10, Opus 5 $5/$25 per million input/output tokens | `claude-sonnet-5` |
| **OpenAI** (`openai`) | GPT-5.4 mini is the lower-cost option; GPT-5.5 is the flagship | `gpt-5.4-mini` |
| **DeepSeek** (`deepseek`) | Among the lowest prices; top up a small balance | `deepseek-v4-flash` |
| **xAI Grok** (`xai`) | Check the xAI console for any promotional credits | `grok-4.3` |

### Custom

Pick **Custom (OpenAI-compatible)** for any service not listed, such as a company AI gateway or another provider. Enter:

- **API URL**: the part before `/chat/completions`, e.g. `https://my-gateway.example.com/v1`
- **Model** and, if needed, **API key**
- **Structured replies**: use *JSON schema* if the service supports OpenAI structured outputs, *JSON mode* if it supports `response_format: json_object`, or *Instructions only* for anything else

The service must allow requests from browsers (CORS).

> This version of SkillPath talks to hosted AI services only. There is no support for AI running on your own computer.

### Which one should I pick?

- **Best teaching quality:** Claude Opus 5 or Sonnet 5, or OpenAI GPT-5.5.
- **Free and good:** Google Gemini (`gemini-3.8-flash`) or Groq (`openai/gpt-oss-120b`).
- **Cheapest paid:** DeepSeek, or Claude Haiku 4.5.

Smaller free models may sometimes produce shallower assessments. SkillPath checks every structured reply and retries automatically when a model returns the wrong format.

---

## Taking a course

A **course** in SkillPath is called a *learning track*: one skill, one goal, and your progress on it. You can have several tracks at once, for example one for Python and one for Docker.

### Step 1 — Start a track

On the home page, fill in **What do you want to learn?**:

| Field | What to write | Example |
|---|---|---|
| **Skill or technology** | Type one, or click a suggestion chip | `Python` |
| **What's your goal?** | What you want to be able to do. This shapes the whole plan. | `Build REST APIs for my team's internal tools` |
| **What have you done with it so far?** | Your honest starting point | `Nothing yet, but I know JavaScript well` |
| **Which AI should teach you?** | Pick the AI provider and model. The model suggestions follow the provider, and a key field appears if that provider needs one | `Groq` · `openai/gpt-oss-120b` |

Click **Start skill check →**. It stays disabled until the chosen AI is ready, for example until a key is added. What you typed is kept if you leave the page or something goes wrong, and it clears once your first question has loaded.

> **If the AI has a problem** (wrong key, unknown model, a used-up free quota, …), the error message offers **Change AI or model** on the spot. Pick another model or provider, then click **Try again**. This works on every page: skill check, plan building, lessons and quizzes.

### Step 2 — Take the skill check (about 5–10 minutes)

The AI asks one question at a time, starting near the level your background suggests:

- **Multiple choice:** click an option to answer.
- **Short answer, code or experience questions:** type in the box, then click **Submit answer** (or press `Ctrl + Enter`).
- **Don't know?** Click **I don't know**. It's useful information, not a failure, and the next question adapts to it.

After each answer you'll see brief feedback, and the next question gets harder or easier depending on how you did. Don't look answers up: the check only works if it measures what you actually know. When it's done, click **See my skill profile →**.

### Step 3 — Review your profile and plan

SkillPath takes up to a minute to analyse your answers and design your plan. You then land on the track dashboard:

- **Skill profile** (left): your level, overall mastery %, a mastery bar per sub-topic (hover a bar to see the evidence behind it), and your strengths, gaps and misconceptions.
- **Your learning plan** (right): an ordered list of modules, each with its objective, why it's in your plan, and an estimated time. The next module is highlighted.

Click **Start next module →**, or click any module in the list.

### Courses & learning materials

Under the plan, **Courses & learning materials** lists 8–12 resources picked for your goal and gaps: complete video courses on different platforms (YouTube, Udemy, Coursera, edX, freeCodeCamp, Pluralsight, LinkedIn Learning, …), tutorial websites and free books, the official documentation, and places to practise. It appears automatically the first time you open the dashboard, and **Suggest again** asks for a fresh list.

- Each card shows the platform, **Free / Free to audit / Paid / Subscription**, format, level, rough hours, *why it suits you* and the gaps it covers. **★ Top pick** marks where to start.
- Filter by **Video courses**, **Websites & books** or **Docs & practice**, and tick **Free only**.
- **Find on Udemy / Coursera / YouTube / …** searches that platform for the exact title, so you always land on the real, current course. AI models sometimes invent course URLs, so SkillPath doesn't link to those. A **Direct link** is shown only when it's secure (https) and on the right platform.
- Each module page has a **Recommended materials for this module** list.

The suggestions come from the AI's own knowledge, so check the price, reviews and date on the platform before enrolling.

### Step 4 — Learn a module (Lesson tab)

Click **Start the lesson**. The tutor teaches in small steps: it explains an idea, shows an example, then asks you a question or gives you a small exercise.

- Type your reply and press `Enter` to send (`Shift + Enter` for a new line).
- Ask anything at any time, such as "why?", "what's the difference between X and Y?" or "check my code".
- Use the quick replies to steer the lesson: **Explain that another way**, **Show me an example**, **Give me a practice exercise**, **I know this already, go faster**, **Slow down, I'm lost**.
- Click **Stop** to cut a long reply short.

When the tutor says you're ready, switch to the **Quiz** tab.

### Step 5 — Pass the module quiz (Quiz tab)

Click **Start quiz** to get 4 questions written for your level and this module, answer them, then click **Submit answers**. You'll get:

- a score and personal feedback on each answer;
- a suggested next step;
- updated mastery bars on your skill profile.

**70% or more** completes the module, and you can click **Next module →**. Below 70%, click **Review with the tutor** to go over the weak spots, then **Take a new quiz**. Each retake uses fresh questions.

### Step 6 — Repeat until the plan is complete

Work through the modules in order. The dashboard shows your progress, best quiz score per module, and how your mastery is growing.

### Coming back later

- Everything saves automatically. Close the tab and come back any time: your tracks are listed under **Your learning tracks** on the home page, and a half-finished skill check or lesson picks up where you left off.
- **Retake skill check** (bottom of the dashboard) starts the track over with a new assessment and plan. This clears that track's lessons, quiz results and suggested materials.
- **Delete track** removes a track entirely.
- You can switch AI, model or effort in **Settings** at any point, even mid-course. The next request uses the new choice.

> Progress is stored in *this browser* (IndexedDB). A different browser or computer won't see it, and clearing this site's data in your browser deletes it.

### Tips for learning well

- Be honest in the skill check. A plan pitched at the right level beats a flattering score.
- Answer the tutor's questions yourself before asking for the answer: that's where the learning happens.
- Tell the tutor what you already know ("I use Promises daily in JS"). It will build on that.
- Try the exercises for real, in your own editor, and paste your code back for feedback.

---

## How it works

There is no backend and no database. The browser talks to the chosen AI provider directly, and all learner data is saved in the browser's IndexedDB.

```
src/
  config.ts                defaults from .env.local: default AI, model, effort, keys
  lib/
    ai/
      providers.ts         the provider catalog: URLs, free-tier notes, models, effort options
      index.ts             routes each request to the selected provider
      anthropic.ts         Claude, via the official Anthropic SDK
      openaiCompatible.ts  every other provider, via the OpenAI-compatible Chat Completions API
      json.ts              reads JSON out of model replies and validates it
      errors.ts            one error type with learner-friendly messages for every provider
    settings.ts            settings in use: Settings-popup choices on top of the defaults
    learning.ts            the AI tasks: skill check, profile, plan, resources, tutor, quizzes
    prompts.ts             system prompts + learner-context builders (the "teaching brain")
    schemas.ts             Zod schemas for the structured (JSON) replies
    resources.ts           course platforms and how to link to them
    types.ts, storage.ts, trackStore.ts, trackDraft.ts, progress.ts   data model and persistence
  components/              React screens: SettingsDialog, AIQuickSwitch, AIErrorPanel, Home,
                           AssessmentView, BuildingView, Dashboard, ResourcesPanel, ModuleView,
                           TutorChat, QuizPanel
  hooks/                   hash router, useTrack, useSettings, useSettingsDialog
```

How it stays reliable across very different AIs:

- **Structured replies.** Assessment turns, profiles, plans, resource lists, quizzes and grades must be JSON matching a Zod schema. Providers that support it get the schema enforced by their API (`json_schema`). Others get JSON mode or the schema in the prompt. Every reply is validated, and a model that returns the wrong shape is shown its mistake and asked to correct it (up to twice).
- **Automatic fallbacks.** If a provider rejects the effort setting or a JSON mode for a particular model, SkillPath retries with a simpler request and remembers what worked for that model.
- **Reasoning models.** `<think>…</think>` blocks that some open models emit are stripped from what the learner sees.
- **Clear setup errors.** A URL that returns a web page, a rejected key, an unknown model or a used-up quota each get their own message, with **Change AI or model** to fix it on the spot.
- **Claude extras.** Adaptive thinking with effort, prompt caching for multi-turn conversations, and clear messages when a request is declined.

## Customising

- **AI, key, model and effort.** The Settings popup, or `.env.local` for defaults.
- **Providers, suggested models, free-tier notes.** `PROVIDERS` in `src/lib/ai/providers.ts`. Adding another OpenAI-compatible service is one new entry there.
- **Course platforms and links.** `PLATFORMS` in `src/lib/resources.ts`.
- **Teaching style, question count, pass rules.** Edit the prompts in `src/lib/prompts.ts`.
- **Pass mark.** `PASS_SCORE` in `src/lib/progress.ts`.
- **Assessment length cap.** `MAX_QUESTIONS` in `src/components/AssessmentView.tsx`.

## Troubleshooting

| Problem | Fix |
|---|---|
| **Start skill check** is greyed out | The chosen AI isn't ready. The line under **Which AI should teach you?** says why: add its key there, or pick another provider |
| **"… rejected the API key"** | The key is wrong, revoked, or belongs to a different provider. Click **Change AI or model** in the error (or open Settings) and paste the right key |
| **"… couldn't find the model"** | The model isn't available on that provider. The error opens **Change AI or model**; click **Load models**, pick one and click **Try again** |
| **"The API URL … returned a web page"** or **"… doesn't point to an AI API"** | A **Custom** provider's URL is wrong. Fix it in the **API URL** field of **Change AI or model**, or switch to a listed provider |
| **"Couldn't reach …"** | Check your internet connection, proxy or firewall. The service may also be blocking browser requests (CORS) |
| **"… rate limit or free quota was reached"** | Free tiers have per-minute and per-day limits. Wait, or switch to another free provider in Settings |
| **"… is out of credit"** | Add credit on the provider's site, or switch to a free option |
| **"… kept replying in an unexpected format"** | That model struggles with structured replies. Pick a larger model, or a provider with JSON schema support (Claude, OpenAI, Gemini, Groq, Mistral) |
| A reply stopped halfway | Click **Get reply** or **Try again**. Nothing you've done is lost |
| Settings seem ignored | Saved Settings override `.env.local`. Click **Reset to defaults** in Settings to use `.env.local` again |
| `npm run dev` says the port is in use | Another copy is running. Stop it, or open the other URL Vite prints |

## Next steps

| When you need… | Add |
|---|---|
| To share the app without exposing keys | One serverless function (Vercel/Netlify/Cloudflare) that holds the keys and forwards requests; point `src/lib/ai/` at it |
| Accounts, progress across devices, a teacher view | A database; replace `src/lib/storage.ts` with API calls |
