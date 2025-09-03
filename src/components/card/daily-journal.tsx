'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ClassifiedData } from '@/lib/data-classification'
import { 
  BookOpen, 
  Target, 
  Lightbulb, 
  MessageSquare,
  Edit3,
  Trash2,
  Plus
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface DailyJournalProps {
  userId: string
  date: string
  journalEntries: Array<{
    id?: string
    entry_type: string
    content: string
    category: string
    created_at?: string
  }>
  onDataUpdate: () => void
}

interface JournalEntry {
  id?: string
  entry_type: string
  content: string
  category: string
  created_at?: string
}

const ENTRY_TYPE_CONFIG = {
  tip: { title: 'Tips & Advice', icon: Lightbulb, color: 'text-yellow-400' },
  note: { title: 'Notes', icon: MessageSquare, color: 'text-blue-400' },
  goal: { title: 'Goals', icon: Target, color: 'text-green-400' },
  reflection: { title: 'Reflections', icon: BookOpen, color: 'text-purple-400' },
  advice: { title: 'Advice', icon: Lightbulb, color: 'text-orange-400' }
}

export function DailyJournal({ userId, date, journalEntries, onDataUpdate }: DailyJournalProps) {
  const [isAddingEntry, setIsAddingEntry] = useState(false)
  const [newEntryType, setNewEntryType] = useState('note')
  const [newEntryContent, setNewEntryContent] = useState('')
  const [editingEntry, setEditingEntry] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [dbJournalEntries, setDbJournalEntries] = useState<JournalEntry[]>([])

  // Fetch journal entries from database
  useEffect(() => {
    const fetchJournalEntries = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('daily_journal')
          .select('*')
          .eq('user_id', userId)
          .eq('journal_date', date)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error fetching journal entries:', error)
          return
        }

        setDbJournalEntries(data || [])
      } catch (error) {
        console.error('Error fetching journal entries:', error)
      }
    }

    fetchJournalEntries()
  }, [userId, date])

  // Use only database entries (since we're not passing journal entries from StructuredCardData anymore)
  const allJournalEntries = useMemo(() => {
    return dbJournalEntries.sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
      return dateB - dateA
    })
  }, [dbJournalEntries])

  const handleAddEntry = async () => {
    if (!newEntryContent.trim()) return

    try {
      const supabase = createClient()
      
      const { error } = await supabase
        .from('daily_journal')
        .insert({
          user_id: userId,
          journal_date: date,
          entry_type: newEntryType,
          category: 'lifestyle',
          content: newEntryContent.trim()
        })

      if (error) {
        console.error('Error adding journal entry:', error)
        return
      }

      setNewEntryContent('')
      setNewEntryType('note')
      setIsAddingEntry(false)
      onDataUpdate()
    } catch (error) {
      console.error('Error adding journal entry:', error)
    }
  }

  const handleEditEntry = async (entryId: string) => {
    if (!editContent.trim()) return

    try {
      const supabase = createClient()
      
      const { error } = await supabase
        .from('daily_journal')
        .update({
          content: editContent.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', entryId)

      if (error) {
        console.error('Error updating journal entry:', error)
        return
      }

      setEditingEntry(null)
      setEditContent('')
      onDataUpdate()
    } catch (error) {
      console.error('Error updating journal entry:', error)
    }
  }

  const handleDeleteEntry = async (entryId: string) => {
    try {
      const supabase = createClient()
      
      const { error } = await supabase
        .from('daily_journal')
        .delete()
        .eq('id', entryId)

      if (error) {
        console.error('Error deleting journal entry:', error)
        return
      }

      onDataUpdate()
    } catch (error) {
      console.error('Error deleting journal entry:', error)
    }
  }

  const JournalEntry = ({ entry }: { entry: any }) => {
    const config = ENTRY_TYPE_CONFIG[entry.entry_type as keyof typeof ENTRY_TYPE_CONFIG]
    const Icon = config?.icon || MessageSquare
    const isEditing = editingEntry === entry.id

    return (
      <div className="bg-card/60 backdrop-blur-sm border border-line/40 rounded-lg p-4 hover:border-primary/30 transition-colors">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 flex-shrink-0 ${config?.color || 'text-primary'}`} />
            <span className="text-sm font-medium text-muted-foreground">
              {config?.title || 'Note'}
            </span>
          </div>
          
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => {
                setEditingEntry(entry.id)
                setEditContent(entry.content)
              }}
              className="p-1 hover:bg-primary/10 rounded transition-colors"
              title="Edit"
            >
              <Edit3 className="h-3 w-3 text-muted-foreground hover:text-primary" />
            </button>
            <button
              onClick={() => handleDeleteEntry(entry.id)}
              className="p-1 hover:bg-destructive/10 rounded transition-colors"
              title="Delete"
            >
              <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
            </button>
          </div>
        </div>
        
        <div className="text-sm leading-relaxed">
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[80px] resize-none"
                placeholder="Edit your journal entry..."
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleEditEntry(entry.id)}
                  className="text-xs"
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingEntry(null)
                    setEditContent('')
                  }}
                  className="text-xs"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="whitespace-pre-wrap">{entry.content}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button
          size="sm"
          onClick={() => setIsAddingEntry(!isAddingEntry)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Entry
        </Button>
      </div>

      {/* Add new entry form */}
      {isAddingEntry && (
        <div className="bg-card/60 backdrop-blur-sm border border-line/40 rounded-lg p-4 space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Entry Type
              </label>
              <select
                value={newEntryType}
                onChange={(e) => setNewEntryType(e.target.value)}
                className="w-full bg-background border border-line rounded-md px-3 py-2 text-sm"
              >
                <option value="note">Note</option>
                <option value="tip">Tip</option>
                <option value="goal">Goal</option>
                <option value="reflection">Reflection</option>
                <option value="advice">Advice</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Content
            </label>
            <Textarea
              value={newEntryContent}
              onChange={(e) => setNewEntryContent(e.target.value)}
              placeholder="Write your journal entry..."
              className="min-h-[100px] resize-none"
            />
          </div>
          
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleAddEntry}
              disabled={!newEntryContent.trim()}
            >
              Add Entry
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setIsAddingEntry(false)
                setNewEntryContent('')
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Journal entries */}
      <div className="space-y-4">
        {allJournalEntries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No journal entries yet for this date.</p>
            <p className="text-sm">Add your thoughts, goals, or notes here.</p>
          </div>
        ) : (
          allJournalEntries.map((entry) => (
            <JournalEntry key={entry.id} entry={entry} />
          ))
        )}
      </div>
    </div>
  )
}
