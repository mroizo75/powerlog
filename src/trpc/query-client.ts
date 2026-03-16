import {
  defaultShouldDehydrateQuery,
  QueryClient,
} from "@tanstack/react-query";
import SuperJSON from "superjson";

const isAbortLikeError = (error: unknown) => {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return message.includes("aborted") || message.includes("aborterror");
};

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set some default staleTime
        // above 0 to avoid refetching immediately on the client
        staleTime: 5 * 1000, // 5 sekunder
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          if (isAbortLikeError(error)) {
            return false;
          }

          return failureCount < 2;
        },
        throwOnError: (error) => !isAbortLikeError(error),
      },
      mutations: {
        retry: (failureCount, error) => {
          if (isAbortLikeError(error)) {
            return false;
          }

          return failureCount < 1;
        },
        throwOnError: (error) => !isAbortLikeError(error),
      },
      dehydrate: {
        serializeData: SuperJSON.serialize,
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
      },
      hydrate: {
        deserializeData: SuperJSON.deserialize,
      },
    },
  });
