import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import RoleService from '#services/identity/role_service'
import User from '#models/user'

test.group('RoleService', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('assigns a role to a user', async ({ assert }) => {
    const user = await User.create({
      email: 'role-test@example.com',
      password: 'password123',
      fullName: 'Role Tester',
    })

    const service = new RoleService()
    const userRole = await service.assignRole(user, 'seller')

    assert.equal(userRole.role, 'seller')
    assert.equal(userRole.userId, user.id)
  })

  test('does not duplicate role assignment', async ({ assert }) => {
    const user = await User.create({
      email: 'role-dup@example.com',
      password: 'password123',
      fullName: 'Role Dup',
    })

    const service = new RoleService()
    await service.assignRole(user, 'seller')
    await service.assignRole(user, 'seller')

    const roles = await service.getUserRoles(user)
    assert.lengthOf(roles, 1)
  })

  test('assigns multiple roles', async ({ assert }) => {
    const user = await User.create({
      email: 'multi-role@example.com',
      password: 'password123',
      fullName: 'Multi Role',
    })

    const service = new RoleService()
    await service.assignRole(user, 'seller')
    await service.assignRole(user, 'manufacturer')

    const roles = await service.getUserRoles(user)
    assert.lengthOf(roles, 2)
    assert.includeMembers(roles, ['seller', 'manufacturer'])
  })

  test('removes a role', async ({ assert }) => {
    const user = await User.create({
      email: 'rm-role@example.com',
      password: 'password123',
      fullName: 'Remove Role',
    })

    const service = new RoleService()
    await service.assignRole(user, 'seller')
    await service.removeRole(user, 'seller')

    const has = await service.hasRole(user, 'seller')
    assert.isFalse(has)
  })

  test('hasRole returns correct result', async ({ assert }) => {
    const user = await User.create({
      email: 'has-role@example.com',
      password: 'password123',
      fullName: 'Has Role',
    })

    const service = new RoleService()
    await service.assignRole(user, 'admin')

    assert.isTrue(await service.hasRole(user, 'admin'))
    assert.isFalse(await service.hasRole(user, 'seller'))
  })
})
