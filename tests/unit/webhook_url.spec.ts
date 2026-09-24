import { test } from '@japa/runner'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { isPublicAddress, validateWebhookUrl } from '#services/integrations/webhook_url'
import { safeTransport } from '#services/integrations/webhook_transport'

test.group('isPublicAddress', () => {
  test('refuses internal, reserved and unparsable addresses', ({ assert }) => {
    for (const address of [
      '127.0.0.1',
      '10.1.2.3',
      '172.16.0.1',
      '172.31.255.255',
      '192.168.1.1',
      '169.254.169.254',
      '100.64.0.1',
      '0.0.0.0',
      '224.0.0.1',
      '255.255.255.255',
      '::',
      '::1',
      'fe80::1',
      'fc00::1',
      'fd12:3456::1',
      '::ffff:127.0.0.1',
      '::ffff:10.0.0.1',
      '::ffff:7f00:1',
      '64:ff9b::7f00:1',
      'not-an-ip',
      '',
    ]) {
      assert.isFalse(isPublicAddress(address), address)
    }
  })

  test('accepts ordinary public addresses', ({ assert }) => {
    for (const address of [
      '8.8.8.8',
      '1.1.1.1',
      '93.184.216.34',
      '172.32.0.1',
      '2606:4700::1111',
    ]) {
      assert.isTrue(isPublicAddress(address), address)
    }
  })
})

test.group('validateWebhookUrl', () => {
  const strict = { allowHttp: false }

  test('accepts a plain https URL and drops the fragment', ({ assert }) => {
    assert.equal(
      validateWebhookUrl('https://hooks.example.com/fabrmatch?x=1#frag', strict),
      'https://hooks.example.com/fabrmatch?x=1'
    )
  })

  test('rejects anything that could reach an internal service', ({ assert }) => {
    for (const url of [
      '',
      'not a url',
      'ftp://example.com/x',
      'http://example.com/x',
      'https://user:pass@example.com/x',
      'https://localhost/x',
      'https://app.localhost/x',
      'https://intranet/x',
      'https://db.internal/x',
      'https://127.0.0.1/x',
      'https://[::1]/x',
      'https://10.0.0.5/x',
      'https://169.254.169.254/latest/meta-data',
      'https://[::ffff:127.0.0.1]/x',
      `https://example.com/${'a'.repeat(500)}`,
    ]) {
      let refused = false
      try {
        validateWebhookUrl(url, strict)
      } catch {
        refused = true
      }
      assert.isTrue(refused, url)
    }
  })

  test('http is allowed only when explicitly enabled (non-production)', ({ assert }) => {
    assert.equal(
      validateWebhookUrl('http://hooks.example.com/x', { allowHttp: true }),
      'http://hooks.example.com/x'
    )
    assert.throws(() => validateWebhookUrl('http://hooks.example.com/x', strict))
  })
})

test.group('safeTransport', () => {
  test('never connects to a loopback target, by IP or by host name', async ({ assert }) => {
    let hits = 0
    const server = createServer((_req, res) => {
      hits += 1
      res.end('ok')
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const { port } = server.address() as AddressInfo
    try {
      for (const host of ['127.0.0.1', 'localhost']) {
        let failure: Error | null = null
        try {
          await safeTransport({ url: `http://${host}:${port}/hook`, headers: {}, body: '{}' })
        } catch (error) {
          failure = error as Error
        }
        assert.isNotNull(failure, host)
      }
      assert.equal(hits, 0)
    } finally {
      await new Promise((resolve) => server.close(resolve))
    }
  })
})
