import { FOOTER_DISCLAIMER } from "@/lib/disclaimers";

export function Footer() {
  return (
    <footer className="mt-auto px-6 py-4 text-center text-xs text-gray-400">
      {FOOTER_DISCLAIMER}
    </footer>
  );
}
