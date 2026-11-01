import type { ApplicationService } from '@adonisjs/core/types'
import logger from '@adonisjs/core/services/logger'
import DeliveryService from '#services/delivery_service'
export default class DeliveryCleanupProvider {
  private timer?: NodeJS.Timeout
  private running = false
  constructor(private app: ApplicationService) {}
  async ready() {
    if (this.app.getEnvironment() !== 'web') return
    const run = async () => {
      if (this.running) return
      this.running = true
      try {
        await new DeliveryService().cleanup()
      } catch (error) {
        logger.warn({ err: error }, 'Delivery media cleanup will retry')
      } finally {
        this.running = false
      }
    }
    this.timer = setInterval(() => {
      void run()
    }, 60_000)
    this.timer.unref()
  }
  async shutdown() {
    if (this.timer) clearInterval(this.timer)
  }
}
