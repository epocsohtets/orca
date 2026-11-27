export type InaxTaskStatus = 'open' | 'inProgress' | 'done'

export type InaxMockTask = {
  id: string
  title: string
  project: string
  author: string
  labels: string[]
  assignee: string | null
  status: InaxTaskStatus
  updatedAt: string
}

const hoursAgo = (hours: number): string => new Date(Date.now() - hours * 3_600_000).toISOString()

export const INAX_MOCK_TASKS: InaxMockTask[] = [
  {
    id: 'INAX-128',
    title: 'Add SSO login to the tenant admin console',
    project: 'inax-console',
    author: 'mako',
    labels: ['auth'],
    assignee: 'Mako',
    status: 'inProgress',
    updatedAt: hoursAgo(1)
  },
  {
    id: 'INAX-127',
    title: 'Retry failed SFTP uploads with backoff',
    project: 'inax-gateway',
    author: 'jiwoo',
    labels: ['sftp', 'reliability'],
    assignee: 'Jiwoo Han',
    status: 'open',
    updatedAt: hoursAgo(5)
  },
  {
    id: 'INAX-124',
    title: 'Show per-tenant usage on the billing page',
    project: 'inax-console',
    author: 'mako',
    labels: ['billing'],
    assignee: null,
    status: 'open',
    updatedAt: hoursAgo(22)
  },
  {
    id: 'INAX-121',
    title: 'Migrate audit log storage to partitioned tables',
    project: 'inax-core',
    author: 'sora',
    labels: ['database'],
    assignee: 'Sora Lim',
    status: 'inProgress',
    updatedAt: hoursAgo(30)
  },
  {
    id: 'INAX-119',
    title: 'Fix role picker losing focus after search',
    project: 'inax-console',
    author: 'jiwoo',
    labels: ['bug'],
    assignee: 'Mako',
    status: 'done',
    updatedAt: hoursAgo(52)
  },
  {
    id: 'INAX-115',
    title: 'Document the xRS export API',
    project: 'inax-docs',
    author: 'sora',
    labels: ['docs'],
    assignee: 'Jiwoo Han',
    status: 'open',
    updatedAt: hoursAgo(96)
  },
  {
    id: 'INAX-112',
    title: 'Rate-limit webhook deliveries per tenant',
    project: 'inax-gateway',
    author: 'mako',
    labels: ['webhooks'],
    assignee: null,
    status: 'done',
    updatedAt: hoursAgo(170)
  }
]
