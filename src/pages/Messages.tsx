
import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useUserContext } from '../hooks/useUserContext'
import { 
  getAnnouncements, 
  getMessages, 
  createMessage, 
  createAnnouncement, 
  subscribeToMessages,
  type Announcement, 
  type Message 
} from '../data/services/messagesService'
import { getTeamsForParent, getTeams } from '../data/services/teamsService'
import PortalLayout from '../components/portal/PortalLayout'
import PortalHeader from '../components/portal/PortalHeader'
import { PageTitle, SectionHeader, CardTitle } from '../components/portal/Typography'
import Card from '../components/portal/Card'
import Button from '../components/portal/Button'
import Icon from '../components/portal/Icon'
import CreateAnnouncementModal from '../components/portal/CreateAnnouncementModal'

interface Team {
  id: string
  name: string
}

type Tab = 'announcements' | 'chat'

export default function Messages() {
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('announcements')
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { user, profile } = useAuth()
  const { context, isReady } = useUserContext()
  const [searchParams] = useSearchParams()
  const hasInitializedTeamRef = useRef(false)

  // Parse query parameter on mount to restore team selection
  useEffect(() => {
    if (!hasInitializedTeamRef.current) {
      const teamParam = searchParams.get('team')
      if (teamParam && !selectedTeam) {
        setSelectedTeam(teamParam)
      }
      hasInitializedTeamRef.current = true
    }
  }, [searchParams, selectedTeam])

  // Safe computation: only check roles when context is ready
  // Valid roles: 'parent', 'coach', 'org_admin'
  const canCreateAnnouncements = isReady && (
    context.roles.includes('coach') || 
    context.roles.includes('org_admin') || 
    profile?.isPlatformAdmin === true
  )

  const fetchTeams = useCallback(async () => {
    if (!isReady) return

    // Use the service to get teams based on user role
    // Safe access: isReady guarantees context.roles is an array
    const isParent = context.roles?.includes('parent') && !context.roles?.includes('org_admin')
    
    // Admin/Coach can see all teams sometimes, or just their teams.
    // For now, logic from before:
    if (isParent) {
      const { data, error } = await getTeamsForParent(context)
      if (!error && data) {
        setTeams(data.map(t => ({ id: t.id, name: t.name })))
        // Auto-select first team if none selected (use functional form to avoid dependency)
        setSelectedTeam(prev => {
          if (!prev && data.length > 0) {
            return data[0].id
          }
          return prev
        })
      }
    } else {
      const { data, error } = await getTeams(context, { activeOnly: true })
      if (!error && data) {
        setTeams(data.map(t => ({ id: t.id, name: t.name })))
        // Auto-select first team if none selected (use functional form to avoid dependency)
        setSelectedTeam(prev => {
          if (!prev && data.length > 0) {
            return data[0].id
          }
          return prev
        })
      }
    }
    setLoading(false)
  }, [context, isReady])

  const fetchAnnouncementsData = useCallback(async () => {
    if (!isReady || !selectedTeam) return

    const { data, error } = await getAnnouncements(context, { teamId: selectedTeam, includeOrgWide: true })
    
    if (!error && data) {
      // Ensure all announcements have required properties with safe defaults
      const safeAnnouncements = (data as Announcement[]).map(ann => ({
        ...ann,
        priority: ann.priority || 'normal' as const,
        title: ann.title || '',
        content: ann.content || '',
        created_at: ann.created_at || new Date().toISOString(),
        updated_at: ann.updated_at || new Date().toISOString(),
      }))
      setAnnouncements(safeAnnouncements)
    } else {
      setAnnouncements([])
    }
  }, [context, isReady, selectedTeam])

  const fetchMessagesData = useCallback(async () => {
    if (!isReady || !selectedTeam) return
    const { data, error } = await getMessages(selectedTeam)
    if (!error && data) {
      // Ensure all messages have required properties with safe defaults
      const safeMessages = data.map(msg => ({
        ...msg,
        content: msg.content || '',
        created_at: msg.created_at || new Date().toISOString(),
      }))
      setMessages(safeMessages)
    } else {
      setMessages([])
    }
  }, [isReady, selectedTeam])

  useEffect(() => {
    fetchTeams()
  }, [fetchTeams])

  useEffect(() => {
    if (!selectedTeam) return

    if (tab === 'announcements') {
      fetchAnnouncementsData()
    } else if (tab === 'chat') {
      fetchMessagesData()
      // Subscribe to realtime messages
      const subscription = subscribeToMessages(selectedTeam, (incomingMsg) => {
          setMessages(prev => [...prev, incomingMsg])
      })
      return () => {
          subscription.unsubscribe()
      }
    }
  }, [selectedTeam, tab, fetchAnnouncementsData, fetchMessagesData])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSendMessage() {
    if (!newMessage.trim() || !selectedTeam || !user) return
    
    setSending(true)
    try {
        const { data, error } = await createMessage(newMessage.trim(), selectedTeam, user.id)
        if (!error && data) {
             setNewMessage('')
             // If local update needed immediately (before realtime):
             // setMessages(prev => [...prev, data])
             // But realtime should handle it usually. 
             // If duplicate messages appear, remove this local update or debounce.
             // Usually better to let Realtime handle it to verify server receipt.
             // However, for better UX with latency, we might do optimistic update.
             // Since we have subscribeToMessages, I'll rely on that or duplicate check.
             // Let's rely on subscription to add it.
        } else {
            console.error(error)
        }
    } catch (e) {
        console.error(e)
    } finally {
        setSending(false)
    }
  }

  async function handleCreateAnnouncement(title: string, content: string, priority: 'normal' | 'urgent', teamId: string) {
      if (!user) return
      await createAnnouncement(title, content, priority, teamId, user.id)
      // Refresh announcements if valid
      if (teamId === selectedTeam) {
          fetchAnnouncementsData()
      }
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
  
  // Show loading state if context is not ready or initial data is loading
  if (!isReady || loading) {
    return (
      <PortalLayout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-slate-900 dark:border-white"></div>
        </div>
      </PortalLayout>
    )
  }

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

            {canCreateAnnouncements && (
                <div className="p-3 border-t border-slate-100 dark:border-slate-800">
                <Button variant="primary" className="w-full" onClick={() => setIsCreateModalOpen(true)}>
                    <Icon name="campaign" size="text-sm" className="mr-2" />
                    New Announcement
                </Button>
                </div>
            )}
          </div>

          <div className="flex-1 flex flex-col relative h-full overflow-hidden">
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
                <div className="bg-white dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex-shrink-0">
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

                <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
                  {tab === 'announcements' ? (
                    <div className="space-y-4 max-w-3xl mx-auto">
                      {announcements.length === 0 ? (
                        <Card className="text-center py-12">
                          <p className="text-slate-500 dark:text-slate-400">No announcements yet.</p>
                        </Card>
                      ) : (
                        announcements.map((ann) => {
                          // Safe access: ensure priority exists and is a string
                          const priority = (ann.priority || 'normal').toLowerCase()
                          const detailUrl = `/portal/messages/${ann.id}${selectedTeam ? `?team=${selectedTeam}` : ''}`
                          return (
                          <Link
                            key={ann.id}
                            to={detailUrl}
                            className="block"
                          >
                            <Card
                              className={`p-6 border-l-4 transition-all hover:shadow-2xl hover:shadow-[#137fec]/5 cursor-pointer ${
                                priority === 'urgent' ? 'border-red-500' : 'border-[#137fec]'
                              }`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-0.5 text-xs font-bold uppercase tracking-widest rounded ${
                                    (ann.author?.role || 'admin') === 'coach'
                                      ? 'bg-[#137fec]/10 text-[#137fec]'
                                      : 'bg-purple-500/10 text-purple-500 dark:text-purple-400'
                                  }`}>
                                    {ann.author?.role || 'Admin'}
                                  </span>
                                  <CardTitle className="text-lg">{ann.title}</CardTitle>
                                </div>
                                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{formatDate(ann.created_at)}</span>
                              </div>

                            </Card>
                          </Link>
                          )
                        })
                      )}
                    </div>
                  ) : (
                    <div className="max-w-3xl mx-auto space-y-4 pb-2">
                      {messages.length === 0 && (
                        <Card className="text-center py-8 mb-4">
                          <Icon name="chat" size="text-4xl" className="text-slate-300 mb-2" />
                          <p className="text-slate-500 dark:text-slate-400 text-sm">Start a conversation with your team</p>
                        </Card>
                      )}
                      {messages.map((msg) => {
                        // Safe access: guard against undefined user and author
                        const isMe = user?.id && msg.author_id === user.id
                        const role = msg.author?.role || 'parent'
                        const authorEmail = msg.author?.email || ''
                        return (
                          <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xs md:max-w-md rounded-xl px-4 py-2 shadow-sm ${
                              isMe
                                ? 'bg-[#137fec] text-white rounded-br-sm'
                                : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white rounded-bl-sm border border-slate-100 dark:border-slate-700'
                            }`}>
                              {!isMe && (
                                <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${
                                    role === 'coach' ? 'text-[#137fec]' : 'text-slate-400'
                                }`}>
                                  {role === 'coach' ? 'Coach' : (authorEmail ? authorEmail.split('@')[0] : 'User')}
                                </p>
                              )}
                              <p className="font-bold whitespace-pre-wrap leading-tight">{msg.content}</p>
                              <p className={`text-[10px] mt-1 font-bold uppercase tracking-widest text-right ${
                                isMe ? 'text-blue-100' : 'text-slate-300'
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
                  <div className="bg-white dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 p-4 flex-shrink-0">
                    <div className="max-w-3xl mx-auto">
                      <div className="flex gap-2 mb-3 flex-wrap">
                        {quickReplies.map((reply) => (
                          <button
                            key={reply.text}
                            onClick={() => setNewMessage(reply.text)}
                            className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-1 transition-colors"
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
                          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                          placeholder="Type a message..."
                          className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-slate-800 dark:text-white placeholder:text-slate-400 font-bold focus:ring-2 focus:ring-[#137fec]/20 focus:border-[#137fec] outline-none transition-all"
                        />
                        <button
                          onClick={handleSendMessage}
                          disabled={sending || !newMessage.trim()}
                          className="w-10 h-10 bg-[#137fec] text-white rounded-full flex items-center justify-center hover:bg-[#137fec]/90 disabled:opacity-50 transition-all transform active:scale-95"
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

        <CreateAnnouncementModal 
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            onSubmit={handleCreateAnnouncement}
            teams={teams}
            selectedTeamId={selectedTeam}
        />
      </div>
    </>
  )
}
