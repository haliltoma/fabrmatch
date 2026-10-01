import transmit from '@adonisjs/transmit/services/main'
import ManufacturerProfile from '#models/manufacturer_profile'

transmit.authorize<{ id: string }>('manufacturers/:id/offers', async (ctx, { id }) => {
  const user = await ctx.auth.check().then(() => ctx.auth.user)
  if (!user) return false
  const profile = await ManufacturerProfile.query().where('userId', user.id).first()
  return profile?.id === id
})

// Live notification pings: a user may only listen to their own channel.
transmit.authorize<{ id: string }>('users/:id/notifications', async (ctx, { id }) => {
  const user = await ctx.auth.check().then(() => ctx.auth.user)
  return !!user && user.id === id
})
