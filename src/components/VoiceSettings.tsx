import { useVoicePrefs, useVoices } from "../hooks/useVoice";
import { canListen } from "../lib/voice/listen";
import { LANGUAGES, RATES, speechLang, updateVoicePrefs } from "../lib/voice/prefs";
import { bestVoice, canSpeak, readAloud } from "../lib/voice/speak";
import { Button } from "./ui";

const field =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200";
const label = "block text-sm font-medium text-slate-700";
const SAMPLE = "Hi! I'm your SkillPath tutor. This is how I'll sound when I read my replies to you.";

/** Language, the tutor's voice and speed, and when SkillPath reads aloud and listens. Changes apply straight away. */
export function VoiceSettings() {
  const prefs = useVoicePrefs();
  const voices = useVoices();
  const listenOk = canListen();
  const speakOk = canSpeak();
  const lang = speechLang();
  const base = lang.split("-")[0].toLowerCase();
  const matching = voices
    .filter((v) => v.lang.replace("_", "-").toLowerCase().split("-")[0] === base)
    .sort((a, b) => a.name.localeCompare(b.name));
  const automatic = bestVoice(voices, lang);

  if (!listenOk && !speakOk) {
    return <p className="text-sm text-slate-600">This browser has no speech support. Try Chrome, Edge or Safari.</p>;
  }

  return (
    <div className="space-y-5 text-sm text-slate-700">
      <p>
        Talk to your tutor instead of typing, and hear its replies while the text stays on screen. This uses your
        browser's own speech tools: free, no key, and it works with any AI. Changes apply straight away.
      </p>

      <div className="space-y-2">
        <label htmlFor="voice-lang" className={label}>
          Language you speak
        </label>
        <select
          id="voice-lang"
          value={prefs.lang}
          onChange={(e) => updateVoicePrefs({ lang: e.target.value, voice: "" })}
          className={field}
        >
          <option value="">Browser language ({navigator.language})</option>
          {LANGUAGES.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-slate-500">
          Used to recognise your speech and to pick the tutor's voice. Choosing your accent, such as English (India),
          improves recognition.
        </p>
      </div>

      {speakOk && (
        <>
          <div className="space-y-2">
            <label htmlFor="voice-voice" className={label}>
              Tutor's voice
            </label>
            <div className="flex gap-2">
              <select
                id="voice-voice"
                value={prefs.voice}
                onChange={(e) => updateVoicePrefs({ voice: e.target.value })}
                className={`${field} min-w-0`}
              >
                <option value="">Automatic{automatic ? ` (${automatic.name})` : ""}</option>
                {matching.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name}
                  </option>
                ))}
              </select>
              <Button variant="secondary" onClick={() => readAloud("voice-test", SAMPLE)} className="shrink-0">
                Test
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              Voices come from your browser and device. In Microsoft Edge, the "Natural" voices sound the most human.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="voice-rate" className={label}>
              Speed
            </label>
            <select
              id="voice-rate"
              value={String(prefs.rate)}
              onChange={(e) => updateVoicePrefs({ rate: Number(e.target.value) })}
              className={field}
            >
              {RATES.map((rate) => (
                <option key={rate} value={rate}>
                  {rate === 1 ? "Normal" : `${rate}×`}
                </option>
              ))}
            </select>
          </div>

          <Check
            checked={prefs.readAloud}
            onChange={(readAloud) => updateVoicePrefs({ readAloud })}
            title="Read everything aloud"
            detail="Tutor replies and skill-check questions are read aloud even when you type. Replies to spoken messages are always read aloud."
          />
        </>
      )}

      {listenOk && speakOk && (
        <Check
          checked={prefs.handsFree}
          onChange={(handsFree) => updateVoicePrefs({ handsFree })}
          title="Hands-free"
          detail="When the tutor finishes speaking, SkillPath listens for your answer, so you don't need to tap the mic."
        />
      )}

      {!listenOk && (
        <p className="rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-800 ring-1 ring-amber-200">
          This browser can read aloud but can't recognise speech. To talk to your tutor, use Chrome, Edge or Safari.
        </p>
      )}

      <p className="text-xs text-slate-500">
        To turn speech into text, Chrome sends your voice to Google, Edge to Microsoft and Safari to Apple. Voices that
        aren't installed on your device, such as Edge's "Natural" and Chrome's "Google" voices, send the text they read
        to that company.
      </p>
    </div>
  );
}

function Check({
  checked,
  onChange,
  title,
  detail,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  title: string;
  detail: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-indigo-600"
      />
      <span>
        <span className="block font-medium text-slate-800">{title}</span>
        <span className="block text-xs text-slate-500">{detail}</span>
      </span>
    </label>
  );
}
