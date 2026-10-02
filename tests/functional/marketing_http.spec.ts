import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Lead from '#models/lead'
import MarketingEvent from '#models/marketing_event'
import User from '#models/user'

const inertia = { 'x-inertia': 'true', 'x-inertia-version': '1', 'accept': 'application/json' }

test.group('landing pages and waitlist over HTTP', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('the landing pages are public, count a view with the utm source, and show no fake numbers', async ({
    client,
    assert,
  }) => {
    const page = await client
      .get('/for-makers?utm_source=newsletter&utm_medium=email')
      .headers(inertia)
    page.assertStatus(200)
    assert.isNull(page.body().props.waiting)
    const view = await MarketingEvent.query().where('name', 'landing_view').firstOrFail()
    assert.equal(view.source, 'newsletter')
    assert.equal(view.path, '/for-makers')

    const sellers = await client.get('/for-sellers').headers(inertia)
    sellers.assertStatus(200)
  })

  test('joining the waitlist needs consent and then shows a real count', async ({
    client,
    assert,
  }) => {
    const refused = await client
      .post('/waitlist')
      .withCsrfToken()
      .headers(inertia)
      .redirects(0)
      .json({ email: 'maker@example.com', interest: 'maker', consent: false })
    assert.notEqual(refused.status(), 200)
    assert.equal(await Lead.query().then((r) => r.length), 0)

    const ok = await client
      .post('/waitlist')
      .withCsrfToken()
      .headers(inertia)
      .redirects(0)
      .json({ email: 'maker@example.com', interest: 'maker', city: 'Bursa', consent: true })
    ok.assertStatus(302)
    const lead = await Lead.firstOrFail()
    assert.equal(lead.city, 'Bursa')

    const page = await client.get('/for-makers').headers(inertia)
    assert.equal(page.body().props.waiting, 1)
  })

  test('signing up credits the visit that brought the person', async ({ client, assert }) => {
    const email = `visitor-${Date.now()}@example.com`
    const signup = await client
      .post('/signup')
      .withSession({ attribution: { source: 'podcast', medium: 'audio', campaign: null } })
      .withCsrfToken()
      .headers(inertia)
      .redirects(0)
      .json({
        fullName: 'Vera Visitor',
        email,
        password: 'password123',
        passwordConfirmation: 'password123',
      })
    assert.oneOf(signup.status(), [302, 200])
    const user = await User.findByOrFail('email', email)
    assert.equal(user.firstTouchSource, 'podcast')
    const signups = await MarketingEvent.query().where('name', 'signup')
    assert.isAbove(signups.length, 0)
  })
})

test.group('maker income tool over HTTP', () => {
  test('is public, computes from the query, and refuses a bad price without crashing', async ({
    client,
    assert,
  }) => {
    const ok = await client
      .get('/tools/maker-income?printers=3&hours=12&busy=50&price=0.6')
      .headers(inertia)
    ok.assertStatus(200)
    assert.equal(ok.body().props.inputs.printers, 3)
    assert.isAbove(ok.body().props.estimate.monthlyMinor, 0)

    const bad = await client.get('/tools/maker-income?price=abc').headers(inertia)
    bad.assertStatus(200)
    assert.isNull(bad.body().props.estimate)
    assert.isString(bad.body().props.priceError)

    const tooMany = await client.get('/tools/maker-income?printers=5000').headers(inertia)
    assert.notEqual(tooMany.status(), 500)
  })
})

import { writeFile, mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  createManufacturer,
  createPrinter,
  ensureReferenceCatalog,
} from '#tests/helpers/order_fixtures'
import MakerCostProfileService from '#services/manufacturing/maker_cost_profile_service'

function cubeStl(): Buffer {
  const quad = (a: number[], b: number[], c: number[], d: number[]) => [
    [...a, ...b, ...c],
    [...a, ...c, ...d],
  ]
  const s = 20
  const p = (x: number, y: number, z: number) => [x * s, y * s, z * s]
  const tris = [
    ...quad(p(0, 0, 0), p(0, 1, 0), p(1, 1, 0), p(1, 0, 0)),
    ...quad(p(0, 0, 1), p(1, 0, 1), p(1, 1, 1), p(0, 1, 1)),
    ...quad(p(0, 0, 0), p(1, 0, 0), p(1, 0, 1), p(0, 0, 1)),
    ...quad(p(0, 1, 0), p(0, 1, 1), p(1, 1, 1), p(1, 1, 0)),
    ...quad(p(0, 0, 0), p(0, 0, 1), p(0, 1, 1), p(0, 1, 0)),
    ...quad(p(1, 0, 0), p(1, 1, 0), p(1, 1, 1), p(1, 0, 1)),
  ]
  const buf = Buffer.alloc(84 + tris.length * 50)
  buf.writeUInt32LE(tris.length, 80)
  tris.forEach((t, i) => t.forEach((v, j) => buf.writeFloatLE(v, 84 + i * 50 + 12 + j * 4)))
  return buf
}

test.group('quick quote (M2-T1)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())

  test('a visitor gets a price for an STL and nothing is stored', async ({ client, assert }) => {
    const dir = await mkdtemp(join(tmpdir(), 'qq-'))
    const path = join(dir, 'cube.stl')
    await writeFile(path, cubeStl())
    const before = await import('#models/model_file').then((m) => m.default.query().count('* as n'))

    const response = await client
      .post('/tools/quick-quote')
      .withCsrfToken()
      .header('accept', 'application/json')
      .file('model', path)
      .fields({ material: 'PETG' })
    assert.equal(response.status(), 200, JSON.stringify(response.body()))
    const { quote } = response.body()
    assert.equal(quote.material, 'PETG')
    assert.deepEqual(quote.bboxMm, [20, 20, 20])
    assert.equal(quote.volumeCm3, 8)
    assert.equal(quote.totalMinor, quote.unitPriceMinor)
    assert.isAbove(quote.shippingMinor, 0)
    assert.deepEqual(
      quote.options.map((o: { material: string }) => o.material),
      ['PLA', 'PETG', 'ABS', 'TPU']
    )
    assert.includeMembers(quote.security.checks, [
      'size',
      'signatures',
      'active_content',
      'structure',
    ])
    const petg = quote.options.find((o: { material: string }) => o.material === 'PETG')
    assert.equal(petg.totals[0].quantity, 1)
    assert.equal(
      petg.totals[0].totalMinor,
      quote.totalMinor,
      'one piece matches the headline price'
    )
    assert.isBelow(petg.totals[3].totalMinor / 10, quote.totalMinor, 'ten share one parcel')

    const after = await import('#models/model_file').then((m) => m.default.query().count('* as n'))
    assert.equal(after[0].$extras.n, before[0].$extras.n, 'no ModelFile row was created')
  })

  test('the price sits inside the range the makers who print it ask (Paket V)', async ({
    client,
    assert,
  }) => {
    // four PLA makers in Türkiye, the same but for their machine hour
    for (const hourly of [1000, 1500, 2000, 9000]) {
      const maker = await createManufacturer()
      await createPrinter(maker.profile, { material: 'PLA' })
      await new MakerCostProfileService().save(maker.profile.id, {
        hourlyRateMinor: hourly,
        setupMinor: 0,
        wasteBps: 1000,
        failureBps: 500,
        profitBps: 2500,
      })
    }
    const dir = await mkdtemp(join(tmpdir(), 'qq-'))
    const path = join(dir, 'cube.stl')
    await writeFile(path, cubeStl())
    const response = await client
      .post('/tools/quick-quote')
      .withCsrfToken()
      .header('accept', 'application/json')
      .file('model', path)
      .fields({ material: 'PLA' })
    assert.equal(response.status(), 200, JSON.stringify(response.body()))
    const pla = response
      .body()
      .quote.options.find((o: { material: string }) => o.material === 'PLA')
    assert.equal(pla.makers, 4)
    for (const line of pla.totals) {
      assert.isAtMost(line.lowMinor, line.totalMinor)
      assert.isAtLeast(line.highMinor, line.totalMinor)
    }
    assert.isBelow(pla.totals[0].lowMinor, pla.totals[0].highMinor, 'four makers make a range')
  })

  test('an OBJ gets the same price as the same shape in STL', async ({ client, assert }) => {
    const dir = await mkdtemp(join(tmpdir(), 'qq-'))
    const stl = join(dir, 'cube.stl')
    await writeFile(stl, cubeStl())
    const obj = join(dir, 'cube.obj')
    const v = [
      [0, 0, 0],
      [20, 0, 0],
      [20, 20, 0],
      [0, 20, 0],
      [0, 0, 20],
      [20, 0, 20],
      [20, 20, 20],
      [0, 20, 20],
    ]
    await writeFile(
      obj,
      [
        ...v.map(([x, y, z]) => `v ${x} ${y} ${z}`),
        'f 1 4 3 2',
        'f 5 6 7 8',
        'f 1 2 6 5',
        'f 3 4 8 7',
        'f 2 3 7 6',
        'f 4 1 5 8',
      ].join('\n')
    )
    const quote = async (path: string) => {
      const response = await client
        .post('/tools/quick-quote')
        .withCsrfToken()
        .header('accept', 'application/json')
        .file('model', path)
        .fields({ material: 'PLA' })
      assert.equal(response.status(), 200, JSON.stringify(response.body()))
      return response.body().quote
    }
    const fromObj = await quote(obj)
    const fromStl = await quote(stl)
    assert.deepEqual(fromObj.bboxMm, [20, 20, 20])
    assert.equal(fromObj.volumeCm3, 8)
    assert.equal(fromObj.totalMinor, fromStl.totalMinor)
  })

  test('non-STL, executables and unknown materials are refused with a message', async ({
    client,
    assert,
  }) => {
    const dir = await mkdtemp(join(tmpdir(), 'qq-'))
    const exe = join(dir, 'bad.stl')
    await writeFile(exe, Buffer.from('MZ\x90\x00 not a model at all, just bytes'))
    const bad = await client
      .post('/tools/quick-quote')
      .withCsrfToken()
      .header('accept', 'application/json')
      .file('model', exe)
      .fields({ material: 'PLA' })
    bad.assertStatus(422)
    assert.isTrue(bad.body().blocked, 'the scan refused it')

    const polyglot = join(dir, 'poly.stl')
    await writeFile(polyglot, 'solid x\n<script>fetch("//evil")</script>\nendsolid x\n')
    const hidden = await client
      .post('/tools/quick-quote')
      .withCsrfToken()
      .header('accept', 'application/json')
      .file('model', polyglot)
      .fields({ material: 'PLA' })
    hidden.assertStatus(422)
    assert.match(hidden.body().error, /script/)

    const txt = join(dir, 'a.txt')
    await writeFile(txt, 'hello')
    const wrongType = await client
      .post('/tools/quick-quote')
      .withCsrfToken()
      .header('accept', 'application/json')
      .file('model', txt)
      .fields({ material: 'PLA' })
    assert.oneOf(wrongType.status(), [400, 422])

    const cube = join(dir, 'cube.stl')
    await writeFile(cube, cubeStl())
    const badMaterial = await client
      .post('/tools/quick-quote')
      .withCsrfToken()
      .header('accept', 'application/json')
      .file('model', cube)
      .fields({ material: 'RESIN' })
    badMaterial.assertStatus(422)
    assert.isFalse(badMaterial.body().blocked)
  })
})

test.group('legal pages over HTTP', () => {
  test('are public; unknown documents are 404', async ({ client, assert }) => {
    const page = await client.get('/legal/terms').headers(inertia)
    page.assertStatus(200)
    assert.equal(page.body().props.title, 'Terms of use')
    assert.include(page.body().props.html, 'DRAFT')
    const missing = await client.get('/legal/nothing').headers(inertia)
    missing.assertStatus(404)
  })
})

test.group('carrier webhook over HTTP', () => {
  test('rejects a bad signature with 401 and needs no CSRF token', async ({ client }) => {
    const bad = await client
      .post('/webhooks/carrier')
      .header('content-type', 'application/json')
      .header('x-fake-carrier-signature', 'nope')
      .json({ eventId: 'e1', trackingNumber: 'X', status: 'delivered' })
    bad.assertStatus(401)
  })
})

test.group('help page over HTTP', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('is public, lists the FAQ, and accepts a message', async ({ client, assert }) => {
    const page = await client.get('/help').headers(inertia)
    page.assertStatus(200)
    assert.isAbove(page.body().props.faq.length, 3)

    const sent = await client.post('/help').withCsrfToken().headers(inertia).redirects(0).json({
      email: 'visitor@example.com',
      topic: 'order',
      message: 'The tracking link does not open',
    })
    sent.assertStatus(302)
  })
})

test.group('status and changelog pages', () => {
  test('are public and say something true', async ({ client, assert }) => {
    const status = await client.get('/status').headers(inertia)
    status.assertStatus(200)
    assert.oneOf(status.body().props.status, ['ok', 'degraded'])
    assert.isArray(status.body().props.issues)

    const log = await client.get('/changelog').headers(inertia)
    log.assertStatus(200)
    assert.include(log.body().props.html, '<h1>Changelog</h1>')
  })
})
