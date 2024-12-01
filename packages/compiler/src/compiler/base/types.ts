import Scope, { ScopePointers } from '$compiler/compiler/scope'
import { TemplateNode } from '$compiler/parser/interfaces'
import { Config, ContentPart, Message, PromptlSourceRef } from '$compiler/types'
import type { Node as LogicalExpression } from 'estree'

import { ResolveBaseNodeProps, ToolCallReference } from '../types'
import { CoreAssistantMessage } from 'ai'

export enum NodeType {
  Literal = 'Literal',
  Identifier = 'Identifier',
  ObjectExpression = 'ObjectExpression',
  ArrayExpression = 'ArrayExpression',
  SequenceExpression = 'SequenceExpression',
  LogicalExpression = 'LogicalExpression',
  BinaryExpression = 'BinaryExpression',
  UnaryExpression = 'UnaryExpression',
  AssignmentExpression = 'AssignmentExpression',
  UpdateExpression = 'UpdateExpression',
  MemberExpression = 'MemberExpression',
  ConditionalExpression = 'ConditionalExpression',
  CallExpression = 'CallExpression',
  ChainExpression = 'ChainExpression',
}

type RaiseErrorFn<T = void | never, N = TemplateNode | LogicalExpression> = (
  { code, message }: { code: string; message: string },
  node: N,
) => T

type NodeStatus = {
  completedAs?: unknown
  scopePointers?: ScopePointers | undefined
  eachIterationIndex?: number
}

export type TemplateNodeWithStatus = TemplateNode & {
  status?: NodeStatus
}

export type CompileNodeContext<N extends TemplateNode> = {
  node: N
  scope: Scope
  resolveExpression: (
    expression: LogicalExpression,
    scope: Scope,
  ) => Promise<unknown>
  resolveBaseNode: (props: ResolveBaseNodeProps<TemplateNode>) => Promise<void>
  baseNodeError: RaiseErrorFn<never, TemplateNode>
  expressionError: RaiseErrorFn<never, LogicalExpression>

  isInsideMessageTag: boolean
  isInsideContentTag: boolean

  setConfig: (config: Config) => void
  addMessage: (message: Message) => void
  addStrayText: (text: string, node: TemplateNode) => void
  popStrayText: () => { text: string; sourceMap: PromptlSourceRef[] }
  groupStrayText: () => void
  addContent: (content: ContentPart) => void
  popContent: () => ContentPart[]
  groupContent: () => void
  addToolCall: (toolCallRef: ToolCallReference) => void
  popToolCalls: () => ToolCallReference[]
  popStepResponse: () => CoreAssistantMessage | undefined

  stop: (config?: Config) => void
}
