import { createClient } from '@/lib/supabase/client';
import { ParsedConversation } from '@/types';

export interface HistoricalUpdate {
  date: string;
  type: 'activity' | 'mood' | 'energy' | 'note' | 'context';
  description: string;
  confidence: number;
  should_update_historical: boolean;
}

/**
 * Process historical updates from conversation parsing
 * Updates previous days' journal entries with new context
 */
export async function processHistoricalUpdates(
  userId: string,
  historicalUpdates: HistoricalUpdate[]
): Promise<void> {
  if (!historicalUpdates || historicalUpdates.length === 0) {
    return;
  }

  const supabase = createClient();

  for (const update of historicalUpdates) {
    if (!update.should_update_historical || !update.date) {
      continue;
    }

    try {
      console.log(
        `🔄 Processing historical update for ${update.date}:`,
        update
      );

      // Check if a journal entry exists for this date
      const { data: existingEntry } = await supabase
        .from('daily_narratives')
        .select('*')
        .eq('user_id', userId)
        .eq('narrative_date', update.date)
        .single();

      if (existingEntry) {
        // Update existing journal entry with new context
        await updateExistingJournalEntry(
          userId,
          update.date,
          update,
          existingEntry
        );
      } else {
        // Create new journal entry for this date
        await createNewJournalEntry(userId, update.date, update);
      }

      // Also update the events table for historical tracking
      await updateEventsTable(userId, update.date, update);

      console.log(`✅ Historical update processed for ${update.date}`);
    } catch (error) {
      console.error(
        `❌ Error processing historical update for ${update.date}:`,
        error
      );
    }
  }
}

/**
 * Update existing journal entry with new historical context
 */
async function updateExistingJournalEntry(
  userId: string,
  date: string,
  update: HistoricalUpdate,
  existingEntry: any
): Promise<void> {
  const supabase = createClient();

  // Merge new context with existing data
  const updatedData = mergeHistoricalContext(existingEntry, update);

  const { error } = await supabase
    .from('daily_narratives')
    .update({
      ...updatedData,
      last_updated: new Date().toISOString(),
      data_sources: [
        ...(existingEntry.data_sources || []),
        'historical_update',
      ],
    })
    .eq('user_id', userId)
    .eq('narrative_date', date);

  if (error) {
    throw new Error(`Failed to update journal entry: ${error.message}`);
  }
}

/**
 * Create new journal entry for historical date
 */
async function createNewJournalEntry(
  userId: string,
  date: string,
  update: HistoricalUpdate
): Promise<void> {
  const supabase = createClient();

  const journalData = createJournalFromHistoricalUpdate(update);

  const { error } = await supabase.from('daily_narratives').insert({
    user_id: userId,
    narrative_date: date,
    ...journalData,
    data_sources: ['historical_update'],
    last_updated: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`Failed to create journal entry: ${error.message}`);
  }
}

/**
 * Update events table for historical tracking
 */
async function updateEventsTable(
  userId: string,
  date: string,
  update: HistoricalUpdate
): Promise<void> {
  const supabase = createClient();

  const eventData = {
    user_id: userId,
    event_type: update.type,
    data: {
      description: update.description,
      source: 'historical_update',
      confidence: update.confidence,
      original_date: date,
      updated_at: new Date().toISOString(),
    },
    created_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('events').insert(eventData);

  if (error) {
    console.error('Failed to update events table:', error);
    // Don't throw here as this is secondary to journal updates
  }
}

/**
 * Merge new historical context with existing journal data
 */
function mergeHistoricalContext(
  existingEntry: any,
  update: HistoricalUpdate
): any {
  const merged = { ...existingEntry };

  switch (update.type) {
    case 'activity':
      if (!merged.daily_schedule) merged.daily_schedule = { activities: [] };
      if (!merged.daily_schedule.activities)
        merged.daily_schedule.activities = [];

      // Add new activity if it doesn't already exist
      const activityExists = merged.daily_schedule.activities.some(
        (a: any) => a.description === update.description
      );
      if (!activityExists) {
        merged.daily_schedule.activities.push({
          type: 'activity',
          title: update.description,
          description: update.description,
          status: 'completed',
          source: 'historical_update',
        });
      }
      break;

    case 'mood':
      if (!merged.notes_flags) merged.notes_flags = {};
      merged.notes_flags.mood = extractMoodFromDescription(update.description);
      merged.notes_flags.flags = [
        ...(merged.notes_flags.flags || []),
        `Historical: ${update.description}`,
      ];
      break;

    case 'energy':
      if (!merged.notes_flags) merged.notes_flags = {};
      merged.notes_flags.energy_level = extractEnergyFromDescription(
        update.description
      );
      merged.notes_flags.flags = [
        ...(merged.notes_flags.flags || []),
        `Historical: ${update.description}`,
      ];
      break;

    case 'note':
    case 'context':
      if (!merged.notes_flags) merged.notes_flags = {};
      merged.notes_flags.flags = [
        ...(merged.notes_flags.flags || []),
        `Historical: ${update.description}`,
      ];
      break;
  }

  return merged;
}

/**
 * Create journal structure from historical update
 */
function createJournalFromHistoricalUpdate(update: HistoricalUpdate): any {
  const journalData: any = {
    morning_checkin: {},
    daily_schedule: { activities: [] },
    session_data: {},
    notes_flags: { flags: [] },
    feedback_log: {},
    weekly_averages: {},
  };

  switch (update.type) {
    case 'activity':
      journalData.daily_schedule.activities.push({
        type: 'activity',
        title: update.description,
        description: update.description,
        status: 'completed',
        source: 'historical_update',
      });
      break;

    case 'mood':
      journalData.notes_flags.mood = extractMoodFromDescription(
        update.description
      );
      journalData.notes_flags.flags.push(`Historical: ${update.description}`);
      break;

    case 'energy':
      journalData.notes_flags.energy_level = extractEnergyFromDescription(
        update.description
      );
      journalData.notes_flags.flags.push(`Historical: ${update.description}`);
      break;

    case 'note':
    case 'context':
      journalData.notes_flags.flags.push(`Historical: ${update.description}`);
      break;
  }

  return journalData;
}

/**
 * Extract mood rating from description text
 */
function extractMoodFromDescription(description: string): number {
  const lowerDesc = description.toLowerCase();

  if (
    lowerDesc.includes('great') ||
    lowerDesc.includes('amazing') ||
    lowerDesc.includes('wonderful')
  )
    return 9;
  if (
    lowerDesc.includes('good') ||
    lowerDesc.includes('happy') ||
    lowerDesc.includes('positive')
  )
    return 7;
  if (
    lowerDesc.includes('okay') ||
    lowerDesc.includes('fine') ||
    lowerDesc.includes('neutral')
  )
    return 5;
  if (
    lowerDesc.includes('bad') ||
    lowerDesc.includes('sad') ||
    lowerDesc.includes('negative')
  )
    return 3;
  if (
    lowerDesc.includes('terrible') ||
    lowerDesc.includes('awful') ||
    lowerDesc.includes('depressed')
  )
    return 1;

  return 5; // Default neutral
}

/**
 * Extract energy level from description text
 */
function extractEnergyFromDescription(description: string): number {
  const lowerDesc = description.toLowerCase();

  if (
    lowerDesc.includes('energetic') ||
    lowerDesc.includes('vibrant') ||
    lowerDesc.includes('peppy')
  )
    return 9;
  if (
    lowerDesc.includes('good') ||
    lowerDesc.includes('decent') ||
    lowerDesc.includes('normal')
  )
    return 7;
  if (
    lowerDesc.includes('okay') ||
    lowerDesc.includes('moderate') ||
    lowerDesc.includes('average')
  )
    return 5;
  if (
    lowerDesc.includes('tired') ||
    lowerDesc.includes('low') ||
    lowerDesc.includes('fatigued')
  )
    return 3;
  if (
    lowerDesc.includes('exhausted') ||
    lowerDesc.includes('drained') ||
    lowerDesc.includes('dead')
  )
    return 1;

  return 5; // Default moderate
}
