import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

interface Team {
  id: string
  name: string
}

interface Announcement {
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
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true) // Kept for future use or remove if strict
  const [sending, setSending] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { user, profile } = useAuth()

  useEffect(() => {
    fetchTeams()
  }, [profile])

  useEffect(() => {
    if (selectedTeam && tab === 'announcements') fetchAnnouncements()
    if (selectedTeam && tab === 'chat') fetchMessages()
  }, [selectedTeam, tab])

  useEffect(() => {
    if (!selectedTeam || tab !== 'chat') return

    const channel = supabase
      .channel(`messages-${selectedTeam}`)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `team_id=eq.${selectedTeam}` },
        () => fetchMessages()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [selectedTeam, tab])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function fetchTeams() {
    // Get teams from children's memberships for parents, or all for staff
    if (profile?.role === 'parent' && profile.family_id) {
      const { data } = await supabase
        .from('team_memberships')
        .select('team:teams(id, name)')
        .eq('status', 'active')
      
      const uniqueTeams = new Map()
      data?.forEach((d: { team: Team }) => {
        if (d.team) uniqueTeams.set(d.team.id, d.team)
      })
      setTeams(Array.from(uniqueTeams.values()))
    } else {
      const { data } = await supabase.from('teams').select('id, name')
      setTeams((data as Team[]) || [])
    }
    setLoading(false)
  }

  async function fetchAnnouncements() {
    const { data } = await supabase
      .from('announcements')
      .select('*, author:users(email, role), team:teams(name)')
      .eq('team_id', selectedTeam || '')
      .order('created_at', { ascending: false })
      .limit(20)

    setAnnouncements((data as unknown as Announcement[]) || [])
  }

  async function fetchMessages() {
    const { data } = await supabase
      .from('messages')
      .select('*, author:users(email, role)')
      .eq('team_id', selectedTeam || '')
      .order('created_at', { ascending: true })
      .limit(100)

    setMessages((data as unknown as Message[]) || [])
  }

  async function sendMessage() {
    if (!newMessage.trim() || !selectedTeam || !user) return
    
    setSending(true)
    await supabase.from('messages').insert({
      team_id: selectedTeam,
      author_id: user.id,
      content: newMessage.trim(),
    } as never)

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
  
  if (loading) return <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-500">Loading team messages...</div>

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <Link to="/portal/dashboard" className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white mb-4">
            <span className="material-symbols-rounded">arrow_back</span>
            <span className="font-bold">TeamHub</span>
          </Link>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">Team Messaging</h1>
          <p className="text-xs text-slate-500">Focused Athletic Chat</p>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 px-2">All Chats</p>
          {teams.map((team) => (
            <button
              key={team.id}
              onClick={() => setSelectedTeam(team.id)}
              className={`w-full text-left px-3 py-2 rounded-lg mb-1 transition-colors ${
                selectedTeam === team.id
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              <span className="font-medium">{team.name}</span>
            </button>
          ))}       
        </div>

        <div className="p-3 border-t border-slate-200 dark:border-slate-700">
          <button className="w-full py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2">
            <span className="material-symbols-rounded">edit_square</span> New Message
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {!selectedTeam ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <span className="material-symbols-rounded text-6xl text-slate-300 mb-4 block">chat_bubble</span>
              <h2 className="text-xl font-bold text-slate-700 dark:text-white mb-2">Select a Team</h2>
              <p className="text-slate-500">Choose a team to view messages</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-slate-900 dark:text-white">{teams.find(t => t.id === selectedTeam)?.name}</h2>
                <div className="flex gap-2">
                  <button onClick={() => setTab('announcements')} className={`px-4 py-1.5 rounded-lg text-sm font-medium ${tab === 'announcements' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'text-slate-500 hover:bg-slate-100'}`}>
                    Announcements
                  </button>
                  <button onClick={() => setTab('chat')} className={`px-4 py-1.5 rounded-lg text-sm font-medium ${tab === 'chat' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'text-slate-500 hover:bg-slate-100'}`}>
                    Team Chat
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {tab === 'announcements' ? (
                <div className="space-y-4 max-w-2xl">
                  {announcements.length === 0 ? (
                    <p className="text-slate-500 text-center py-8">No announcements yet.</p>
                  ) : (
                    announcements.map((ann) => (
                      <div key={ann.id} className={`bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border-l-4 ${ann.priority === 'urgent' ? 'border-red-500' : 'border-blue-500'}`}>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 text-xs font-bold uppercase rounded ${ann.author.role === 'coach' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                              {ann.author.role}
                            </span>
                            <h3 className="font-bold text-slate-900 dark:text-white">{ann.title}</h3>
                          </div>
                          <span className="text-xs text-slate-400">{formatDate(ann.created_at)}</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300">{ann.content}</p>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="max-w-2xl mx-auto space-y-4">
                  {messages.map((msg) => {
                    const isMe = msg.author_id === user?.id
                    return (
                      <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs md:max-w-md rounded-2xl px-4 py-2 ${isMe ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white rounded-bl-sm'}`}>
                          {!isMe && <p className="text-xs font-bold text-blue-500 mb-1">{msg.author.role === 'coach' ? 'Coach' : 'Parent'}</p>}
                          <p>{msg.content}</p>
                          <p className={`text-xs mt-1 ${isMe ? 'text-blue-200' : 'text-slate-400'}`}>{formatTime(msg.created_at)}</p>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Chat Input */}
            {tab === 'chat' && (
              <div className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-4">
                <div className="max-w-2xl mx-auto">
                  <div className="flex gap-2 mb-3 flex-wrap">
                    {quickReplies.map((reply) => (
                      <button key={reply.text} onClick={() => setNewMessage(reply.text)} className="px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-full text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 flex items-center gap-1">
                        <span className="material-symbols-rounded text-[14px]">{reply.icon}</span>
                        {reply.text}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && sendMessage()} placeholder="Type a message..." className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 border-0 rounded-full text-slate-800 dark:text-white placeholder-slate-400" />
                    <button onClick={sendMessage} disabled={sending || !newMessage.trim()} className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 disabled:opacity-50">
                      <span className="material-symbols-rounded text-[20px]">send</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
