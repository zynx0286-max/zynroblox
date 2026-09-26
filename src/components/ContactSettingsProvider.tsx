import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_SETTINGS, type ContactSettings } from "@/lib/site-settings";

/**
 * Site-wide contact settings (from the admin panel's Contact section) shared
 * through context so nav links, the footer, and the contact form all follow
 * edits instead of hardcoding the Discord URL / email.
 */
const ContactSettingsContext = createContext<ContactSettings>(DEFAULT_SETTINGS.contact);

export function ContactSettingsProvider({
  contact,
  children,
}: {
  contact: ContactSettings;
  children: ReactNode;
}) {
  return (
    <ContactSettingsContext.Provider value={contact}>{children}</ContactSettingsContext.Provider>
  );
}

export function useContactSettings(): ContactSettings {
  return useContext(ContactSettingsContext);
}
