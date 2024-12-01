import type {
  ToolContent,
  AssistantContent,
  CoreAssistantMessage,
  CoreToolMessage,
  UserContent,
  CoreUserMessage,
  TextPart,
  ToolCallPart,
  FilePart,
  ImagePart,
  ToolResultPart,
  CoreSystemMessage,
} from 'ai'

export enum ContentType {
  text = 'text',
  image = 'image',
  toolCall = 'tool-call',
  toolResult = 'tool-result',
}

export enum MessageRole {
  system = 'system',
  user = 'user',
  assistant = 'assistant',
  tool = 'tool',
}

// Message is a role + a MessageContent
export type Message =
  | CoreAssistantMessage
  | CoreToolMessage
  | CoreUserMessage
  | CoreSystemMessage
// MessageContent is a string or an array of ContentPart
export type MessageContent =
  | AssistantContent
  | UserContent
  | ToolContent
  | string
// ContentPart is all possible content types. It's always a type string value +
// some extra fields that depend on the type. Inspect the types to see the
// details.
export type ContentPart =
  | FilePart
  | ImagePart
  | TextPart
  | ToolCallPart
  | ToolResultPart
  | string

export type PromptlSourceRef = {
  start: number
  end: number
  identifier?: string
}
