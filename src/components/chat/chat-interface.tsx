'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Mic, Send, Plus, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChatMessage } from './chat-message'
import { FileUploadMenu } from './file-upload-menu'
import { FilePreviewList } from './file-preview-chip'
import { OptimizedInput } from './optimized-input'
import { IsolatedFileManager } from './isolated-file-manager'

import { createClient } from '@/lib/supabase/client'
import { FileAttachment, SupportedFileType } from '@/types'
import { FileProcessor } from '@/lib/file-processing'
import { processFileContentClient } from '@/lib/file-processing/client'
import { useFileManager } from '@/hooks/use-file-manager'

interface ChatInterfaceProps {
  userId: string
  pendingQuestions?: string[]
  onQuestionAsked?: (question: string) => void
  onDataStored?: () => void
}

export function ChatInterface({ userId, pendingQuestions = [], onQuestionAsked, onDataStored }: ChatInterfaceProps) {
  
  const [messages, setMessages] = useState<any[]>([])
  const [inputValue, setInputValue] = useState('')

  const [isUploadMenuOpen, setIsUploadMenuOpen] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [conversationState, setConversationState] = useState<'idle' | 'morning_checkin' | 'activity_planning' | 'data_clarification'>('idle')
  const [checkinProgress] = useState({
    weight: null as number | null,
    energy: null as number | null,
    mood: null as string | null,
    physical_notes: null as string | null
  })
  const [isDragging, setIsDragging] = useState(false)
  const fileManager = useFileManager(userId)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)





  const loadConversationHistory = useCallback(async () => {
    try {
      setIsLoadingHistory(true)
      const supabase = createClient()
      
      // Fetch last 50 messages (25 exchanges) for context
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select('message, message_type, metadata, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(50)

      if (error) {
        console.error('Error loading conversation history:', error)
        return
      }

      // Convert to message format
      const historyMessages = conversations.map((conv, index) => ({
        id: `history-${index}`,
        content: conv.message,
        role: conv.metadata?.role === 'assistant' ? 'assistant' : 'user',
        timestamp: new Date(conv.created_at),
        isHistory: true
      }))

      setMessages(historyMessages)
    } catch (error) {
      console.error('Error loading conversation history:', error)
    } finally {
      setIsLoadingHistory(false)
    }
  }, [userId])

  // Load conversation history on mount
  useEffect(() => {
    if (userId) {
      loadConversationHistory()
    }
  }, [userId, loadConversationHistory])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Handle pending questions from the daily card
  useEffect(() => {
    if (pendingQuestions.length > 0 && !isLoading) {
      const question = pendingQuestions[0]
      if (question && onQuestionAsked) {
        // Add the question as a system message
        const systemMessage = {
          id: Date.now(),
          content: question,
          role: 'assistant',
          timestamp: new Date(),
          isClarification: true
        }
        setMessages(prev => [...prev, systemMessage])
        onQuestionAsked(question)
      }
    }
  }, [pendingQuestions, isLoading, onQuestionAsked])

  const handleSendMessage = useCallback(async () => {
    if ((!inputValue.trim() && fileManager.files.length === 0) || isLoading) return

    // If we have attached files, process them with context
    if (fileManager.files.length > 0) {
      await handleFilesWithContext()
      return
    }

    // Check if this is a correction to OCR data
    const correction = detectOcrCorrection(inputValue, messages)
    if (correction) {
      await handleOcrCorrection(correction, inputValue)
      return
    }

    // Regular text message
    const userMessage = {
      id: Date.now(),
      content: inputValue,
      role: 'user',
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    const currentMessage = inputValue
    setInputValue('')
    setIsLoading(true)

    // Update conversation state based on message content
    updateConversationState(currentMessage)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentMessage,
          conversationId: Date.now().toString(),
          conversationState: conversationState,
          checkinProgress: checkinProgress
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        })
        throw new Error(`Failed to send message: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      
      const aiMessage = {
        id: Date.now() + 1,
        content: data.message,
        role: 'assistant',
        timestamp: new Date(),
      }
      
      setMessages(prev => [...prev, aiMessage])

      // Check if we have conversation insights
      if (data.parsedData && (data.parsedData.has_health_data || data.parsedData.has_activity_data || data.parsedData.has_mood_data || data.parsedData.has_nutrition_data || data.parsedData.has_sleep_data || data.parsedData.has_workout_data)) {
        console.log('🔍 Conversation insights detected:', data.parsedData)
        // The backend now handles storing conversation insights automatically
        // No need for complex frontend data storage logic
      } else {
        console.log('🔍 No conversation insights to store')
      }

    } catch (error) {
      console.error('Error sending message:', error)
      const aiErrorResponse = await sendErrorToAI('connection issue')
      const errorMessage = {
        id: Date.now() + 1,
        content: aiErrorResponse,
        role: 'assistant',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }, [inputValue, fileManager.files, isLoading, conversationState, checkinProgress, messages, userId, onDataStored])

  const handleFilesWithContext = useCallback(async () => {
    if (fileManager.files.length === 0) return

    setIsLoading(true)

    try {
      const contextText = inputValue.trim() || 'No additional context provided'
      
      // Create file summary for user message
      const fileSummary = fileManager.files.map(file => 
        `📎 ${file.fileName} (${FileProcessor.formatFileSize(file.fileSize)})`
      ).join('\n')
      
      const combinedMessage = `${fileSummary}\n\nContext: ${contextText}`

      const userMessage = {
        id: Date.now(),
        content: combinedMessage,
        role: 'user',
        timestamp: new Date(),
        hasFiles: true,
        fileAttachments: fileManager.files
      }

      setMessages(prev => [...prev, userMessage])
      setInputValue('')

      // Process files by type
      const imageFiles = fileManager.files.filter(file => file.fileType.startsWith('image/'))
      const documentFiles = fileManager.files.filter(file => !file.fileType.startsWith('image/'))

      const allProcessedContent: any = {
        images: [],
        documents: [],
        context: contextText
      }

      // Process images with OCR
      for (const imageFile of imageFiles) {
        if (imageFile.fileUrl) {
          try {
            console.log('🚀 Calling OCR Edge Function with:', imageFile.fileUrl)
            const ocrResult = await callOcrFunction(imageFile.fileUrl, userId)
            
            if (ocrResult.success) {
              allProcessedContent.images.push({
                fileName: imageFile.fileName,
                ocrData: ocrResult.structuredData,
                fileUrl: imageFile.fileUrl
              })
            }
          } catch (error) {
            console.error('OCR processing error for', imageFile.fileName, error)
            allProcessedContent.images.push({
              fileName: imageFile.fileName,
              error: 'OCR processing failed'
            })
          }
        }
      }

      // Process documents
      for (const docFile of documentFiles) {
        try {
          // For complex documents, use server-side processing
          const needsServerProcessing = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          ].includes(docFile.fileType)

          let processingResult
          
          if (needsServerProcessing && docFile.fileUrl) {
            // Use server-side extraction API
            const response = await fetch('/api/files/extract', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                fileUrl: docFile.fileUrl,
                fileName: docFile.fileName,
                mimeType: docFile.fileType
              })
            })
            
            if (response.ok) {
              processingResult = await response.json()
            } else {
              throw new Error('Server processing failed')
            }
          } else {
            // Use client-side processing for simple files
            processingResult = await processFileContentClient(docFile.file)
          }
          
          if (processingResult.success) {
            allProcessedContent.documents.push({
              fileName: docFile.fileName,
              content: processingResult.content,
              metadata: processingResult.metadata
            })
          } else {
            allProcessedContent.documents.push({
              fileName: docFile.fileName,
              error: processingResult.error
            })
          }
        } catch (error) {
          console.error('Document processing error for', docFile.fileName, error)
          allProcessedContent.documents.push({
            fileName: docFile.fileName,
            error: 'Document processing failed'
          })
        }
      }

      // Send all processed content to AI
      const aiResponse = await sendToAIWithMultiFileData(allProcessedContent, contextText)
      
      const aiMessage = {
        id: Date.now() + 1,
        content: aiResponse,
        role: 'assistant',
        timestamp: new Date(),
        isMultiFileResult: true,
        processedContent: allProcessedContent
      }
      setMessages(prev => [...prev, aiMessage])

      // Clear attached files
      fileManager.clearFiles()

    } catch (error) {
      console.error('Error processing files with context:', error)
      const aiErrorResponse = await sendErrorToAI('file processing issue')
      const errorMessage = {
        id: Date.now() + 1,
        content: aiErrorResponse,
        role: 'assistant',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }, [fileManager.files, inputValue, userId])

  // Detect if user is correcting OCR data
  const detectOcrCorrection = (message: string, messageHistory: any[]) => {
    const lowerMessage = message.toLowerCase()
    
    // Look for more specific correction patterns
    const correctionPatterns = [
      // Direct corrections
      /(?:that'?s|that is) wrong/i,
      /(?:you missed|you got wrong|incorrect|mistake)/i,
      /(?:not|wrong|incorrect)/i,
      
      // Specific data corrections
      /(?:there is no|i don'?t know where you got|that'?s not right)/i,
      /(?:clearly|obviously|actually) (\d+)/i,
      
      // Conversational corrections
      /(?:not my|is not my|that'?s not my)/i,
      /(?:it says|it shows|it reads)/i,
      
      // Specific metric corrections
      /(?:sleep score|readiness score|activity score|heart rate|glucose|heart rate variability|body temperature|respiratory rate|total sleep) (?:is|was|should be) (\d+)/i,
      
      // Duration corrections
      /(?:total sleep|deep sleep) (?:is|was) (\d+)h (\d+)m/i,
      
      // Contextual corrections
      /(?:i didn'?t sleep very well|i slept poorly|my sleep was bad)/i,
      /(?:i slept great|i slept well|my sleep was good)/i,
      /(?:my readiness was low|my readiness was high)/i,
      /(?:my activity was low|my activity was high)/i
    ]
    
    const isCorrection = correctionPatterns.some(pattern => pattern.test(lowerMessage))
    
    console.log('🔍 Correction detection:', {
      message: lowerMessage,
      isCorrection,
      patterns: correctionPatterns.map(pattern => ({
        pattern: pattern.toString(),
        matches: pattern.test(lowerMessage)
      })).filter(p => p.matches)
    })
    
    if (!isCorrection) return null
    
    // Find the most recent OCR result message
    const recentOcrMessage = messageHistory
      .filter(msg => msg.isOcrResult && msg.structuredData)
      .pop()
    
    if (!recentOcrMessage) return null
    
    return {
      originalData: recentOcrMessage.structuredData,
      originalMessage: recentOcrMessage,
      correctionText: message
    }
  }

  // Handle OCR correction
  const handleOcrCorrection = async (correction: any, userMessage: string) => {
    const userMsg = {
      id: Date.now(),
      content: userMessage,
      role: 'user',
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMsg])
    setInputValue('')
    setIsLoading(true)

    try {
      // Extract corrected values from user message
      const correctedData = extractCorrections(userMessage, correction.originalData)
      
      // The backend now handles storing conversation insights automatically
      console.log('🔍 Data correction processed:', correctedData)
      
      // Store training data (original OCR vs user correction)
      await storeTrainingData(correction.originalData, correctedData, userMessage)
      
      // Get a natural AI response for the correction
      const aiResponse = await sendCorrectionToAI(correction.originalData, correctedData, userMessage)
      
      // Confirm the correction to the user with AI response
      const confirmationMessage = {
        id: Date.now() + 1,
        content: aiResponse,
        role: 'assistant',
        timestamp: new Date(),
      }
      
      setMessages(prev => [...prev, confirmationMessage])
      
      // Trigger data refresh
      if (onDataStored) {
        onDataStored()
      }
      
    } catch (error) {
      console.error('Error handling OCR correction:', error)
      const aiErrorResponse = await sendErrorToAI('data update issue')
      const errorMessage = {
        id: Date.now() + 1,
        content: aiErrorResponse,
        role: 'assistant',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  // Extract corrections from user message
  const extractCorrections = (message: string, originalData: any) => {
    const correctedData = { ...originalData }
    const lowerMessage = message.toLowerCase()
    
    console.log('🔧 Extracting corrections from:', lowerMessage)
    console.log('🔧 Original data:', originalData)
    
    // Handle "there is no sleep score" - remove sleep score
    if (lowerMessage.includes("there is no sleep score") || lowerMessage.includes("no sleep score")) {
      correctedData.sleep_score = null
      correctedData.sleepScore = null
    }
    
    // Handle "clearly 30" for HRV
    const hrvClearlyMatch = lowerMessage.match(/clearly (\d+)/i)
    if (hrvClearlyMatch && lowerMessage.includes("heart rate variability")) {
      correctedData.heartRateVariability = parseInt(hrvClearlyMatch[1])
    }
    
    // Handle "don't know where you got" - remove incorrect values
    if (lowerMessage.includes("don't know where you got")) {
      if (lowerMessage.includes("sleep score")) {
        correctedData.sleep_score = null
        correctedData.sleepScore = null
      }
      if (lowerMessage.includes("total sleep")) {
        correctedData.totalSleep = null
      }
    }
    
    // Extract sleep score - multiple patterns
    const sleepMatch = lowerMessage.match(/(?:sleep|sleep score) (?:was|is|should be|is actually) (\d+)/i)
    if (sleepMatch) {
      correctedData.sleep_score = parseInt(sleepMatch[1])
    }
    
    // Extract readiness score - multiple patterns
    const readinessMatch = lowerMessage.match(/(?:readiness|readiness score) (?:was|is|should be|is actually) (\d+)/i)
    if (readinessMatch) {
      correctedData.readiness_score = parseInt(readinessMatch[1])
    }
    
    // Extract activity score - multiple patterns
    const activityMatch = lowerMessage.match(/(?:activity|activity score) (?:was|is|should be|is actually) (\d+)/i)
    if (activityMatch) {
      correctedData.activity_score = parseInt(activityMatch[1])
    }
    
    // Extract heart rate - multiple patterns
    const heartRateMatch = lowerMessage.match(/(?:heart rate|hr) (?:was|is|should be|is actually) (\d+)/i)
    if (heartRateMatch) {
      correctedData.heartRate = parseInt(heartRateMatch[1])
    }
    
    // Handle "not my resting heart rate" - remove resting heart rate
    if (lowerMessage.includes("not my resting heart rate") || lowerMessage.includes("not resting heart rate")) {
      correctedData.restingHeartRate = null
      correctedData.resting_heart_rate = null
      correctedData.heartRate = null
    }
    
    // Handle "latest heart rate" vs "resting heart rate" distinction
    if (lowerMessage.includes("latest heart rate") && lowerMessage.includes("not") && lowerMessage.includes("resting")) {
      correctedData.restingHeartRate = null
      correctedData.resting_heart_rate = null
      correctedData.heartRate = null
    }
    
    // Extract glucose - multiple patterns
    const glucoseMatch = lowerMessage.match(/(?:glucose|blood sugar) (?:was|is|should be|is actually) (\d+)/i)
    if (glucoseMatch) {
      correctedData.glucose_level = parseInt(glucoseMatch[1])
    }
    
    // Extract heart rate variability
    const hrvMatch = lowerMessage.match(/(?:heart rate variability|hrv) (?:was|is|should be|is actually) (\d+)/i)
    if (hrvMatch) {
      correctedData.heartRateVariability = parseInt(hrvMatch[1])
    }
    
    // Extract body temperature
    const bodyTempMatch = lowerMessage.match(/(?:body temperature|temperature) (?:was|is|should be|is actually) ([±]?\d+(?:\.\d+)?)/i)
    if (bodyTempMatch) {
      correctedData.bodyTemperature = bodyTempMatch[1]
    }
    
    // Extract respiratory rate
    const respRateMatch = lowerMessage.match(/(?:respiratory rate|breathing rate) (?:was|is|should be|is actually) (\d+(?:\.\d+)?)/i)
    if (respRateMatch) {
      correctedData.respiratoryRate = parseFloat(respRateMatch[1])
    }
    
    // Extract deep sleep duration - multiple patterns
    const deepSleepMatch = lowerMessage.match(/(?:deep sleep|deep) (?:was|is|should be|is actually) (\d+)h (\d+)m/i)
    if (deepSleepMatch) {
      const hours = parseInt(deepSleepMatch[1])
      const minutes = parseInt(deepSleepMatch[2])
      correctedData.deepSleep = hours * 60 + minutes
    }
    
    // Extract total sleep duration - multiple patterns
    const totalSleepMatch = lowerMessage.match(/(?:total sleep|i slept for|i got) (?:was|is|should be|is actually) (\d+)h (\d+)m/i)
    if (totalSleepMatch) {
      const hours = parseInt(totalSleepMatch[1])
      const minutes = parseInt(totalSleepMatch[2])
      correctedData.totalSleep = hours * 60 + minutes
    }
    
    // Handle contextual corrections (qualitative to quantitative)
    if (lowerMessage.includes("didn't sleep very well") || lowerMessage.includes("slept poorly") || lowerMessage.includes("sleep was bad")) {
      // Assume low sleep score if not already specified
      if (!correctedData.sleep_score) {
        correctedData.sleep_score = 30 // Low sleep score
      }
    }
    
    if (lowerMessage.includes("slept great") || lowerMessage.includes("slept well") || lowerMessage.includes("sleep was good")) {
      // Assume high sleep score if not already specified
      if (!correctedData.sleep_score) {
        correctedData.sleep_score = 85 // High sleep score
      }
    }
    
    if (lowerMessage.includes("readiness was low")) {
      if (!correctedData.readiness_score) {
        correctedData.readiness_score = 30 // Low readiness
      }
    }
    
    if (lowerMessage.includes("readiness was high")) {
      if (!correctedData.readiness_score) {
        correctedData.readiness_score = 85 // High readiness
      }
    }
    
    if (lowerMessage.includes("activity was low")) {
      if (!correctedData.activity_score) {
        correctedData.activity_score = 30 // Low activity
      }
    }
    
    if (lowerMessage.includes("activity was high")) {
      if (!correctedData.activity_score) {
        correctedData.activity_score = 85 // High activity
      }
    }
    
    console.log('🔧 Corrected data:', correctedData)
    const changedKeys = Object.keys(correctedData).filter(key => correctedData[key] !== originalData[key])
    console.log('🔧 Changes made:', changedKeys)
    console.log('🔧 Detailed changes:', changedKeys.map(key => ({
      field: key,
      original: originalData[key],
      corrected: correctedData[key]
    })))
    
    return correctedData
  }



  // Handle errors gracefully without calling the AI API
  const sendErrorToAI = async (errorType: string) => {
    // Provide natural, friendly error messages directly
    const errorMessages = {
      'connection issue': "I'm having trouble connecting right now. Could you try sending your message again? Sometimes a quick refresh helps clear up connection issues.",
      'OCR processing failure': "I had trouble processing that file. Could you try uploading it again? Make sure the image is clear and readable.",
      'file processing issue': "I'm having trouble with that file right now. Could you try again in a moment?",
      'data update issue': "I had trouble updating that data. Could you try again?",
      'correction response generation': "I've updated your data, but I'm having trouble generating a response right now. The changes have been saved though!",
      'OCR response generation': "I processed your health data, but I'm having trouble responding right now. Your data has been saved though!"
    }
    
    return errorMessages[errorType] || "I'm having some technical difficulties right now. Could you try again in a moment?"
  }

  // Send correction to OpenAI for natural conversational response
  const sendCorrectionToAI = async (originalData: any, correctedData: any, userMessage: string) => {
    try {
      // Create a summary of what changed
      const changes = []
      if (originalData.readiness_score !== correctedData.readiness_score) {
        changes.push(`readiness score: ${originalData.readiness_score || 'not detected'} → ${correctedData.readiness_score}`)
      }
      if (originalData.sleepScore !== correctedData.sleepScore) {
        changes.push(`sleep score: ${originalData.sleepScore || 'not detected'} → ${correctedData.sleepScore}`)
      }
      if (originalData.restingHeartRate !== correctedData.restingHeartRate) {
        changes.push(`resting heart rate: ${originalData.restingHeartRate || 'not detected'} → ${correctedData.restingHeartRate} bpm`)
      }
      if (originalData.resting_heart_rate !== correctedData.resting_heart_rate) {
        changes.push(`resting heart rate: ${originalData.resting_heart_rate || 'not detected'} → ${correctedData.resting_heart_rate} bpm`)
      }
      if (originalData.heartRateVariability !== correctedData.heartRateVariability) {
        changes.push(`HRV: ${originalData.heartRateVariability || 'not detected'} → ${correctedData.heartRateVariability} ms`)
      }
      if (originalData.bodyTemperature !== correctedData.bodyTemperature) {
        changes.push(`body temperature: ${originalData.bodyTemperature || 'not detected'} → ${correctedData.bodyTemperature}°F`)
      }
      if (originalData.respiratoryRate !== correctedData.respiratoryRate) {
        changes.push(`respiratory rate: ${originalData.respiratoryRate || 'not detected'} → ${correctedData.respiratoryRate}/min`)
      }
      if (originalData.totalSleep !== correctedData.totalSleep) {
        const originalFormatted = originalData.totalSleep ? `${Math.floor(originalData.totalSleep / 60)}h ${originalData.totalSleep % 60}m` : 'not detected'
        const correctedFormatted = correctedData.totalSleep ? `${Math.floor(correctedData.totalSleep / 60)}h ${correctedData.totalSleep % 60}m` : 'removed'
        changes.push(`total sleep: ${originalFormatted} → ${correctedFormatted}`)
      }
      if (originalData.timeInBed !== correctedData.timeInBed) {
        const originalFormatted = originalData.timeInBed ? `${Math.floor(originalData.timeInBed / 60)}h ${originalData.timeInBed % 60}m` : 'not detected'
        const correctedFormatted = correctedData.timeInBed ? `${Math.floor(correctedData.timeInBed / 60)}h ${correctedData.timeInBed % 60}m` : 'removed'
        changes.push(`time in bed: ${originalFormatted} → ${correctedFormatted}`)
      }
      if (originalData.sleepEfficiency !== correctedData.sleepEfficiency) {
        changes.push(`sleep efficiency: ${originalData.sleepEfficiency || 'not detected'} → ${correctedData.sleepEfficiency}%`)
      }
      if (originalData.remSleep !== correctedData.remSleep) {
        const originalFormatted = originalData.remSleep ? `${Math.floor(originalData.remSleep / 60)}h ${originalData.remSleep % 60}m` : 'not detected'
        const correctedFormatted = correctedData.remSleep ? `${Math.floor(correctedData.remSleep / 60)}h ${correctedData.remSleep % 60}m` : 'removed'
        changes.push(`REM sleep: ${originalFormatted} → ${correctedFormatted}`)
      }
      if (originalData.deepSleep !== correctedData.deepSleep) {
        const originalFormatted = originalData.deepSleep ? `${Math.floor(originalData.deepSleep / 60)}h ${originalData.deepSleep % 60}m` : 'not detected'
        const correctedFormatted = correctedData.deepSleep ? `${Math.floor(correctedData.deepSleep / 60)}h ${correctedData.deepSleep % 60}m` : 'removed'
        changes.push(`deep sleep: ${originalFormatted} → ${correctedFormatted}`)
      }
      if (originalData.steps !== correctedData.steps) {
        changes.push(`steps: ${originalData.steps || 'not detected'} → ${correctedData.steps}`)
      }
      if (originalData.calories !== correctedData.calories) {
        changes.push(`calories: ${originalData.calories || 'not detected'} → ${correctedData.calories}`)
      }
      if (originalData.glucose !== correctedData.glucose) {
        changes.push(`glucose: ${originalData.glucose || 'not detected'} → ${correctedData.glucose} mg/dL`)
      }

      const changesSummary = changes.length > 0 ? changes.join(', ') : 'some corrections'
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `I just corrected some health data. The user said: "${userMessage}" and I updated: ${changesSummary}. Please give me a natural, conversational response acknowledging the correction. Be friendly and helpful, but don't be robotic or templated.`,
          conversationId: Date.now().toString(),
          conversationState: 'correction',
          checkinProgress: {}
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to get AI response: ${response.status}`)
      }

      const data = await response.json()
      return data.message || await sendErrorToAI('correction response generation')
    } catch (error) {
      console.error('Error getting AI response for correction:', error)
      // Fallback to AI error response if AI fails
      return await sendErrorToAI('correction response generation')
    }
  }



  // Send multi-file data to OpenAI for natural conversational response
  const sendToAIWithMultiFileData = async (processedContent: any, context: string) => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: context || 'I uploaded multiple files',
          conversationId: Date.now().toString(),
          conversationState: 'multi_file_analysis',
          checkinProgress: {},
          multiFileData: processedContent
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to get AI response: ${response.status}`)
      }

      const data = await response.json()
      return data.message || await sendErrorToAI('file processing issue')
    } catch (error) {
      console.error('Error getting AI response for multi-file data:', error)
      return await sendErrorToAI('file processing issue')
    }
  }

  // REMOVED: createConversationalResponse function - now using AI for all responses

  // Store training data for OCR improvement
  const storeTrainingData = async (originalData: any, correctedData: any, userMessage: string) => {
    try {
      // This would integrate with the training data collector
      // For now, we'll just log it
      console.log('Training data:', {
        original: originalData,
        corrected: correctedData,
        userCorrection: userMessage
      })
    } catch (error) {
      console.error('Error storing training data:', error)
    }
  }

  const updateConversationState = (message: string) => {
    const lowerMessage = message.toLowerCase()
    
    // Detect morning check-in patterns
    if (lowerMessage.includes('good morning') || lowerMessage.includes('morning') || 
        lowerMessage.includes('hello') || lowerMessage.includes('hi') ||
        (lowerMessage.includes('weight') && !checkinProgress.weight)) {
      setConversationState('morning_checkin')
    }
    
    // Detect activity planning
    if (lowerMessage.includes('golf') || lowerMessage.includes('workout') || 
        lowerMessage.includes('exercise') || lowerMessage.includes('activity')) {
      setConversationState('activity_planning')
    }
    
    // Detect data clarification needs
    if (lowerMessage.includes('clarify') || lowerMessage.includes('not sure') || 
        lowerMessage.includes('maybe') || lowerMessage.includes('kind of')) {
      setConversationState('data_clarification')
    }
  }

  // REMOVED: storeDataAutomatically function - now handled by backend
  // REMOVED: storeOcrData function - now handled by backend
  // REMOVED: mapOcrToStructuredMetrics function - no longer needed

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }, [handleSendMessage])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return

    try {
      await fileManager.addFiles(files)
    } catch (error) {
      const errorMessage = {
        id: Date.now(),
        content: `❌ ${error instanceof Error ? error.message : 'Upload failed'}`,
        role: 'assistant',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    }
    
    event.target.value = ''
  }



  const handleMultipleFileUpload = useCallback(async (files: File[]) => {
    try {
      // File manager handles validation and uploads automatically
      await fileManager.addFiles(files)
      setIsUploadMenuOpen(false)
    } catch (error) {
      // Show error message if validation fails
      const errorMessage = {
        id: Date.now(),
        content: `❌ ${error instanceof Error ? error.message : 'File upload failed'}`,
        role: 'assistant',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    }
  }, [fileManager])

  const handleRemoveFile = useCallback((fileId: string) => {
    fileManager.removeFile(fileId)
  }, [fileManager])

  const handleFileSelectType = useCallback((type: 'all' | 'images' | 'documents') => {
    if (fileInputRef.current) {
      // Update accept attribute based on type
      switch (type) {
        case 'images':
          fileInputRef.current.accept = 'image/*'
          break
        case 'documents':
          fileInputRef.current.accept = '.pdf,.doc,.docx,.txt,.md,.csv,.xlsx,.ods,.pptx'
          break
        default:
          fileInputRef.current.accept = FileProcessor.getAcceptString()
      }
      fileInputRef.current.click()
    }
  }, [])

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      try {
        await fileManager.addFiles(files)
      } catch (error) {
        const errorMessage = {
          id: Date.now(),
          content: `❌ ${error instanceof Error ? error.message : 'Upload failed'}`,
          role: 'assistant',
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, errorMessage])
      }
    }
  }, [fileManager])

  const handleVoiceRecord = () => {
    setIsRecording(!isRecording)
    // TODO: Implement voice recording
  }

  const handleEmergencyMessage = useCallback(async (message: string) => {
    if (isLoading) return;

    // Simple message handling without file complexity
    const userMessage = {
      id: Date.now(),
      content: message,
      role: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          conversationId: Date.now().toString(),
          conversationState: 'emergency_mode'
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.status}`);
      }

      const data = await response.json();
      
      const aiMessage = {
        id: Date.now() + 1,
        content: data.message,
        role: 'assistant',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: Date.now() + 1,
        content: "I'm having trouble responding right now. Please try again.",
        role: 'assistant',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading])

  const handleEmergencyFileUpload = useCallback(() => {
    // Simple file upload trigger
    if (fileInputRef.current) {
      fileInputRef.current.accept = FileProcessor.getAcceptString();
      fileInputRef.current.click();
    }
  }, [])

  // TODO: Replace mock with real OCR function
  const callOcrFunction = async (imageUrl: string, userId: string) => {
    try {
      // Get the current user's session for authorization
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('No authentication token available')
      }

      const response = await fetch('https://uqzgbvcrnxdzfgmkkoxb.supabase.co/functions/v1/ocr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          imageUrl,
          userId,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`OCR request failed: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const result = await response.json()
      return result
    } catch (error) {
      console.error('OCR function error:', error)
      throw error
    }
  }

  // REMOVED: Complex data storage functions - now handled by backend
  // The backend automatically stores conversation insights in a simplified way

  return (
    <div 
      className="flex flex-col h-full"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary z-50 flex items-center justify-center">
          <div className="text-center">
            <Upload className="h-12 w-12 text-primary mx-auto mb-2" />
            <p className="text-lg font-medium text-primary">Drop files here</p>
            <p className="text-sm text-muted">Upload images and documents</p>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {isLoadingHistory ? (
            <div className="flex items-center justify-center h-full min-h-[400px]">
              <div className="text-center text-muted">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p>Loading conversation history...</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full min-h-[400px]">
              <div className="text-center text-muted">
                <p className="text-lg mb-2">Welcome to Coach!</p>
                <p className="text-sm mb-3">Your AI health and fitness companion</p>
                <div className="text-sm text-muted space-y-2">
                  <p>💡 <strong>Quick Start:</strong></p>
                  <p>• Upload a screenshot from your health app (Oura, Apple Health, Fitbit, etc.)</p>
                  <p>• Or simply tell me how you're feeling and what's going on</p>
                  <p>• I'll help track your progress and build your daily card</p>
                  <p>• Check the "Daily Card" button to see your health data organized</p>
                </div>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))
          )}
          
          {isLoading && (
            <div className="flex items-center space-x-2 text-muted">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-muted rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-muted rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-muted rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <span className="text-sm">Coach is typing...</span>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area - Pinned to Bottom */}
      <div className="border-t border-line p-4 bg-background">
        <div className="max-w-4xl mx-auto">
              
              
              {/* File Attachments Preview - Isolated */}
              <IsolatedFileManager 
                files={fileManager.files}
                onRemoveFile={fileManager.removeFile}
              />

          <div className="flex items-center space-x-3">
            {/* Attachment Button */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsUploadMenuOpen(!isUploadMenuOpen)}
                className="p-2 text-muted hover:text-text"
                disabled={fileManager.files.length >= 10}
              >
                <Plus className="h-4 w-4" />
              </Button>
              
              {isUploadMenuOpen && (
                <FileUploadMenu 
                  onFileSelect={handleFileSelectType}
                  disabled={fileManager.files.length >= 10}
                />
              )}
            </div>

            {/* Text Input - Use Emergency Mode Input for Performance */}
            <div className="flex-1">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={fileManager.files.length > 0 ? "Add context about these files..." : "Ask anything..."}
                className="w-full bg-card border border-line rounded-xl px-4 py-3 text-text placeholder:text-muted resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/30"
                rows={1}
                style={{ minHeight: '44px', maxHeight: '120px' }}
                disabled={isLoading}
              />
            </div>

            {/* Voice and Send Buttons */}
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleVoiceRecord}
                className={`p-2 ${isRecording ? 'text-destructive' : 'text-muted hover:text-text'}`}
                disabled={fileManager.files.length >= 10}
              >
                {isRecording ? (
                  <div className="w-4 h-4 bg-destructive rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>
              
              <Button
                onClick={handleSendMessage}
                disabled={(!inputValue.trim() && fileManager.files.length === 0) || isLoading}
                className="bg-primary text-black hover:bg-primary/90 disabled:opacity-50"
                size="sm"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileUpload}
        accept={FileProcessor.getAcceptString()}
        multiple
        className="hidden"
      />
    </div>
  )
}
