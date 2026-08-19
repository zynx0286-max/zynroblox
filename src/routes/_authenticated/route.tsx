import { createFileRoute, Outlet } from "@tanstack/react-router";

// Admin pages are guarded by the owner cookie server-side (each admin server
// function validates it via `requireOwner`); the admin layout itself handles
// redirecting to /auth when a request is unauthorized.
export const Route = createFileRoute("/_authenticated")({
  component: () => <Outlet />,
});
