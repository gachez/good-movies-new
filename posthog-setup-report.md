<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into FlickBuddy. PostHog client-side analytics are initialized via `instrumentation-client.ts` (Next.js 15.3+ approach), with a reverse proxy configured in `next.config.ts` to route events through `/ingest`. A server-side PostHog client (`src/lib/posthog-server.ts`) handles server-side event capture for API routes. The existing `trackEvent` utility (`src/utils/analytics.ts`) was extended to forward all events to PostHog in addition to the existing SQLite-based analytics system — this means all pre-existing event tracking (feed interactions, onboarding, discover) automatically flows into PostHog without touching those files. User identification (`posthog.identify`) fires on login and signup via `AuthNudge.tsx`, and `posthog.reset()` fires on sign-out from `profile/page.tsx`. Server-side events are captured in the interactions and recommendations API routes.

| Event | Description | File |
|---|---|---|
| `user_signed_up` | User creates a new account via email | `src/components/auth/AuthNudge.tsx` |
| `user_signed_in` | User signs in to an existing account | `src/components/auth/AuthNudge.tsx` |
| `user_signed_out` | User signs out from the profile page | `src/app/profile/page.tsx` |
| `movie_detail_viewed` | User opens a shared movie detail page | `src/app/movie/[id]/page.tsx` |
| `movie_interaction_recorded` | Server: any movie interaction is persisted (like/dislike/save/watch/rate/share) | `src/app/api/interactions/route.ts` |
| `ai_recommendations_requested` | Server: AI-powered recommendation query is executed | `src/app/api/recommendations/route.ts` |
| `movie_liked` | User likes a movie from the feed *(via existing trackEvent)* | `src/components/feed/MovieFeed.tsx` |
| `movie_disliked` | User passes on a movie from the feed *(via existing trackEvent)* | `src/components/feed/MovieFeed.tsx` |
| `movie_saved` | User saves a movie to a list *(via existing trackEvent)* | `src/components/feed/MovieFeed.tsx` |
| `movie_shared` | User shares a movie *(via existing trackEvent)* | `src/components/feed/MovieFeed.tsx` |
| `onboarding_shown` | Taste onboarding screen shown to new user *(via existing trackEvent)* | `src/components/onboarding/TasteOnboarding.tsx` |
| `onboarding_completed` | User completes the taste onboarding *(via existing trackEvent)* | `src/components/onboarding/TasteOnboarding.tsx` |
| `onboarding_skipped` | User skips the taste onboarding *(via existing trackEvent)* | `src/components/onboarding/TasteOnboarding.tsx` |
| `discover_searched` | User submits a search query in Discover *(via existing trackEvent)* | `src/app/discover/page.tsx` |
| `discover_refined` | User refines a Discover result *(via existing trackEvent)* | `src/app/discover/page.tsx` |
| `discover_prompt_used` | User clicks a prompt chip in Discover *(via existing trackEvent)* | `src/app/discover/page.tsx` |
| `recommendation_feedback` | User leaves quick feedback on a recommendation *(via existing trackEvent)* | `src/components/feed/MovieFeed.tsx`, `src/app/discover/page.tsx` |
| `feed_loaded` | Initial feed loaded *(via existing trackEvent)* | `src/components/feed/MovieFeed.tsx` |
| `movie_opened` | User opens a movie from Discover *(via existing trackEvent)* | `src/app/discover/page.tsx` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard — Analytics basics**: https://us.posthog.com/project/404035/dashboard/1528515
- **Auth events (signups, logins, logouts)**: https://us.posthog.com/project/404035/insights/DdO45yeT
- **Movie engagement actions (likes, saves, shares, passes)**: https://us.posthog.com/project/404035/insights/RV28v1ks
- **Onboarding funnel (shown → completed)**: https://us.posthog.com/project/404035/insights/so9tzc4A
- **AI recommendations & movie interactions (server-side)**: https://us.posthog.com/project/404035/insights/43cf17G9
- **Discover search & refinement activity**: https://us.posthog.com/project/404035/insights/LKW6Oxfr

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
