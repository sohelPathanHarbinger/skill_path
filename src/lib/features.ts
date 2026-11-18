// Feature switches. Change a value, then commit and push to turn a feature on or off.
import { isPhoneOrTablet } from "./device";

export const features = {
  /**
   * Local AI (Ollama, LM Studio) in the AI lists. Even when true, phones and tablets
   * never show it: they can't run a local AI server.
   */
  localAiSupport: false,
  /**
   * Voice: talk to the tutor instead of typing and hear its replies, using the browser's
   * own speech recognition and voices (free, no key, works with any AI). Browsers
   * without them hide the controls; Firefox, for example, can read aloud but not listen.
   */
  voiceSupport: true,
};

let localAi: boolean | undefined;

/** Whether Ollama and LM Studio are offered on this device. */
export function localAiAvailable(): boolean {
  localAi ??= features.localAiSupport && !isPhoneOrTablet();
  return localAi;
}
