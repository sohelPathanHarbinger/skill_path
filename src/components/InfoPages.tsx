import type { ReactNode } from "react";
import { getProvider } from "../lib/ai/providers";
import { APP_VERSION, COPYRIGHT, DEVELOPER } from "../lib/appInfo";

// The About, How to use and Disclaimer pages opened from the menu.

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-1.5">
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

const page = "space-y-5 text-sm leading-relaxed text-slate-700";
// In the wide popup, sections flow into columns so long pages need little or no scrolling.
const flow =
  "text-sm leading-relaxed text-slate-700 lg:columns-2 lg:gap-10 2xl:columns-3 [&>*]:mb-5 [&>*]:break-inside-avoid";
const list = "list-disc space-y-1 pl-5";
const link = "font-medium text-indigo-600 underline";

export function AboutPage() {
  return (
    <div className={flow}>
      <div className="flex items-center gap-4">
        <img src="favicon.svg" alt="" className="h-14 w-14" />
        <div>
          <p className="text-base font-semibold text-slate-900">SkillPath</p>
          <p className="text-slate-500">Adaptive learning coach · Version {APP_VERSION}</p>
        </div>
      </div>
      <p>
        Tell SkillPath a skill you want to learn and your goal. It finds your current level with a short adaptive skill
        check, then builds a personal plan and teaches you one module at a time.
      </p>
      <Section title="What you get">
        <ul className={list}>
          <li>A skill check whose questions adapt to your answers</li>
          <li>A skill profile with your strengths, gaps and misconceptions</li>
          <li>A learning plan that skips what you already know</li>
          <li>Two-way lessons with an AI tutor you can question at any time</li>
          <li>Quizzes with feedback, and suggested courses and materials</li>
        </ul>
      </Section>
      <Section title="Private by design">
        <p>
          No account and no sign-up. SkillPath has no server of its own: your tracks and your encrypted API key stay on
          this device. Use <span className="font-medium">Back up &amp; restore</span> in the menu to keep a copy.
        </p>
      </Section>
      <Section title="Which AI teaches you">
        <p>
          Google Gemini by default, which has a free tier. You can switch to Claude, OpenAI, Groq and many others in{" "}
          <span className="font-medium">AI settings</span>.
        </p>
      </Section>
      <Section title="Credits">
        <p>
          Designed and developed by <span className="font-medium text-slate-900">{DEVELOPER}</span>.
        </p>
        <p className="text-slate-500">{COPYRIGHT}</p>
      </Section>
    </div>
  );
}

export function HowToUsePage() {
  const gemini = getProvider("gemini");
  return (
    <div className={page}>
      <ol className="grid gap-x-10 gap-y-3 lg:grid-cols-2">
        <Step n={1} title="Get a free AI key">
          Open{" "}
          <a href={gemini.keyUrl} target="_blank" rel="noreferrer" className={link}>
            Google AI Studio ↗
          </a>
          , sign in with your Google account, click <b>Get API key</b> → <b>Create API key</b>, and copy the key. No credit
          card needed.
        </Step>
        <Step n={2} title="Add the key to SkillPath">
          Open <b>AI settings</b> (top right), keep <b>Google Gemini</b> selected, paste the key and click <b>Save</b>. The
          key is encrypted and stays on this device. If the key is wrong, SkillPath tells you as soon as you start a
          track, with a button to fix it.
        </Step>
        <Step n={3} title="Start a track">
          On the home page, type the skill (for example Python), your goal and what you've done with it so far, then click{" "}
          <b>Start skill check</b>.
        </Step>
        <Step n={4} title="Take the skill check">
          Answer honestly. <b>I don't know</b> is a good answer: it helps find your real level. At the end, click{" "}
          <b>See my skill profile</b>.
        </Step>
        <Step n={5} title="Follow your plan">
          Review your skill profile and learning plan, then open the first module.
        </Step>
        <Step n={6} title="Learn and practise">
          Click <b>Start the lesson</b>, chat with the tutor and ask anything. Then take the quiz under{" "}
          <b>Check your understanding</b>. Scoring 70% or more completes the module.
        </Step>
        <Step n={7} title="Come back any time">
          Progress saves automatically. Your tracks are listed under <b>Your learning tracks</b> on the home page.
        </Step>
      </ol>
      <div className="grid gap-x-10 gap-y-5 lg:grid-cols-2">
        <Section title="Install SkillPath as an app">
          <ul className={list}>
            <li>
              <b>Android, Chrome or Edge:</b> menu → <b>Install app</b>, or the install icon in the address bar.
            </li>
            <li>
              <b>iPhone or iPad:</b> open SkillPath in Safari, tap <b>Share</b> → <b>Add to Home Screen</b>.
            </li>
          </ul>
          <p>Installed, it opens in its own window and works offline for the tracks you already have.</p>
        </Section>
        <Section title="Keep your progress safe">
          <p>
            Your tracks live only on this device. Menu → <b>Back up &amp; restore</b> → <b>Download backup</b> before you
            clear browser data or move to a new device.
          </p>
        </Section>
      </div>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
        {n}
      </span>
      <div>
        <p className="font-semibold text-slate-900">{title}</p>
        <p>{children}</p>
      </div>
    </li>
  );
}

export function DisclaimerPage() {
  return (
    <div className={flow}>
      <Section title="AI-generated content">
        <p>
          Lessons, questions, quiz grades, skill levels and suggestions are written by AI. They can be wrong, incomplete
          or out of date. Check important facts against official documentation. SkillPath doesn't guarantee any learning,
          exam, certification or career outcome.
        </p>
      </Section>
      <Section title="Your data stays on your device">
        <p>
          SkillPath has no account system and no server of its own. Your tracks are saved in this browser's storage on
          this device, and the developer can't see them. Clearing browser data, uninstalling the app or using a private
          window can delete them, so download a backup now and then.
        </p>
      </Section>
      <Section title="What is sent to the AI provider">
        <p>
          To teach you, SkillPath sends your skill, goal, answers and messages straight from your device to the AI
          provider you choose in AI settings. That provider's terms and privacy policy apply. Free tiers, including
          Google Gemini's, may use what you send to improve their products. Don't enter personal, confidential or
          work-sensitive information.
        </p>
      </Section>
      <Section title="Your API key">
        <p>
          You're responsible for your API key and for any charges your provider makes. SkillPath encrypts the key on this
          device and sends it only to that provider. Anyone using this device and browser can still use the app with it,
          so on a shared device remove it with <b>Reset to defaults</b> in AI settings.
        </p>
      </Section>
      <Section title="Links to other sites">
        <p>
          Suggested courses and materials link to third-party sites. SkillPath isn't affiliated with them and isn't
          responsible for their content, prices or availability.
        </p>
      </Section>
      <Section title="Trademarks">
        <p>
          Google, Gemini, Claude, OpenAI and other product names belong to their owners. SkillPath isn't affiliated with
          or endorsed by them.
        </p>
      </Section>
      <Section title="No warranty">
        <p>
          SkillPath is provided "as is", without warranty of any kind. To the extent the law allows, the developer isn't
          liable for any loss or damage arising from its use.
        </p>
        <p className="text-slate-500">{COPYRIGHT}</p>
      </Section>
    </div>
  );
}
