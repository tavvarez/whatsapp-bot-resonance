import { chromium } from 'playwright'
import fs from 'fs'

async function initSession() {
  const browser = await chromium.launch({
    headless: false
  })

  const context = await browser.newContext()
  const page = await context.newPage()

  console.log('👉 Abra o captcha MANUALMENTE e resolva')
  await page.goto('https://rubinot.com.br/?subtopic=latestdeaths')

  // você resolve o captcha com o mouse
  await page.waitForTimeout(120_000) // 2 minutos

  // salva sessão
  await context.storageState({ path: 'rubinot-state.json' })
  console.log('✅ Sessão salva em rubinot-state.json')

  await browser.close()
}

initSession()
