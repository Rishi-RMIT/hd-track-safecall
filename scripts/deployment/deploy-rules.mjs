import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { GoogleAuth } from 'google-auth-library'

const project = 'hd-track-safecall'
const content = await readFile('firebase/firestore.rules', 'utf8')
const client = await new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/firebase'] }).getClient()
const base = `https://firebaserules.googleapis.com/v1/projects/${project}`
const source = { files: [{ name: 'firestore.rules', content }] }
// Print no access tokens, headers or credential objects, including in errors.
try {
  const test = await client.request({ url: `${base}:test`, method: 'POST', data: { source } })
  if ((test.data.issues ?? []).some((issue) => issue.severity === 'ERROR')) throw new Error('Rule compilation failed')
  const created = await client.request({ url: `${base}/rulesets`, method: 'POST', data: { source } })
  const name = `projects/${project}/releases/cloud.firestore`
  await client.request({ url: `${base}/releases/cloud.firestore`, method: 'PATCH', data: { release: { name, rulesetName: created.data.name }, updateMask: 'rulesetName' } })
  const readback = await client.request({ url: `${base}/releases/cloud.firestore`, method: 'GET' })
  if (readback.data.rulesetName !== created.data.name) throw new Error('Release readback mismatch')
  console.log(JSON.stringify({ project, ruleset: created.data.name, sourceSha256: createHash('sha256').update(content).digest('hex'), commit: process.env.GITHUB_SHA, status: 'DEPLOYED_AND_READ_BACK' }))
} catch (error) {
  console.error('Rules deployment failed:', error.response?.status ?? error.message ?? 'Unknown failure')
  process.exitCode = 1
}
