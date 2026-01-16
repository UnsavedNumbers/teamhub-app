import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useUserContext } from '../hooks/useUserContext'
import { getAnnouncements, type FakeAnnouncement } from '../data/services/messagesService'
import { getTeamsForParent, getTeams } from '../data/services/teamsService'
import PortalLayout from '../components/portal/PortalLayout'
import PortalHeader from '../components/portal/PortalHeader'
import { PageTitle, SectionHeader, CardTitle } from '../components/portal/Typography'
import Card from '../components/portal/Card'
import Button from '../components/portal/Button'
import Icon from '../components/portal/Icon'

interface Team {
  id: string
  name: string
}

interface DisplayAnnouncement {
  id: string
  title: string
  content: string
  priority: string
  created_at: string
  author: { email: string; role: string }
  team: { name: string }
}

interface Message {
  id: string
  content: string
  created_at: string
  author_id: string
  author: { email: string; role: string }
}

type Tab = 'announcements' | 'chat'

export default function Messages() {
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('announcements')
  const [announcements, setAnnouncements] = useState<DisplayAnnouncement[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { user, profile } = useAuth()
  const { context, isReady } = useUserContext()

  const fetchTeams = useCallback(async () => {
    if (!isReady) return

    // Use the service to get teams based on user role
    const isParent = context.roles.includes('parent') && !context.roles.includes('org_admin')
    
    if (isParent) {
      const { data, error } = await getTeamsForParent(context)
      if (!error) {
        setTeams(data.map(t => ({ id: t.id, name: t.name })))
      }
    } else {
      const { data, error } = await getTeams(context, { activeOnly: true })
      if (!error) {
        setTeams(data.map(t => ({ id: t.id, name: t.name })))
      }
    }
    setLoading(false)
  }, [context, isReady])

  const fetchAnnouncements = useCallback(async () => {
    if (!isReady || !selectedTeam) return

    const { data, error } = await getAnnouncements(context, { teamId: selectedTeam, includeOrgWide: true })
    
    if (!error) {
      // Transform to display format
      const displayAnnouncements: DisplayAnnouncement[] = data.map(ann => ({
        id: ann.id,
        title: ann.title,
        content: ann.body,
        priority: ann.type === 'emergency' ? 'urgent' : 'normal',
        created_at: ann.sent_at ?? ann.created_at,
        author: { 
          email: '', 
          role: ann.audience === 'team' ? 'coach' : 'admin' 
        },
        team: { name: getTeamName(ann.team_id) },
      }))
      setAnnouncements(displayAnnouncements)
    }
  }, [context, isReady, selectedTeam])

  // Helper to get team name
  const getTeamName = (teamId: string | null): string => {
    if (!teamId) return 'Organization'
    const team = teams.find(t => t.id === teamId)
    return team?.name ?? 'Team'
  }

  useEffect(() => {
    fetchTeams()
  }, [fetchTeams])

  useEffect(() => {
    if (selectedTeam && tab === 'announcements') fetchAnnouncements()
    // Note: Chat functionality requires real-time Supabase subscription
    // For fake data, we'll show a placeholder
    if (selectedTeam && tab === 'chat') setMessages([])
  }, [selectedTeam, tab, fetchAnnouncements])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    if (!newMessage.trim() || !selectedTeam || !user) return
    
    setSending(true)
    // In fake data mode, just add the message locally
    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      content: newMessage.trim(),
      created_at: new Date().toISOString(),
      author_id: user.id,
      author: { email: user.email ?? '', role: 'parent' },
    }
    setMessages(prev => [...prev, newMsg])
    setNewMessage('')
    setSending(false)
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const quickReplies = [
    { icon: 'directions_run', text: 'Running Late' },
    { icon: 'help', text: 'Question' },
    { icon: 'check_circle', text: 'Be there soon' },
    { icon: 'cancel', text: "Can't make it" },
    { icon: 'location_on', text: 'Where are you?' }
  ]
  
  if (loading) return (
    <>
      <PortalHeader />
      <PortalLayout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-slate-900 dark:border-white"></div>
        </div>
      </PortalLayout>
    </>
  )

  return (
    <>
      <PortalHeader />
      <div className="min-h-screen bg-background-light dark:bg-background-dark font-impact text-slate-900 dark:text-slate-100 antialiased relative">
        <div 
          className="fixed inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.02] z-[-1]"
          style={{
            backgroundImage: 'linear-gradient(to right, #f3f4f6 1px, transparent 1px), linear-gradient(to bottom, #f3f4f6 1px, transparent 1px)',
            backgroundSize: '100px 100px',
          }}
        />
        <div className="flex h-screen pt-16">
          <div className="w-64 bg-white dark:bg-slate-900/50 border-r border-slate-100 dark:border-slate-800 flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <PageTitle className="text-2xl mb-2">Messages</PageTitle>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Team messaging</p>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              <SectionHeader className="mb-4 px-2">All Chats</SectionHeader>
              {teams.map((team) => (
                <button
                  key={team.id}
                  onClick={() => setSelectedTeam(team.id)}
                  className={`w-full text-left px-3 py-2 rounded mb-1 transition-colors font-bold ${
                    selectedTeam === team.id
                      ? 'bg-[#137fec]/10 text-[#137fec] dark:text-[#137fec]'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {team.name}
                </button>
              ))}       
            </div>

            <div className="p-3 border-t border-slate-100 dark:border-slate-800">
              <Button variant="primary" className="w-full">
                <Icon name="edit_square" size="text-sm" className="mr-2" />
                New Message
              </Button>
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            {!selectedTeam ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Icon name="chat_bubble" size="text-6xl" className="text-slate-300 mb-4" />
                  <CardTitle className="mb-2">Select a Team</CardTitle>
                  <p className="text-slate-500 dark:text-slate-400">Choose a team to view messages</p>
                </div>
              </div>
            ) : (
              <>
                <div className="bg-white dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{teams.find(t => t.id === selectedTeam)?.name}</CardTitle>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setTab('announcements')}
                        className={`px-4 py-1.5 rounded text-sm font-bold uppercase tracking-widest transition-colors ${
                          tab === 'announcements'
                            ? 'bg-[#137fec]/10 text-[#137fec]'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        Announcements
                      </button>
                      <button
                        onClick={() => setTab('chat')}
                        className={`px-4 py-1.5 rounded text-sm font-bold uppercase tracking-widest transition-colors ${
                          tab === 'chat'
                            ? 'bg-[#137fec]/10 text-[#137fec]'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        Team Chat
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                  {tab === 'announcements' ? (
                    <div className="space-y-4 max-w-2xl">
                      {announcements.length === 0 ? (
                        <Card className="text-center py-12">
                          <p className="text-slate-500 dark:text-slate-400">No announcements yet.</p>
                        </Card>
                      ) : (
                        announcements.map((ann) => (
                          <Card
                            key={ann.id}
                            className={`p-6 border-l-4 ${
                              ann.priority === 'urgent' ? 'border-red-500' : 'border-[#137fec]'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 text-xs font-bold uppercase tracking-widest rounded ${
                                  ann.author.role === 'coach'
                                    ? 'bg-[#137fec]/10 text-[#137fec]'
                                    : 'bg-purple-500/10 text-purple-500 dark:text-purple-400'
                                }`}>
                                  {ann.author.role}
                                </span>
                                <CardTitle className="text-lg">{ann.title}</CardTitle>
                              </div>
                              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{formatDate(ann.created_at)}</span>
                            </div>
                            <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{ann.content}</p>
                          </Card>
                        ))
                      )}
                    </div>
                  ) : (
                    <div className="max-w-2xl mx-auto space-y-4">
                      {messages.length === 0 && (
                        <Card className="text-center py-8 mb-4">
                          <Icon name="chat" size="text-4xl" className="text-slate-300 mb-2" />
                          <p className="text-slate-500 dark:text-slate-400 text-sm">Start a conversation with your team</p>
                        </Card>
                      )}
                      {messages.map((msg) => {
                        const isMe = msg.author_id === user?.id
                        return (
                          <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xs md:max-w-md rounded-xl px-4 py-2 ${
                              isMe
                                ? 'bg-[#137fec] text-white rounded-br-sm'
                                : 'bg-white dark:bg-slate-900/50 text-slate-800 dark:text-white rounded-bl-sm border border-slate-100 dark:border-slate-800'
                            }`}>
                              {!isMe && (
                                <p className="text-xs font-bold uppercase tracking-widest text-[#137fec] mb-1">
                                  {msg.author.role === 'coach' ? 'Coach' : 'Parent'}
                                </p>
                              )}
                              <p className="font-bold">{msg.content}</p>
                              <p className={`text-xs mt-1 font-bold uppercase tracking-widest ${
                                isMe ? 'text-blue-200' : 'text-slate-400'
                              }`}>
                                {formatTime(msg.created_at)}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {tab === 'chat' && (
                  <div className="bg-white dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 p-4">
                    <div className="max-w-2xl mx-auto">
                      <div className="flex gap-2 mb-3 flex-wrap">
                        {quickReplies.map((reply) => (
                          <button
                            key={reply.text}
                            onClick={() => setNewMessage(reply.text)}
                            className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-1"
                          >
                            <Icon name={reply.icon} size="text-sm" />
                            {reply.text}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-3">
                        <input
                          type="text"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                          placeholder="Type a message"
                          className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-full text-slate-800 dark:text-white placeholder:text-slate-400 font-bold"
                        />
                        <button
                          onClick={sendMessage}
                          disabled={sending || !newMessage.trim()}
                          className="w-10 h-10 bg-[#137fec] text-white rounded-full flex items-center justify-center hover:bg-[#137fec]/90 disabled:opacity-50"
                        >
                          <Icon name="send" size="text-sm" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
