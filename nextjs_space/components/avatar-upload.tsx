'use client'

import { useState, useRef } from 'react'
import { Camera, Loader2, User, X } from 'lucide-react'
import Image from 'next/image'

interface AvatarUploadProps {
  currentUrl?: string | null
  onUpload: (url: string) => void
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
}

const sizes = {
  sm: 'w-16 h-16',
  md: 'w-24 h-24',
  lg: 'w-32 h-32'
}

export function AvatarUpload({ 
  currentUrl, 
  onUpload, 
  size = 'md',
  disabled = false 
}: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentUrl || null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validação no cliente
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setError('Use JPG, PNG ou WebP')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Máximo 5MB')
      return
    }

    setError(null)
    setUploading(true)

    // Preview local
    const localPreview = URL.createObjectURL(file)
    setPreview(localPreview)

    try {
      const formData = new FormData()
      formData.append('avatar', file)

      const res = await fetch('/api/upload/avatar', {
        method: 'POST',
        body: formData
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erro no upload')
      }

      setPreview(data.url)
      onUpload(data.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro no upload')
      setPreview(currentUrl || null)
    } finally {
      setUploading(false)
      URL.revokeObjectURL(localPreview)
    }
  }

  const handleRemove = () => {
    setPreview(null)
    onUpload('')
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`relative ${sizes[size]} rounded-full overflow-hidden bg-slate-100 border-2 border-slate-200`}>
        {preview ? (
          <Image
            src={preview}
            alt="Avatar"
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400">
            <User className="w-1/2 h-1/2" />
          </div>
        )}

        {uploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          </div>
        )}

        {!disabled && !uploading && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute inset-0 bg-black/0 hover:bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
          >
            <Camera className="w-6 h-6 text-white" />
          </button>
        )}

        {preview && !disabled && !uploading && (
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
          >
            <X className="w-3 h-3 text-white" />
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || uploading}
      />

      {!disabled && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
        >
          {uploading ? 'Enviando...' : preview ? 'Trocar foto' : 'Adicionar foto'}
        </button>
      )}

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  )
}
