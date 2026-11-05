# ChibiDink

Fair queues for real-life friendly pickleball sessions, with collectible chibi characters.
This repo currently implements **Phase 1 — Functional Queue** from the product spec.

```
server/   ASP.NET Core 10 API · EF Core + PostgreSQL · SignalR · Identity
web/      React 19 · TypeScript · Vite · Tailwind 4 · TanStack Query · Zustand · Motion
```

## Run it locally

1. **Database** — Supabase (hosted PostgreSQL). The connection is `ConnectionStrings:DefaultConnection` in
   `server/src/ChibiDink.Api/appsettings.json`. It uses Supabase's **session pooler** host
   (`aws-0-<region>.pooler.supabase.com`, username `postgres.<project-ref>`), because the direct `db.<ref>.supabase.co`
   host is IPv6-only on the free plan. The API creates the tables itself.
2. **API** — applies migrations on startup in Development:
   ```sh
   cd server
   dotnet run --project src/ChibiDink.Api        # http://localhost:5299
   ```
3. **Web** — proxies `/api` and `/hubs` to the API:
   ```sh
   cd web
   npm install
   npm run dev                                     # http://localhost:5173
   ```
4. Sign in with a demo account (created automatically in Development):

   | Account | Password | Role |
   |---|---|---|
   | `organizer@chibidink.test` | `Dink1234` | Organizer of **Demo Open Play** (code `DINK22`) |
   | `mia@`, `rafa@`, `elle@`, `lucas@`, `nora@`, `evan@`, `zoe@`, `max@chibidink.test` | `Dink1234` | Players, already in the queue |

   As the organizer, open the session → **Manage** → **Start session**; both courts fill. Sign in as a player in a
   private window to accept the match and report a score. Turn seeding off with `Database:SeedDemoData: false`.

Tests: `cd server && dotnet test` (domain rules, scoring, and matchmaking fairness).

## What works

- Register / sign in (ASP.NET Identity bearer tokens, rate-limited)
- Create a session: title, location, time, singles/doubles, 1–6 courts, rules
- Join by 6-character code, shareable link, or QR code; guests can preview the invite
- Shared waiting pool for all courts; players queue or rest themselves
- Automatic matchmaking (background service) plus **Fill open courts now**
- Match lifecycle: `AwaitingConfirmation → Ready → Playing → PendingResult → Completed` (+ `Cancelled`, `Voided`)
- Accept / decline with a countdown; decliners step out, everyone else keeps their queue spot
- Score entry validated against "game to N, win by M"; verified by the other team or the organizer, processed once
- Organizer overrides: manual matches, swap players, move courts, cancel, void, court availability, skill estimates — all audited
- Court VS dashboard (grid + full-screen per court), live via SignalR
- Session and lifetime records: games, wins, losses, win rate, singles/doubles split, recent matches
- 3D chibi characters (three.js / React Three Fiber): live and draggable on Character, Home, Profile and item
  previews; cached 3D snapshots on court cards and lists (one shared WebGL renderer). Falls back to the drawn
  SVG character when WebGL isn't available.
- Progression and cosmetics (Phase 3): XP and levels, coins, a reward ledger (each reward paid once), outfits,
  paddles, paddle effects, character auras, Items and Shop screens. All cosmetic; nothing affects matchmaking.
- The character is a living paddle (the "Sprout" design). Customize body colour, edge guard, eyes, eye colour, brows,
  mouth, cheeks, face mark, grip colour, grip wrap, handle shape and end cap; the face is drawn once and shared by 2D and 3D
- Outfits are themed gear sets (Basic, Chef, Cowboy, Ninja, Knight, Pirate, Wizard, Royal, Angel, Demon, Ranger, Viking,
  Cleric, Bard, Samurai), plus two Mythic premium skins (Inferno Dragon, Void Reaper). Hats and helmets are
  shaped from the head's own outline so they fit. Legendary auras include Celestial and Phoenix
- Backgrounds (Locker Room, Sunset Court, Tropical Beach, Neon Arena, Galaxy, and premium Dragon's Lair and Void Realm)
  behind the character. Outfits, scenes, auras and effects are equipped in the Wardrobe on the Character screen: a hat, a held item, and
  sometimes a cape. Effects glow on the held item. Paddle items are retired from the app
- Notification bell for your current match, session bottom nav (Courts, Queue, My Games, Session)

## Architecture

```
Api  ──►  Infrastructure  ──►  Application  ──►  Domain
(HTTP,     (EF Core, Postgres,   (use cases,        (entities, rules,
 SignalR,   repositories,         ports/interfaces,  matchmaking engine;
 worker)    advisory locks)       DTOs)              no dependencies)
```

### Where the SOLID principles live

| Principle | Example |
|---|---|
| **Single responsibility** | `SessionService` (configure), `QueueService` (join/rest), `MatchService` (one match), `MatchmakingService` (fill courts), `SessionQueries` (read views) are separate. `SessionCommandRunner` owns lock → load → save → notify so services don't repeat it. |
| **Open/closed** | Verified matches fan out to `IMatchCompletedHandler`s. XP, coins and achievements (Phase 3) are new handlers — `MatchService` doesn't change. New scoring formats implement `IScoringRule`. |
| **Liskov substitution** | Any `IMatchmakingStrategy` can replace `FairRotationMatchmaker`; tests use the same contract. |
| **Interface segregation** | Small ports: `IClock`, `ICurrentUser`, `ISessionNotifier`, `IMatchmakingScheduler`, `IAuditLog`, one repository per aggregate. |
| **Dependency inversion** | Application defines ports; Infrastructure (EF/Postgres) and Api (SignalR, HTTP user) implement them. Domain references nothing. |

**OOP / rich domain model:** entities guard their own invariants. `Match` owns its state machine and keeps courts
and participants consistent on every transition; setters are private, so services can't skip a rule.

### Fairness and safety

- Matchmaker priority: long-waiting players (past the protection window) → fewest games → longest wait.
  The front-of-line player is always included, so nobody is skipped forever. Among nearby candidates it prefers
  balanced teams and fresh partner/opponent pairings, but never leaves a court empty for a perfect balance.
- Every change to a session runs inside a transaction holding a PostgreSQL advisory lock for that session.
- Database backstops: unique partial indexes allow **one live match per player** and **one live match per court**;
  `xmin` optimistic concurrency stops a result from being counted twice.

## Not yet built (later phases)

- Phase 2: fixed/organizer-assigned partnerships
- Phase 3 polish: artist-made GLB character models (current 3D characters are built from shapes in code and read
  the same appearance + loadout data, so models can be swapped in later)
- Phase 4: Log My Play, Pickle Drills mini-games
- Phase 5: leaderboards, achievements, admin moderation UI, deployment

Bearer tokens currently last 7 days without refresh-token rotation; add `/refresh` before a public launch.
