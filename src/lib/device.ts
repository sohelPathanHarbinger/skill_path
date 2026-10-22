// What kind of device the app runs on.

/**
 * True on phones and tablets: iPhone, iPad (including iPads that identify as a Mac),
 * Android and other touch-only devices. Laptops and desktops, touch laptops with a
 * trackpad included, return false.
 */
export function isPhoneOrTablet(): boolean {
  const nav = navigator as Navigator & { userAgentData?: { mobile?: boolean } };
  if (nav.userAgentData?.mobile) return true;
  const ua = navigator.userAgent;
  if (/Android|iPhone|iPad|iPod|Mobile|Silk|Kindle|BlackBerry|Opera Mini|IEMobile/i.test(ua)) return true;
  // iPadOS reports itself as a Mac, but Macs have no touch screen.
  if (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return true;
  // Touch-only devices have no mouse or trackpad to hover with.
  return window.matchMedia("(hover: none) and (pointer: coarse)").matches;
}
