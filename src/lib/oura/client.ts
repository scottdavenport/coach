// Oura Cloud API Client
// Documentation: https://cloud.ouraring.com/docs/

const OURA_API_BASE = 'https://api.ouraring.com/v2'

export interface OuraTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token: string
  scope: string
}

export interface OuraSleepData {
  data: Array<{
    id: string
    day: string
    score: number
    deep_sleep_duration: number
    rem_sleep_duration: number
    light_sleep_duration: number
    total_sleep_duration: number
    time_in_bed: number
    efficiency: number
    latency: number
    temperature_delta: number
    temperature_deviation: number
    average_heart_rate: number
    lowest_heart_rate: number
    average_hrv: number
    respiratory_rate: number
    sleep_phase_5_min: string
    bedtime_start: string
    bedtime_end: string
    type: string
  }>
}

export interface OuraActivityData {
  data: Array<{
    id: string
    day: string
    score: number
    steps: number
    calories_total: number
    calories_active: number
    average_met_minutes: number
    low_activity_met_minutes: number
    medium_activity_met_minutes: number
    high_activity_met_minutes: number
    inactive_met_minutes: number
    rest_met_minutes: number
    active_met_minutes: number
    met_1min_high_exceeded: number
    average_heart_rate: number
    max_heart_rate: number
    activity_class_5min: string
    activity_5min: string
    rest_mode_state: number
    target_calories: number
    target_km: number
    target_miles: number
    to_target_calories: number
    to_target_km: number
    to_target_miles: number
  }>
}

export interface OuraReadinessData {
  data: Array<{
    id: string
    day: string
    score: number
    score_activity_balance: number
    score_hrv_balance: number
    score_previous_day: number
    score_previous_night: number
    score_recovery_index: number
    score_resting_hr: number
    score_sleep_balance: number
    score_temperature: number
    period_id: number
    rest_mode_state: number
  }>
}

export interface OuraHeartRateData {
  data: Array<{
    id: string
    day: string
    heart_rate: number
    timestamp: string
  }>
}

class OuraClient {
  private accessToken: string | null = null

  constructor(accessToken?: string) {
    this.accessToken = accessToken || null
  }

  setAccessToken(token: string) {
    this.accessToken = token
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.accessToken) {
      throw new Error('No access token provided')
    }

    const url = `${OURA_API_BASE}${endpoint}`
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Oura API error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    return response.json()
  }

  // Get sleep data for a date range
  async getSleepData(startDate: string, endDate: string): Promise<OuraSleepData> {
    return this.makeRequest<OuraSleepData>(`/usercollection/daily_sleep?start_date=${startDate}&end_date=${endDate}`)
  }

  // Get activity data for a date range
  async getActivityData(startDate: string, endDate: string): Promise<OuraActivityData> {
    return this.makeRequest<OuraActivityData>(`/usercollection/daily_activity?start_date=${startDate}&end_date=${endDate}`)
  }

  // Get readiness data for a date range
  async getReadinessData(startDate: string, endDate: string): Promise<OuraReadinessData> {
    return this.makeRequest<OuraReadinessData>(`/usercollection/daily_readiness?start_date=${startDate}&end_date=${endDate}`)
  }

  // Get heart rate data for a date range
  async getHeartRateData(startDate: string, endDate: string): Promise<OuraHeartRateData> {
    return this.makeRequest<OuraHeartRateData>(`/usercollection/heartrate?start_date=${startDate}&end_date=${endDate}`)
  }

  // Get user info
  async getUserInfo() {
    return this.makeRequest('/userinfo')
  }
}

export const ouraClient = new OuraClient()
