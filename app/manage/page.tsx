'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface ImageFile {
  originalName: string
  fileName: string
  url: string
  markdown: string
  bbcode: string
  html: string
  size: number
  type: string
  uploadTime: string
}

export default function ManagePage() {
  const [images, setImages] = useState<ImageFile[]>([])
  const [selectedImage, setSelectedImage] = useState<ImageFile | null>(null)
  const [copiedText, setCopiedText] = useState<string>('')
  const router = useRouter()

  useEffect(() => {
    fetch('/api/images')
      .then(res => res.json())
      .then(data => setImages(data))
      .catch(err => console.error('Failed to load images:', err))
  }, [])

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopiedText(type)
        setTimeout(() => setCopiedText(''), 2000)
      })
      .catch(err => console.error('Failed to copy:', err))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
  }

  const handleDelete = async (fileName: string) => {
    if (!confirm('确定要删除这张图片吗？')) {
      return
    }

    try {
      const res = await fetch(`/api/images/${fileName}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        setImages(prev => prev.filter(img => img.fileName !== fileName))
        setSelectedImage(null)
      } else {
        alert('删除失败')
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('删除失败')
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-yellow-500">图片管理</h1>
          <div className="space-x-4">
            <button
              onClick={() => router.push('/home')}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded transition-colors"
            >
              返回上传
            </button>
            <button
              onClick={() => {
                fetch('/api/logout', { method: 'POST' })
                  .then(() => window.location.href = '/login')
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition-colors"
            >
              退出登录
            </button>
          </div>
        </header>

        <main>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {images.map(image => (
              <div
                key={image.fileName}
                className="group relative aspect-square rounded-lg overflow-hidden bg-gray-800 cursor-pointer
                         hover:ring-2 hover:ring-yellow-500 transition-all"
                onClick={() => setSelectedImage(image)}
              >
                <Image
                  src={image.url}
                  alt={image.originalName}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/75 text-sm
                             transform translate-y-full group-hover:translate-y-0 transition-transform">
                  <p className="truncate">{image.originalName}</p>
                  <p className="text-gray-400 text-xs">{formatFileSize(image.size)}</p>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>

      {/* 图片详情弹窗 */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg max-w-3xl w-full mx-4 relative">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 p-1 hover:bg-gray-700 rounded-full transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex flex-col md:flex-row gap-6">
              {/* 图片预览 */}
              <div className="flex-shrink-0 relative w-full md:w-96 aspect-square rounded-lg overflow-hidden bg-gray-900">
                <Image
                  src={selectedImage.url}
                  alt={selectedImage.originalName}
                  fill
                  className="object-contain"
                />
              </div>

              {/* 图片信息 */}
              <div className="flex-grow space-y-4">
                <h3 className="text-lg font-medium text-yellow-500">
                  {selectedImage.originalName}
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">直链</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={selectedImage.url}
                        readOnly
                        className="flex-grow bg-gray-900 rounded px-3 py-2 text-sm"
                      />
                      <button
                        onClick={() => handleCopy(selectedImage.url, 'url')}
                        className="px-3 py-2 bg-yellow-500 hover:bg-yellow-400 rounded text-sm transition-colors"
                      >
                        {copiedText === 'url' ? '已复制' : '复制'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Markdown</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={selectedImage.markdown}
                        readOnly
                        className="flex-grow bg-gray-900 rounded px-3 py-2 text-sm"
                      />
                      <button
                        onClick={() => handleCopy(selectedImage.markdown, 'markdown')}
                        className="px-3 py-2 bg-yellow-500 hover:bg-yellow-400 rounded text-sm transition-colors"
                      >
                        {copiedText === 'markdown' ? '已复制' : '复制'}
                      </button>
                    </div>
                  </div>

                  <div className="pt-4 space-y-2">
                    <p className="text-sm text-gray-400">
                      大小：{formatFileSize(selectedImage.size)}
                    </p>
                    <p className="text-sm text-gray-400">
                      上传时间：{new Date(selectedImage.uploadTime).toLocaleString()}
                    </p>
                  </div>

                  <div className="pt-4">
                    <button
                      onClick={() => handleDelete(selectedImage.fileName)}
                      className="w-full px-4 py-2 bg-red-600 hover:bg-red-500 rounded transition-colors"
                    >
                      删除图片
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 