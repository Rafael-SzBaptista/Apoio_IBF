import { AppLogo } from "@/components/app-logo";
import { MobileProfileButton } from "@/mobile/profile-button";

export function MobileHeader({
  member,
  isAdmin,
  onSignOut,
}: {
  member?: string | null | undefined;
  isAdmin: boolean;
  onSignOut: () => void;
}) {
  return (
    <header className="fixed inset-x-0 top-0 z-40 pt-[var(--safe-top)] lg:hidden">
      <div aria-hidden className="mobile-header-veil" />
      <div className="relative flex h-14 items-center gap-2 px-4 sm:px-5">
        <AppLogo
          alt="Ministério Apoio"
          width={80}
          height={96}
          className="mr-auto h-10 w-auto shrink-0 object-contain"
        />
        <MobileProfileButton member={member} isAdmin={isAdmin} onSignOut={onSignOut} />
      </div>
    </header>
  );
}
