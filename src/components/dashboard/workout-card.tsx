'use client'

import { useState } from 'react'
import { Clock, CheckCircle, Play, Pause, RotateCcw, Check, Edit2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EditableField } from './editable-field'

interface WorkoutStep {
  title: string
  duration: string
  description: string
  completed?: boolean
  equipment?: string
  weight?: string
}

interface WorkoutCardProps {
  title: string
  steps: WorkoutStep[]
  totalTime: string
  onComplete?: () => void
}

export function WorkoutCard({ title, steps, totalTime, onComplete }: WorkoutCardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isActive, setIsActive] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [stepData, setStepData] = useState<WorkoutStep[]>(steps.map(step => ({
    ...step,
    equipment: step.equipment || '',
    weight: step.weight || ''
  })))

  const startWorkout = () => {
    setIsActive(true)
    setCurrentStep(0)
    setTimeRemaining(parseInt(steps[0].duration) * 60) // Convert minutes to seconds
  }

  const pauseWorkout = () => {
    setIsActive(false)
  }

  const resetWorkout = () => {
    setIsActive(false)
    setCurrentStep(0)
    setTimeRemaining(0)
    setCompletedSteps(new Set())
  }

  const completeStep = (stepIndex: number) => {
    setCompletedSteps(prev => new Set([...prev, stepIndex]))
    
    if (stepIndex === steps.length - 1) {
      // Workout complete
      setIsActive(false)
      if (onComplete) onComplete()
    } else {
      // Move to next step
      setCurrentStep(stepIndex + 1)
      setTimeRemaining(parseInt(steps[stepIndex + 1].duration) * 60)
    }
  }

  const toggleStepCompletion = (stepIndex: number) => {
    if (completedSteps.has(stepIndex)) {
      setCompletedSteps(prev => {
        const newSet = new Set(prev)
        newSet.delete(stepIndex)
        return newSet
      })
    } else {
      setCompletedSteps(prev => new Set([...prev, stepIndex]))
    }
  }

  const updateStepData = (index: number, field: keyof WorkoutStep, value: string) => {
    setStepData(prev => prev.map((step, i) => 
      i === index ? { ...step, [field]: value } : step
    ))
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const parseDuration = (duration: string): number => {
    const match = duration.match(/(\d+)/)
    return match ? parseInt(match[1]) : 1
  }

  // Check if step mentions equipment or weights
  const hasEquipment = (description: string): boolean => {
    const equipmentKeywords = ['dumbbell', 'weight', 'kettlebell', 'barbell', 'resistance', 'band', 'machine']
    return equipmentKeywords.some(keyword => 
      description.toLowerCase().includes(keyword)
    )
  }

  return (
    <div className="bg-card border border-line rounded-lg p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white mb-1">{title}</h3>
          <div className="flex items-center text-sm text-blue-300">
            <Clock className="w-4 h-4 mr-2" />
            <span className="font-medium">Total Time: {totalTime}</span>
          </div>
        </div>
        
        {/* Workout Controls */}
        <div className="flex space-x-2">
          {!isActive ? (
            <Button onClick={startWorkout} size="sm" className="bg-green-600 hover:bg-green-700 text-white">
              <Play className="w-4 h-4 mr-1" />
              Start
            </Button>
          ) : (
            <>
              <Button onClick={pauseWorkout} size="sm" variant="outline" className="border-orange-500 text-orange-400 hover:bg-orange-500/10">
                <Pause className="w-4 h-4 mr-1" />
                Pause
              </Button>
              <Button onClick={resetWorkout} size="sm" variant="outline" className="border-gray-500 text-gray-400 hover:bg-gray-500/10">
                <RotateCcw className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Current Step Timer */}
      {isActive && (
        <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-blue-400 mb-2">
            {formatTime(timeRemaining)}
          </div>
          <div className="text-sm text-blue-300 font-medium">
            Step {currentStep + 1} of {steps.length}: {steps[currentStep].title}
          </div>
        </div>
      )}

      {/* Progress Bar */}
      <div className="w-full bg-gray-700 rounded-full h-3">
        <div 
          className="bg-gradient-to-r from-green-500 to-blue-500 h-3 rounded-full transition-all duration-300"
          style={{ width: `${(completedSteps.size / steps.length) * 100}%` }}
        />
        <div className="text-xs text-gray-400 mt-1 text-center">
          {completedSteps.size} of {steps.length} completed
        </div>
      </div>

      {/* Workout Steps */}
      <div className="space-y-3">
        {stepData.map((step, index) => (
          <div 
            key={index}
            className={`p-4 rounded-lg border transition-all duration-200 relative ${
              completedSteps.has(index)
                ? 'bg-green-600/10 border-green-500/40 shadow-lg'
                : currentStep === index && isActive
                ? 'bg-blue-600/10 border-blue-500/40 shadow-lg'
                : 'bg-gray-800/50 border-gray-600 hover:border-gray-500'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1">
                {/* Checkbox */}
                <button
                  onClick={() => toggleStepCompletion(index)}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-200 ${
                    completedSteps.has(index)
                      ? 'bg-green-500 text-white shadow-lg'
                      : 'bg-gray-600 text-gray-300 hover:bg-gray-500 border border-gray-500'
                  }`}
                >
                  {completedSteps.has(index) ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    index + 1
                  )}
                </button>
                
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h4 className={`font-semibold ${
                      completedSteps.has(index) 
                        ? 'text-green-400 line-through' 
                        : 'text-white'
                    }`}>
                      {step.title}
                    </h4>
                    <span className="text-xs text-orange-300 bg-orange-600/20 px-2 py-1 rounded-full font-medium border border-orange-500/30">
                      {step.duration}
                    </span>
                  </div>
                  
                  <p className={`text-sm leading-relaxed mb-3 ${
                    completedSteps.has(index) 
                      ? 'text-gray-500 line-through' 
                      : 'text-gray-300'
                  }`}>
                    {step.description}
                  </p>

                  {/* Equipment and Weight Fields */}
                  {hasEquipment(step.description) && (
                    <div className="flex space-x-3 mt-3">
                      {/* Equipment Field */}
                      <div className="flex-1">
                        <label className="text-xs text-gray-400 font-medium mb-1 block">
                          Equipment
                        </label>
                        <EditableField
                          value={step.equipment}
                          onSave={(value) => updateStepData(index, 'equipment', value)}
                          fieldType="text"
                          placeholder="e.g., Dumbbells"
                          className="text-base text-gray-300"
                        />
                      </div>

                      {/* Weight Field */}
                      <div className="flex-1">
                        <label className="text-xs text-gray-400 font-medium mb-1 block">
                          Weight
                        </label>
                        <EditableField
                          value={step.weight}
                          onSave={(value) => updateStepData(index, 'weight', value)}
                          fieldType="text"
                          placeholder="e.g., 20 lbs"
                          className="text-base text-gray-300"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Complete Button for Active Step */}
              {currentStep === index && isActive && !completedSteps.has(index) && (
                <Button 
                  onClick={() => completeStep(index)}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Complete
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Completion Message */}
      {completedSteps.size === steps.length && (
        <div className="bg-green-600/20 border border-green-500/40 rounded-lg p-6 text-center">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <h4 className="text-xl font-bold text-green-400 mb-2">Workout Complete! 🎉</h4>
          <p className="text-gray-300">
            Excellent work! You've completed your {title.toLowerCase()}.
          </p>
        </div>
      )}
    </div>
  )
}
