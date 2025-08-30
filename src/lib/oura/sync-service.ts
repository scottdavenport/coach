import { createClient } from '@/lib/supabase/client'
import { ouraClient, OuraSleepData, OuraActivityData, OuraReadinessData } from './client'

interface SyncOptions {
  userId: string
  startDate?: string
  endDate?: string
  importHistory?: boolean
}

export class OuraSyncService {
  private supabase = createClient()

  async syncOuraData(options: SyncOptions) {
    const { userId, startDate, endDate, importHistory = false } = options
    
    // Get user's Oura integration
    const { data: integration, error: integrationError } = await this.supabase
      .from('oura_integrations')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()

    if (integrationError || !integration) {
      throw new Error('No active Oura integration found')
    }

    // Set access token
    ouraClient.setAccessToken(integration.access_token)

    // Determine date range
    const syncStartDate = startDate || this.getDefaultStartDate(importHistory)
    const syncEndDate = endDate || new Date().toISOString().split('T')[0]

    console.log(`Syncing Oura data from ${syncStartDate} to ${syncEndDate}`)

    try {
      // Fetch all data types
      const [sleepData, activityData, readinessData] = await Promise.all([
        ouraClient.getSleepData(syncStartDate, syncEndDate),
        ouraClient.getActivityData(syncStartDate, syncEndDate),
        ouraClient.getReadinessData(syncStartDate, syncEndDate),
      ])

      // Store raw data
      await this.storeRawData(userId, 'sleep', sleepData)
      await this.storeRawData(userId, 'activity', activityData)
      await this.storeRawData(userId, 'readiness', readinessData)

      // Transform and store in daily cards
      await this.transformAndStoreData(userId, sleepData, activityData, readinessData)

      // Update last sync timestamp
      await this.updateLastSync(userId)

      console.log('Oura data sync completed successfully')
      return { success: true, recordsProcessed: sleepData.data.length }

    } catch (error) {
      console.error('Oura sync error:', error)
      throw error
    }
  }

  private getDefaultStartDate(importHistory: boolean): string {
    if (importHistory) {
      // Import last 30 days
      const date = new Date()
      date.setDate(date.getDate() - 30)
      return date.toISOString().split('T')[0]
    } else {
      // Just today
      return new Date().toISOString().split('T')[0]
    }
  }

  private async storeRawData(userId: string, dataType: string, data: any) {
    for (const record of data.data) {
      const { error } = await this.supabase
        .from('oura_data')
        .upsert({
          user_id: userId,
          date: record.day,
          data_type: dataType,
          raw_data: record,
        }, {
          onConflict: 'user_id,date,data_type'
        })

      if (error) {
        console.error(`Error storing ${dataType} data:`, error)
      }
    }
  }

  private async transformAndStoreData(
    userId: string, 
    sleepData: OuraSleepData, 
    activityData: OuraActivityData, 
    readinessData: OuraReadinessData
  ) {
    // Create a map of all dates
    const allDates = new Set([
      ...sleepData.data.map(d => d.day),
      ...activityData.data.map(d => d.day),
      ...readinessData.data.map(d => d.day),
    ])

    for (const date of allDates) {
      const sleepRecord = sleepData.data.find(d => d.day === date)
      const activityRecord = activityData.data.find(d => d.day === date)
      const readinessRecord = readinessData.data.find(d => d.day === date)

      // Transform Oura data to daily card format
      const dailyCardData = this.transformOuraData(sleepRecord, activityRecord, readinessRecord)

      // Get existing daily card data
      const { data: existingCard } = await this.supabase
        .from('daily_log_cards')
        .select('summary')
        .eq('user_id', userId)
        .eq('log_date', date)
        .single()

      // Merge with existing data, prioritizing Oura data
      const mergedSummary = {
        ...existingCard?.summary,
        ...dailyCardData,
        source: 'oura_api',
        last_updated: new Date().toISOString()
      }

      // Upsert daily card
      const { error } = await this.supabase
        .from('daily_log_cards')
        .upsert({
          user_id: userId,
          log_date: date,
          summary: mergedSummary,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,log_date'
        })

      if (error) {
        console.error(`Error updating daily card for ${date}:`, error)
      }
    }
  }

  private transformOuraData(sleep?: any, activity?: any, readiness?: any) {
    const transformed: any = {}

    // Sleep data
    if (sleep) {
      transformed.sleep_score = sleep.score
      transformed.total_sleep = sleep.total_sleep_duration
      transformed.time_in_bed = sleep.time_in_bed
      transformed.sleep_efficiency = sleep.efficiency
      transformed.rem_sleep = sleep.rem_sleep_duration
      transformed.deep_sleep = sleep.deep_sleep_duration
      transformed.light_sleep = sleep.light_sleep_duration
      transformed.sleep_latency = sleep.latency
      transformed.average_heart_rate = sleep.average_heart_rate
      transformed.lowest_heart_rate = sleep.lowest_heart_rate
      transformed.average_hrv = sleep.average_hrv
      transformed.respiratory_rate = sleep.respiratory_rate
    }

    // Activity data
    if (activity) {
      transformed.activity_score = activity.score
      transformed.steps = activity.steps
      transformed.calories_total = activity.calories_total
      transformed.calories_active = activity.calories_active
      transformed.average_met_minutes = activity.average_met_minutes
      transformed.active_met_minutes = activity.active_met_minutes
      transformed.rest_met_minutes = activity.rest_met_minutes
      transformed.average_heart_rate_activity = activity.average_heart_rate
      transformed.max_heart_rate = activity.max_heart_rate
    }

    // Readiness data
    if (readiness) {
      transformed.readiness_score = readiness.score
      transformed.score_activity_balance = readiness.score_activity_balance
      transformed.score_hrv_balance = readiness.score_hrv_balance
      transformed.score_previous_day = readiness.score_previous_day
      transformed.score_previous_night = readiness.score_previous_night
      transformed.score_recovery_index = readiness.score_recovery_index
      transformed.score_resting_hr = readiness.score_resting_hr
      transformed.score_sleep_balance = readiness.score_sleep_balance
      transformed.score_temperature = readiness.score_temperature
    }

    // Add metadata
    transformed.app_name = 'Oura Ring'
    transformed.source = 'oura_api'
    transformed.last_updated = new Date().toISOString()

    return transformed
  }

  private async updateLastSync(userId: string) {
    const { error } = await this.supabase
      .from('oura_integrations')
      .update({ 
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)

    if (error) {
      console.error('Error updating last sync timestamp:', error)
    }
  }
}

export const ouraSyncService = new OuraSyncService()
