// Display labels only; section keys and persisted names remain unchanged.
// The mapping mirrors the PetroTimes homepage layout (docs/API-CONTRACT.md).
export function homeSectionLabel(key: string, fallback: string): string {
  switch (key) {
    case "hero":
      return "سرخط خبرها (هیرو + ۴ کارت)";
    case "videos":
      return "پترو تایمز TV (پخش + پلی‌لیست)";
    case "topnews":
      return "مطالب ویژه سایدبار";
    case "magazine":
      return "مجله";
    case "feature":
      return "برترین‌ها (رتبه‌دار)";
    case "energy":
      return "انرژی (اصلی + فرعی)";
    case "advertise1":
      return "ادورتایز 1";
    case "advertise":
      return "تبلیغات ویژه";
    default:
      return fallback;
  }
}
