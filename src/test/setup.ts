import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// With `globals: false` Testing Library cannot register its automatic cleanup.
afterEach(cleanup)

// jsdom 31 does not implement modal dialogs: toggle the `open` attribute the way browsers do.
// Focus trapping and Escape are browser behaviour and are checked in the running app.
HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
  this.setAttribute('open', '')
}
HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
  this.removeAttribute('open')
}
