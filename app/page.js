"use client"
import { useChat } from "@ai-sdk/react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Settings, MessageCircle, Brain, Square, Send, Search, PenTool, Code, Zap } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge"
import { ChevronDown } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

const models = [
  {
    id: "deepseek/deepseek-r1-0528:free",
    name: "DeepSeek R1",
    description: "Latest reasoning model with advanced capabilities",
    icon: Brain,
    badge: "Free",
    badgeVariant: "secondary",
  },
  {
    id: "deepseek/deepseek-r1-0528-qwen3-8b:free",
    name: "DeepSeek R1 Qwen3-8B",
    description: "Qwen3-8B variant with reasoning",
    icon: Brain,
    badge: "Free",
    badgeVariant: "secondary",
  },
  {
    id: "deepseek/deepseek-chat",
    name: "DeepSeek Chat",
    description: "Standard conversational model",
    icon: MessageCircle,
    badge: "Pro",
    badgeVariant: "default",
  },
  {
    id: "deepseek/deepseek-chat-v3-0324:free",
    name: "DeepSeek Chat v3",
    description: "March 2024 version",
    icon: MessageCircle,
    badge: "Free",
    badgeVariant: "secondary",
  },
]

// Function to render HTML content safely
function renderMessageContent(content) {
  // Create a temporary div to parse HTML
  const tempDiv = document.createElement("div")
  tempDiv.innerHTML = content

  // Style code blocks
  const codeElements = tempDiv.querySelectorAll("code")
  codeElements.forEach((code) => {
    code.style.backgroundColor = "#f3f4f6"
    code.style.padding = "2px 6px"
    code.style.borderRadius = "4px"
    code.style.fontFamily = 'Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace'
    code.style.fontSize = "0.875rem"
    code.style.border = "1px solid #e5e7eb"

    // If it's a multi-line code block, add more styling
    if (code.textContent && code.textContent.includes("\n")) {
      code.style.display = "block"
      code.style.padding = "12px"
      code.style.margin = "8px 0"
      code.style.whiteSpace = "pre"
      code.style.overflow = "auto"
    }
  })

  // Add extra spacing for lists, bold, and links
  tempDiv.querySelectorAll("li").forEach((li) => {
    li.style.marginBottom = "0.5em"
    li.style.marginLeft = "1.5em"
    li.innerHTML = "\t" + li.innerHTML
  })
  tempDiv.querySelectorAll("strong, b").forEach((b) => {
    b.style.display = "inline-block"
    b.style.marginTop = "0.5em"
    b.style.marginBottom = "0.2em"
  })
  tempDiv.querySelectorAll("a").forEach((a) => {
    a.style.display = "block"
    a.style.marginTop = "0.3em"
    a.style.wordBreak = "break-all"
  })
  tempDiv.querySelectorAll("br").forEach((br) => {
    br.insertAdjacentHTML('afterend', '<br>')
  })

  // Add extra line breaks after paragraphs
  tempDiv.querySelectorAll("p").forEach((p) => {
    p.style.marginBottom = "1em"
  })

  return tempDiv.innerHTML
}

export default function DeepSeekChat() {
  const [selectedModel, setSelectedModel] = useState("deepseek/deepseek-r1-0528:free")
  const [showSettings, setShowSettings] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [activeTools, setActiveTools] = useState([])
  const [focusMode, setFocusMode] = useState("general")

  // Load saved settings from localStorage on component mount
  useEffect(() => {
    setIsClient(true)
    const savedModel = localStorage.getItem("deepseek-model")
    if (savedModel) {
      setSelectedModel(savedModel)
    }
  }, [])

  // Save model selection to localStorage whenever it changes
  useEffect(() => {
    if (isClient && selectedModel) {
      localStorage.setItem("deepseek-model", selectedModel)
    }
  }, [selectedModel, isClient])

  const { messages, input, handleInputChange, handleSubmit, isLoading, error, stop } = useChat({
    api: "/api/chat",
    streamProtocol: "text",
    body: {
      model: selectedModel,
      focusMode: focusMode,
    },
  })

  const handleStop = () => {
    stop()
  }

  const selectedModelInfo = models.find((m) => m.id === selectedModel)
  const isReasoningModel = selectedModel.includes("r1")

  // Function to get mode-specific descriptions
  const getModeDescription = (mode) => {
    switch (mode) {
      case "general":
        return "Get comprehensive answers with smart search when needed"
      case "contentWriting":
        return "Create content with current examples and best practices"
      case "coding":
        return "Code with latest documentation and solutions"
      case "reasoning":
        return "Analyze problems with current data and methodologies"
      case "webSearch":
        return "Get real-time information with AI analysis"
      default:
        return "AI-powered assistance"
    }
  }

  const getModeIcon = (mode) => {
    switch (mode) {
      case "general":
        return <MessageCircle className="w-5 h-5" />
      case "contentWriting":
        return <PenTool className="w-5 h-5" />
      case "coding":
        return <Code className="w-5 h-5" />
      case "reasoning":
        return <Brain className="w-5 h-5" />
      case "webSearch":
        return <Search className="w-5 h-5" />
      default:
        return <MessageCircle className="w-5 h-5" />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Aly AI Chat
          </h1>
          <p className="text-gray-600">Chat with powerful DeepSeek AI models</p>
        </div>

        {/* Settings Panel */}
        <Collapsible open={showSettings} onOpenChange={setShowSettings}>
          <Card className="mb-6 shadow-sm border-0 bg-white/70 backdrop-blur-sm">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-gray-50/50 transition-colors rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-blue-600" />
                  Model Selection
                  {!showSettings && selectedModelInfo && (
                    <div className="flex items-center gap-2 ml-auto">
                      <Badge variant={selectedModelInfo.badgeVariant}>{selectedModelInfo.badge}</Badge>
                      <span className="text-sm text-green-600">✓ {selectedModelInfo.name}</span>
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="model">Choose AI Model</Label>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger className="w-full px-3 py-[30px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {models.map((model) => {
                        const IconComponent = model.icon
                        return (
                          <SelectItem key={model.id} value={model.id}>
                            <div className="flex items-center gap-3 py-1">
                              <IconComponent className="w-4 h-4 text-blue-600" />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{model.name}</span>
                                  <Badge variant={model.badgeVariant} className="text-xs">
                                    {model.badge}
                                  </Badge>
                                </div>
                                <p className="text-xs text-gray-500">{model.description}</p>
                              </div>
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                  {selectedModelInfo && (
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                      <p className="text-sm text-blue-800">
                        <strong>{selectedModelInfo.name}:</strong> {selectedModelInfo.description}
                        {isReasoningModel && " Perfect for complex reasoning tasks and step-by-step problem solving."}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Chat Interface */}
        <Card className="h-[750px] flex flex-col shadow-lg border-0 bg-white/80 backdrop-blur-sm pt-0 pb-3">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-t-lg px-3 py-4">
            <CardTitle className="flex items-center gap-2">
              {getModeIcon(focusMode)}
              {focusMode === "general" && "General Chat"}
              {focusMode === "contentWriting" && "Content Writing"}
              {focusMode === "coding" && "Coding Assistant"}
              {focusMode === "reasoning" && "Reasoning Mode"}
              {focusMode === "webSearch" && "Smart Search"}
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                <Zap className="w-3 h-3 mr-1" />
                Smart Mode
              </Badge>
              {selectedModelInfo && (
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                  {selectedModelInfo.badge}
                </Badge>
              )}
              {isLoading && (
                <Button
                  onClick={handleStop}
                  variant="secondary"
                  size="sm"
                  className="ml-auto bg-white/20 text-white hover:bg-white/30 border-white/30"
                >
                  <Square className="w-4 h-4 mr-1" />
                  Stop
                </Button>
              )}
            </CardTitle>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto space-y-4 p-6">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 mt-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                  {getModeIcon(focusMode)}
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  {focusMode === "general" && "General AI Assistant"}
                  {focusMode === "contentWriting" && "Content Writing Assistant"}
                  {focusMode === "coding" && "Coding Assistant"}
                  {focusMode === "reasoning" && "Reasoning Assistant"}
                  {focusMode === "webSearch" && "Smart Search Assistant"}
                </h3>
                <p className="text-gray-500 mb-4">{getModeDescription(focusMode)}</p>

                {/* Tool Examples */}
                <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
                  <div
                    className={`p-3 rounded-lg border text-left ${
                      focusMode === "general" ? "bg-gray-100 border-gray-200" : "bg-gray-50 border-gray-100"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <MessageCircle className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">General</span>
                      {focusMode === "general" && (
                        <Badge variant="secondary" className="text-xs bg-gray-200 text-gray-800">
                          Active
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-600">Smart answers with search</p>
                  </div>
                  <div
                    className={`p-3 rounded-lg border text-left ${
                      focusMode === "contentWriting" ? "bg-green-100 border-green-200" : "bg-green-50 border-green-100"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <PenTool className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-700">Content Writing</span>
                      {focusMode === "contentWriting" && (
                        <Badge variant="secondary" className="text-xs bg-green-200 text-green-800">
                          Active
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-green-600">Current examples & trends</p>
                  </div>
                  <div
                    className={`p-3 rounded-lg border text-left ${
                      focusMode === "coding" ? "bg-purple-100 border-purple-200" : "bg-purple-50 border-purple-100"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Code className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-medium text-purple-700">Coding</span>
                      {focusMode === "coding" && (
                        <Badge variant="secondary" className="text-xs bg-purple-200 text-purple-800">
                          Active
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-purple-600">Latest docs & solutions</p>
                  </div>
                  <div
                    className={`p-3 rounded-lg border text-left ${
                      focusMode === "reasoning" ? "bg-orange-100 border-orange-200" : "bg-orange-50 border-orange-100"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Brain className="w-4 h-4 text-orange-600" />
                      <span className="text-sm font-medium text-orange-700">Reasoning</span>
                      {focusMode === "reasoning" && (
                        <Badge variant="secondary" className="text-xs bg-orange-200 text-orange-800">
                          Active
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-orange-600">Data-driven analysis</p>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-blue-100 rounded-lg border border-blue-200 text-sm text-blue-800">
                  <div className="font-semibold mb-2">🧠 All Modes Now Include Smart Search:</div>
                  <div className="space-y-1 text-xs">
                    <div>
                      1. <strong>DeepSeek optimizes</strong> your query for the specific mode
                    </div>
                    <div>
                      2. <strong>Brave Search</strong> finds relevant current information
                    </div>
                    <div>
                      3. <strong>DeepSeek analyzes</strong> results in your chosen focus area
                    </div>
                  </div>
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} overflow-x-auto`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm whitespace-pre-line break-words ${
                    message.role === "user"
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                      : focusMode === "general"
                        ? "bg-gray-50 text-gray-900 border border-gray-200"
                        : focusMode === "contentWriting"
                          ? "bg-green-50 text-gray-900 border border-green-200"
                          : focusMode === "coding"
                            ? "bg-purple-50 text-gray-900 border border-purple-200"
                            : focusMode === "reasoning"
                              ? "bg-orange-50 text-gray-900 border border-orange-200"
                              : "bg-blue-50 text-gray-900 border border-blue-200"
                  }`}
                >
                  <div
                    className="text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html:
                        message.role === "user"
                          ? message.content.replace(/\n/g, "<br>")
                          : renderMessageContent(message.content),
                    }}
                  />
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div
                  className={`rounded-2xl px-4 py-3 text-gray-600 border shadow-sm ${
                    focusMode === "general"
                      ? "bg-gray-50 border-gray-200"
                      : focusMode === "contentWriting"
                        ? "bg-green-50 border-green-200"
                        : focusMode === "coding"
                          ? "bg-purple-50 border-purple-200"
                          : focusMode === "reasoning"
                            ? "bg-orange-50 border-orange-200"
                            : "bg-blue-50 border-blue-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="animate-spin w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full"></div>
                    <span className="text-sm">Optimizing query → Searching → Analyzing...</span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 overflow-x-auto">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <strong>Error:</strong> {error.message}
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="bg-gray-50/50 rounded-b-lg">
            <form onSubmit={handleSubmit} className="flex w-full gap-2">
              <Input
                value={input}
                onChange={handleInputChange}
                placeholder={
                  isLoading
                    ? "Type your next message..."
                    : focusMode === "general"
                      ? "Ask anything - I'll search for current info when needed..."
                      : focusMode === "contentWriting"
                        ? "Ask about writing - I'll find current examples and trends..."
                        : focusMode === "coding"
                          ? "Ask about code - I'll search for latest docs and solutions..."
                          : focusMode === "reasoning"
                            ? "Ask me to analyze - I'll find current data and methods..."
                            : "Search for current information with AI analysis..."
                }
                className="flex-1 border-gray-200 focus:border-blue-400 focus:ring-blue-400"
              />

              {/* Focus Mode Selector */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="px-3 border-gray-200 hover:bg-gray-50 bg-transparent"
                  >
                    <div className="flex items-center gap-2">
                      {focusMode === "general" && <MessageCircle className="w-4 h-4 text-gray-600" />}
                      {focusMode === "webSearch" && <Search className="w-4 h-4 text-blue-600" />}
                      {focusMode === "contentWriting" && <PenTool className="w-4 h-4 text-green-600" />}
                      {focusMode === "coding" && <Code className="w-4 h-4 text-purple-600" />}
                      {focusMode === "reasoning" && <Brain className="w-4 h-4 text-orange-600" />}
                      <ChevronDown className="w-3 h-3 text-gray-400" />
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => setFocusMode("general")}>
                    <div className="flex items-center gap-2 w-full">
                      <MessageCircle className="w-4 h-4 text-gray-600" />
                      <div>
                        <div className="font-medium">General</div>
                        <div className="text-xs text-gray-500">Smart AI + Search</div>
                      </div>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFocusMode("webSearch")}>
                    <div className="flex items-center gap-2 w-full">
                      <Search className="w-4 h-4 text-blue-600" />
                      <div>
                        <div className="font-medium">Web Search</div>
                        <div className="text-xs text-gray-500">Direct Search Focus</div>
                      </div>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFocusMode("contentWriting")}>
                    <div className="flex items-center gap-2 w-full">
                      <PenTool className="w-4 h-4 text-green-600" />
                      <div>
                        <div className="font-medium">Content Writing</div>
                        <div className="text-xs text-gray-500">Writing + Search</div>
                      </div>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFocusMode("coding")}>
                    <div className="flex items-center gap-2 w-full">
                      <Code className="w-4 h-4 text-purple-600" />
                      <div>
                        <div className="font-medium">Coding</div>
                        <div className="text-xs text-gray-500">Code + Search</div>
                      </div>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFocusMode("reasoning")}>
                    <div className="flex items-center gap-2 w-full">
                      <Brain className="w-4 h-4 text-orange-600" />
                      <div>
                        <div className="font-medium">Reasoning</div>
                        <div className="text-xs text-gray-500">Analysis + Search</div>
                      </div>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                type="submit"
                disabled={!input.trim()}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
