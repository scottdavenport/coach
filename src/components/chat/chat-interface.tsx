'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Mic, Send, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChatMessage } from './chat-message'
import { FileUploadMenu } from './file-upload-menu'
import { createClient } from '@/lib/supabase/client'

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
  const [pendingFile, setPendingFile] = useState<{
    file: File
    fileUrl: string
    fileName: string
    uploaded: boolean
  } | null>(null)
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

  const handleSendMessage = async () => {
    if ((!inputValue.trim() && !pendingFile) || isLoading) return

    // If we have a pending file, process it with context
    if (pendingFile) {
      await handleFileWithContext()
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
        throw new Error('Failed to send message')
      }

      const data = await response.json()
      
      const aiMessage = {
        id: Date.now() + 1,
        content: data.message,
        role: 'assistant',
        timestamp: new Date(),
      }
      
      setMessages(prev => [...prev, aiMessage])

      // Automatically store data if we have parsed data (no review needed)
      if (data.parsedData && (data.parsedData.health_events.length > 0 || data.parsedData.context_data.length > 0)) {
        console.log('🔍 Attempting to store conversation data:', data.parsedData)
        await storeDataAutomatically(data.parsedData)
      } else {
        console.log('🔍 No parsed data to store or data is empty')
      }

    } catch (error) {
      console.error('Error sending message:', error)
      const aiErrorResponse = await sendErrorToAI('connection issue', 'The user tried to send a message but I had trouble connecting.')
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

  const handleFileWithContext = async () => {
    if (!pendingFile) return

    setIsLoading(true)

    try {
      // Create combined message with file and context
      const contextText = inputValue.trim() || 'No additional context provided'
      const combinedMessage = `📎 File: ${pendingFile.fileName}\n\nContext: ${contextText}\n\nFile URL: ${pendingFile.fileUrl}`

      const userMessage = {
        id: Date.now(),
        content: combinedMessage,
        role: 'user',
        timestamp: new Date(),
        hasFile: true,
        fileName: pendingFile.fileName,
        fileUrl: pendingFile.fileUrl
      }

      setMessages(prev => [...prev, userMessage])
      setInputValue('')
      setPendingFile(null)

      // Call real OCR Edge Function
      console.log('🚀 Calling OCR Edge Function with:', pendingFile.fileUrl)
      
      try {
        const ocrResult = await callOcrFunction(pendingFile.fileUrl, userId)
        console.log('OCR Result:', ocrResult)
        
        if (ocrResult.success) {
          // Store the structured data first
          if (ocrResult.structuredData) {
            console.log('🔍 Storing structured OCR data:', ocrResult.structuredData);
            try {
              await storeOcrData(ocrResult.structuredData, userId);
              console.log('✅ OCR data stored successfully');
            } catch (error) {
              console.error('❌ Failed to store OCR data:', error);
            }
          } else {
            console.log('🔍 No structured data in OCR result')
          }
          
          // Send to OpenAI for natural conversational response
          const aiResponse = await sendToAIWithOcrData(ocrResult.structuredData, contextText, pendingFile.fileName)
          
          const ocrMessage = {
            id: Date.now() + 1,
            content: aiResponse,
            role: 'assistant',
            timestamp: new Date(),
            isOcrResult: true,
            structuredData: ocrResult.structuredData
          }
          setMessages(prev => [...prev, ocrMessage])
        } else {
          throw new Error(ocrResult.error || 'OCR processing failed')
        }
      } catch (error) {
        console.error('OCR processing error:', error)
        const aiErrorResponse = await sendErrorToAI('OCR processing failure', `The OCR processing failed for file ${pendingFile.fileName}. Error: ${error.message}. Context provided: "${contextText}"`)
        const errorMessage = {
          id: Date.now() + 1,
          content: aiErrorResponse,
          role: 'assistant',
          timestamp: new Date(),
          isOcrResult: true
        }
        setMessages(prev => [...prev, errorMessage])
      }

    } catch (error) {
      console.error('Error processing file with context:', error)
      const aiErrorResponse = await sendErrorToAI('file processing issue', `The user tried to upload a file (${pendingFile?.fileName}) but I had trouble processing it.`)
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
      
      // Update the database with corrected data
      await storeOcrData(correctedData, userId)
      
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
      const aiErrorResponse = await sendErrorToAI('data update issue', 'The user tried to correct some health data but I had trouble updating it in the database.')
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



  // Send error to OpenAI for natural conversational response
  const sendErrorToAI = async (errorType: string, context: string = '') => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `I encountered an error: ${errorType}. ${context} Please give me a natural, conversational response to apologize to the user and suggest what they can do. Be friendly and helpful, but don't be robotic or templated.`,
          conversationId: Date.now().toString(),
          conversationState: 'error',
          checkinProgress: {}
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to get AI response: ${response.status}`)
      }

      const data = await response.json()
      return data.message || "I'm having some technical difficulties right now. Could you try again in a moment?"
    } catch (error) {
      console.error('Error getting AI response for error:', error)
      // Minimal fallback if AI completely fails
      return "I'm having some technical difficulties right now. Could you try again in a moment?"
    }
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
      return data.message || await sendErrorToAI('correction response generation', 'I successfully updated the data but had trouble generating a response.')
    } catch (error) {
      console.error('Error getting AI response for correction:', error)
      // Fallback to AI error response if AI fails
      return await sendErrorToAI('correction response generation', 'I successfully updated the data but had trouble generating a response.')
    }
  }

  // Send OCR data to OpenAI for natural conversational response
  const sendToAIWithOcrData = async (structuredData: any, context: string, fileName: string) => {
    try {
      // Send the RAW OCR text to the AI for dynamic parsing
      const rawOcrText = structuredData.rawOcrText || 'No OCR text available'
      
      // Create a summary of any regex-detected data as fallback
      const detectedMetrics = []
      if (structuredData.readiness_score) detectedMetrics.push(`readiness score: ${structuredData.readiness_score}`)
      if (structuredData.sleepScore) detectedMetrics.push(`sleep score: ${structuredData.sleepScore}`)
      if (structuredData.restingHeartRate) detectedMetrics.push(`resting heart rate: ${structuredData.restingHeartRate} bpm`)
      if (structuredData.heartRateVariability) detectedMetrics.push(`HRV: ${structuredData.heartRateVariability} ms`)
      if (structuredData.bodyTemperature) detectedMetrics.push(`body temperature: ${structuredData.bodyTemperature}°F`)
      if (structuredData.respiratoryRate) detectedMetrics.push(`respiratory rate: ${structuredData.respiratoryRate}/min`)
      if (structuredData.totalSleep) detectedMetrics.push(`total sleep: ${Math.floor(structuredData.totalSleep / 60)}h ${structuredData.totalSleep % 60}m`)
      if (structuredData.timeInBed) detectedMetrics.push(`time in bed: ${Math.floor(structuredData.timeInBed / 60)}h ${structuredData.timeInBed % 60}m`)
      if (structuredData.sleepEfficiency) detectedMetrics.push(`sleep efficiency: ${structuredData.sleepEfficiency}%`)
      if (structuredData.remSleep) detectedMetrics.push(`REM sleep: ${Math.floor(structuredData.remSleep / 60)}h ${structuredData.remSleep % 60}m`)
      if (structuredData.deepSleep) detectedMetrics.push(`deep sleep: ${Math.floor(structuredData.deepSleep / 60)}h ${structuredData.deepSleep % 60}m`)
      if (structuredData.steps) detectedMetrics.push(`steps: ${structuredData.steps}`)
      if (structuredData.calories) detectedMetrics.push(`calories: ${structuredData.calories}`)
      if (structuredData.glucose) detectedMetrics.push(`glucose: ${structuredData.glucose} mg/dL`)

      const dataSummary = detectedMetrics.length > 0 ? detectedMetrics.join(', ') : 'some health data'
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `I just uploaded a screenshot (${fileName}) and the OCR extracted this raw text: "${rawOcrText}". ${context ? `Context: ${context}` : ''} Please analyze this OCR text and extract ALL the health metrics you can find. Don't just look for the ones I've already detected (${dataSummary}) - look for everything! Extract metrics like oxygen saturation, breathing regularity, average heart rate, lowest heart rate, sleep stages, etc. Give me a natural, conversational response about this health data. Don't be robotic or templated - just talk to me like a friend would about my health data.`,
          conversationId: Date.now().toString(),
          conversationState: 'ocr_analysis',
          checkinProgress: {}
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to get AI response: ${response.status}`)
      }

      const data = await response.json()
      return data.message || await sendErrorToAI('OCR response generation', 'I successfully processed the health data but had trouble generating a response.')
    } catch (error) {
      console.error('Error getting AI response for OCR data:', error)
      // Fallback to AI error response if AI fails
      return await sendErrorToAI('OCR response generation', 'I successfully processed the health data but had trouble generating a response.')
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

  const storeDataAutomatically = async (parsedData: any) => {
    try {
      console.log('🔍 storeDataAutomatically called with:', parsedData)
      
      const requestBody = {
        events: parsedData.health_events.filter((e: any) => e.should_store),
        contextData: parsedData.context_data.filter((c: any) => c.should_store),
        dailySummary: parsedData.daily_summary,
        conversationId: Date.now().toString(),
      }
      
      console.log('🔍 Request body:', requestBody)
      
      const response = await fetch('/api/health/store', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      console.log('🔍 Response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Failed to store data automatically:', response.status, errorText)
      } else {
        const result = await response.json()
        console.log('✅ Data stored successfully:', result)
        // Trigger daily card refresh via callback
        if (onDataStored) {
          setTimeout(() => {
            onDataStored()
          }, 500) // Small delay to ensure database write is complete
        }
      }
    } catch (error) {
      console.error('❌ Error storing data automatically:', error)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Show uploading message
    const uploadingMessage = {
      id: Date.now(),
      content: `📤 Uploading: ${file.name}...`,
      role: 'user',
      timestamp: new Date(),
      isUploading: true
    }
    setMessages(prev => [...prev, uploadingMessage])

    try {

      // Upload to Supabase Storage
      const supabase = createClient()
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `${userId}/uploads/${fileName}`

      const { error } = await supabase.storage
        .from('user-uploads')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('Upload error:', error)
        // Update message to show error
        setMessages(prev => prev.map(msg => 
          msg.id === uploadingMessage.id 
            ? { ...msg, content: `❌ Upload failed: ${file.name}`, isUploading: false }
            : msg
        ))
        return
      }

      // Get signed URL for private bucket (expires in 1 hour)
      const { data: { signedUrl } } = await supabase.storage
        .from('user-uploads')
        .createSignedUrl(filePath, 3600) // 1 hour expiry

      if (!signedUrl) {
        throw new Error('Failed to create signed URL')
      }

      // Store file as pending for user to add context
      setPendingFile({
        file,
        fileUrl: signedUrl,
        fileName: file.name,
        uploaded: true
      })

      // Remove the uploading message - no message in chat until user sends
      setMessages(prev => prev.filter(msg => msg.id !== uploadingMessage.id))

      // Close the upload menu
      setIsUploadMenuOpen(false)
      
      // Clear the file input
      event.target.value = ''

    } catch (error) {
      console.error('File upload error:', error)
      // Update message to show error
      setMessages(prev => prev.map(msg => 
        msg.id === uploadingMessage?.id 
          ? { ...msg, content: `❌ Upload failed: ${file.name}`, isUploading: false }
          : msg
      ))
    }
  }

  const handleVoiceRecord = () => {
    setIsRecording(!isRecording)
    // TODO: Implement voice recording
  }

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

  // Store structured OCR data in the new structured metrics system
  const storeOcrData = async (structuredData: any, userId: string) => {
    try {
      console.log('🔍 storeOcrData called with:', structuredData)
      const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
      
      // Map OCR data to our structured metrics using the mapping function
      const mappedMetrics = await mapOcrToStructuredMetrics(structuredData)
      console.log('🔍 Mapped metrics:', mappedMetrics)
      
      // Store using the new structured metrics API
      console.log('🔍 Sending request to /api/metrics/daily with:', { date: today, metrics: mappedMetrics })
      
      const response = await fetch('/api/metrics/daily', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: today,
          metrics: mappedMetrics
        }),
      })

      console.log('🔍 Response status:', response.status)
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ Failed to store OCR data in structured system:', errorData)
        throw new Error(`Failed to store data: ${errorData.error || 'Unknown error'}`)
      }

      const result = await response.json()
      console.log('✅ OCR data stored successfully in structured system:', result)
      
      // Trigger daily card refresh
      if (onDataStored) {
        console.log('Triggering daily card refresh...')
        setTimeout(() => {
          onDataStored()
        }, 1000) // Increased delay to ensure database write completes
      }
      
      return result
    } catch (error) {
      console.error('Failed to store OCR data:', error)
      throw error
    }
  }

  // Helper function to map OCR data to structured metrics
  const mapOcrToStructuredMetrics = async (ocrData: any) => {
    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]
    
    console.log('🔍 mapOcrToStructuredMetrics called with:', ocrData)
    
    // Handle different OCR data formats
    let mappings = {}
    
    // If ocrData has context_data (from conversation parsing)
    if (ocrData.context_data && Array.isArray(ocrData.context_data)) {
      console.log('🔍 Processing context_data format')
      ocrData.context_data.forEach((item: any) => {
        if (item.should_store) {
          mappings[item.key] = item.value
        }
      })
    }
    // If ocrData has daily_summary (from conversation parsing)
    else if (ocrData.daily_summary) {
      console.log('🔍 Processing daily_summary format')
      mappings = { ...ocrData.daily_summary }
    }
    // If ocrData is a flat object (direct OCR result)
    else {
      console.log('🔍 Processing flat object format')
      mappings = {
        // Sleep metrics
        'readiness_score': ocrData.readiness || ocrData.readiness_score,
        'sleep_score': ocrData.sleepScore || ocrData.sleep,
        'sleep_duration': ocrData.totalSleep,
        'time_in_bed': ocrData.timeInBed,
        'sleep_efficiency': ocrData.sleepEfficiency,
        'rem_sleep': ocrData.remSleep,
        'deep_sleep': ocrData.deepSleep,
        
        // Health metrics
        'resting_heart_rate': ocrData.restingHeartRate || ocrData.heartRate,
        'heart_rate_variability': ocrData.heartRateVariability,
        'body_temperature': ocrData.bodyTemperature,
        'glucose': ocrData.glucose,
        
        // Activity metrics
        'steps': ocrData.steps,
        'calories_burned': ocrData.calories,
        
        // Wellness metrics
        'energy': ocrData.energy,
        'mood': ocrData.mood,
        'stress': ocrData.stress
      }
    }
    
    console.log('🔍 Final mappings:', mappings)
    
    const metrics = []
    
    // Get metric IDs for each metric key
    for (const [metricKey, value] of Object.entries(mappings)) {
      if (value !== null && value !== undefined) {
        // Get the metric ID from the database
        const { data: metricData, error } = await supabase
          .from('standard_metrics')
          .select('id')
          .eq('metric_key', metricKey)
          .single()
        
        if (metricData) {
          metrics.push({
            metric_id: metricData.id,
            metric_date: today,
            metric_value: typeof value === 'number' ? value : null,
            text_value: typeof value === 'string' ? value : null,
            boolean_value: typeof value === 'boolean' ? value : null,
            source: 'ocr',
            confidence: 0.9 // High confidence for OCR data
          })
        } else {
          console.warn(`Metric key not found: ${metricKey}`)
        }
      }
    }
    
    return metrics
  }

  return (
    <div className="flex flex-col h-full">
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
          {/* Pending File Indicator */}
          {pendingFile && (
            <div className="mb-3 p-3 bg-primary/10 border border-primary/30 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                    <span className="text-xs font-medium">📎</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{pendingFile.fileName}</p>
                    <p className="text-xs text-muted">Add context and click Send to process</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPendingFile(null)}
                  className="text-muted hover:text-destructive"
                >
                  ✕
                </Button>
              </div>
            </div>
          )}

          <div className="flex items-center space-x-3">
            {/* Attachment Button */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsUploadMenuOpen(!isUploadMenuOpen)}
                className="p-2 text-muted hover:text-text"
                disabled={!!pendingFile}
              >
                <Plus className="h-4 w-4" />
              </Button>
              
              {isUploadMenuOpen && (
                <FileUploadMenu 
                  onFileSelect={() => fileInputRef.current?.click()}
                />
              )}
            </div>

            {/* Text Input */}
            <div className="flex-1">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={pendingFile ? "Add context about this image..." : "Ask anything..."}
                className="w-full bg-card border border-line rounded-xl px-4 py-3 text-text placeholder:text-muted resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/30"
                rows={1}
                style={{ minHeight: '44px', maxHeight: '120px' }}
              />
            </div>

            {/* Voice and Send Buttons */}
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleVoiceRecord}
                className={`p-2 ${isRecording ? 'text-destructive' : 'text-muted hover:text-text'}`}
                disabled={!!pendingFile}
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
                disabled={(!inputValue.trim() && !pendingFile) || isLoading}
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
        accept="image/*,.pdf,.doc,.docx"
        className="hidden"
      />
    </div>
  )
}
