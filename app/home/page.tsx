'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface PreviewFile extends File {
  preview: string;
}

export default function HomePage() {
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<PreviewFile[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = Array.from(e.dataTransfer.files)
    handleFiles(files)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    handleFiles(files)
  }

  const handleFiles = (files: File[]) => {
    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    const previewFiles = imageFiles.map(file => Object.assign(file, {
      preview: URL.createObjectURL(file)
    }))
    setSelectedFiles(prev => [...prev, ...previewFiles])
  }

  const removeFile = (index: number) => {
    setSelectedFiles(prev => {
      const newFiles = [...prev]
      URL.revokeObjectURL(newFiles[index].preview)
      newFiles.splice(index, 1)
      return newFiles
    })
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      alert('请先选择图片')
      return
    }

    setIsUploading(true)
    
    try {
      const formData = new FormData()
      selectedFiles.forEach(file => {
        formData.append('files', file)
      })

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      if (!res.ok) {
        throw new Error('上传失败')
      }

      const data = await res.json()
      console.log('Upload success:', data)
      
      // 清除预览
      selectedFiles.forEach(file => URL.revokeObjectURL(file.preview))
      setSelectedFiles([])
      
      // 跳转到图片管理页面
      router.push('/manage')
    } catch (error) {
      console.error('Upload error:', error)
      alert('上传失败，请重试')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-yellow-500">图床</h1>
          <div className="space-x-4">
            <button
              onClick={() => router.push('/manage')}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded transition-colors"
            >
              图片管理
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

        <main className="space-y-8">
          <div className="bg-gray-800 p-8 rounded-lg shadow-lg">
            <h2 className="text-xl mb-6 text-yellow-500">上传图片</h2>
            
            {/* 拖放区域 */}
            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors
                ${dragActive
                  ? 'border-yellow-500 bg-yellow-500/10'
                  : 'border-gray-600 hover:border-gray-500'
                }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{ cursor: 'pointer' }}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                multiple
                accept="image/*"
                className="hidden"
              />
              <p className="text-gray-400 mb-2">
                {isUploading ? '上传中...' : '点击或拖拽图片到这里'}
              </p>
              <p className="text-gray-500 text-sm">
                支持 JPG、PNG、GIF 等图片格式
              </p>
            </div>

            {/* 预览区域 */}
            {selectedFiles.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg mb-4 text-yellow-500">
                  已选择 {selectedFiles.length} 张图片
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-square rounded-lg overflow-hidden bg-gray-700">
                        <Image
                          src={file.preview}
                          alt={file.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        className="absolute top-2 right-2 p-1 bg-red-500 rounded-full
                                 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
                
                {/* 上传按钮 */}
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={handleUpload}
                    disabled={isUploading}
                    className={`px-8 py-3 rounded-lg font-medium transition-colors
                      ${isUploading
                        ? 'bg-yellow-600 cursor-not-allowed'
                        : 'bg-yellow-500 hover:bg-yellow-400 active:bg-yellow-600'
                      }`}
                  >
                    {isUploading ? '上传中...' : '确认上传'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
