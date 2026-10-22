// Feature switches. Change a value, then commit and push to turn a feature on or off.
import { isPhoneOrTablet } from "./device";

export const features = {
  /**
   * Local AI (Ollama, LM Studio) in the AI lists. Even when true, phones and tablets
   * never show it: they can't run a local AI server.
   */
  localAiSupport: false,
};

let localAi: boolean | undefined;

/** Whether Ollama and LM Studio are offered on this device. */
export function localAiAvailable(): boolean {
  localAi ??= features.localAiSupport && !isPhoneOrTablet();
  return localAi;
}
