"use client";

import dynamic from "next/dynamic";

const FirstTimeWelcomeModal = dynamic(
  () => import("@/components/FirstTimeWelcomeModal"),
  { ssr: false }
);

const AdminToeQuizPopup = dynamic(
  () =>
    import("@/components/admin/AdminToeQuizPopup").then(
      (module) => module.AdminToeQuizPopup
    ),
  { ssr: false }
);

const DeferredPrivacyBanner = dynamic(
  () => import("@/components/PrivacyBanner"),
  { ssr: false }
);

export function ClientOverlays() {
  return (
    <>
      <FirstTimeWelcomeModal />
      <AdminToeQuizPopup />
      <DeferredPrivacyBanner />
    </>
  );
}
