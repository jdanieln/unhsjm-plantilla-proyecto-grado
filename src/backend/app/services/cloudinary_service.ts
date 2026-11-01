import { inject } from '@adonisjs/core'
import { MultipartFile } from '@adonisjs/core/types/bodyparser'
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary'
import logger from '@adonisjs/core/services/logger'
import env from '#start/env'

export interface CloudinaryUploadResult {
  secureUrl: string
  publicId: string
}

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024 // 2 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

@inject()
export default class CloudinaryService {
  constructor() {
    cloudinary.config({
      cloud_name: env.get('CLOUDINARY_CLOUD_NAME'),
      api_key: env.get('CLOUDINARY_API_KEY'),
      api_secret: env.get('CLOUDINARY_API_SECRET'),
      secure: true,
    })
  }

  /**
   * Validates that the uploaded file is an image and doesn't exceed 2 MB.
   * Throws a descriptive Error if validation fails.
   */
  validateImage(file: MultipartFile): void {
    if (!file.tmpPath) {
      throw new Error('No file was uploaded.')
    }

    const mimeType = file.headers['content-type'] ?? ''
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new Error(
        `Invalid file type "${mimeType}". Only JPEG, PNG, WEBP and GIF images are allowed.`
      )
    }

    const sizeBytes = file.size ?? 0
    if (sizeBytes > MAX_FILE_SIZE_BYTES) {
      const sizeMB = (sizeBytes / 1024 / 1024).toFixed(2)
      throw new Error(`File size ${sizeMB} MB exceeds the 2 MB limit.`)
    }
  }

  /**
   * Uploads a validated MultipartFile to Cloudinary.
   * @param file  - The AdonisJS multipart file (must have a tmpPath).
   * @param folder - Cloudinary folder where the asset will be stored (e.g. "drivers", "companies").
   * @returns     - { secureUrl, publicId }
   */
  async upload(file: MultipartFile, folder: string): Promise<CloudinaryUploadResult> {
    this.validateImage(file)

    try {
      const result: UploadApiResponse = await cloudinary.uploader.upload(file.tmpPath!, {
        folder,
        resource_type: 'image',
        overwrite: true,
      })

      logger.info({ publicId: result.public_id, folder }, 'Image uploaded to Cloudinary')

      return {
        secureUrl: result.secure_url,
        publicId: result.public_id,
      }
    } catch (error: any) {
      logger.error({ err: error }, 'Failed to upload image to Cloudinary')
      throw new Error('Failed to upload image. Please try again later.')
    }
  }

  /**
   * Deletes an asset from Cloudinary by its public_id.
   * Safe to call with a null/undefined publicId (no-op).
   */
  async delete(publicId: string | null | undefined): Promise<boolean> {
    if (!publicId) return true

    try {
      const result = await cloudinary.uploader.destroy(publicId, { invalidate: true })
      if (!['ok', 'not found'].includes(result.result)) return false
      logger.info({ publicId }, 'Image deleted from Cloudinary')
      return true
    } catch (error: any) {
      // Non-fatal: log but don't throw so the main flow is not interrupted.
      logger.warn({ err: error, publicId }, 'Failed to delete image from Cloudinary')
      return false
    }
  }
}
