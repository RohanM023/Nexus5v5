import type { Meta, StoryObj } from "@storybook/react";
import { MasterProfile } from "../components/master-profile";
import { NexusProvider } from "../components/nexus-provider";

const meta: Meta<typeof MasterProfile> = {
  title: "Widgets/MasterProfile",
  component: MasterProfile,
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
type Story = StoryObj<typeof MasterProfile>;

export const Default: Story = {
  args: {
    userId: "12345678-1234-5678-1234-567812345678",
    maxChampions: 12,
  },
};

export const CompactGrid: Story = {
  args: {
    userId: "12345678-1234-5678-1234-567812345678",
    maxChampions: 6,
  },
};
