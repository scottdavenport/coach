// OCR Training Data Collection System
// This handles global learning while preserving user privacy

import { createClient } from '@/lib/supabase/client'

export interface OcrTrainingData {
  id: string
  timestamp: string
  // Global data for training (no personal info)
  imageHash: string // Hash of image for deduplication
  appType: string // 'oura', 'apple_health', 'fitbit', etc.
  screenshotType: string // 'sleep', 'activity', 'readiness', etc.
  originalOcrText: string // Raw OCR output
  correctedData: any // What the user says it should be
  parsingErrors: string[] // What went wrong
  confidence: number // OCR confidence score
  processingTime: number // How long it took
  
  // Metadata (no personal info)
  imageDimensions: { width: number; height: number }
  textBlocksDetected: number
  language: string
  
  // Training flags
  isAnonymized: boolean
  approvedForTraining: boolean
}

export interface OcrFeedback {
  messageId: string
  userId: string // For tracking who submitted, but not stored in training data
  feedbackType: 'parsing_error' | 'missing_data' | 'incorrect_value' | 'suggestion'
  description: string
  originalData: any
  suggestedCorrection: any
  timestamp: string
}

class OcrTrainingDataCollector {
  private supabase: ReturnType<typeof createClient> | null = null

  private getSupabase() {
    if (!this.supabase) {
      this.supabase = createClient()
    }
    return this.supabase
  }

  async submitTrainingData(data: Omit<OcrTrainingData, 'id' | 'timestamp' | 'isAnonymized' | 'approvedForTraining'>) {
    try {
      const supabase = this.getSupabase()
      
      // Anonymize the data
      const anonymizedData: OcrTrainingData = {
        ...data,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        isAnonymized: true,
        approvedForTraining: true
      }

      console.log('Submitting training data:', anonymizedData)

      // Store in training data table
      const { error } = await supabase
        .from('ocr_training_data')
        .insert(anonymizedData)

      if (error) {
        console.error('Error storing OCR training data:', error)
        throw error
      }

      console.log('OCR training data submitted successfully')
      return { success: true, id: anonymizedData.id }
    } catch (error) {
      console.error('Failed to submit OCR training data:', error)
      throw error
    }
  }

  async submitFeedback(feedback: OcrFeedback) {
    try {
      const supabase = this.getSupabase()
      
      // Store feedback separately from training data
      const { error } = await supabase
        .from('ocr_feedback')
        .insert({
          ...feedback,
          id: crypto.randomUUID()
        })

      if (error) {
        console.error('Error storing OCR feedback:', error)
        throw error
      }

      console.log('OCR feedback submitted successfully')
      return { success: true }
    } catch (error) {
      console.error('Failed to submit OCR feedback:', error)
      throw error
    }
  }

  async getTrainingStats() {
    try {
      const supabase = this.getSupabase()
      
      const { data, error } = await supabase
        .from('ocr_training_data')
        .select('appType, screenshotType, confidence, processingTime')
        .eq('approvedForTraining', true)

      if (error) throw error

      return {
        totalSamples: data.length,
        byAppType: this.groupBy(data, 'appType'),
        byScreenshotType: this.groupBy(data, 'screenshotType'),
        averageConfidence: data.reduce((sum, item) => sum + item.confidence, 0) / data.length,
        averageProcessingTime: data.reduce((sum, item) => sum + item.processingTime, 0) / data.length
      }
    } catch (error) {
      console.error('Failed to get training stats:', error)
      return null
    }
  }

  private groupBy(data: any[], key: string) {
    return data.reduce((groups, item) => {
      const group = item[key] || 'unknown'
      groups[group] = (groups[group] || 0) + 1
      return groups
    }, {})
  }

  // Generate image hash for deduplication (without storing the actual image)
  generateImageHash(imageUrl: string, dimensions: { width: number; height: number }): string {
    // Simple hash based on URL and dimensions
    const hashInput = `${imageUrl}_${dimensions.width}x${dimensions.height}`
    return btoa(hashInput).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16)
  }

  // Detect app type from OCR text
  detectAppType(ocrText: string): string {
    const text = ocrText.toLowerCase()
    
    if (text.includes('oura') || text.includes('ōura')) return 'oura'
    if (text.includes('apple health') || text.includes('health app')) return 'apple_health'
    if (text.includes('fitbit')) return 'fitbit'
    if (text.includes('garmin')) return 'garmin'
    if (text.includes('whoop')) return 'whoop'
    
    return 'unknown'
  }

  // Detect screenshot type from OCR text
  detectScreenshotType(ocrText: string): string {
    const text = ocrText.toLowerCase()
    
    if (text.includes('sleep') || text.includes('bedtime')) return 'sleep'
    if (text.includes('activity') || text.includes('steps') || text.includes('calories')) return 'activity'
    if (text.includes('readiness') || text.includes('recovery')) return 'readiness'
    if (text.includes('heart rate') || text.includes('hrv')) return 'heart_rate'
    if (text.includes('glucose') || text.includes('blood sugar')) return 'glucose'
    
    return 'general'
  }
}

export const ocrTrainingCollector = new OcrTrainingDataCollector()
