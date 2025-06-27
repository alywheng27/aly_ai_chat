// Allow streaming responses up to 5 minutes for reasoning models
export const maxDuration = 300

// Brave Search function
async function performBraveSearch(query, numResults = 5) {
  try {
    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${numResults}`,
      {
        headers: {
          "X-Subscription-Token": process.env.BRAVE_SEARCH_API_KEY,
          Accept: "application/json",
        },
      },
    )

    if (!response.ok) {
      throw new Error(`Brave Search API error: ${response.status}`)
    }

    const data = await response.json()
    return {
      results: data.web?.results || [],
      query,
      timestamp: new Date().toISOString(),
      success: true,
    }
  } catch (error) {
    console.error("Brave Search error:", error)
    return {
      error: "Failed to perform web search",
      query,
      timestamp: new Date().toISOString(),
      success: false,
    }
  }
}

// Function to get optimized search query from DeepSeek based on focus mode
async function getOptimizedSearchQuery(userQuery, apiKey, model, focusMode) {
  try {
    const focusSpecificPrompts = {
      general: `You are a search query optimization expert. Your task is to analyze user queries and create optimized search terms that will yield the best general information results from a web search engine.

Guidelines:
1. Extract the key concepts and intent from the user's question
2. Create specific, targeted search terms for comprehensive information
3. Include relevant keywords that search engines can match
4. Consider current events, dates, and context
5. Optimize for factual, authoritative sources
6. Return ONLY the optimized search query, nothing else`,

      contentWriting: `You are a search query optimization expert specializing in content writing research. Your task is to analyze user queries and create optimized search terms that will yield the best results for content creation, writing techniques, examples, and industry insights.

Guidelines:
1. Extract the key concepts related to content writing from the user's question
2. Create search terms that find writing examples, techniques, and best practices
3. Include keywords for current trends, style guides, and industry standards
4. Consider target audience, content type, and writing purpose
5. Optimize for authoritative writing resources and examples
6. Return ONLY the optimized search query, nothing else`,

      coding: `You are a search query optimization expert specializing in programming and development research. Your task is to analyze user queries and create optimized search terms that will yield the best results for coding solutions, documentation, tutorials, and technical resources.

Guidelines:
1. Extract the key programming concepts and technologies from the user's question
2. Create search terms that find code examples, documentation, and solutions
3. Include specific programming languages, frameworks, and tools
4. Consider current versions, best practices, and common issues
5. Optimize for authoritative developer resources and documentation
6. Return ONLY the optimized search query, nothing else`,

      reasoning: `You are a search query optimization expert specializing in analytical and reasoning research. Your task is to analyze user queries and create optimized search terms that will yield the best results for logical analysis, problem-solving approaches, and reasoning methodologies.

Guidelines:
1. Extract the key analytical concepts and problem types from the user's question
2. Create search terms that find reasoning frameworks, methodologies, and examples
3. Include keywords for logical analysis, decision-making, and problem-solving
4. Consider academic sources, case studies, and analytical approaches
5. Optimize for authoritative research and reasoning resources
6. Return ONLY the optimized search query, nothing else`,

      webSearch: `You are a search query optimization expert. Your task is to analyze user queries and create optimized search terms that will yield the best results from a web search engine.

Guidelines:
1. Extract the key concepts and intent from the user's question
2. Create specific, targeted search terms
3. Include relevant keywords that search engines can match
4. Consider current events, dates, and context
5. Optimize for factual, authoritative sources
6. Return ONLY the optimized search query, nothing else`,
    }

    const queryOptimizationPrompt = {
      role: "system",
      content: focusSpecificPrompts[focusMode] || focusSpecificPrompts.general,
    }

    const userPrompt = {
      role: "user",
      content: `Optimize this search query for ${focusMode} mode: "${userQuery}"`,
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://localhost:3000",
        "X-Title": "DeepSeek Chat App",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        messages: [queryOptimizationPrompt, userPrompt],
        stream: false,
        temperature: 0.3,
        max_tokens: 100,
      }),
    })

    if (!response.ok) {
      throw new Error(`Query optimization failed: ${response.status}`)
    }

    const data = await response.json()
    const optimizedQuery = data.choices?.[0]?.message?.content?.trim()

    return optimizedQuery || userQuery // Fallback to original query if optimization fails
  } catch (error) {
    console.error("Query optimization error:", error)
    return userQuery // Fallback to original query
  }
}

// Function to determine if a query needs web search
function needsWebSearch(message) {
  const searchIndicators = [
    "latest",
    "recent",
    "current",
    "today",
    "news",
    "what's happening",
    "search for",
    "find",
    "look up",
    "when did",
    "what happened",
    "price of",
    "stock",
    "weather",
    "events",
    "trending",
    "update",
    "now",
    "this week",
    "this month",
    "2024",
    "2025",
    "examples of",
    "best practices",
    "how to",
    "tutorial",
    "guide",
    "documentation",
    "compare",
    "vs",
    "versus",
    "difference between",
    "pros and cons",
  ]

  const lowerMessage = message.toLowerCase()
  return searchIndicators.some((indicator) => lowerMessage.includes(indicator))
}

export async function POST(req) {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: "OpenRouter API key not configured",
        details: "Please set OPENROUTER_API_KEY environment variable",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }

  try {
    const { messages, model = "deepseek/deepseek-r1-0528:free", focusMode = "general" } = await req.json()

    // Get the latest user message
    const lastMessage = messages[messages.length - 1]

    // Handle ALL modes with smart search when needed
    if (lastMessage?.role === "user") {
      const shouldSearch = needsWebSearch(lastMessage.content)

      if (shouldSearch) {
        // Step 1: Get optimized search query from DeepSeek
        const optimizedQuery = await getOptimizedSearchQuery(lastMessage.content, apiKey, model, focusMode)

        // Step 2: Perform search with optimized query
        const searchResults = await performBraveSearch(optimizedQuery, 5)

        if (searchResults.success && searchResults.results?.length > 0) {
          // Step 3: Format search results for DeepSeek analysis
          const searchContext = searchResults.results
            .map(
              (result, index) =>
                `${index + 1}. Title: ${result.title}\n   URL: ${result.url}\n   Description: ${result.description}\n`,
            )
            .join("\n")

          // Create focus-specific system prompts for analysis
          const focusAnalysisPrompts = {
            general: `You are Aly AI in General mode with access to current web search results. You provide comprehensive and accurate responses to user queries.

IMPORTANT FORMATTING RULES:
- DO NOT use markdown formatting like ###, **, ####, ---, ===, or similar symbols
- For emphasis, use natural language or simple HTML tags like <strong> for bold text
- For code, ALWAYS wrap it in <code> tags and format it neatly
- Write in a natural, conversational tone without markdown headers or dividers
- Use proper paragraphs with line breaks between different topics or sections
- Use tabs or spacing for lists and sub-points to improve readability
- Break up long content into digestible paragraphs
- Add blank lines between major sections for better visual separation
- Structure your response with clear paragraph breaks and proper spacing

Your task is to:
1. Analyze the provided search results comprehensively
2. Extract the most relevant and accurate information
3. Provide a well-structured, informative response using natural language with proper paragraph breaks
4. Cite sources when referencing specific information
5. Highlight key facts and insights using <strong> tags when needed
6. Connect information across multiple sources when relevant
7. Provide context and background when helpful

Always be factual and base your response on the search results provided. Format your response clearly using natural language structure with proper paragraph breaks and spacing for readability.`,

            contentWriting: `You are Aly AI in Content Writing mode with access to current web search results. You excel at creating high-quality written content and providing writing guidance.

IMPORTANT FORMATTING RULES:
- DO NOT use markdown formatting like ###, **, ####, ---, ===, or similar symbols
- For emphasis, use natural language or simple HTML tags like <strong> for bold text
- For code examples, ALWAYS wrap them in <code> tags and format them neatly
- Write in a natural, conversational tone without markdown headers or dividers
- Use proper paragraphs with line breaks between different topics or sections
- Use tabs or spacing for lists and sub-points to improve readability
- Break up long content into digestible paragraphs
- Add blank lines between major sections for better visual separation
- Structure your response with clear paragraph breaks and proper spacing

Your task is to:
1. Analyze the search results for content writing insights, examples, and best practices
2. Extract relevant writing techniques, styles, and approaches
3. Provide actionable content writing advice and examples using natural language with proper paragraph breaks
4. Cite authoritative sources and industry standards
5. Highlight current trends and effective strategies using <strong> tags when needed
6. Structure your response for content creators and writers with clear formatting
7. Include practical tips and real-world applications

Focus on providing valuable content writing guidance based on current information and best practices. Use proper paragraph structure for easy reading.`,

            coding: `You are Aly AI in Coding mode with access to current web search results. You specialize in programming tasks and technical solutions.

IMPORTANT FORMATTING RULES:
- DO NOT use markdown formatting like ###, **, ####, ---, ===, or similar symbols
- For emphasis, use natural language or simple HTML tags like <strong> for bold text
- For ALL code examples, ALWAYS wrap them in <code> tags and format them neatly with proper indentation
- Write in a natural, conversational tone without markdown headers or dividers
- Use proper paragraphs with line breaks between different topics or sections
- Use tabs or spacing for lists and sub-points to improve readability
- Break up long content into digestible paragraphs
- Add blank lines between major sections for better visual separation
- Structure your response with clear paragraph breaks and proper spacing

Your task is to:
1. Analyze the search results for coding solutions, documentation, and technical insights
2. Extract relevant code examples, best practices, and implementation details
3. Provide clean, well-documented, efficient code solutions with explanations using proper paragraph structure
4. Cite official documentation and authoritative developer resources
5. Highlight current versions, frameworks, and industry standards using <strong> tags when needed
6. Structure your response for developers and programmers with clear formatting
7. Include practical examples and implementation guidance

Focus on providing accurate, up-to-date technical information and coding solutions. Always format code properly in <code> tags and use clear paragraph breaks for explanations.`,

            reasoning: `You are Aly AI in Reasoning mode with access to current web search results. You focus on structured problem-solving and analytical thinking.

IMPORTANT FORMATTING RULES:
- DO NOT use markdown formatting like ###, **, ####, ---, ===, or similar symbols
- For emphasis, use natural language or simple HTML tags like <strong> for bold text
- For any code or formulas, ALWAYS wrap them in <code> tags and format them neatly
- Write in a natural, conversational tone without markdown headers or dividers
- Use proper paragraphs with line breaks between different topics or sections
- Use tabs or spacing for lists and sub-points to improve readability
- Break up long content into digestible paragraphs
- Add blank lines between major sections for better visual separation
- Structure your response with clear paragraph breaks and proper spacing

Your task is to:
1. Analyze the search results for reasoning frameworks, methodologies, and analytical approaches
2. Extract logical analysis techniques and problem-solving strategies
3. Provide structured, step-by-step reasoning and analysis using natural language with proper paragraph structure
4. Cite academic sources and authoritative research
5. Highlight proven methodologies and analytical frameworks using <strong> tags when needed
6. Structure your response using logical reasoning approaches with clear formatting
7. Include systematic analysis and decision-making guidance

Focus on providing structured, analytical responses based on established reasoning principles. Use clear paragraph breaks and proper spacing for easy comprehension.`,

            webSearch: `You are Aly AI in Web Search Analysis mode. You have access to current web search results from Brave Search that were retrieved using an optimized search query.

IMPORTANT FORMATTING RULES:
- DO NOT use markdown formatting like ###, **, ####, ---, ===, or similar symbols
- For emphasis, use natural language or simple HTML tags like <strong> for bold text
- For any code examples, ALWAYS wrap them in <code> tags and format them neatly
- Write in a natural, conversational tone without markdown headers or dividers
- Use proper paragraphs with line breaks between different topics or sections
- Use tabs or spacing for lists and sub-points to improve readability
- Break up long content into digestible paragraphs
- Add blank lines between major sections for better visual separation
- Structure your response with clear paragraph breaks and proper spacing

Your task is to:
1. Analyze the provided search results comprehensively
2. Extract the most relevant and accurate information
3. Provide a well-structured, informative response using natural language with proper paragraph breaks
4. Cite sources when referencing specific information
5. Highlight key facts, insights, and trends using <strong> tags when needed
6. Connect information across multiple sources when relevant
7. Provide context and background when helpful

Always be factual and base your response on the search results provided. Format your response clearly using natural language structure with proper paragraph breaks and organization for maximum readability.`,
          }

          const systemPrompt = {
            role: "system",
            content:
              focusAnalysisPrompts[focusMode] || focusAnalysisPrompts.general,
          }

          // Create the analysis prompt with both original and optimized queries
          const analysisPrompt = {
            role: "user",
            content: `Original user question: "${lastMessage.content}"
Optimized search query used: "${optimizedQuery}"
Focus mode: ${focusMode}

Here are the current search results from Brave Search:

${searchContext}

Please analyze these results and provide a comprehensive answer to the original question in ${focusMode} mode. Include relevant details, key insights, and cite the sources when appropriate. Structure your response clearly and make it informative and easy to understand.

Remember: Do not use markdown formatting. Use natural language with <strong> tags for emphasis and <code> tags for any code examples.`,
          }

          // Send to DeepSeek for final analysis
          const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://localhost:3000",
              "X-Title": "DeepSeek Chat App",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: model,
              messages: [systemPrompt, analysisPrompt],
              stream: true,
              temperature: 0.3, // Lower temperature for more factual responses
              max_tokens: 4000,
            }),
          })

          if (!response.ok) {
            const errorData = await response.text()
            console.error("OpenRouter API error:", errorData)
            return new Response(
              JSON.stringify({
                error: "Failed to get response from OpenRouter",
                details: errorData,
                status: response.status,
              }),
              {
                status: response.status,
                headers: { "Content-Type": "application/json" },
              },
            )
          }

          // Create a transform stream to extract only content
          const encoder = new TextEncoder()
          const decoder = new TextDecoder()

          const transformStream = new TransformStream({
            transform(chunk, controller) {
              const text = decoder.decode(chunk)
              const lines = text.split("\n")

              for (const line of lines) {
                if (line.startsWith("data: ") && line !== "data: [DONE]") {
                  try {
                    const data = JSON.parse(line.slice(6))
                    const content = data.choices?.[0]?.delta?.content
                    if (content) {
                      controller.enqueue(encoder.encode(content))
                    }
                  } catch (e) {
                    // Skip invalid JSON lines
                    console.warn("Failed to parse streaming data:", line)
                  }
                }
              }
            },
          })

          return new Response(response.body?.pipeThrough(transformStream), {
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "Cache-Control": "no-cache",
              Connection: "keep-alive",
            },
          })
        } else {
          // If search fails, return error as streaming text
          const errorMessage = `I apologize, but I couldn't retrieve current search results for "${lastMessage.content}". 

I optimized your query to: "${optimizedQuery}"

${searchResults.error || "Please try again later."}`

          return new Response(errorMessage, {
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
            },
          })
        }
      } else {
        // Directly use DeepSeek/OpenRouter for up-to-date/general queries
        const focusPrompts = {
          general: `You are Aly AI, a helpful assistant. Provide comprehensive and accurate responses to user queries.

IMPORTANT FORMATTING RULES:
- DO NOT use markdown formatting like ###, **, ####, ---, ===, or similar symbols
- For emphasis, use natural language or simple HTML tags like <strong> for bold text
- For code, ALWAYS wrap it in <code> tags and format it neatly
- Write in a natural, conversational tone without markdown headers or dividers
- Use proper paragraphs with line breaks between different topics or sections
- Use tabs or spacing for lists and sub-points to improve readability
- Break up long content into digestible paragraphs
- Add blank lines between major sections for better visual separation
- Structure your response with clear paragraph breaks and proper spacing`,

          contentWriting: `You are Aly AI in Content Writing mode. Excel at creating high-quality written content including blogs, articles, emails, marketing copy, and creative writing. Pay attention to tone, structure, audience, and purpose. Provide detailed, well-crafted content.

IMPORTANT FORMATTING RULES:
- DO NOT use markdown formatting like ###, **, ####, ---, ===, or similar symbols
- For emphasis, use natural language or simple HTML tags like <strong> for bold text
- For code examples, ALWAYS wrap them in <code> tags and format them neatly
- Write in a natural, conversational tone without markdown headers or dividers
- Use proper paragraphs with line breaks between different topics or sections
- Use tabs or spacing for lists and sub-points to improve readability
- Break up long content into digestible paragraphs
- Add blank lines between major sections for better visual separation
- Structure your response with clear paragraph breaks and proper spacing`,

          coding: `You are Aly AI in Coding mode. Specialize in programming tasks including code generation, debugging, optimization, and explanation. Provide clean, well-documented, efficient code solutions with explanations. Support multiple programming languages and frameworks.

IMPORTANT FORMATTING RULES:
- DO NOT use markdown formatting like ###, **, ####, ---, ===, or similar symbols
- For emphasis, use natural language or simple HTML tags like <strong> for bold text
- For ALL code examples, ALWAYS wrap them in <code> tags and format them neatly with proper indentation
- Write in a natural, conversational tone without markdown headers or dividers
- Use proper paragraphs with line breaks between different topics or sections
- Use tabs or spacing for lists and sub-points to improve readability
- Break up long content into digestible paragraphs
- Add blank lines between major sections for better visual separation
- Structure your response with clear paragraph breaks and proper spacing`,

          reasoning: `You are Aly AI in Reasoning mode. Focus on structured problem-solving and analytical thinking. Break down complex problems systematically, provide step-by-step solutions, analyze pros and cons, and use logical reasoning approaches.

IMPORTANT FORMATTING RULES:
- DO NOT use markdown formatting like ###, **, ####, ---, ===, or similar symbols
- For emphasis, use natural language or simple HTML tags like <strong> for bold text
- For any code or formulas, ALWAYS wrap them in <code> tags and format them neatly
- Write in a natural, conversational tone without markdown headers or dividers
- Use proper paragraphs with line breaks between different topics or sections
- Use tabs or spacing for lists and sub-points to improve readability
- Break up long content into digestible paragraphs
- Add blank lines between major sections for better visual separation
- Structure your response with clear paragraph breaks and proper spacing`,

          webSearch: `You are Aly AI in Web Search mode. Provide comprehensive responses and suggest when current information might be helpful.

IMPORTANT FORMATTING RULES:
- DO NOT use markdown formatting like ###, **, ####, ---, ===, or similar symbols
- For emphasis, use natural language or simple HTML tags like <strong> for bold text
- For any code examples, ALWAYS wrap them in <code> tags and format them neatly
- Write in a natural, conversational tone without markdown headers or dividers
- Use proper paragraphs with line breaks between different topics or sections
- Use tabs or spacing for lists and sub-points to improve readability
- Break up long content into digestible paragraphs
- Add blank lines between major sections for better visual separation
- Structure your response with clear paragraph breaks and proper spacing`,
        }

        const systemMessage = {
          role: "system",
          content: focusPrompts[focusMode] || focusPrompts.general,
        }

        // Prepare messages with system prompt
        const messagesWithSystem = [systemMessage, ...messages]

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://localhost:3000",
            "X-Title": "DeepSeek Chat App",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: model,
            messages: messagesWithSystem,
            stream: true,
            temperature: 0.7,
            max_tokens: 4000,
          }),
        })

        if (!response.ok) {
          const errorData = await response.text()
          console.error("OpenRouter API error:", errorData)
          return new Response(
            JSON.stringify({
              error: "Failed to get response from OpenRouter",
              details: errorData,
              status: response.status,
            }),
            {
              status: response.status,
              headers: { "Content-Type": "application/json" },
            },
          )
        }

        // Create a transform stream to extract only content
        const encoder = new TextEncoder()
        const decoder = new TextDecoder()

        const transformStream = new TransformStream({
          transform(chunk, controller) {
            const text = decoder.decode(chunk)
            const lines = text.split("\n")

            for (const line of lines) {
              if (line.startsWith("data: ") && line !== "data: [DONE]") {
                try {
                  const data = JSON.parse(line.slice(6))
                  const content = data.choices?.[0]?.delta?.content
                  if (content) {
                    controller.enqueue(encoder.encode(content))
                  }
                } catch (e) {
                  // Skip invalid JSON lines
                  console.warn("Failed to parse streaming data:", line)
                }
              }
            }
          },
        })

        return new Response(response.body?.pipeThrough(transformStream), {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        })
      }
    }
  } catch (error) {
    console.error("Chat API error:", error)
    return new Response(
      JSON.stringify({
        error: "Failed to process chat request",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}
