import type { ComponentType } from 'react';

export type SocialKey = 'linkedin' | 'x' | 'instagram' | 'github' | 'youtube' | 'snapchat' | 'tiktok' | 'website';

type IconProps = { className?: string; 'aria-hidden'?: boolean | 'true' | 'false' };

// This lucide version ships no brand logos, so each network gets a compact text mark instead.
const mark = (text: string): ComponentType<IconProps> =>
  function SocialMark({ className }: IconProps) {
    return <span aria-hidden="true" className={`inline-flex items-center justify-center font-black leading-none ${className ?? ''}`} style={{ fontSize: '0.7rem' }}>{text}</span>;
  };

export const SOCIALS: { key: SocialKey; labelAr: string; labelEn: string; placeholder: string; Icon: ComponentType<IconProps> }[] = [
  { key: 'linkedin', labelAr: 'لينكدإن', labelEn: 'LinkedIn', placeholder: 'https://www.linkedin.com/in/…', Icon: mark('in') },
  { key: 'x', labelAr: 'إكس (تويتر)', labelEn: 'X (Twitter)', placeholder: 'https://x.com/…', Icon: mark('X') },
  { key: 'instagram', labelAr: 'إنستغرام', labelEn: 'Instagram', placeholder: 'https://www.instagram.com/…', Icon: mark('IG') },
  { key: 'github', labelAr: 'جيت هاب', labelEn: 'GitHub', placeholder: 'https://github.com/…', Icon: mark('GH') },
  { key: 'youtube', labelAr: 'يوتيوب', labelEn: 'YouTube', placeholder: 'https://www.youtube.com/@…', Icon: mark('YT') },
  { key: 'snapchat', labelAr: 'سناب شات', labelEn: 'Snapchat', placeholder: 'https://www.snapchat.com/add/…', Icon: mark('SC') },
  { key: 'tiktok', labelAr: 'تيك توك', labelEn: 'TikTok', placeholder: 'https://www.tiktok.com/@…', Icon: mark('TT') },
  { key: 'website', labelAr: 'موقع شخصي', labelEn: 'Website', placeholder: 'https://…', Icon: mark('www') },
];

/** linkedin was stored on its own before `socials` existed, so it is merged in for display. */
export function socialLinks(profile?: { linkedin?: string; socials?: Partial<Record<SocialKey, string>> } | null) {
  const merged: Partial<Record<SocialKey, string>> = { ...(profile?.socials ?? {}) };
  if (profile?.linkedin && !merged.linkedin) merged.linkedin = profile.linkedin;
  return SOCIALS.filter(item => merged[item.key]).map(item => ({ ...item, url: merged[item.key] as string }));
}
