// Small inline icon set (stroke icons, 24px grid)
type P = { className?: string };
const base = (d: React.ReactNode, className = "h-5 w-5") => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>{d}</svg>
);
export const IconBookmark = ({ className, filled }: P & { filled?: boolean }) => (
  <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" className={className ?? "h-5 w-5"} aria-hidden><path d="M6 3h12v18l-6-4-6 4z" /></svg>
);
export const IconHome = ({ className }: P) => base(<><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /></>, className);
export const IconPlay = ({ className }: P) => base(<><circle cx="12" cy="12" r="9" /><path d="M10 8.5l5 3.5-5 3.5z" fill="currentColor" /></>, className);
export const IconNotebook = ({ className }: P) => base(<><path d="M5 4h12a2 2 0 012 2v14H7a2 2 0 01-2-2z" /><path d="M9 8h6M9 12h6M5 4v14" /></>, className);
export const IconGrid = ({ className }: P) => base(<><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>, className);
export const IconChart = ({ className }: P) => base(<><path d="M4 20V4" /><path d="M4 20h16" /><path d="M7 15l4-4 3 3 5-6" /></>, className);
export const IconUser = ({ className }: P) => base(<><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>, className);
export const IconMenu = ({ className }: P) => base(<path d="M4 7h16M4 12h16M4 17h16" />, className);
export const IconX = ({ className }: P) => base(<path d="M6 6l12 12M18 6L6 18" />, className);
export const IconCheck = ({ className }: P) => base(<path d="M5 12.5l4.5 4.5L19 7.5" />, className);
export const IconFlag = ({ className }: P) => base(<><path d="M5 21V4" /><path d="M5 4h11l-2 4 2 4H5" /></>, className);
export const IconClock = ({ className }: P) => base(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>, className);
export const IconChat = ({ className }: P) => base(<path d="M4 5h16v11H9l-5 4z" />, className);
export const IconFire = ({ className }: P) => base(<path d="M12 3c1 3 5 5 5 10a5 5 0 01-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9z" />, className);
export const IconTarget = ({ className }: P) => base(<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" fill="currentColor" /></>, className);
export const IconPhone = ({ className }: P) => base(<path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a1 1 0 01-1 1A16 16 0 014 5a1 1 0 011-1z" />, className);
export const IconGlobe = ({ className }: P) => base(<><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></>, className);
export const IconPin = ({ className }: P) => base(<><path d="M12 21s7-6 7-12a7 7 0 00-14 0c0 6 7 12 7 12z" /><circle cx="12" cy="9" r="2.5" /></>, className);
export const IconTrash = ({ className }: P) => base(<><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></>, className);
export const IconEdit = ({ className }: P) => base(<><path d="M4 20h4L19 9l-4-4L4 16z" /></>, className);
export const IconUpload = ({ className }: P) => base(<><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v4h16v-4" /></>, className);
export const IconSettings = ({ className }: P) => base(<><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 00-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 00-2-1.2L14 3h-4l-.5 2.6a7 7 0 00-2 1.2l-2.4-1-2 3.4 2 1.6a7 7 0 000 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 002 1.2L10 21h4l.5-2.6a7 7 0 002-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z" /></>, className);
export const IconWhatsApp = ({ className }: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className ?? "h-5 w-5"} aria-hidden><path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm0 18.2a8.2 8.2 0 01-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1112 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 01-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 00-.7.3 3 3 0 00-.9 2.2 5.2 5.2 0 001.1 2.7 11.9 11.9 0 004.6 4c1.7.7 2.4.8 3.2.7a2.8 2.8 0 001.8-1.3 2.3 2.3 0 00.2-1.3c-.1-.1-.3-.2-.5-.3z" /></svg>
);
