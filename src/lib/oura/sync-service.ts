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

      // Transform Oura data to structured metrics format
      const structuredMetrics = await this.transformOuraToStructuredMetrics(sleepRecord, activityRecord, readinessRecord, date)

      // Store metrics using the new structured system
      for (const metric of structuredMetrics) {
        const { error } = await this.supabase
          .from('user_daily_metrics')
          .upsert({
            user_id: userId,
            metric_id: metric.metric_id,
            metric_date: date,
            metric_value: metric.metric_value,
            text_value: metric.text_value,
            boolean_value: metric.boolean_value,
            source: 'oura_api',
            confidence: 0.95
          }, {
            onConflict: 'user_id,metric_id,metric_date'
          })

        if (error) {
          console.error(`Error storing metric ${metric.metric_key} for ${date}:`, error)
        }
      }
    }
  }

  private async transformOuraToStructuredMetrics(sleep: any, activity: any, readiness: any, date: string) {
    const metrics: any[] = []

    // Get standard metrics to map Oura data
    const { data: standardMetrics } = await this.supabase
      .from('standard_metrics')
      .select('id, metric_key')

    if (!standardMetrics) return metrics

    const metricIdMap = new Map(standardMetrics.map(m => [m.metric_key, m.id]))

    // Sleep data
    if (sleep) {
      const sleepMappings = {
        'sleep_score': sleep.score,
        'sleep_duration': sleep.total_sleep_duration,
        'time_in_bed': sleep.time_in_bed,
        'sleep_efficiency': sleep.efficiency,
        'rem_sleep': sleep.rem_sleep_duration,
        'deep_sleep': sleep.deep_sleep_duration,
        'resting_heart_rate': sleep.average_heart_rate,
        'heart_rate_variability': sleep.average_hrv,
        'respiratory_rate': sleep.respiratory_rate
      }

      for (const [metricKey, value] of Object.entries(sleepMappings)) {
        const metricId = metricIdMap.get(metricKey)
        if (metricId && value !== null && value !== undefined) {
          metrics.push({
            metric_id: metricId,
            metric_key: metricKey,
            metric_value: typeof value === 'number' ? value : null,
            text_value: typeof value === 'string' ? value : null,
            boolean_value: typeof value === 'boolean' ? value : null
          })
        }
      }
    }

    // Activity data
    if (activity) {
      const activityMappings = {
        'steps': activity.steps,
        'calories_burned': activity.calories_total,
        'active_minutes': activity.active_met_minutes
      }

      for (const [metricKey, value] of Object.entries(activityMappings)) {
        const metricId = metricIdMap.get(metricKey)
        if (metricId && value !== null && value !== undefined) {
          metrics.push({
            metric_id: metricId,
            metric_key: metricKey,
            metric_value: typeof value === 'number' ? value : null,
            text_value: typeof value === 'string' ? value : null,
            boolean_value: typeof value === 'boolean' ? value : null
          })
        }
      }
    }

    // Readiness data
    if (readiness) {
      const readinessMappings = {
        'readiness': readiness.score
      }

      for (const [metricKey, value] of Object.entries(readinessMappings)) {
        const metricId = metricIdMap.get(metricKey)
        if (metricId && value !== null && value !== undefined) {
          metrics.push({
            metric_id: metricId,
            metric_key: metricKey,
            metric_value: typeof value === 'number' ? value : null,
            text_value: typeof value === 'string' ? value : null,
            boolean_value: typeof value === 'boolean' ? value : null
          })
        }
      }
    }

    return metrics
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
