import {
  ChainCallResponse,
  Commit,
  Dataset,
  DocumentLog,
  DocumentVersion,
  Evaluation,
  LogSources,
  MagicLinkToken,
  Membership,
  Message,
  Project,
  ProviderApiKey,
  ProviderLog,
  User,
  Workspace,
} from '../../browser'
import { PartialConfig } from '../../services/ai'
import { createEvaluationResultJob } from './createEvaluationResultJob'
import { createDocumentLogJob } from './documentLogs/createJob'
import { runLiveEvaluationsJob } from './runLiveEvaluationsJob'
import { sendInvitationToUserJob } from './sendInvitationToUser'
import { sendMagicLinkJob } from './sendMagicLinkHandler'

type LatitudeEventGeneric<
  U extends keyof typeof EventHandlers,
  T extends { userEmail?: string; workspaceId?: number; [key: string]: any },
> = {
  type: U
  data: T
}

export type EventHandler<E extends LatitudeEvent> = ({
  data,
}: {
  data: E
}) => void

export type MagicLinkTokenCreated = LatitudeEventGeneric<
  'magicLinkTokenCreated',
  MagicLinkToken & { userEmail: string }
>
export type UserCreatedEvent = LatitudeEventGeneric<
  'userCreated',
  User & { workspaceId: number; userEmail: string }
>
export type MembershipCreatedEvent = LatitudeEventGeneric<
  'membershipCreated',
  Membership & { authorId?: string; userEmail?: string }
>
export type EvaluationRunEvent = LatitudeEventGeneric<
  'evaluationRun',
  {
    documentUuid: string
    evaluationId: number
    documentLogUuid: string
    providerLogUuid: string
    response: ChainCallResponse
    workspaceId: number
  }
>
export type DocumentRunEvent = LatitudeEventGeneric<
  'documentRun',
  {
    workspaceId: number
    documentUuid: string
    commitUuid: string
    projectId: number
    customIdentifier?: string
    duration: number
    documentLogUuid: string
    response: ChainCallResponse
    resolvedContent: string
    parameters: Record<string, unknown>
    source: LogSources
  }
>

export type ProviderLogCreatedEvent = LatitudeEventGeneric<
  'providerLogCreated',
  ProviderLog
>

export type AIProviderCallCompletedEvent = LatitudeEventGeneric<
  'aiProviderCallCompleted',
  {
    workspaceId: number
    uuid: string
    source: LogSources
    generatedAt: Date
    documentLogUuid?: string
    providerId: number
    providerType: string
    model: string
    config: PartialConfig
    messages: Message[]
    toolCalls: {
      id: string
      name: string
      arguments: unknown[]
    }[]
    usage: unknown
    duration: number
    responseText: string
    responseObject?: unknown
  }
>

export type WorkspaceCreatedEvent = LatitudeEventGeneric<
  'workspaceCreated',
  {
    workspace: Workspace
    user: User
    userEmail: string
    workspaceId: number
  }
>

export type ProjectCreatedEvent = LatitudeEventGeneric<
  'projectCreated',
  {
    project: Project
    commit: Commit
    userEmail: string
    workspaceId: number
  }
>

export type CommitCreatedEvent = LatitudeEventGeneric<
  'commitCreated',
  {
    commit: Commit
    userEmail: string
    workspaceId: number
  }
>

export type DocumentLogCreatedEvent = LatitudeEventGeneric<
  'documentLogCreated',
  DocumentLog
>

export type EvaluationCreatedEvent = LatitudeEventGeneric<
  'evaluationCreated',
  {
    evaluation: Evaluation
    userEmail: string
    workspaceId: number
  }
>

export type DatasetCreatedEvent = LatitudeEventGeneric<
  'datasetCreated',
  {
    dataset: Dataset
    userEmail: string
    workspaceId: number
  }
>

export type ProviderApiKeyCreatedEvent = LatitudeEventGeneric<
  'providerApiKeyCreated',
  {
    providerApiKey: ProviderApiKey
    userEmail: string
    workspaceId: number
  }
>

export type UserInvitedEvent = LatitudeEventGeneric<
  'userInvited',
  {
    invited: User
    invitee: User
    userEmail: string
    workspaceId: number
  }
>

export type EvaluationsConnectedEvent = LatitudeEventGeneric<
  'evaluationsConnected',
  {
    evaluations: Partial<Evaluation>[] // it includes the basic stuff
    userEmail: string
    workspaceId: number
  }
>

export type CommitPublishedEvent = LatitudeEventGeneric<
  'commitPublished',
  {
    commit: Commit
    userEmail: string
    workspaceId: number
  }
>

export type BatchEvaluationRunEvent = LatitudeEventGeneric<
  'batchEvaluationRun',
  {
    evaluationId: number
    workspaceId: number
    userEmail: string
  }
>

export type DocumentCreatedEvent = LatitudeEventGeneric<
  'documentCreated',
  {
    document: DocumentVersion
    workspaceId: number
    userEmail: string
  }
>

export type LatitudeEvent =
  | MembershipCreatedEvent
  | UserCreatedEvent
  | MagicLinkTokenCreated
  | EvaluationRunEvent
  | DocumentRunEvent
  | ProviderLogCreatedEvent
  | AIProviderCallCompletedEvent
  | WorkspaceCreatedEvent
  | ProjectCreatedEvent
  | DocumentLogCreatedEvent
  | EvaluationCreatedEvent
  | DatasetCreatedEvent
  | ProviderApiKeyCreatedEvent
  | UserInvitedEvent
  | CommitCreatedEvent
  | CommitPublishedEvent
  | EvaluationsConnectedEvent
  | BatchEvaluationRunEvent
  | DocumentCreatedEvent
export interface IEventsHandlers {
  magicLinkTokenCreated: EventHandler<MagicLinkTokenCreated>[]
  membershipCreated: EventHandler<MembershipCreatedEvent>[]
  userCreated: EventHandler<UserCreatedEvent>[]
  evaluationRun: EventHandler<EvaluationRunEvent>[]
  documentRun: EventHandler<DocumentRunEvent>[]
  providerLogCreated: EventHandler<ProviderLogCreatedEvent>[]
  aiProviderCallCompleted: EventHandler<AIProviderCallCompletedEvent>[]
  workspaceCreated: EventHandler<WorkspaceCreatedEvent>[]
  projectCreated: EventHandler<ProjectCreatedEvent>[]
  documentLogCreated: EventHandler<DocumentLogCreatedEvent>[]
  evaluationCreated: EventHandler<EvaluationCreatedEvent>[]
  datasetCreated: EventHandler<DatasetCreatedEvent>[]
  providerApiKeyCreated: EventHandler<ProviderApiKeyCreatedEvent>[]
  userInvited: EventHandler<UserInvitedEvent>[]
  commitCreated: EventHandler<CommitCreatedEvent>[]
  commitPublished: EventHandler<CommitPublishedEvent>[]
  evaluationsConnected: EventHandler<EvaluationsConnectedEvent>[]
  batchEvaluationRun: EventHandler<BatchEvaluationRunEvent>[]
  documentCreated: EventHandler<DocumentCreatedEvent>[]
}

export const EventHandlers: IEventsHandlers = {
  evaluationCreated: [],
  aiProviderCallCompleted: [],
  documentLogCreated: [runLiveEvaluationsJob],
  documentRun: [createDocumentLogJob],
  evaluationRun: [createEvaluationResultJob],
  magicLinkTokenCreated: [sendMagicLinkJob],
  membershipCreated: [sendInvitationToUserJob],
  projectCreated: [],
  providerLogCreated: [],
  userCreated: [],
  workspaceCreated: [],
  datasetCreated: [],
  providerApiKeyCreated: [],
  userInvited: [],
  commitCreated: [],
  commitPublished: [],
  evaluationsConnected: [],
  batchEvaluationRun: [],
  documentCreated: [],
} as const
