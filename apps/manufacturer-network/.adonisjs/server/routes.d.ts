import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'production_requests_api.store': { paramsTuple?: []; params?: {} }
    'region_capability.show': { paramsTuple?: []; params?: {} }
    'webhook_events_api.index': { paramsTuple?: []; params?: {} }
    'home': { paramsTuple?: []; params?: {} }
    'panel.index': { paramsTuple?: []; params?: {} }
    'panel.onboarding.create': { paramsTuple?: []; params?: {} }
    'panel.onboarding.store': { paramsTuple?: []; params?: {} }
    'panel.requests.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'panel.requests.steps.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'panel.offers.accept': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'panel.offers.decline': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'panel.orders.index': { paramsTuple?: []; params?: {} }
    'panel.earnings.index': { paramsTuple?: []; params?: {} }
    'panel.profile.show': { paramsTuple?: []; params?: {} }
    'panel.profile.update': { paramsTuple?: []; params?: {} }
    'new_account.create': { paramsTuple?: []; params?: {} }
    'new_account.store': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'session.store': { paramsTuple?: []; params?: {} }
    'session.destroy': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'production_requests_api.store': { paramsTuple?: []; params?: {} }
    'panel.onboarding.store': { paramsTuple?: []; params?: {} }
    'panel.requests.steps.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'panel.offers.accept': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'panel.offers.decline': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'panel.profile.update': { paramsTuple?: []; params?: {} }
    'new_account.store': { paramsTuple?: []; params?: {} }
    'session.store': { paramsTuple?: []; params?: {} }
    'session.destroy': { paramsTuple?: []; params?: {} }
  }
  GET: {
    'region_capability.show': { paramsTuple?: []; params?: {} }
    'webhook_events_api.index': { paramsTuple?: []; params?: {} }
    'home': { paramsTuple?: []; params?: {} }
    'panel.index': { paramsTuple?: []; params?: {} }
    'panel.onboarding.create': { paramsTuple?: []; params?: {} }
    'panel.requests.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'panel.orders.index': { paramsTuple?: []; params?: {} }
    'panel.earnings.index': { paramsTuple?: []; params?: {} }
    'panel.profile.show': { paramsTuple?: []; params?: {} }
    'new_account.create': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'region_capability.show': { paramsTuple?: []; params?: {} }
    'webhook_events_api.index': { paramsTuple?: []; params?: {} }
    'home': { paramsTuple?: []; params?: {} }
    'panel.index': { paramsTuple?: []; params?: {} }
    'panel.onboarding.create': { paramsTuple?: []; params?: {} }
    'panel.requests.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'panel.orders.index': { paramsTuple?: []; params?: {} }
    'panel.earnings.index': { paramsTuple?: []; params?: {} }
    'panel.profile.show': { paramsTuple?: []; params?: {} }
    'new_account.create': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}