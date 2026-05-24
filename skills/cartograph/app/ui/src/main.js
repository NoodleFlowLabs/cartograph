import { render } from 'preact'
import { html } from './lib/html.js'
import { App } from './app.js'

render(html`<${App} />`, document.getElementById('root'))
