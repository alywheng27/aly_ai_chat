import { Search, PenTool, Code, Brain } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const toolExamples = [
  {
    name: "Web Search",
    icon: Search,
    color: "blue",
    examples: [
      "Search for latest AI developments",
      "Find current stock prices for Tesla",
      "What's happening in tech news today?",
    ],
  },
  {
    name: "Content Writing",
    icon: PenTool,
    color: "green",
    examples: [
      "Write a blog post about sustainable energy",
      "Create a professional email template",
      "Draft social media content for a product launch",
    ],
  },
  {
    name: "Coding",
    icon: Code,
    color: "purple",
    examples: [
      "Create a React component for a todo list",
      "Debug this Python function",
      "Convert this JavaScript to TypeScript",
    ],
  },
  {
    name: "Reasoning",
    icon: Brain,
    color: "orange",
    examples: [
      "Analyze the pros and cons of remote work",
      "Solve this complex math problem step by step",
      "Help me make a strategic business decision",
    ],
  },
]

export function ToolExamples() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
      {toolExamples.map((tool) => {
        const IconComponent = tool.icon
        return (
          <Card key={tool.name} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <IconComponent className={`w-5 h-5 text-${tool.color}-600`} />
                {tool.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {tool.examples.map((example, index) => (
                  <div
                    key={index}
                    className={`text-sm p-2 bg-${tool.color}-50 rounded border border-${tool.color}-100 text-${tool.color}-700`}
                  >
                    &ldquo;{example}&rdquo;
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
