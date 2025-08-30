export interface WorkoutStep {
  title: string
  duration: string
  description: string
}

export interface ParsedWorkout {
  title: string
  steps: WorkoutStep[]
  totalTime: string
}

export function parseWorkoutFromMarkdown(markdown: string): ParsedWorkout | null {
  try {
    // Extract title (usually after ### or ##)
    const titleMatch = markdown.match(/(?:###|##)\s*(.+?)(?:\n|$)/)
    const title = titleMatch ? titleMatch[1].replace(/:/g, '').trim() : 'Workout Routine'

    // Extract total time
    const totalTimeMatch = markdown.match(/Total Time:\s*(\d+\s*minutes?)/i)
    const totalTime = totalTimeMatch ? totalTimeMatch[1] : '8 minutes'

    // Extract steps (numbered list items)
    const stepRegex = /(\d+)\.\s*\*\*(.+?)\*\*\s*\(([^)]+)\)\s*-\s*(.+?)(?=\n\d+\.|$)/gs
    const steps: WorkoutStep[] = []
    
    let match
    while ((match = stepRegex.exec(markdown)) !== null) {
      const [, , title, duration, description] = match
      steps.push({
        title: title.trim(),
        duration: duration.trim(),
        description: description.trim()
      })
    }

    // If no numbered steps found, try alternative format
    if (steps.length === 0) {
      const altStepRegex = /(\d+)\.\s*(.+?)\s*\(([^)]+)\)\s*-\s*(.+?)(?=\n\d+\.|$)/gs
      while ((match = altStepRegex.exec(markdown)) !== null) {
        const [, , title, duration, description] = match
        steps.push({
          title: title.trim(),
          duration: duration.trim(),
          description: description.trim()
        })
      }
    }

    // If still no steps, try to extract from any list format
    if (steps.length === 0) {
      const listItemRegex = /[-*]\s*(.+?)\s*\(([^)]+)\)\s*-\s*(.+?)(?=\n[-*]|$)/gs
      while ((match = listItemRegex.exec(markdown)) !== null) {
        const [, title, duration, description] = match
        steps.push({
          title: title.trim(),
          duration: duration.trim(),
          description: description.trim()
        })
      }
    }

    if (steps.length === 0) {
      return null
    }

    return {
      title,
      steps,
      totalTime
    }
  } catch (error) {
    console.error('Error parsing workout from markdown:', error)
    return null
  }
}

// Example usage for the golf warm-up workout
export function createGolfWarmupWorkout(): ParsedWorkout {
  return {
    title: "Pre-Golf Mobility and Warm-Up Routine",
    totalTime: "8 minutes",
    steps: [
      {
        title: "Dynamic Arm Circles",
        duration: "1 minute",
        description: "Stand tall and extend your arms out to the sides. Make small circles forward for 30 seconds, then reverse for another 30 seconds."
      },
      {
        title: "Torso Twists",
        duration: "1 minute",
        description: "Stand with your feet shoulder-width apart. Rotate your torso to the right and then to the left, allowing your arms to follow the motion. Repeat for 1 minute."
      },
      {
        title: "Leg Swings",
        duration: "1 minute",
        description: "Stand next to a wall for support. Swing one leg forward and backward for 30 seconds, then switch to the other leg."
      },
      {
        title: "Hip Openers",
        duration: "1 minute",
        description: "Stand tall and lift your right knee towards your chest. Rotate it outward and then back down. Repeat for 30 seconds on each leg."
      },
      {
        title: "Ankle Rolls",
        duration: "1 minute",
        description: "Lift one foot off the ground and roll your ankle in circles for 30 seconds, then switch to the other foot."
      },
      {
        title: "Walking Lunges",
        duration: "2 minutes",
        description: "Take a step forward with your right leg and lower into a lunge. Alternate legs while walking forward for about 2 minutes."
      },
      {
        title: "Gentle Stretching",
        duration: "2 minutes",
        description: "Finish with some gentle stretches for your arms, legs, and back to loosen up any tight spots."
      }
    ]
  }
}
