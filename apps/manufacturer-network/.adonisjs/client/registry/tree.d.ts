/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  productionRequestsApi: {
    store: typeof routes['production_requests_api.store']
  }
  regionCapability: {
    show: typeof routes['region_capability.show']
  }
  webhookEventsApi: {
    index: typeof routes['webhook_events_api.index']
  }
  home: typeof routes['home']
  panel: {
    index: typeof routes['panel.index']
    onboarding: {
      create: typeof routes['panel.onboarding.create']
      store: typeof routes['panel.onboarding.store']
    }
    requests: {
      show: typeof routes['panel.requests.show']
      steps: {
        store: typeof routes['panel.requests.steps.store']
      }
    }
    offers: {
      accept: typeof routes['panel.offers.accept']
      decline: typeof routes['panel.offers.decline']
    }
  }
  newAccount: {
    create: typeof routes['new_account.create']
    store: typeof routes['new_account.store']
  }
  session: {
    create: typeof routes['session.create']
    store: typeof routes['session.store']
    destroy: typeof routes['session.destroy']
  }
}
