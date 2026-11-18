// Voice: talk to SkillPath and hear it answer, with the browser's own speech tools
// (free, no key, works with any AI). listen.ts turns speech into text, speak.ts
// reads text aloud, speechText.ts picks what to read out of Markdown, and prefs.ts
// keeps the learner's choices. features.voiceSupport switches it all on or off.
import { canListen } from "./listen";
import { canSpeak } from "./speak";

/** Whether to offer voice at all: switched on, and this browser can listen or speak. */
export function voiceAvailable(): boolean {
  return canListen() || canSpeak();
}
