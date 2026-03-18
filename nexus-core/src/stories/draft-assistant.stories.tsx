import type { Meta, StoryObj } from "@storybook/react";
import { DraftAssistant } from "../components/draft-assistant";
import { NexusProvider } from "../components/nexus-provider";

const meta: Meta<typeof DraftAssistant> = {
  title: "Widgets/DraftAssistant",
  component: DraftAssistant,
  decorators: [
    (Story) => (
      <NexusProvider
        config={{
          apiBaseUrl: "http://localhost:8000",
          apiKey: "nxs_storybook-test-key",
        }}
      >
        <Story />
      </NexusProvider>
    ),
  ],
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof DraftAssistant>;

export const Default: Story = {
  args: {
    mode: "clash",
    teamPuuids: ["puuid-1", "puuid-2", "puuid-3", "puuid-4", "puuid-5"],
  },
};

export const CustomMode: Story = {
  args: {
    mode: "custom",
    teamPuuids: ["puuid-1", "puuid-2"],
  },
};

export const ScrimMode: Story = {
  args: {
    mode: "scrim",
    teamPuuids: [],
  },
};
