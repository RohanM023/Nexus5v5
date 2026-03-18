import type { Meta, StoryObj } from "@storybook/react";
import { NexusProvider } from "../components/nexus-provider";
import { SynergyChart } from "../components/synergy-chart";

const meta: Meta<typeof SynergyChart> = {
  title: "Widgets/SynergyChart",
  component: SynergyChart,
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
type Story = StoryObj<typeof SynergyChart>;

export const FiveChampions: Story = {
  args: {
    champions: [1, 2, 3, 4, 5],
  },
};

export const ThreeChampions: Story = {
  args: {
    champions: [10, 20, 30],
  },
};

export const TooFew: Story = {
  args: {
    champions: [1],
  },
};
