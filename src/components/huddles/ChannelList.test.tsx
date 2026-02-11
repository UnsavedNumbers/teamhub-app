import { describe, test, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ChannelList from './ChannelList'

const createMockChannel = (id: string, name: string) =>
  ({
    id,
    data: { name },
    state: { unreadCount: 0 },
    on: vi.fn(),
    off: vi.fn(),
  }) as never

describe('ChannelList', () => {
  test('renders team channels', () => {
    const channels = [createMockChannel('c1', 'Team A')]
    render(
      <ChannelList
        onChannelSelect={vi.fn()}
        selectedChannel={null}
        teamChannels={channels}
        orgChannels={[]}
        dmChannels={[]}
      />
    )
    expect(screen.getByText('Team A')).toBeInTheDocument()
  })

  test('calls onChannelSelect when channel clicked', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    const channel = createMockChannel('c1', 'Team A')
    render(
      <ChannelList
        onChannelSelect={onSelect}
        selectedChannel={null}
        teamChannels={[channel]}
        orgChannels={[]}
        dmChannels={[]}
      />
    )
    await user.click(screen.getByText('Team A'))
    expect(onSelect).toHaveBeenCalledWith(channel)
  })
})
