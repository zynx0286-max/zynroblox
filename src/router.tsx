import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Cross-document-feeling page changes on browsers with the View
    // Transitions API; instant, ordinary navigation everywhere else.
    defaultViewTransition: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
