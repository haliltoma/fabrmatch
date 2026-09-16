/* eslint-disable prettier/prettier */
import type { AdonisEndpoint } from '@tuyau/core/types'
import type { Registry } from './schema.d.ts'
import type { ApiDefinition } from './tree.d.ts'

const placeholder: any = {}

const routes = {
  'production_requests_api.store': {
    methods: ["POST"],
    pattern: '/api/v1/production-requests',
    tokens: [{"old":"/api/v1/production-requests","type":0,"val":"api","end":""},{"old":"/api/v1/production-requests","type":0,"val":"v1","end":""},{"old":"/api/v1/production-requests","type":0,"val":"production-requests","end":""}],
    types: placeholder as Registry['production_requests_api.store']['types'],
  },
  'region_capability.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/region-capability',
    tokens: [{"old":"/api/v1/region-capability","type":0,"val":"api","end":""},{"old":"/api/v1/region-capability","type":0,"val":"v1","end":""},{"old":"/api/v1/region-capability","type":0,"val":"region-capability","end":""}],
    types: placeholder as Registry['region_capability.show']['types'],
  },
  'webhook_events_api.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/webhook-events',
    tokens: [{"old":"/api/v1/webhook-events","type":0,"val":"api","end":""},{"old":"/api/v1/webhook-events","type":0,"val":"v1","end":""},{"old":"/api/v1/webhook-events","type":0,"val":"webhook-events","end":""}],
    types: placeholder as Registry['webhook_events_api.index']['types'],
  },
  'home': {
    methods: ["GET","HEAD"],
    pattern: '/',
    tokens: [{"old":"/","type":0,"val":"/","end":""}],
    types: placeholder as Registry['home']['types'],
  },
  'panel.index': {
    methods: ["GET","HEAD"],
    pattern: '/panel',
    tokens: [{"old":"/panel","type":0,"val":"panel","end":""}],
    types: placeholder as Registry['panel.index']['types'],
  },
  'panel.onboarding.create': {
    methods: ["GET","HEAD"],
    pattern: '/panel/onboarding',
    tokens: [{"old":"/panel/onboarding","type":0,"val":"panel","end":""},{"old":"/panel/onboarding","type":0,"val":"onboarding","end":""}],
    types: placeholder as Registry['panel.onboarding.create']['types'],
  },
  'panel.onboarding.store': {
    methods: ["POST"],
    pattern: '/panel/onboarding',
    tokens: [{"old":"/panel/onboarding","type":0,"val":"panel","end":""},{"old":"/panel/onboarding","type":0,"val":"onboarding","end":""}],
    types: placeholder as Registry['panel.onboarding.store']['types'],
  },
  'panel.requests.show': {
    methods: ["GET","HEAD"],
    pattern: '/panel/requests/:id',
    tokens: [{"old":"/panel/requests/:id","type":0,"val":"panel","end":""},{"old":"/panel/requests/:id","type":0,"val":"requests","end":""},{"old":"/panel/requests/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['panel.requests.show']['types'],
  },
  'panel.requests.steps.store': {
    methods: ["POST"],
    pattern: '/panel/requests/:id/steps',
    tokens: [{"old":"/panel/requests/:id/steps","type":0,"val":"panel","end":""},{"old":"/panel/requests/:id/steps","type":0,"val":"requests","end":""},{"old":"/panel/requests/:id/steps","type":1,"val":"id","end":""},{"old":"/panel/requests/:id/steps","type":0,"val":"steps","end":""}],
    types: placeholder as Registry['panel.requests.steps.store']['types'],
  },
  'panel.offers.accept': {
    methods: ["POST"],
    pattern: '/panel/offers/:id/accept',
    tokens: [{"old":"/panel/offers/:id/accept","type":0,"val":"panel","end":""},{"old":"/panel/offers/:id/accept","type":0,"val":"offers","end":""},{"old":"/panel/offers/:id/accept","type":1,"val":"id","end":""},{"old":"/panel/offers/:id/accept","type":0,"val":"accept","end":""}],
    types: placeholder as Registry['panel.offers.accept']['types'],
  },
  'panel.offers.decline': {
    methods: ["POST"],
    pattern: '/panel/offers/:id/decline',
    tokens: [{"old":"/panel/offers/:id/decline","type":0,"val":"panel","end":""},{"old":"/panel/offers/:id/decline","type":0,"val":"offers","end":""},{"old":"/panel/offers/:id/decline","type":1,"val":"id","end":""},{"old":"/panel/offers/:id/decline","type":0,"val":"decline","end":""}],
    types: placeholder as Registry['panel.offers.decline']['types'],
  },
  'new_account.create': {
    methods: ["GET","HEAD"],
    pattern: '/signup',
    tokens: [{"old":"/signup","type":0,"val":"signup","end":""}],
    types: placeholder as Registry['new_account.create']['types'],
  },
  'new_account.store': {
    methods: ["POST"],
    pattern: '/signup',
    tokens: [{"old":"/signup","type":0,"val":"signup","end":""}],
    types: placeholder as Registry['new_account.store']['types'],
  },
  'session.create': {
    methods: ["GET","HEAD"],
    pattern: '/login',
    tokens: [{"old":"/login","type":0,"val":"login","end":""}],
    types: placeholder as Registry['session.create']['types'],
  },
  'session.store': {
    methods: ["POST"],
    pattern: '/login',
    tokens: [{"old":"/login","type":0,"val":"login","end":""}],
    types: placeholder as Registry['session.store']['types'],
  },
  'session.destroy': {
    methods: ["POST"],
    pattern: '/logout',
    tokens: [{"old":"/logout","type":0,"val":"logout","end":""}],
    types: placeholder as Registry['session.destroy']['types'],
  },
} as const satisfies Record<string, AdonisEndpoint>

export { routes }

export const registry = {
  routes,
  $tree: {} as ApiDefinition,
}

declare module '@tuyau/core/types' {
  export interface UserRegistry {
    routes: typeof routes
    $tree: ApiDefinition
  }
}
