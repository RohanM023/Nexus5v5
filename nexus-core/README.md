# @nexus5v5/core

React widget library for integrating Nexus-5v5 Draft Intelligence and Analytics into your application.

## Quick Start

### 1. Install

```bash
npm install @nexus5v5/core
# or
pnpm add @nexus5v5/core
```

### 2. Wrap with Provider

```tsx
import { NexusProvider } from "@nexus5v5/core";

function App() {
  return (
    <NexusProvider
      config={{
        apiBaseUrl: "https://api.nexus5v5.com",
        apiKey: "nxs_your-partner-api-key",
      }}
    >
      {/* Your app content + Nexus widgets */}
    </NexusProvider>
  );
}
```

### 3. Use Widgets

#### Draft Assistant

Self-contained draft board with real-time scoring and champion suggestions.

```tsx
import { DraftAssistant } from "@nexus5v5/core";

<DraftAssistant
  teamPuuids={["puuid1", "puuid2", "puuid3", "puuid4", "puuid5"]}
  mode="clash"
  onDraftComplete={(sessionId) => console.log("Draft done:", sessionId)}
/>;
```

#### Master Profile

Player profile with champion pool, mastery scores, and linked accounts.

```tsx
import { MasterProfile } from "@nexus5v5/core";

<MasterProfile userId="user-uuid" maxChampions={12} />;
```

#### Synergy Chart

Pairwise synergy heatmap for a set of champions.

```tsx
import { SynergyChart } from "@nexus5v5/core";

<SynergyChart champions={[1, 2, 3, 4, 5]} />;
```

## Hooks

### `useNexus()`

Access the API client and theme from any component inside `NexusProvider`.

```tsx
import { useNexus } from "@nexus5v5/core";

function MyComponent() {
  const { client, theme } = useNexus();
  // client.getProfile(userId), client.getDraftScores(sessionId), etc.
}
```

### `useNexusDraft()`

Full draft session lifecycle: create, pick, ban, and get scores/suggestions.

```tsx
import { useNexusDraft } from "@nexus5v5/core";

function MyDraftUI() {
  const { sessionId, scores, suggestions, createSession, pick, ban } =
    useNexusDraft();

  return (
    <div>
      <button onClick={() => createSession("clash")}>Start Draft</button>
      {/* render scores, suggestions, pick/ban buttons */}
    </div>
  );
}
```

## Theming

Widgets use CSS custom properties for theming. Override via the `theme` prop on `NexusProvider`:

```tsx
<NexusProvider
  config={{
    apiBaseUrl: "https://api.nexus5v5.com",
    apiKey: "nxs_...",
    theme: {
      primaryColor: "#3b82f6",
      backgroundColor: "#1e293b",
      fontFamily: '"Inter", sans-serif',
    },
  }}
>
  {/* Widgets inherit your theme */}
</NexusProvider>
```

Available tokens: `primaryColor`, `secondaryColor`, `backgroundColor`, `surfaceColor`, `textColor`, `textMutedColor`, `borderColor`, `successColor`, `warningColor`, `dangerColor`, `fontFamily`, `borderRadius`.

## API Key

Request a partner API key from the Nexus admin panel. Keys are passed via the `X-Nexus-Api-Key` header on all widget API requests.

## Development

```bash
# Install dependencies
npm install

# Dev mode (watch)
npm run dev

# Build library
npm run build

# Run Storybook
npm run storybook
```

## License

MIT
