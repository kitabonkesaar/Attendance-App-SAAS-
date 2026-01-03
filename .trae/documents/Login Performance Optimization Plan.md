# Optimize Admin Panel Login Speed

To achieve a login time of under 3 seconds (often < 100ms perceived latency), I will implement a "Stale-While-Revalidate" caching strategy. This allows the app to load instantly from local storage while verifying the session in the background.

## 1. Analysis & Bottlenecks
- **Current Flow**: `App.tsx` waits for `DB.getCurrentSession()` to complete before rendering anything. This involves:
  1. `supabase.auth.getSession()` (Network request)
  2. `supabase.from('profiles').select(...)` (Database query)
- **Bottleneck**: If the Supabase instance is "cold" (free tier) or network is slow, this sequence takes 2-5+ seconds, blocking the UI.
- **Mobile Login**: The extra lookup for mobile numbers adds another round trip.

## 2. Implementation Plan

### Phase 1: Local Caching (Instant Load)
I will modify `DB.getCurrentSession` and `App.tsx` to utilize `localStorage`.

1.  **Modify `App.tsx`**:
    -   **Read Cache on Mount**: Initialize `session` state directly from `localStorage.getItem('app_session')`.
    -   **Background Revalidation**: Continue running `DB.getCurrentSession()` in the background. If the returned session differs from the cache (or is null), update the state and `localStorage`.
    -   **Visual Feedback**: If loading from cache, show the dashboard immediately without a spinner.

2.  **Modify `lib/db.ts`**:
    -   Update `getCurrentSession`: When a fresh session is successfully fetched, save it to `localStorage.setItem('app_session', JSON.stringify(session))`.
    -   Update `handleLogout`: Clear the `app_session` from storage.

3.  **Modify `LoginView.tsx`**:
    -   When constructing the "Optimistic Session" (lines 79-85), immediately write it to `localStorage` so that if the user refreshes the page right after login, they don't lose access while waiting for the DB.

### Phase 2: Database Optimization
-   **Verify Indexes**: Ensure `employees(mobile)` and `profiles(id)` are efficiently queried (Already handled by Primary Keys/Unique constraints, but verified).

## 3. Expected Outcome
-   **Cold Start**: < 3s (Network dependent, but UI will show "Connecting..." instead of blank).
-   **Warm Start / Refresh**: **< 100ms** (Instant rendering from cache).
-   **Security**: The background check ensures that if a user's account is deleted or token revoked, they will be logged out automatically within seconds of the background check completing.
